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

	const MapperInstance = new Mapper();

	let activeMarker: import('leaflet').Layer | null = null;
	let mapCircleLayer: any = null;
	let markerLayerGroup: any = null;
	let heatLayer: any = null;
	let markerMap = new Map<string, import('leaflet').Marker>();

	function dotIconHtml(isFatal: boolean) {
		const color = isFatal ? '#dc2626' : '#eab308';
		return `<div class="marker-dot" style="background:${color}"></div>`;
	}

	async function initMap() {
		await MapperInstance.init('map', defaultGeoCenter, 11);

		if (MapperInstance.L && MapperInstance.map) {
			// Import heat plugin (adds L.heatLayer)
			await import('leaflet.heat');
			markerLayerGroup = MapperInstance.L.layerGroup().addTo(MapperInstance.map);

			// Scale dots based on zoom: small/borderless when zoomed out, full when zoomed in
			MapperInstance.map.on('zoomend', updateDotScale);
			updateDotScale();
		}
	}

	function updateDotScale() {
		if (!MapperInstance.map) return;
		const mapEl = document.getElementById('map');
		if (!mapEl) return;
		const zoom = MapperInstance.map.getZoom();
		mapEl.classList.toggle('zoom-far', zoom < 14);
		mapEl.classList.toggle('zoom-mid', zoom >= 14 && zoom < 16);

		// Hide heatmap when zoomed in enough to see individual dots
		if (heatLayer) {
			if (zoom >= 14) {
				MapperInstance.map.removeLayer(heatLayer);
			} else if (!MapperInstance.map.hasLayer(heatLayer)) {
				MapperInstance.map.addLayer(heatLayer);
			}
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

	// Jitter marker positions so overlapping dots spread out visually.
	// ~0.0003 degrees ≈ 30 meters — enough to scatter at zoomed-out views
	// but negligible at street level.
	function jitter(coord: number): number {
		return coord + (Math.random() - 0.5) * 0.0006;
	}

	export function updateNearbyMarkers(items: Crash[]) {
		if (!MapperInstance.map || !MapperInstance.L || !markerLayerGroup) return;

		markerLayerGroup.clearLayers();
		markerMap.clear();

		// Remove old heat layer
		if (heatLayer && MapperInstance.map) {
			MapperInstance.map.removeLayer(heatLayer);
			heatLayer = null;
		}

		// Build heatmap data using exact positions for accurate density
		const heatData: [number, number, number][] = [];

		items.forEach((item) => {
			const lat = item.latitude;
			const lon = item.longitude;

			if (!isNaN(lat) && !isNaN(lon) && (lat !== 0 || lon !== 0)) {
				// Heatmap uses exact coords
				heatData.push([lat, lon, item.isFatal ? 1.0 : 0.4]);

				// Dot marker uses jittered coords so overlapping crashes spread out
				const popup = popupHtml(item);
				const icon = MapperInstance.L!.divIcon({
					html: dotIconHtml(item.isFatal),
					className: '',
					iconSize: [10, 10],
					iconAnchor: [5, 5]
				});
				const crashMarker = MapperInstance.L!.marker([jitter(lat), jitter(lon)], {
					icon
				}).bindPopup(popup, {
					maxWidth: 280
				});

				crashMarker.on('click', () => setCrashDetail(item));
				crashMarker.addTo(markerLayerGroup);
				markerMap.set(item.crash_record_id, crashMarker);
			}
		});

		// Create heat layer
		if (heatData.length > 0) {
			// @ts-ignore - L.heatLayer added by leaflet.heat plugin
			heatLayer = MapperInstance.L.heatLayer(heatData, {
				radius: 25,
				blur: 18,
				maxZoom: 15,
				max: 0.6,
				minOpacity: 0.2,
				gradient: {
					0.0: 'rgba(254, 249, 195, 0.4)',
					0.2: 'rgba(253, 224, 71, 0.6)',
					0.4: '#facc15',
					0.6: '#eab308',
					0.8: '#ca8a04',
					1.0: '#a16207'
				}
			}).addTo(MapperInstance.map);
		}

		fitToCrashes(items);
	}

	export function openCrashPopup(crashId: string) {
		if (!MapperInstance.map) return;
		const marker = markerMap.get(crashId);
		if (!marker) return;

		// Zoom in close enough to see the marker, then open popup
		const latlng = marker.getLatLng();
		const currentZoom = MapperInstance.map.getZoom();
		if (currentZoom < 15) {
			MapperInstance.map.setView(latlng, 16, { animate: true });
			setTimeout(() => marker.openPopup(), 350);
		} else {
			MapperInstance.map.panTo(latlng, { animate: true });
			setTimeout(() => marker.openPopup(), 200);
		}
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
		} else if (markerLayerGroup) {
			markerLayerGroup.clearLayers();
			if (heatLayer && MapperInstance.map) {
				MapperInstance.map.removeLayer(heatLayer);
				heatLayer = null;
			}
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

	/* Dot markers — default (zoomed in, zoom 16+) */
	:global(.marker-dot) {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 2px solid rgba(0, 0, 0, 0.6);
		box-shadow:
			0 0 0 2px rgba(255, 255, 255, 0.7),
			0 1px 4px rgba(0, 0, 0, 0.3);
		transition:
			width 150ms,
			height 150ms,
			border 150ms,
			box-shadow 150ms;
	}

	/* Zoomed out (< 14): tiny dots, no border, let heatmap dominate */
	:global(.zoom-far .marker-dot) {
		width: 5px;
		height: 5px;
		border: none;
		box-shadow: none;
		opacity: 0.7;
	}

	/* Mid zoom (14-15): medium dots with stroke */
	:global(.zoom-mid .marker-dot) {
		width: 9px;
		height: 9px;
		border: 1.5px solid rgba(0, 0, 0, 0.5);
		box-shadow:
			0 0 0 1.5px rgba(255, 255, 255, 0.6),
			0 1px 3px rgba(0, 0, 0, 0.25);
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
