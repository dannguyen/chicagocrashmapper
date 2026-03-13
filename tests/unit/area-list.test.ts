import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';

import AreaList from '$lib/components/AreaList.svelte';
import type { AreaStat } from '$lib/models/types';

function makeAreaStat(overrides: Partial<AreaStat> = {}): AreaStat {
	return {
		id: 'stat-1',
		name: 'Sample Place',
		geometry: {
			type: 'Polygon',
			coordinates: [
				[
					[-87.63, 41.88],
					[-87.62, 41.88],
					[-87.62, 41.89],
					[-87.63, 41.89],
					[-87.63, 41.88]
				]
			]
		},
		totalCrashes: 12,
		totalFatal: 1,
		totalSeriousInjuries: 4,
		mostRecent: '2025-01-15',
		avgPerYear: 3.2,
		rank: 1,
		percentile: 90,
		...overrides
	};
}

const cityGeoJson: GeoJSON.FeatureCollection = {
	type: 'FeatureCollection',
	features: [
		{
			type: 'Feature',
			properties: {},
			geometry: {
				type: 'Polygon',
				coordinates: [
					[
						[-87.94, 41.64],
						[-87.52, 41.64],
						[-87.52, 42.03],
						[-87.94, 42.03],
						[-87.94, 41.64]
					]
				]
			}
		}
	]
};

describe('AreaList', () => {
	it('renders area thumbnails with AreaShape for non-street categories', () => {
		const { body } = render(AreaList, {
			props: {
				stats: [makeAreaStat({ id: 'neighborhood-1', name: 'Loop' })],
				loading: false,
				error: null,
				category: 'neighborhoods'
			}
		});

		expect(body).toContain('area-shape');
		expect(body).not.toContain('street-shape');
		expect(body).toContain('/neighborhoods/neighborhood-1');
	});

	it('renders street thumbnails with StreetShape when city boundary data is present', () => {
		const { body } = render(AreaList, {
			props: {
				stats: [
					makeAreaStat({
						id: 'street-1',
						name: 'Michigan Ave',
						geometry: {
							type: 'LineString',
							coordinates: [
								[-87.624, 41.87],
								[-87.623, 41.88]
							]
						}
					})
				],
				loading: false,
				error: null,
				category: 'streets',
				cityGeoJson
			}
		});

		expect(body).toContain('street-shape');
		expect(body).toContain('/streets/street-1');
		expect(body).not.toContain('class="area-shape"');
	});

	it('suppresses street thumbnails when city boundary data is missing', () => {
		const { body } = render(AreaList, {
			props: {
				stats: [
					makeAreaStat({
						id: 'street-1',
						geometry: {
							type: 'LineString',
							coordinates: [
								[-87.624, 41.87],
								[-87.623, 41.88]
							]
						}
					})
				],
				loading: false,
				error: null,
				category: 'streets',
				cityGeoJson: null
			}
		});

		expect(body).not.toContain('table-th-shape');
		expect(body).not.toContain('class="street-shape"');
	});
});
