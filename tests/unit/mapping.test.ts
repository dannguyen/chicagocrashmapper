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

const mockLeaflet = {
	map: vi.fn().mockReturnThis(),
	setView: vi.fn().mockReturnThis(),
	tileLayer: vi.fn().mockReturnValue({ addTo: vi.fn() }),
	marker: vi.fn().mockReturnValue({
		bindPopup: vi.fn().mockReturnValue({ openPopup: vi.fn() })
	}),
	circle: vi.fn().mockReturnValue({ addTo: vi.fn() }),
	geoJSON: vi.fn().mockReturnValue({ addTo: vi.fn() }),
	latLngBounds: vi.fn(),
	layerGroup: vi.fn().mockReturnValue({ addTo: vi.fn(), clearLayers: vi.fn() }),
	divIcon: vi.fn()
};

vi.mock('leaflet', () => ({
	default: mockLeaflet
}));

describe('Mapper', () => {
	let mapper: Mapper;

	beforeEach(() => {
		vi.clearAllMocks();
		mapper = new Mapper();
		mapper.L = mockLeaflet as unknown as typeof import('leaflet');
		mapper.map = { remove: vi.fn() } as unknown as import('leaflet').Map;
	});

	describe('init and destroy lifecycle', () => {
		it('initializes the map with element, center, and zoom', async () => {
			mapper = new Mapper();
			const map = await mapper.init('map-id', [41.88, -87.62], 12);

			expect(mockLeaflet.map).toHaveBeenCalledWith('map-id');
			expect(mockLeaflet.map().setView).toHaveBeenCalledWith([41.88, -87.62], 12);
			expect(mockLeaflet.tileLayer).toHaveBeenCalled();
			expect(map).toBeDefined();
			expect(mapper.L).toBeDefined();
		});

		it('destroys the map and nulls references', () => {
			const removeSpy = mapper.map!.remove;
			mapper.destroy();
			expect(removeSpy).toHaveBeenCalled();
			expect(mapper.map).toBeNull();
			expect(mapper.L).toBeNull();
		});

		it('does nothing when destroying without a map', () => {
			mapper.map = null;
			mapper.destroy();
			expect(mapper.map).toBeNull();
		});
	});

	describe('makePointMarker', () => {
		it('creates a marker at the location coordinates', () => {
			mapper.makePointMarker(
				new Location(makeLocationRecord({ latitude: 41.88, longitude: -87.62, name: 'Test' }))
			);
			expect(mockLeaflet.marker).toHaveBeenCalledWith([41.88, -87.62]);
		});

		it('binds the location name as a popup', () => {
			const marker = mapper.makePointMarker(
				new Location(makeLocationRecord({ name: 'Test Location' }))
			);
			expect(marker.bindPopup).toHaveBeenCalledWith('Test Location');
		});
	});

	describe('makeMapCircle', () => {
		it('creates a circle with lat/lng swapped and given radius/color', () => {
			mapper.makeMapCircle(-87.62, 41.88, 100);
			expect(mockLeaflet.circle).toHaveBeenCalledWith(
				[41.88, -87.62],
				expect.objectContaining({ radius: 100, color: '#3c80ff' })
			);
		});

		it('accepts custom color and opacity', () => {
			mapper.makeMapCircle(-87.62, 41.88, 200, '#ff0000', 0.5);
			expect(mockLeaflet.circle).toHaveBeenCalledWith(
				[41.88, -87.62],
				expect.objectContaining({ color: '#ff0000', fillOpacity: 0.5 })
			);
		});
	});

	describe('makeShapeMarker', () => {
		it('styles street shapes with thick stroke and no fill', () => {
			mapper.makeShapeMarker(
				new Location(
					makeLocationRecord({
						category: 'street',
						name: 'S MICHIGAN AVE',
						the_geom: 'LINESTRING (-87.62 41.88, -87.62 41.89)'
					})
				)
			);

			const options = mockLeaflet.geoJSON.mock.calls[0][1] as {
				style: (feature?: import('geojson').Feature) => Record<string, unknown>;
			};
			const style = options.style({
				type: 'Feature',
				properties: { category: 'street' },
				geometry: {
					type: 'LineString',
					coordinates: [
						[-87.62, 41.88],
						[-87.62, 41.89]
					]
				}
			} as unknown as import('geojson').Feature);

			expect(style.weight).toBe(5);
			expect(style.fillOpacity).toBe(0);
			expect(style.opacity).toBe(1);
		});

		it('styles area polygons with lighter stroke and fill', () => {
			mapper.makeShapeMarker(
				new Location(
					makeLocationRecord({
						category: 'neighborhood',
						name: 'Loop',
						the_geom: 'POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))'
					})
				)
			);

			const options = mockLeaflet.geoJSON.mock.calls[0][1] as {
				style: (feature?: import('geojson').Feature) => Record<string, unknown>;
			};
			const style = options.style({
				type: 'Feature',
				properties: { category: 'neighborhood' },
				geometry: { type: 'Polygon', coordinates: [] }
			} as unknown as import('geojson').Feature);

			expect(style.weight).toBe(1);
			expect(style.fillOpacity).toBe(0.4);
			expect(style.opacity).toBe(0.8);
		});

		it('passes a FeatureCollection with location properties to geoJSON', () => {
			mapper.makeShapeMarker(
				new Location(makeLocationRecord({ id: 'ward-1', category: 'ward', name: 'Ward 42' }))
			);

			expect(mockLeaflet.geoJSON).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'FeatureCollection',
					features: expect.arrayContaining([
						expect.objectContaining({
							properties: expect.objectContaining({ name: 'Ward 42', id: 'ward-1' })
						})
					])
				}),
				expect.any(Object)
			);
		});
	});
});
