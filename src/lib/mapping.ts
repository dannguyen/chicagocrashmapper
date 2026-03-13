import type { Feature, FeatureCollection, GeoJsonProperties, Geometry, Polygon } from 'geojson';
import type { Location } from '$lib/location';

const MAP_STYLE: import('maplibre-gl').StyleSpecification = {
	version: 8,
	sources: {
		carto: {
			type: 'raster',
			tiles: [
				'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
				'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
				'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
				'https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
			],
			tileSize: 256,
			maxzoom: 19,
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
		}
	},
	layers: [
		{
			id: 'carto',
			type: 'raster',
			source: 'carto'
		}
	]
};

type MapLibreRuntimeModule = typeof import('maplibre-gl') & {
	default?: typeof import('maplibre-gl');
};
export type MapLibreMap = import('maplibre-gl').Map;
export type MapLibreMarker = import('maplibre-gl').Marker;
export type MapLibrePopup = import('maplibre-gl').Popup;

type Bounds = [[number, number], [number, number]];

function toLngLat(latitude: number, longitude: number): [number, number] {
	return [longitude, latitude];
}

function toMapBounds(bounds: Bounds): [[number, number], [number, number]] {
	return [
		[bounds[0][0], bounds[0][1]],
		[bounds[1][0], bounds[1][1]]
	];
}

function appendCoordinateBounds(value: unknown, bounds: Bounds | null): Bounds | null {
	if (!Array.isArray(value)) {
		return bounds;
	}

	if (
		value.length >= 2 &&
		typeof value[0] === 'number' &&
		typeof value[1] === 'number' &&
		Number.isFinite(value[0]) &&
		Number.isFinite(value[1])
	) {
		const [lng, lat] = value as [number, number];
		if (!bounds) {
			return [
				[lng, lat],
				[lng, lat]
			];
		}

		return [
			[Math.min(bounds[0][0], lng), Math.min(bounds[0][1], lat)],
			[Math.max(bounds[1][0], lng), Math.max(bounds[1][1], lat)]
		];
	}

	let nextBounds = bounds;
	for (const entry of value) {
		nextBounds = appendCoordinateBounds(entry, nextBounds);
	}
	return nextBounds;
}

function circlePolygonCoordinates(
	longitude: number,
	latitude: number,
	radiusMeters: number,
	steps = 64
): number[][] {
	const earthRadiusMeters = 6371008.8;
	const latRadians = (latitude * Math.PI) / 180;

	const coordinates: number[][] = [];
	for (let index = 0; index <= steps; index += 1) {
		const angle = (index / steps) * Math.PI * 2;
		const dy = Math.sin(angle) * radiusMeters;
		const dx = Math.cos(angle) * radiusMeters;
		const pointLat = latitude + (dy / earthRadiusMeters) * (180 / Math.PI);
		const pointLng =
			longitude + (dx / (earthRadiusMeters * Math.cos(latRadians))) * (180 / Math.PI);
		coordinates.push([pointLng, pointLat]);
	}

	return coordinates;
}

function parseLocationGeometry(location: Location): Geometry {
	if (location.geometry) {
		return location.geometry;
	}
	return {
		type: 'Point',
		coordinates: toLngLat(location.latitude, location.longitude)
	};
}

function getGeometryBounds(geometry: Geometry): Bounds | null {
	if (geometry.type === 'GeometryCollection') {
		let bounds: Bounds | null = null;
		for (const child of geometry.geometries) {
			bounds = mergeBounds(bounds, getGeometryBounds(child));
		}
		return bounds;
	}

	return appendCoordinateBounds(getGeometryCoordinates(geometry), null);
}

function getGeometryCoordinates(geometry: Exclude<Geometry, import('geojson').GeometryCollection>) {
	return geometry.coordinates;
}

function mergeBounds(bounds: Bounds | null, other: Bounds | null): Bounds | null {
	if (!bounds) return other;
	if (!other) return bounds;

	return [
		[Math.min(bounds[0][0], other[0][0]), Math.min(bounds[0][1], other[0][1])],
		[Math.max(bounds[1][0], other[1][0]), Math.max(bounds[1][1], other[1][1])]
	];
}

export class Mapper {
	maplibre: typeof import('maplibre-gl') | null = null;
	map: MapLibreMap | null = null;

	async init(
		container: string | HTMLElement,
		center: [number, number],
		zoom: number,
		options: {
			scrollZoom?: boolean;
			navigationControl?: boolean;
			attributionControl?: boolean;
		} = {}
	) {
		const maplibreModule = (await import('maplibre-gl')) as unknown as MapLibreRuntimeModule;
		const maplibre = (maplibreModule.default ?? maplibreModule) as typeof import('maplibre-gl');
		this.maplibre = maplibre;
		this.map = new maplibre.Map({
			container,
			style: MAP_STYLE,
			center: toLngLat(center[0], center[1]),
			zoom,
			attributionControl: options.attributionControl === false ? false : undefined
		});

		if (options.scrollZoom === false) {
			this.map.scrollZoom.disable();
		}

		if (options.navigationControl ?? true) {
			this.map.addControl(new maplibre.NavigationControl(), 'top-right');
		}

		await new Promise<void>((resolve) => {
			if (this.map?.loaded()) {
				resolve();
				return;
			}

			this.map?.once('load', () => resolve());
		});

		return this.map;
	}

	destroy() {
		if (this.map) {
			this.map.remove();
			this.map = null;
			this.maplibre = null;
		}
	}

	resize() {
		this.map?.resize();
	}

	setView(
		center: [number, number],
		zoom: number,
		options: {
			animate?: boolean;
		} = {}
	) {
		this.map?.easeTo({
			center: toLngLat(center[0], center[1]),
			zoom,
			duration: options.animate === false ? 0 : 500
		});
	}

	panTo(
		center: [number, number],
		options: {
			animate?: boolean;
		} = {}
	) {
		this.map?.easeTo({
			center: toLngLat(center[0], center[1]),
			duration: options.animate === false ? 0 : 400
		});
	}

	fitBounds(bounds: Bounds, padding = 50) {
		this.map?.fitBounds(toMapBounds(bounds), {
			padding,
			duration: 0
		});
	}

	createPopup(html: string, maxWidth = '280px') {
		return this.maplibre
			? new this.maplibre.Popup({
					closeButton: false,
					maxWidth
				}).setHTML(html)
			: null;
	}

	makeMapCircleFeature(
		longitude: number,
		latitude: number,
		radius: number,
		color = '#3c80ff',
		opacity = 0.1
	): Feature<Polygon, GeoJsonProperties> {
		return {
			type: 'Feature',
			properties: {
				color,
				opacity
			},
			geometry: {
				type: 'Polygon',
				coordinates: [circlePolygonCoordinates(longitude, latitude, radius)]
			}
		};
	}

	makePointFeature(location: Location): Feature<Geometry, GeoJsonProperties> {
		return {
			type: 'Feature',
			properties: {
				id: location.id,
				name: location.name,
				category: location.category
			},
			geometry: {
				type: 'Point',
				coordinates: [location.longitude, location.latitude]
			}
		};
	}

	makeShapeFeature(location: Location): Feature<Geometry, GeoJsonProperties> {
		return {
			type: 'Feature',
			properties: {
				id: location.id,
				name: location.name,
				category: location.category
			},
			geometry: parseLocationGeometry(location)
		};
	}

	makeFeatureCollection(
		features: Array<Feature<Geometry | Polygon, GeoJsonProperties>>
	): FeatureCollection<Geometry | Polygon, GeoJsonProperties> {
		return {
			type: 'FeatureCollection',
			features
		};
	}

	getFeatureBounds(feature: Feature<Geometry | Polygon, GeoJsonProperties>): Bounds | null {
		return getGeometryBounds(feature.geometry);
	}

	getPointsBounds(points: Array<[number, number]>): Bounds | null {
		return appendCoordinateBounds(
			points.map(([latitude, longitude]) => [longitude, latitude]),
			null
		);
	}

	extendBounds(bounds: Bounds | null, other: Bounds | null): Bounds | null {
		return mergeBounds(bounds, other);
	}

	getLocationPaint(category: string) {
		const isStreet = category === 'street';
		return {
			lineColor: isStreet ? '#94a3b8' : '#4455bb',
			lineOpacity: isStreet ? 0.7 : 0.8,
			lineWidth: isStreet ? 2 : 1,
			fillColor: '#4455bb',
			fillOpacity: isStreet ? 0 : 0.4
		};
	}
}
