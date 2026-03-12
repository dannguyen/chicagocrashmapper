import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Location } from '$lib/location';
import { Mapper } from '$lib/mapping';
import { makeLocationRecord } from './fixtures';

vi.mock('wellknown', () => ({
	default: {
		parse: vi.fn(() => ({
			type: 'LineString',
			coordinates: [
				[-87.62, 41.88],
				[-87.62, 41.89]
			]
		}))
	}
}));

const mockMap = {
	loaded: vi.fn(() => true),
	scrollZoom: { disable: vi.fn() },
	addControl: vi.fn(),
	once: vi.fn(),
	remove: vi.fn(),
	easeTo: vi.fn(),
	fitBounds: vi.fn(),
	resize: vi.fn()
};

const MockMap = vi.fn(() => mockMap);
const MockNavigationControl = vi.fn();
const MockPopup = vi.fn(() => ({
	setHTML: vi.fn().mockReturnThis()
}));

vi.mock('maplibre-gl/dist/maplibre-gl-csp.js', () => ({
	Map: MockMap,
	NavigationControl: MockNavigationControl,
	Popup: MockPopup,
	setWorkerUrl: vi.fn(),
	default: {
		Map: MockMap,
		NavigationControl: MockNavigationControl,
		Popup: MockPopup
	}
}));

vi.mock('maplibre-gl/dist/maplibre-gl-csp-worker.js?url', () => ({
	default: '/mock-maplibre-worker.js'
}));

describe('Mapper', () => {
	let mapper: Mapper;

	beforeEach(() => {
		vi.clearAllMocks();
		mapper = new Mapper();
		mapper.map = mockMap as unknown as import('maplibre-gl').Map;
		mapper.maplibre = {
			Map: MockMap,
			NavigationControl: MockNavigationControl,
			Popup: MockPopup
		} as unknown as typeof import('maplibre-gl');
	});

	describe('init and destroy lifecycle', () => {
		it('initializes the map with container, center, zoom, and base style', async () => {
			mapper = new Mapper();
			const map = await mapper.init('map-id', [41.88, -87.62], 12, { scrollZoom: false });

			expect(MockMap).toHaveBeenCalledWith(
				expect.objectContaining({
					container: 'map-id',
					center: [-87.62, 41.88],
					zoom: 12,
					style: expect.objectContaining({
						version: 8,
						sources: expect.objectContaining({
							carto: expect.objectContaining({ type: 'raster' })
						})
					})
				})
			);
			expect(mockMap.scrollZoom.disable).toHaveBeenCalled();
			expect(mockMap.addControl).toHaveBeenCalled();
			expect(map).toBeDefined();
			expect(mapper.maplibre).toBeDefined();
		});

		it('destroys the map and nulls references', () => {
			mapper.destroy();
			expect(mockMap.remove).toHaveBeenCalled();
			expect(mapper.map).toBeNull();
			expect(mapper.maplibre).toBeNull();
		});

		it('does nothing when destroying without a map', () => {
			mapper.map = null;
			mapper.destroy();
			expect(mapper.map).toBeNull();
		});
	});

	describe('geometry helpers', () => {
		it('creates a point feature at the location coordinates', () => {
			const point = mapper.makePointFeature(
				new Location(makeLocationRecord({ latitude: 41.88, longitude: -87.62, name: 'Test' }))
			);

			expect(point.geometry).toEqual({
				type: 'Point',
				coordinates: [-87.62, 41.88]
			});
			expect(point.properties?.name).toBe('Test');
		});

		it('creates a circle polygon feature with style properties', () => {
			const circle = mapper.makeMapCircleFeature(-87.62, 41.88, 100, '#ff0000', 0.5);

			expect(circle.geometry.type).toBe('Polygon');
			expect(circle.geometry.coordinates[0]).toHaveLength(65);
			expect(circle.properties).toEqual(
				expect.objectContaining({ color: '#ff0000', opacity: 0.5 })
			);
		});

		it('creates a shape feature with location properties', () => {
			const shape = mapper.makeShapeFeature(
				new Location(
					makeLocationRecord({
						id: 'ward-1',
						category: 'street',
						name: 'S MICHIGAN AVE',
						the_geom: 'LINESTRING (-87.62 41.88, -87.62 41.89)'
					})
				)
			);

			expect(shape.properties).toEqual(
				expect.objectContaining({
					name: 'S MICHIGAN AVE',
					id: 'ward-1',
					category: 'street'
				})
			);
			expect(shape.geometry.type).toBe('LineString');
		});

		it('computes and extends bounds from features and points', () => {
			const bounds = mapper.getFeatureBounds(
				mapper.makeShapeFeature(
					new Location(
						makeLocationRecord({
							the_geom: 'LINESTRING (-87.62 41.88, -87.61 41.89)'
						})
					)
				)
			);
			const pointBounds = mapper.getPointsBounds([[41.87, -87.63]]);
			const combined = mapper.extendBounds(bounds, pointBounds);

			expect(combined).toEqual([
				[-87.63, 41.87],
				[-87.62, 41.89]
			]);
		});

		it('returns street paint with no fill and thicker line', () => {
			expect(mapper.getLocationPaint('street')).toEqual(
				expect.objectContaining({
					lineWidth: 2,
					fillOpacity: 0,
					lineOpacity: 0.7
				})
			);
		});

		it('returns area paint with filled polygon styling', () => {
			expect(mapper.getLocationPaint('neighborhood')).toEqual(
				expect.objectContaining({
					lineWidth: 1,
					fillOpacity: 0.4,
					lineOpacity: 0.8
				})
			);
		});
	});
});
