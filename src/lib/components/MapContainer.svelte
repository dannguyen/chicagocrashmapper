<script lang="ts">
	import { onMount } from 'svelte';
	import { Mapper, type MapLibreMarker, type MapLibrePopup } from '$lib/mapping';
	import { Location } from '$lib/location';
	import type { BriefCrash } from '$lib/models/briefCrash';
	import { briefPopupHtml } from '$lib/models/crashFormat';
	import { CHICAGO_CENTER, SEVERITY_COLORS } from '$lib/constants';

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
	const CRASH_HEX_SOURCE_ID = 'crash-hexes';
	const CRASH_HEX_FILL_LAYER_ID = 'crash-hexes-fill';
	const CRASH_HEX_LINE_LAYER_ID = 'crash-hexes-line';
	const HEX_TO_HEATMAP_CUTOFF = 12.7;
	const HEATMAP_TO_POINTS_CUTOFF = 13;
	const HEX_RADIUS_LARGE_METERS = 900;
	const HEX_RADIUS_MEDIUM_METERS = 600;
	const HEX_RADIUS_SMALL_METERS = 350;
	const HEX_RADIUS_TINY_METERS = 175;
	const METERS_PER_DEGREE_LATITUDE = 111320;
	const METERS_PER_DEGREE_LONGITUDE =
		METERS_PER_DEGREE_LATITUDE * Math.cos((CHICAGO_CENTER[0] * Math.PI) / 180);

	type Bounds = [[number, number], [number, number]];
	type CrashMarkerEntry = {
		element: HTMLDivElement;
		isFatal: boolean;
		marker: MapLibreMarker;
		popup: MapLibrePopup | null;
		coordinates: [number, number];
	};
	type HexBin = {
		q: number;
		r: number;
		count: number;
	};

	let mapHost: HTMLDivElement | null = $state(null);
	let activeLocationMarker: MapLibreMarker | null = null;
	let activeLocationPopup: MapLibrePopup | null = null;
	let activeLocationBounds: Bounds | null = null;
	let crashMarkers = new Map<string, CrashMarkerEntry>();
	let pendingCrashPopupId: string | null = null;
	let activeHexRadiusMeters: number | null = null;
	let resizeTimeoutId: ReturnType<typeof setTimeout> | null = null;

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

	function setLayerVisibility(layerId: string, visible: boolean) {
		if (!MapperInstance.map?.getLayer(layerId)) return;
		MapperInstance.map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
	}

	function hexRound(q: number, r: number): [number, number] {
		let x = q;
		let z = r;
		let y = -x - z;

		let rx = Math.round(x);
		let ry = Math.round(y);
		let rz = Math.round(z);

		const xDiff = Math.abs(rx - x);
		const yDiff = Math.abs(ry - y);
		const zDiff = Math.abs(rz - z);

		if (xDiff > yDiff && xDiff > zDiff) {
			rx = -ry - rz;
		} else if (yDiff > zDiff) {
			ry = -rx - rz;
		} else {
			rz = -rx - ry;
		}

		return [rx, rz];
	}

	function toProjectedMeters(longitude: number, latitude: number): [number, number] {
		return [
			(longitude - CHICAGO_CENTER[1]) * METERS_PER_DEGREE_LONGITUDE,
			(latitude - CHICAGO_CENTER[0]) * METERS_PER_DEGREE_LATITUDE
		];
	}

	function toLngLatFromMeters(x: number, y: number): [number, number] {
		return [
			CHICAGO_CENTER[1] + x / METERS_PER_DEGREE_LONGITUDE,
			CHICAGO_CENTER[0] + y / METERS_PER_DEGREE_LATITUDE
		];
	}

	function hexKey(longitude: number, latitude: number, radiusMeters: number): string {
		const [x, y] = toProjectedMeters(longitude, latitude);
		const q = ((Math.sqrt(3) / 3) * x - y / 3) / radiusMeters;
		const r = ((2 / 3) * y) / radiusMeters;
		const [roundedQ, roundedR] = hexRound(q, r);
		return `${roundedQ},${roundedR}`;
	}

	function hexCenter(q: number, r: number, radiusMeters: number): [number, number] {
		const x = radiusMeters * Math.sqrt(3) * (q + r / 2);
		const y = radiusMeters * 1.5 * r;
		return toLngLatFromMeters(x, y);
	}

	function hexPolygon(longitude: number, latitude: number, radiusMeters: number): number[][] {
		const corners: number[][] = [];
		for (let cornerIndex = 0; cornerIndex < 6; cornerIndex += 1) {
			const angle = (Math.PI / 180) * (60 * cornerIndex - 30);
			const x = Math.cos(angle) * radiusMeters;
			const y = Math.sin(angle) * radiusMeters;
			corners.push(
				toLngLatFromMeters(
					(longitude - CHICAGO_CENTER[1]) * METERS_PER_DEGREE_LONGITUDE + x,
					(latitude - CHICAGO_CENTER[0]) * METERS_PER_DEGREE_LATITUDE + y
				)
			);
		}
		corners.push(corners[0]);
		return corners;
	}

	function getHexRadiusForZoom(zoom: number): number | null {
		if (zoom >= HEX_TO_HEATMAP_CUTOFF) return null;
		if (zoom < 10.3) return HEX_RADIUS_LARGE_METERS;
		if (zoom < 11.6) return HEX_RADIUS_MEDIUM_METERS;
		if (zoom < 12.2) return HEX_RADIUS_SMALL_METERS;
		return HEX_RADIUS_TINY_METERS;
	}

	function buildHexFeatures(items: BriefCrash[], radiusMeters: number) {
		const bins = new Map<string, HexBin>();

		for (const item of items) {
			const lat = item.latitude;
			const lon = item.longitude;
			if (
				lat == null ||
				lon == null ||
				Number.isNaN(lat) ||
				Number.isNaN(lon) ||
				(lat === 0 && lon === 0)
			) {
				continue;
			}

			const key = hexKey(lon, lat, radiusMeters);
			const existing = bins.get(key);
			if (existing) {
				existing.count += 1;
				continue;
			}

			const [q, r] = key.split(',').map(Number);
			bins.set(key, { q, r, count: 1 });
		}

		const maxCount = Math.max(1, ...Array.from(bins.values(), (bin) => bin.count));

		return Array.from(bins.values(), (bin) => {
			const [centerLng, centerLat] = hexCenter(bin.q, bin.r, radiusMeters);
			return {
				type: 'Feature',
				properties: {
					count: bin.count,
					densityRatio: bin.count / maxCount
				},
				geometry: {
					type: 'Polygon',
					coordinates: [hexPolygon(centerLng, centerLat, radiusMeters)]
				}
			} as import('geojson').Feature;
		});
	}

	function updateHexBins(items: BriefCrash[]) {
		if (!MapperInstance.map) return;
		const zoom = MapperInstance.map.getZoom();
		const nextHexRadiusMeters = getHexRadiusForZoom(zoom);
		if (nextHexRadiusMeters == null) {
			activeHexRadiusMeters = null;
			setGeoJSONSourceData(CRASH_HEX_SOURCE_ID, emptyFeatureCollection());
			return;
		}

		if (activeHexRadiusMeters === nextHexRadiusMeters && crashMarkers.size > 0) {
			return;
		}

		activeHexRadiusMeters = nextHexRadiusMeters;
		setGeoJSONSourceData(
			CRASH_HEX_SOURCE_ID,
			MapperInstance.makeFeatureCollection(buildHexFeatures(items, nextHexRadiusMeters))
		);
	}

	function dotIconHtml(color: string) {
		return `<div class="marker-dot" style="background:${color}"></div>`;
	}

	function createCrashMarkerElement(color: string) {
		const element = document.createElement('div');
		element.innerHTML = dotIconHtml(color);
		const marker = element.firstElementChild as HTMLDivElement;
		marker.style.cursor = 'pointer';
		return marker;
	}

	function updateMarkerVisibility() {
		if (!MapperInstance.map || !mapHost) return;
		const zoom = MapperInstance.map.getZoom();
		const showFatalOverlay = zoom < HEATMAP_TO_POINTS_CUTOFF;
		const showAllPoints = zoom >= HEATMAP_TO_POINTS_CUTOFF;

		mapHost.classList.toggle('zoom-fatal-overlay', showFatalOverlay);
		mapHost.classList.toggle('zoom-full-points', showAllPoints);

		for (const entry of crashMarkers.values()) {
			const shouldShow = showAllPoints || entry.isFatal;
			entry.element.style.display = shouldShow ? 'block' : 'none';
			if (!shouldShow) {
				entry.popup?.remove();
			}
		}
	}

	async function initMap() {
		if (!mapHost) return;

		await MapperInstance.init(mapHost, defaultGeoCenter, 11);
		if (!MapperInstance.map) return;
		MapperInstance.map.dragPan.enable();
		MapperInstance.map.touchZoomRotate.enable();

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
		MapperInstance.map.addSource(CRASH_HEX_SOURCE_ID, {
			type: 'geojson',
			data: emptyFeatureCollection()
		});
		MapperInstance.map.addLayer({
			id: CRASH_HEAT_LAYER_ID,
			type: 'heatmap',
			source: CRASH_HEAT_SOURCE_ID,
			maxzoom: HEATMAP_TO_POINTS_CUTOFF,
			paint: {
				'heatmap-weight': ['coalesce', ['get', 'weight'], 1],
				'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 0.85, 13, 1.7, 15, 1.15],
				'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 18, 13, 30, 15, 38],
				'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.52, 13, 0.72, 15, 0.18],
				'heatmap-color': [
					'interpolate',
					['linear'],
					['heatmap-density'],
					0,
					'rgba(245, 238, 242, 0)',
					0.12,
					'rgba(223, 201, 212, 0.12)',
					0.24,
					'rgba(205, 170, 186, 0.24)',
					0.38,
					'rgba(183, 121, 146, 0.40)',
					0.56,
					'rgba(183, 121, 146, 0.58)',
					0.74,
					'#b77992',
					0.88,
					'#8f5b78',
					1,
					'#6b3d58'
				]
			}
		});
		MapperInstance.map.addLayer({
			id: CRASH_HEX_FILL_LAYER_ID,
			type: 'fill',
			source: CRASH_HEX_SOURCE_ID,
			maxzoom: 13.5,
			paint: {
				'fill-color': [
					'interpolate',
					['linear'],
					['coalesce', ['get', 'densityRatio'], 0],
					0,
					'rgba(228, 215, 222, 0.36)',
					0.2,
					'rgba(211, 163, 183, 0.5)',
					0.4,
					'rgba(183, 121, 146, 0.66)',
					0.65,
					'rgba(143, 91, 120, 0.8)',
					1,
					'rgba(95, 39, 69, 0.92)'
				],
				'fill-opacity': [
					'interpolate',
					['linear'],
					['coalesce', ['get', 'densityRatio'], 0],
					0,
					0.5,
					1,
					0.92
				],
				'fill-outline-color': 'rgba(255, 255, 255, 0.5)'
			}
		});
		MapperInstance.map.addLayer({
			id: CRASH_HEX_LINE_LAYER_ID,
			type: 'line',
			source: CRASH_HEX_SOURCE_ID,
			maxzoom: 13.5,
			paint: {
				'line-color': 'rgba(255, 255, 255, 0.52)',
				'line-width': ['interpolate', ['linear'], ['zoom'], 0, 0.8, 13.5, 0.4],
				'line-opacity': 0.7
			}
		});

		MapperInstance.map.on('zoomend', () => {
			updateDotScale();
			logZoomLevel();
		});
		updateDotScale();
		logZoomLevel();
		setMapDataset('mapReady', 'true');
	}

	function updateDotScale() {
		if (!MapperInstance.map || !mapHost) return;
		const zoom = MapperInstance.map.getZoom();
		const showHexes = zoom < HEX_TO_HEATMAP_CUTOFF;
		const showHeatmap = zoom >= HEX_TO_HEATMAP_CUTOFF && zoom < HEATMAP_TO_POINTS_CUTOFF;

		mapHost.classList.toggle('zoom-cluster', showHexes);
		mapHost.classList.toggle('zoom-heat', showHeatmap);
		mapHost.classList.toggle('zoom-mid', zoom >= HEATMAP_TO_POINTS_CUTOFF && zoom < 16);
		setLayerVisibility(CRASH_HEX_FILL_LAYER_ID, showHexes);
		setLayerVisibility(CRASH_HEX_LINE_LAYER_ID, showHexes);
		setLayerVisibility(CRASH_HEAT_LAYER_ID, showHeatmap);
		updateHexBins(crashes);
		updateMarkerVisibility();
	}

	function logZoomLevel() {
		if (!MapperInstance.map) return;
		console.log(`[MapContainer] zoom=${MapperInstance.map.getZoom().toFixed(2)}`);
	}

	function scheduleMapResize() {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				MapperInstance.resize();
				updateDotScale();
			});
		});
		if (resizeTimeoutId) {
			clearTimeout(resizeTimeoutId);
		}
		resizeTimeoutId = setTimeout(() => {
			MapperInstance.resize();
			updateDotScale();
		}, 120);
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

	function updateMapWithLocation(location: Location) {
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

	function deterministicUnit(seed: string): number {
		let hash = 2166136261;
		for (let index = 0; index < seed.length; index += 1) {
			hash ^= seed.charCodeAt(index);
			hash = Math.imul(hash, 16777619);
		}
		return (hash >>> 0) / 4294967295;
	}

	function jitter(coord: number, seed: string): number {
		return coord + (deterministicUnit(seed) - 0.5) * 0.0006;
	}

	function updateNearbyMarkers(items: BriefCrash[]) {
		if (!MapperInstance.map || !MapperInstance.maplibre) return;

		clearCrashMarkers();
		const heatFeatures: Array<import('geojson').Feature> = [];

		for (const item of items) {
			const lat = item.latitude;
			const lon = item.longitude;
			const isFatal = item.isFatal;
			const markerColor = isFatal
				? SEVERITY_COLORS.fatal
				: item.injuries_incapacitating > 0
					? SEVERITY_COLORS.serious
					: item.injuries_total > 0
						? SEVERITY_COLORS.minor
						: SEVERITY_COLORS.none;

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
					weight: 1
				},
				geometry: {
					type: 'Point',
					coordinates: [lon, lat]
				}
			});

			const popup = MapperInstance.createPopup(briefPopupHtml(item));
			const coordinates: [number, number] = [
				jitter(lon, `${item.crash_record_id}:lon`),
				jitter(lat, `${item.crash_record_id}:lat`)
			];
			const marker = new MapperInstance.maplibre.Marker({
				element: createCrashMarkerElement(markerColor),
				anchor: 'center'
			});
			const markerElement = marker.getElement() as HTMLDivElement;
			if (isFatal) {
				markerElement.classList.add('fatal-marker');
			}
			marker.setLngLat(coordinates).addTo(MapperInstance.map);

			if (popup) {
				marker.setPopup(popup);
			}

			crashMarkers.set(item.crash_record_id, {
				element: markerElement,
				isFatal,
				marker,
				popup,
				coordinates
			});
		}

		setGeoJSONSourceData(
			CRASH_HEAT_SOURCE_ID,
			MapperInstance.makeFeatureCollection(heatFeatures as import('geojson').Feature[])
		);
		activeHexRadiusMeters = null;
		updateHexBins(items);
		setMapDataset('crashCount', String(crashMarkers.size));
		updateMarkerVisibility();

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

	function fitToCrashes(items: BriefCrash[]) {
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
			setGeoJSONSourceData(CRASH_HEX_SOURCE_ID, emptyFeatureCollection());
			activeHexRadiusMeters = null;
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
			setGeoJSONSourceData(CRASH_HEX_SOURCE_ID, emptyFeatureCollection());
			activeHexRadiusMeters = null;
			fitToCrashes([]);
		}
	});

	onMount(() => {
		let destroyed = false;
		let resizeObserver: ResizeObserver | null = null;
		const handleViewportChange = () => {
			if (destroyed) return;
			scheduleMapResize();
		};

		window.addEventListener('resize', handleViewportChange);
		window.addEventListener('orientationchange', handleViewportChange);
		window.visualViewport?.addEventListener('resize', handleViewportChange);

		(async () => {
			await initMap();
			if (destroyed) return;
			if (mapHost) {
				resizeObserver = new ResizeObserver(() => {
					if (destroyed) return;
					scheduleMapResize();
				});
				resizeObserver.observe(mapHost);
				if (mapHost.parentElement) {
					resizeObserver.observe(mapHost.parentElement);
				}
			}
			syncMapState();
			scheduleMapResize();
		})();

		return () => {
			destroyed = true;
			if (resizeTimeoutId) {
				clearTimeout(resizeTimeoutId);
				resizeTimeoutId = null;
			}
			resizeObserver?.disconnect();
			window.removeEventListener('resize', handleViewportChange);
			window.removeEventListener('orientationchange', handleViewportChange);
			window.visualViewport?.removeEventListener('resize', handleViewportChange);
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
		touch-action: none;
		overscroll-behavior: contain;
		user-select: none;
		-webkit-user-select: none;
		-webkit-touch-callout: none;
	}

	:global(.map-root .maplibregl-canvas-container),
	:global(.map-root .maplibregl-canvas) {
		touch-action: none;
	}

	:global(.map-root .marker-dot) {
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

	:global(.zoom-mid .marker-dot) {
		width: 11px;
		height: 11px;
		border: 1.5px solid rgba(0, 0, 0, 0.5);
		box-shadow:
			0 0 0 1.5px rgba(255, 255, 255, 0.6),
			0 1px 3px rgba(0, 0, 0, 0.25);
	}

	:global(.zoom-fatal-overlay .fatal-marker) {
		width: 9px;
		height: 9px;
		border: 1.75px solid rgba(255, 255, 255, 0.95);
		box-shadow:
			0 0 0 1px rgba(127, 29, 29, 0.18),
			0 1px 4px rgba(0, 0, 0, 0.24);
	}

	:global(.popup-content) {
		min-width: 200px;
		line-height: 1.4;
	}

	:global(.popup-content a:hover) {
		text-decoration: underline;
	}
</style>
