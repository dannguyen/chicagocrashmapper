import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BriefCrash } from '$lib/models/briefCrash';
import {
	getCrashById,
	getCrashesBrief,
	getCrashesList,
	getCrashesNearPoint,
	getCrashesWithin,
	getCrashSummary,
	getDateCount,
	getLocationById,
	getNearbyLocations,
	getNeighborhoodStats,
	getStreetStats,
	getTopIntersections,
	getWardStats,
	getYearToDateComparison,
	searchLocations
} from '$lib/api/client';
import { makeCrashRecord, makeLocationRecord } from './fixtures';

describe('api client', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	function mockFetchOk(body: unknown) {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ response: body })
		} as Response);
	}

	function mockFetchError(status: number) {
		vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status } as Response);
	}

	function lastFetchUrl(): URL {
		return new URL(String(vi.mocked(fetch).mock.calls[0][0]), 'http://localhost');
	}

	describe('searchLocations', () => {
		it('short-circuits blank queries without calling fetch', async () => {
			await expect(searchLocations('   ')).resolves.toEqual([]);
			expect(fetch).not.toHaveBeenCalled();
		});

		it('builds the correct URL and unwraps the response', async () => {
			mockFetchOk({ locations: [makeLocationRecord({ id: 'loc-1' })] });

			const locations = await searchLocations('cedar shore');
			const url = lastFetchUrl();

			expect(url.pathname).toBe('/api/locations/search');
			expect(url.searchParams.get('q')).toBe('cedar shore');
			expect(locations[0].id).toBe('loc-1');
		});
	});

	describe('getLocationById', () => {
		it('returns null on fetch failure', async () => {
			mockFetchError(404);
			await expect(getLocationById('missing')).resolves.toBeNull();
		});

		it('uses an injected fetch implementation when provided', async () => {
			const customFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ response: { location: makeLocationRecord({ id: 'loc-custom' }) } })
			} as Response);

			const location = await getLocationById('loc-custom', customFetch as typeof fetch);

			expect(customFetch).toHaveBeenCalledOnce();
			expect(fetch).not.toHaveBeenCalled();
			expect(location?.id).toBe('loc-custom');
		});
	});

	describe('getNearbyLocations', () => {
		it('fetches nearby locations for a location ID with a limit', async () => {
			mockFetchOk({
				locations: [
					{
						id: 'near-1',
						name: 'Nearby Spot',
						latitude: 41.88,
						longitude: -87.62,
						total_crashes: 10
					}
				]
			});

			const locations = await getNearbyLocations('loc-123', 3);
			const url = lastFetchUrl();

			expect(url.pathname).toBe('/api/locations/loc-123/nearby');
			expect(url.searchParams.get('limit')).toBe('3');
			expect(locations[0].id).toBe('near-1');
			expect(locations[0].total_crashes).toBe(10);
		});
	});

	describe('getCrashById', () => {
		it('returns null on fetch failure', async () => {
			mockFetchError(404);
			await expect(getCrashById('missing')).resolves.toBeNull();
		});

		it('uses an injected fetch implementation when provided', async () => {
			const customFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					response: {
						crash: makeCrashRecord({ crash_record_id: 'custom-crash', hit_and_run_i: 1 as never }),
						neighborhood: null,
						ward: null,
						intersections: [],
						nearby_crashes: []
					}
				})
			} as Response);

			const crash = await getCrashById('custom-crash', customFetch as typeof fetch);

			expect(customFetch).toHaveBeenCalledOnce();
			expect(fetch).not.toHaveBeenCalled();
			expect(crash?.crash.crash_record_id).toBe('custom-crash');
			expect(crash?.crash.hit_and_run_i).toBe(true);
		});
	});

	describe('getCrashesNearPoint', () => {
		it('converts distance from feet to miles in the request and back to feet in the result', async () => {
			mockFetchOk({
				crashes: [{ ...makeCrashRecord(), hit_and_run_i: 1 as never, distance_miles: 0.5 }]
			});

			const crashes = await getCrashesNearPoint(
				41.88,
				-87.62,
				'2025-01-01',
				'2025-01-31',
				2640,
				10
			);
			const url = lastFetchUrl();

			expect(url.searchParams.get('distance')).toBe('0.5');
			expect(crashes[0].distance).toBe(2640);
			expect(crashes[0].hit_and_run_i).toBe(true);
		});
	});

	describe('getCrashesWithin', () => {
		it('passes location_id, since, until, and limit to the API', async () => {
			mockFetchOk({ crashes: [makeCrashRecord({ crash_record_id: 'within-1' })] });

			const crashes = await getCrashesWithin('loc-abc', '2025-01-01', '2025-01-31', 500);
			const url = lastFetchUrl();

			expect(url.pathname).toBe('/api/crashes/within');
			expect(url.searchParams.get('location_id')).toBe('loc-abc');
			expect(url.searchParams.get('since')).toBe('2025-01-01');
			expect(url.searchParams.get('until')).toBe('2025-01-31');
			expect(url.searchParams.get('limit')).toBe('500');
			expect(crashes[0].crash_record_id).toBe('within-1');
		});
	});

	describe('getCrashesList', () => {
		it('passes pagination and sort params through', async () => {
			mockFetchOk({ total: 1, page: 2, per_page: 25, crashes: [makeCrashRecord()] });

			const result = await getCrashesList({ locationId: 'abc', page: 2, sort: 'asc' });
			const url = lastFetchUrl();

			expect(url.pathname).toBe('/api/crashes/list');
			expect(url.searchParams.get('location_id')).toBe('abc');
			expect(url.searchParams.get('page')).toBe('2');
			expect(url.searchParams.get('sort')).toBe('asc');
			expect(result.total).toBe(1);
		});
	});

	describe('getNeighborhoodStats', () => {
		it('fetches /api/neighborhoods/stats and returns the stats array', async () => {
			mockFetchOk({ stats: [{ id: 'nbhd-1', name: 'Loop', total_crashes: 100 }] });

			const stats = await getNeighborhoodStats();
			const url = lastFetchUrl();

			expect(url.pathname).toBe('/api/neighborhoods/stats');
			expect(stats[0].name).toBe('Loop');
		});
	});

	describe('getWardStats', () => {
		it('fetches /api/wards/stats and returns the stats array', async () => {
			mockFetchOk({ stats: [{ id: 'ward-42', name: 'Ward 42', total_crashes: 50 }] });

			const stats = await getWardStats();
			const url = lastFetchUrl();

			expect(url.pathname).toBe('/api/wards/stats');
			expect(stats[0].name).toBe('Ward 42');
		});
	});

	describe('getStreetStats', () => {
		it('fetches /api/streets/stats with a limit and returns the stats array', async () => {
			mockFetchOk({ stats: [{ id: 'street-1', name: 'Michigan Ave', total_crashes: 30 }] });

			const stats = await getStreetStats(50);
			const url = lastFetchUrl();

			expect(url.pathname).toBe('/api/streets/stats');
			expect(url.searchParams.get('limit')).toBe('50');
			expect(stats[0].name).toBe('Michigan Ave');
		});
	});

	describe('getTopIntersections', () => {
		it('fetches /api/intersections/top with limit=20 and recent_days=90', async () => {
			const mockResponse = {
				by_count: [{ id: 'i-1', name: 'State & Lake', total_crashes: 80 }],
				by_recent: []
			};
			mockFetchOk(mockResponse);

			const result = await getTopIntersections();
			const url = lastFetchUrl();

			expect(url.pathname).toBe('/api/intersections/top');
			expect(url.searchParams.get('limit')).toBe('20');
			expect(url.searchParams.get('recent_days')).toBe('90');
			expect(result.by_count[0].name).toBe('State & Lake');
		});
	});

	describe('getCrashSummary', () => {
		it('passes all scope params to /api/crashes/summary', async () => {
			const mockSummary = { total_crashes: 42, fatal: 1 };
			mockFetchOk(mockSummary);

			const result = await getCrashSummary({
				locationId: 'loc-1',
				since: '2025-01-01',
				until: '2025-12-31'
			});
			const url = lastFetchUrl();

			expect(url.pathname).toBe('/api/crashes/summary');
			expect(url.searchParams.get('location_id')).toBe('loc-1');
			expect(url.searchParams.get('since')).toBe('2025-01-01');
			expect(url.searchParams.get('until')).toBe('2025-12-31');
			expect(result).toEqual(mockSummary);
		});

		it('omits undefined params from the query string', async () => {
			mockFetchOk({ total_crashes: 0 });

			await getCrashSummary({ latitude: 41.88, longitude: -87.62 });
			const url = lastFetchUrl();

			expect(url.searchParams.has('location_id')).toBe(false);
			expect(url.searchParams.get('latitude')).toBe('41.88');
			expect(url.searchParams.get('longitude')).toBe('-87.62');
		});
	});

	describe('getCrashesBrief', () => {
		it('fetches /api/crashes/brief and returns brief crash result', async () => {
			const mockBrief = [
				{
					crash_record_id: 'CR001',
					address: '1200 S STATE ST',
					latitude: 41.88,
					longitude: -87.62,
					crash_date: '2025-01-15',
					crash_type: 'REAR END',
					hit_and_run_i: 1 as never,
					injuries_fatal: 1,
					injuries_incapacitating: 0,
					injuries_total: 1,
					cause_prim: 'FAILING TO YIELD'
				}
			];
			mockFetchOk({ total: 1, crashes: mockBrief });

			const result = await getCrashesBrief();
			const url = lastFetchUrl();

			expect(url.pathname).toBe('/api/crashes/brief');
			expect(result.total).toBe(1);
			expect(result.crashes).toHaveLength(1);
			expect(result.crashes[0]).toBeInstanceOf(BriefCrash);
			expect(result.crashes[0].crash_date).toBeInstanceOf(Date);
			expect(result.crashes[0].latitude).toBe(41.88);
			expect(result.crashes[0].address).toBe('1200 S STATE ST');
			expect(result.crashes[0].crash_type).toBe('REAR END');
			expect(result.crashes[0].hit_and_run_i).toBe(true);
			expect(result.crashes[0].isHitAndRun).toBe(true);
			expect(result.crashes[0].injuries_fatal).toBe(1);
			expect(result.crashes[0].injuries_total).toBe(1);
			expect(result.crashes[0].isFatal).toBe(true);
		});
	});

	describe('getDateCount', () => {
		it('passes unit and last params and returns the periods map', async () => {
			mockFetchOk({
				unit: 'month',
				last: 6,
				periods: { '2025-01': { total: 10 }, '2025-02': { total: 15 } }
			});

			const periods = await getDateCount('month', 6);
			const url = lastFetchUrl();

			expect(url.pathname).toBe('/api/crashes/date-count');
			expect(url.searchParams.get('unit')).toBe('month');
			expect(url.searchParams.get('last')).toBe('6');
			expect(periods['2025-01']).toEqual({ total: 10 });
		});
	});

	describe('getYearToDateComparison', () => {
		it('formats the date as YYYY-MM-DD and returns the periods map', async () => {
			mockFetchOk({
				unit: 'year',
				last: 1,
				periods: { '2025': { total: 200 } }
			});

			const date = new Date('2025-06-15T12:00:00Z');
			const periods = await getYearToDateComparison(date);
			const url = lastFetchUrl();

			expect(url.pathname).toBe('/api/crashes/ytd-comparison');
			expect(url.searchParams.get('date')).toBe('2025-06-15');
			expect(periods['2025']).toEqual({ total: 200 });
		});
	});
});
