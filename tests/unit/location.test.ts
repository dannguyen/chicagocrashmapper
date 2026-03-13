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
		it('treats intersections as points even without geometry', () => {
			const loc = new Location(makeLocationRecord({ category: 'intersection', geometry: null }));
			expect(loc.isPoint).toBe(true);
			expect(loc.isShape).toBe(false);
		});

		it('treats intersections with polygon geometry as points', () => {
			const loc = new Location(
				makeLocationRecord({
					category: 'intersection',
					geometry: {
						type: 'Polygon',
						coordinates: [
							[
								[0, 0],
								[1, 0],
								[1, 1],
								[0, 1],
								[0, 0]
							]
						]
					}
				})
			);
			expect(loc.isShape).toBe(false);
			expect(loc.isPoint).toBe(true);
		});

		it('treats intersections with multipolygon geometry as points', () => {
			const loc = new Location(
				makeLocationRecord({
					category: 'intersection',
					geometry: {
						type: 'MultiPolygon',
						coordinates: [
							[
								[
									[0, 0],
									[1, 0],
									[1, 1],
									[0, 0]
								]
							]
						]
					}
				})
			);
			expect(loc.isShape).toBe(false);
			expect(loc.isPoint).toBe(true);
		});

		it('treats non-intersection categories as shapes when geometry exists', () => {
			for (const category of ['ward', 'neighborhood', 'street'] as const) {
				const loc = new Location(
					makeLocationRecord({
						category,
						geometry: {
							type: 'LineString',
							coordinates: [
								[-87.6, 41.8],
								[-87.59, 41.81]
							]
						}
					})
				);
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
