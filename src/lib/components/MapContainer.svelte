<script lang="ts">
	import { onMount } from 'svelte';
	import { Mapper } from '$lib/mapping'; // Import the class, not an instance
	import { Crash } from '$lib/crash';
	import { Location } from '$lib/location';
	import { popupHtml } from '$lib/crashFormat';

	let {
		selectedLocation = null,
		crashes,
		setCrashDetail = (_item: Crash | null) => {},
		defaultGeoCenter,
		maxDistance = 5280
	} = $props<{
		selectedLocation?: Location | null;
		crashes: Crash[];
		setCrashDetail?: (item: Crash | null) => void;
		defaultGeoCenter: [number, number];
		maxDistance?: number;
	}>();

	// Create a local instance of Mapper
	const MapperInstance = new Mapper();

	let activeMarker: import('leaflet').Layer | null = null;
	let mapCircleLayer: any = null;
	let markerLayerGroup: any;

	function markerIconHtml(index: number, isFatal: boolean) {
		const label = index + 1;
		const cls = isFatal ? 'marker-icon fatal' : 'marker-icon';
		return `<div class="${cls}">${label}</div>`;
	}

	async function initMap() {
		await MapperInstance.init('map', defaultGeoCenter, 11);

		if (MapperInstance.L && MapperInstance.map) {
			markerLayerGroup = MapperInstance.L.layerGroup().addTo(MapperInstance.map);
		}
	}

	function clearActiveLayer() {
		if (activeMarker && MapperInstance.map) {
			MapperInstance.map.removeLayer(activeMarker);
			activeMarker = null;
		}
	}

	function updateSearchRadius() {
		if (mapCircleLayer && MapperInstance.map) {
			MapperInstance.map.removeLayer(mapCircleLayer);
			mapCircleLayer = null;
		}

		if (selectedLocation && MapperInstance.map && MapperInstance.L) {
			// Convert feet to meters (1 ft = 0.3048 m)
			const radiusInMeters = maxDistance * 0.3048;
			mapCircleLayer = MapperInstance.makeMapCircle(
				selectedLocation.longitude,
				selectedLocation.latitude,
				radiusInMeters
			);

			if (mapCircleLayer) {
				mapCircleLayer.addTo(MapperInstance.map);
			}
		}
	}

	export function updateMapWithLocation(location: Location) {
		if (!MapperInstance.map) return;

		clearActiveLayer();
		MapperInstance.map.setView([location.latitude, location.longitude], 16);

		const renderAsShape = location.category !== 'intersection' && location.isShape;
		if (renderAsShape) {
			activeMarker = MapperInstance.makeShapeMarker(location);
		} else {
			activeMarker = MapperInstance.makePointMarker(location);
			updateSearchRadius();
		}
		if (activeMarker) {
			activeMarker.addTo(MapperInstance.map);
		}
	}

	export function updateNearbyMarkers(items: Crash[]) {
		if (!MapperInstance.map || !MapperInstance.L || !markerLayerGroup) return;

		markerLayerGroup.clearLayers();

		items.forEach((item, index) => {
			const lat = item.latitude;
			const lon = item.longitude;

			if (!isNaN(lat) && !isNaN(lon)) {
				const popup = popupHtml(item, index);
				const icon = MapperInstance.L!.divIcon({
					html: markerIconHtml(index, item.isFatal),
					className: '',
					iconSize: [24, 24],
					iconAnchor: [12, 12]
				});
				const crashMarker = MapperInstance.L!.marker([lat, lon], { icon }).bindPopup(popup, {
					maxWidth: 280
				});

				crashMarker.on('click', () => setCrashDetail(item));

				crashMarker.addTo(markerLayerGroup);
			}
		});

		fitToCrashes(items);
	}

	export function fitToCrashes(items: Crash[]) {
		if (!MapperInstance.map || !MapperInstance.L) return;

		// Only include coordinates that are valid and non-zero (lat=0/lng=0 means missing data)
		const validLatLngs: import('leaflet').LatLngExpression[] = items
			.filter(
				(item) =>
					!isNaN(item.latitude) &&
					!isNaN(item.longitude) &&
					(item.latitude !== 0 || item.longitude !== 0)
			)
			.map((item) => [item.latitude, item.longitude]);

		if (validLatLngs.length > 0) {
			// For shape locations (neighborhoods/wards), extend bounds using the shape layer's
			// actual geographic extent rather than the centroid point — the centroid lat/lng
			// may be 0,0 for polygon records that don't store a separate centroid.
			if (
				selectedLocation?.category !== 'intersection' &&
				selectedLocation?.isShape &&
				activeMarker &&
				'getBounds' in activeMarker
			) {
				try {
					const shapeBounds = (activeMarker as import('leaflet').GeoJSON).getBounds();
					const bounds = MapperInstance.L.latLngBounds(validLatLngs).extend(shapeBounds);
					MapperInstance.map.fitBounds(bounds, { padding: [40, 40] });
				} catch {
					MapperInstance.map.fitBounds(MapperInstance.L.latLngBounds(validLatLngs), {
						padding: [50, 50]
					});
				}
			} else {
				if (
					selectedLocation &&
					selectedLocation.latitude !== 0 &&
					selectedLocation.longitude !== 0
				) {
					validLatLngs.push([selectedLocation.latitude, selectedLocation.longitude]);
				}
				MapperInstance.map.fitBounds(MapperInstance.L.latLngBounds(validLatLngs), {
					padding: [50, 50]
				});
			}
			MapperInstance.map.invalidateSize();
		} else if (selectedLocation) {
			// No valid crash coords — just show the shape/location
			if (
				selectedLocation.category !== 'intersection' &&
				selectedLocation.isShape &&
				activeMarker &&
				'getBounds' in activeMarker
			) {
				try {
					MapperInstance.map.fitBounds((activeMarker as import('leaflet').GeoJSON).getBounds(), {
						padding: [40, 40]
					});
				} catch {
					MapperInstance.map.setView([selectedLocation.latitude, selectedLocation.longitude], 13);
				}
			} else {
				MapperInstance.map.setView([selectedLocation.latitude, selectedLocation.longitude], 16);
			}
			MapperInstance.map.invalidateSize();
		}
	}

	function syncMapState() {
		if (!MapperInstance.map) return;
		if (selectedLocation) {
			updateMapWithLocation(selectedLocation);
		} else {
			clearActiveLayer();
		}
		if (crashes.length > 0) {
			updateNearbyMarkers(crashes);
		} else if (markerLayerGroup) {
			markerLayerGroup.clearLayers();
		}
	}

	// React to location changes only
	$effect(() => {
		const loc = selectedLocation;
		if (!MapperInstance.map) return;
		if (loc) {
			updateMapWithLocation(loc);
		} else {
			clearActiveLayer();
			if (mapCircleLayer && MapperInstance.map) {
				MapperInstance.map.removeLayer(mapCircleLayer);
				mapCircleLayer = null;
			}
		}
	});

	// React to distance filter changes without recentering
	$effect(() => {
		if (
			selectedLocation &&
			(selectedLocation.category === 'intersection' || selectedLocation.isPoint) &&
			maxDistance
		) {
			updateSearchRadius();
		} else if (mapCircleLayer && MapperInstance.map) {
			MapperInstance.map.removeLayer(mapCircleLayer);
			mapCircleLayer = null;
		}
	});

	// React to crash result changes
	$effect(() => {
		if (crashes.length > 0) {
			updateNearbyMarkers(crashes);
		} else if (markerLayerGroup) {
			markerLayerGroup.clearLayers();
			fitToCrashes([]);
		}
	});

	onMount(() => {
		let destroyed = false;
		(async () => {
			await initMap();
			if (destroyed) return;
			syncMapState();
			requestAnimationFrame(() => {
				MapperInstance.map?.invalidateSize();
			});
		})();

		// Return cleanup function for Svelte to run when unmounting
		return () => {
			destroyed = true;
			MapperInstance.destroy();
		};
	});
</script>

<div id="map"></div>

<style>
	/* Leaflet requires a height to be set explicitly — cannot use Tailwind utilities on Leaflet-injected elements */
	:global(#map) {
		height: 24rem; /* h-96 */
		width: 100%; /* w-full */
		border-radius: 0.375rem; /* rounded-md */
		border-width: 1px;
		border-color: rgb(229 231 235); /* border-gray-200 */
		box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); /* shadow-sm */
		margin-bottom: 1rem; /* mb-4 */
		z-index: 0;
	}

	/* Crash markers — injected by Leaflet outside Svelte scope, must be :global */
	:global(.marker-icon) {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: #6d28d9; /* purple-700 */
		color: #fff;
		font-size: 11px;
		font-weight: 700;
		line-height: 1;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
	}

	:global(.marker-icon.fatal) {
		background: #dc2626; /* red-600 */
	}

	/* Rich popup content — Leaflet injects popups outside Svelte scope */
	:global(.popup-content) {
		min-width: 200px;
		line-height: 1.4;
	}

	:global(.popup-content a:hover) {
		text-decoration: underline;
	}
</style>
