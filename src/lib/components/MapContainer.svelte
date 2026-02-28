<script lang="ts">
	import { onMount } from 'svelte';
	import { Mapper } from '$lib/mapping';
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
	let clusterGroup: any = null;
	let markerMap = new Map<string, import('leaflet').Marker>();

	function dotIconHtml(isFatal: boolean) {
		const color = isFatal ? '#dc2626' : '#6d28d9';
		return `<div class="marker-dot" style="background:${color}"></div>`;
	}

	async function initMap() {
		await MapperInstance.init('map', defaultGeoCenter, 11);

		if (MapperInstance.L && MapperInstance.map) {
			// Dynamically import markercluster
			await import('leaflet.markercluster');
			// @ts-ignore - markerClusterGroup is added to L by the plugin
			clusterGroup = MapperInstance.L.markerClusterGroup({
				maxClusterRadius: 40,
				spiderfyOnMaxZoom: true,
				showCoverageOnHover: false,
				iconCreateFunction: (cluster: any) => {
					const children: import('leaflet').Marker[] = cluster.getAllChildMarkers();
					const hasFatal = children.some((m: any) => m.options._isFatal);
					const count = cluster.getChildCount();
					const bg = hasFatal ? '#dc2626' : '#6d28d9';
					const size = count < 10 ? 28 : count < 100 ? 32 : 36;
					return MapperInstance.L!.divIcon({
						html: `<div class="marker-cluster-icon" style="background:${bg};width:${size}px;height:${size}px">${count}</div>`,
						className: '',
						iconSize: [size, size],
						iconAnchor: [size / 2, size / 2]
					});
				}
			});
			clusterGroup.addTo(MapperInstance.map);
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

		const renderAsShape = location.isShape;
		if (renderAsShape) {
			if (mapCircleLayer && MapperInstance.map) {
				MapperInstance.map.removeLayer(mapCircleLayer);
				mapCircleLayer = null;
			}
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
		if (!MapperInstance.map || !MapperInstance.L || !clusterGroup) return;

		clusterGroup.clearLayers();
		markerMap.clear();

		items.forEach((item) => {
			const lat = item.latitude;
			const lon = item.longitude;

			if (!isNaN(lat) && !isNaN(lon)) {
				const popup = popupHtml(item);
				const icon = MapperInstance.L!.divIcon({
					html: dotIconHtml(item.isFatal),
					className: '',
					iconSize: [12, 12],
					iconAnchor: [6, 6]
				});
				const crashMarker = MapperInstance.L!.marker([lat, lon], {
					icon,
					// @ts-ignore - custom option for cluster icon coloring
					_isFatal: item.isFatal
				}).bindPopup(popup, {
					maxWidth: 280
				});

				crashMarker.on('click', () => setCrashDetail(item));

				clusterGroup.addLayer(crashMarker);
				markerMap.set(item.crash_record_id, crashMarker);
			}
		});

		fitToCrashes(items);
	}

	export function openCrashPopup(crashId: string) {
		if (!MapperInstance.map || !clusterGroup) return;
		const marker = markerMap.get(crashId);
		if (!marker) return;

		// Zoom to the marker and spiderfy its cluster if needed
		clusterGroup.zoomToShowLayer(marker, () => {
			marker.openPopup();
		});
	}

	export function fitToCrashes(items: Crash[]) {
		if (!MapperInstance.map || !MapperInstance.L) return;

		const validLatLngs: import('leaflet').LatLngExpression[] = items
			.filter(
				(item) =>
					!isNaN(item.latitude) &&
					!isNaN(item.longitude) &&
					(item.latitude !== 0 || item.longitude !== 0)
			)
			.map((item) => [item.latitude, item.longitude]);

		if (validLatLngs.length > 0) {
			if (selectedLocation?.isShape && activeMarker && 'getBounds' in activeMarker) {
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
			if (selectedLocation.isShape && activeMarker && 'getBounds' in activeMarker) {
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
		} else if (clusterGroup) {
			clusterGroup.clearLayers();
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
		if (selectedLocation && selectedLocation.isPoint && maxDistance) {
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
		} else if (clusterGroup) {
			clusterGroup.clearLayers();
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

		return () => {
			destroyed = true;
			MapperInstance.destroy();
		};
	});
</script>

<div id="map"></div>

<style>
	/* Leaflet requires a height to be set explicitly */
	:global(#map) {
		height: 24rem;
		width: 100%;
		border-radius: 0.375rem;
		border-width: 1px;
		border-color: rgb(229 231 235);
		box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
		margin-bottom: 1rem;
		z-index: 0;
	}

	/* Dot markers */
	:global(.marker-dot) {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 2px solid #fff;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
	}

	/* Cluster icons */
	:global(.marker-cluster-icon) {
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		color: #fff;
		font-size: 12px;
		font-weight: 700;
		line-height: 1;
		border: 2px solid rgba(255, 255, 255, 0.8);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
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
