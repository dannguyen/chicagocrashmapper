import { describe, expect, it } from 'vitest';

import { filterLocationsBySearchString, Location } from '$lib/location';
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

		it('treats POLYGON intersections as shapes', () => {
			const loc = new Location(
				makeLocationRecord({
					category: 'intersection',
					the_geom: 'POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))'
				})
			);
			expect(loc.isShape).toBe(true);
			expect(loc.isPoint).toBe(false);
		});

		it('treats MULTIPOLYGON intersections as shapes', () => {
			const loc = new Location(
				makeLocationRecord({
					category: 'intersection',
					the_geom: 'MULTIPOLYGON (((0 0, 1 0, 1 1, 0 0)))'
				})
			);
			expect(loc.isShape).toBe(true);
			expect(loc.isPoint).toBe(false);
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

describe('filterLocationsBySearchString', () => {
	const locations = [
		new Location(makeLocationRecord({ id: '1', name: 'STATE & LAKE' })),
		new Location(makeLocationRecord({ id: '2', name: 'STATE & MADISON' })),
		new Location(makeLocationRecord({ id: '3', name: 'MICHIGAN & LAKE' })),
		new Location(makeLocationRecord({ id: '4', name: 'CLARK & LAKE' })),
		new Location(makeLocationRecord({ id: '5', name: 'W OHIO ST & LAKE' })),
		new Location(makeLocationRecord({ id: '6', name: 'W OHIO ST & STATE' })),
		new Location(makeLocationRecord({ id: '7', name: 'E OHIO ST & LAKE' }))
	];

	it('returns matches where all tokens appear in the name', () => {
		const results = filterLocationsBySearchString(locations, 'State Lake');
		expect(results).toHaveLength(1);
		expect(results[0].id).toBe('1');
	});

	it('is case insensitive', () => {
		const results = filterLocationsBySearchString(locations, 'state madison');
		expect(results).toHaveLength(1);
		expect(results[0].name).toBe('STATE & MADISON');
	});

	it('ignores token order', () => {
		const results = filterLocationsBySearchString(locations, 'madison state');
		expect(results).toHaveLength(1);
		expect(results[0].name).toBe('STATE & MADISON');
	});

	it('ignores AND keyword in query', () => {
		const results = filterLocationsBySearchString(locations, 'State AND Madison');
		expect(results).toHaveLength(1);
		expect(results[0].name).toBe('STATE & MADISON');
	});

	it('ignores & in query', () => {
		const results = filterLocationsBySearchString(locations, 'madison&state');
		expect(results).toHaveLength(1);
		expect(results[0].name).toBe('STATE & MADISON');
	});

	it('returns empty array when no match', () => {
		expect(filterLocationsBySearchString(locations, 'Wacker')).toHaveLength(0);
	});

	it('respects the limit parameter', () => {
		const results = filterLocationsBySearchString(locations, 'Lake', 2);
		expect(results).toHaveLength(2);
	});

	it('returns empty for blank or whitespace-only query', () => {
		expect(filterLocationsBySearchString(locations, '')).toEqual([]);
		expect(filterLocationsBySearchString(locations, '   ')).toEqual([]);
	});
});
