import { describe, expect, it } from 'vitest';

import { Location } from '$lib/location';
import { makeLocationRecord } from './fixtures';

describe('Location', () => {
	it('constructs from a record', () => {
		const loc = new Location(makeLocationRecord({ id: 'abc', name: 'Test Place' }));
		expect(loc.id).toBe('abc');
		expect(loc.name).toBe('Test Place');
	});

	describe('isPoint / isShape', () => {
		it('treats POINT intersections as points', () => {
			const loc = new Location(
				makeLocationRecord({ category: 'intersection', the_geom: 'POINT (-87.6 41.8)' })
			);
			expect(loc.isPoint).toBe(true);
			expect(loc.isShape).toBe(false);
		});

		it('treats POLYGON intersections as points (no voronoi rendering)', () => {
			const loc = new Location(
				makeLocationRecord({
					category: 'intersection',
					the_geom: 'POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))'
				})
			);
			expect(loc.isShape).toBe(false);
			expect(loc.isPoint).toBe(true);
		});

		it('treats MULTIPOLYGON intersections as points (no voronoi rendering)', () => {
			const loc = new Location(
				makeLocationRecord({
					category: 'intersection',
					the_geom: 'MULTIPOLYGON (((0 0, 1 0, 1 1, 0 0)))'
				})
			);
			expect(loc.isShape).toBe(false);
			expect(loc.isPoint).toBe(true);
		});

		it('treats non-intersection categories as shapes regardless of geom type', () => {
			for (const category of ['ward', 'neighborhood', 'street'] as const) {
				const loc = new Location(makeLocationRecord({ category, the_geom: 'POINT (-87.6 41.8)' }));
				expect(loc.isShape).toBe(true);
				expect(loc.isPoint).toBe(false);
			}
		});
	});

	describe('pluralCategory', () => {
		it('appends s to each category', () => {
			expect(new Location(makeLocationRecord({ category: 'intersection' })).pluralCategory).toBe(
				'intersections'
			);
			expect(new Location(makeLocationRecord({ category: 'ward' })).pluralCategory).toBe('wards');
			expect(new Location(makeLocationRecord({ category: 'neighborhood' })).pluralCategory).toBe(
				'neighborhoods'
			);
			expect(new Location(makeLocationRecord({ category: 'street' })).pluralCategory).toBe(
				'streets'
			);
		});
	});
});
