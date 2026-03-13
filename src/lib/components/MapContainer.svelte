<script lang="ts">
	import { onMount } from 'svelte';
	import { Mapper, type MapLibreMarker, type MapLibrePopup } from '$lib/mapping';
	import { Location } from '$lib/location';
	import type { BriefCrash } from '$lib/models/types';
	import { briefPopupHtml } from '$lib/models/crashFormat';
	import { SEVERITY_COLORS } from '$lib/constants';

	let {
		selectedLocation = null,
		crashes,
		defaultGeoCenter,
		maxDistance = 5280,
		fitPadding = 50
	} = $props<{
		selectedLocation?: Location | null;
		crashes: BriefCrash[];
		defaultGeoCenter: [number, number];
		maxDistance?: number;
		fitPadding?: number;
	}>();

	const MapperInstance = new Mapper();
	const SELECTED_SOURCE_ID = 'selected-location';
	const SEARCH_RADIUS_SOURCE_ID = 'search-radius';
	const CRASH_HEAT_SOURCE_ID = 'crash-heat';
	const CRASH_HEAT_LAYER_ID = 'crash-heat-layer';

	type Bounds = [[number, number], [number, number]];
	type CrashMarkerEntry = {
		marker: MapLibreMarker;
		popup: MapLibrePopup | null;
		coordinates: [number, number];
	};

	let mapHost: HTMLDivElement | null = $state(null);
	let activeLocationMarker: MapLibreMarker | null = null;
	let activeLocationPopup: MapLibrePopup | null = null;
	let activeLocationBounds: Bounds | null = null;
	let crashMarkers = new Map<string, CrashMarkerEntry>();
	let pendingCrashPopupId: string | null = null;

	function emptyFeatureCollection() {
		return {
			type: 'FeatureCollection',
			features: []
		} as import('geojson').FeatureCollection;
	}

	function setMapDataset(name: string, value: string) {
		if (mapHost) {
			mapHost.dataset[name] = value;
		}
	}

	function setGeoJSONSourceData(sourceId: string, data: import('geojson').FeatureCollection) {
		const source = MapperInstance.map?.getSource(sourceId) as
			| {
					setData(nextData: import('geojson').FeatureCollection): void;
			  }
			| undefined;
		source?.setData(data);
	}

	function dotIconHtml(isFatal: boolean) {
		const color = isFatal ? SEVERITY_COLORS.fatal : SEVERITY_COLORS.minor;
		return `<div class="marker-dot" style="background:${color}"></div>`;
	}

	function createCrashMarkerElement(isFatal: boolean) {
		const element = document.createElement('div');
		element.innerHTML = dotIconHtml(isFatal);
		const marker = element.firstElementChild as HTMLDivElement;
		marker.style.cursor = 'pointer';
		return marker;
	}

	async function initMap() {
		if (!mapHost) return;

		await MapperInstance.init(mapHost, defaultGeoCenter, 11);
		if (!MapperInstance.map) return;

		MapperInstance.map.addSource(SELECTED_SOURCE_ID, {
			type: 'geojson',
			data: emptyFeatureCollection()
		});
		MapperInstance.map.addLayer({
			id: `${SELECTED_SOURCE_ID}-fill`,
			type: 'fill',
			source: SELECTED_SOURCE_ID,
			filter: ['match', ['geometry-type'], ['Polygon', 'MultiPolygon'], true, false],
			paint: {
				'fill-color': ['coalesce', ['get', 'fillColor'], '#4455bb'],
				'fill-opacity': ['coalesce', ['get', 'fillOpacity'], 0.4]
			}
		});
		MapperInstance.map.addLayer({
			id: `${SELECTED_SOURCE_ID}-line`,
			type: 'line',
			source: SELECTED_SOURCE_ID,
			paint: {
				'line-color': ['coalesce', ['get', 'lineColor'], '#4455bb'],
				'line-width': ['coalesce', ['get', 'lineWidth'], 1],
				'line-opacity': ['coalesce', ['get', 'lineOpacity'], 0.8]
			}
		});

		MapperInstance.map.addSource(SEARCH_RADIUS_SOURCE_ID, {
			type: 'geojson',
			data: emptyFeatureCollection()
		});
		MapperInstance.map.addLayer({
			id: `${SEARCH_RADIUS_SOURCE_ID}-fill`,
			type: 'fill',
			source: SEARCH_RADIUS_SOURCE_ID,
			paint: {
				'fill-color': ['coalesce', ['get', 'color'], '#3c80ff'],
				'fill-opacity': ['coalesce', ['get', 'opacity'], 0.1]
			}
		});
		MapperInstance.map.addLayer({
			id: `${SEARCH_RADIUS_SOURCE_ID}-line`,
			type: 'line',
			source: SEARCH_RADIUS_SOURCE_ID,
			paint: {
				'line-color': ['coalesce', ['get', 'color'], '#3c80ff'],
				'line-width': 1,
				'line-opacity': 0.75
			}
		});

		MapperInstance.map.addSource(CRASH_HEAT_SOURCE_ID, {
			type: 'geojson',
			data: emptyFeatureCollection()
		});
		MapperInstance.map.addLayer({
			id: CRASH_HEAT_LAYER_ID,
			type: 'heatmap',
			source: CRASH_HEAT_SOURCE_ID,
			maxzoom: 15,
			paint: {
				'heatmap-weight': ['coalesce', ['get', 'weight'], 0.4],
				'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.45, 13, 1.2],
				'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 10, 13, 25, 15, 32],
				'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.25, 13, 0.55, 15, 0.2],
				'heatmap-color': [
					'interpolate',
					['linear'],
					['heatmap-density'],
					0,
					'rgba(254, 249, 195, 0)',
					0.2,
					'rgba(253, 224, 71, 0.6)',
					0.4,
					'#facc15',
					0.6,
					'#eab308',
					0.8,
					'#ca8a04',
					1,
					'#a16207'
				]
			}
		});

		MapperInstance.map.on('zoomend', updateDotScale);
		updateDotScale();
		setMapDataset('mapReady', 'true');
	}

	function updateDotScale() {
		if (!MapperInstance.map || !mapHost) return;
		const zoom = MapperInstance.map.getZoom();
		mapHost.classList.toggle('zoom-far', zoom < 14);
		mapHost.classList.toggle('zoom-mid', zoom >= 14 && zoom < 16);
		MapperInstance.map.setLayoutProperty(
			CRASH_HEAT_LAYER_ID,
			'visibility',
			zoom >= 14 ? 'none' : 'visible'
		);
	}

	function clearCrashMarkers() {
		for (const entry of crashMarkers.values()) {
			entry.popup?.remove();
			entry.marker.remove();
		}
		crashMarkers.clear();
		setMapDataset('crashCount', '0');
	}

	function clearActiveLayer() {
		activeLocationPopup?.remove();
		activeLocationMarker?.remove();
		activeLocationPopup = null;
		activeLocationMarker = null;
		activeLocationBounds = null;
		setGeoJSONSourceData(SELECTED_SOURCE_ID, emptyFeatureCollection());
		setMapDataset('activeLocationKind', 'none');
	}

	function updateSearchRadius() {
		if (!selectedLocation || !selectedLocation.isPoint) {
			setGeoJSONSourceData(SEARCH_RADIUS_SOURCE_ID, emptyFeatureCollection());
			return;
		}

		const radiusInMeters = maxDistance * 0.3048;
		const feature = MapperInstance.makeMapCircleFeature(
			selectedLocation.longitude,
			selectedLocation.latitude,
			radiusInMeters
		);
		setGeoJSONSourceData(SEARCH_RADIUS_SOURCE_ID, MapperInstance.makeFeatureCollection([feature]));
	}

	export function updateMapWithLocation(location: Location) {
		if (!MapperInstance.map || !MapperInstance.maplibre) return;

		clearActiveLayer();
		MapperInstance.setView([location.latitude, location.longitude], 16, { animate: false });

		if (location.isShape) {
			const feature = MapperInstance.makeShapeFeature(location);
			const paint = MapperInstance.getLocationPaint(location.category);
			const styledFeature = {
				...feature,
				properties: {
					...feature.properties,
					...paint
				}
			};

			activeLocationBounds = MapperInstance.getFeatureBounds(styledFeature);
			setGeoJSONSourceData(
				SELECTED_SOURCE_ID,
				MapperInstance.makeFeatureCollection([styledFeature])
			);
			setMapDataset('activeLocationKind', 'shape');
		} else {
			const popup = MapperInstance.createPopup(location.name, '220px');
			const selectedPointElement = document.createElement('div');
			selectedPointElement.style.width = '20px';
			selectedPointElement.style.height = '20px';
			selectedPointElement.style.borderRadius = '9999px';
			selectedPointElement.style.background = '#2563eb';
			selectedPointElement.style.border = '3px solid rgba(255, 255, 255, 0.92)';
			selectedPointElement.style.boxShadow = '0 2px 6px rgba(15, 23, 42, 0.25)';
			selectedPointElement.style.cursor = 'pointer';
			const marker = new MapperInstance.maplibre.Marker({
				element: selectedPointElement,
				anchor: 'center'
			})
				.setLngLat([location.longitude, location.latitude])
				.addTo(MapperInstance.map);

			if (popup) {
				marker.setPopup(popup);
				popup.setLngLat([location.longitude, location.latitude]).addTo(MapperInstance.map);
			}

			activeLocationMarker = marker;
			activeLocationPopup = popup;
			activeLocationBounds = MapperInstance.getPointsBounds([
				[location.latitude, location.longitude]
			]);
			setMapDataset('activeLocationKind', 'point');
		}

		updateSearchRadius();
	}

	function jitter(coord: number): number {
		return coord + (Math.random() - 0.5) * 0.0006;
	}

	export function updateNearbyMarkers(items: BriefCrash[]) {
		if (!MapperInstance.map || !MapperInstance.maplibre) return;

		clearCrashMarkers();
		const heatFeatures: Array<import('geojson').Feature> = [];

		for (const item of items) {
			const lat = item.latitude;
			const lon = item.longitude;
			const isFatal = item.injuries_fatal > 0;

			if (
				lat == null ||
				lon == null ||
				Number.isNaN(lat) ||
				Number.isNaN(lon) ||
				(lat === 0 && lon === 0)
			) {
				continue;
			}

			heatFeatures.push({
				type: 'Feature',
				properties: {
					weight: isFatal ? 1.0 : 0.4
				},
				geometry: {
					type: 'Point',
					coordinates: [lon, lat]
				}
			});

			const popup = MapperInstance.createPopup(briefPopupHtml(item));
			const coordinates: [number, number] = [jitter(lon), jitter(lat)];
			const marker = new MapperInstance.maplibre.Marker({
				element: createCrashMarkerElement(isFatal),
				anchor: 'center'
			})
				.setLngLat(coordinates)
				.addTo(MapperInstance.map);

			if (popup) {
				marker.setPopup(popup);
			}

			crashMarkers.set(item.crash_record_id, {
				marker,
				popup,
				coordinates
			});
		}

		setGeoJSONSourceData(
			CRASH_HEAT_SOURCE_ID,
			MapperInstance.makeFeatureCollection(heatFeatures as import('geojson').Feature[])
		);
		setMapDataset('crashCount', String(crashMarkers.size));

		fitToCrashes(items);

		if (pendingCrashPopupId && crashMarkers.has(pendingCrashPopupId)) {
			const pendingId = pendingCrashPopupId;
			pendingCrashPopupId = null;
			openCrashPopup(pendingId);
		}
	}

	export function openCrashPopup(crashId: string) {
		if (!MapperInstance.map) return;
		const marker = crashMarkers.get(crashId);
		if (!marker) {
			pendingCrashPopupId = crashId;
			return;
		}
		pendingCrashPopupId = null;

		const [lng, lat] = marker.coordinates;
		const currentZoom = MapperInstance.map.getZoom();
		marker.popup?.remove();
		marker.popup?.setLngLat(marker.coordinates).addTo(MapperInstance.map);
		if (currentZoom < 15) {
			MapperInstance.setView([lat, lng], 16);
		} else {
			MapperInstance.panTo([lat, lng]);
		}
	}

	export function fitToCrashes(items: BriefCrash[]) {
		if (!MapperInstance.map) return;

		const validLatLngs = items
			.filter(
				(item) =>
					item.latitude != null &&
					item.longitude != null &&
					!Number.isNaN(item.latitude) &&
					!Number.isNaN(item.longitude) &&
					(item.latitude !== 0 || item.longitude !== 0)
			)
			.map((item) => [item.latitude, item.longitude] as [number, number]);

		if (validLatLngs.length > 0) {
			let bounds = MapperInstance.getPointsBounds(validLatLngs);

			if (selectedLocation?.isShape) {
				bounds = MapperInstance.extendBounds(bounds, activeLocationBounds);
			} else if (
				selectedLocation &&
				selectedLocation.latitude !== 0 &&
				selectedLocation.longitude !== 0
			) {
				bounds = MapperInstance.extendBounds(
					bounds,
					MapperInstance.getPointsBounds([[selectedLocation.latitude, selectedLocation.longitude]])
				);
			}

			if (bounds) {
				MapperInstance.fitBounds(bounds, selectedLocation?.isShape ? 40 : fitPadding);
			}
			MapperInstance.resize();
		} else if (selectedLocation) {
			if (selectedLocation.isShape && activeLocationBounds) {
				MapperInstance.fitBounds(activeLocationBounds, 40);
			} else {
				MapperInstance.setView([selectedLocation.latitude, selectedLocation.longitude], 16, {
					animate: false
				});
			}
			MapperInstance.resize();
		}
	}

	export function scrollIntoView() {
		mapHost?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}

	function syncMapState() {
		if (!MapperInstance.map) return;
		if (selectedLocation) {
			updateMapWithLocation(selectedLocation);
		} else {
			clearActiveLayer();
			updateSearchRadius();
		}
		if (crashes.length > 0) {
			updateNearbyMarkers(crashes);
		} else {
			clearCrashMarkers();
			setGeoJSONSourceData(CRASH_HEAT_SOURCE_ID, emptyFeatureCollection());
		}
	}

	$effect(() => {
		const loc = selectedLocation;
		if (!MapperInstance.map) return;
		if (loc) {
			updateMapWithLocation(loc);
		} else {
			clearActiveLayer();
			updateSearchRadius();
		}
	});

	$effect(() => {
		if (!MapperInstance.map) return;
		updateSearchRadius();
	});

	$effect(() => {
		if (!MapperInstance.map) return;
		if (crashes.length > 0) {
			updateNearbyMarkers(crashes);
		} else {
			clearCrashMarkers();
			setGeoJSONSourceData(CRASH_HEAT_SOURCE_ID, emptyFeatureCollection());
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
				MapperInstance.resize();
			});
		})();

		return () => {
			destroyed = true;
			clearCrashMarkers();
			clearActiveLayer();
			MapperInstance.destroy();
		};
	});
</script>

<div
	class="map-root"
	bind:this={mapHost}
	data-map-ready="false"
	data-active-location-kind="none"
	data-crash-count="0"
></div>

<style>
	.map-root {
		height: 24rem;
		width: 100%;
		border-radius: 0.375rem;
		border-width: 1px;
		border-color: rgb(229 231 235);
		box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
		margin-bottom: 1rem;
		z-index: 0;
	}

	:global(.marker-dot) {
		width: 15px;
		height: 15px;
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

	:global(.zoom-far .marker-dot) {
		width: 5px;
		height: 5px;
		border: none;
		box-shadow: none;
		opacity: 0.7;
	}

	:global(.zoom-mid .marker-dot) {
		width: 11px;
		height: 11px;
		border: 1.5px solid rgba(0, 0, 0, 0.5);
		box-shadow:
			0 0 0 1.5px rgba(255, 255, 255, 0.6),
			0 1px 3px rgba(0, 0, 0, 0.25);
	}

	:global(.popup-content) {
		min-width: 200px;
		line-height: 1.4;
	}

	:global(.popup-content a:hover) {
		text-decoration: underline;
	}
</style>
