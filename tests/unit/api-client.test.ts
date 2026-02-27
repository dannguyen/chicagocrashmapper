import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	getCrashById,
	getCrashesList,
	getCrashesNearPoint,
	getLocationById,
	getRecentCrashes,
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
			vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 404 } as Response);
			await expect(getLocationById('missing')).resolves.toBeNull();
		});
	});

	describe('getCrashById', () => {
		it('returns null on fetch failure', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 404 } as Response);
			await expect(getCrashById('missing')).resolves.toBeNull();
		});
	});

	describe('getCrashesNearPoint', () => {
		it('converts distance from feet to miles in the request and back to feet in the result', async () => {
			mockFetchOk({ crashes: [{ ...makeCrashRecord(), distance_miles: 0.5 }] });

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

	describe('getRecentCrashes', () => {
		it('passes the limit param and returns crashes', async () => {
			mockFetchOk({ crashes: [makeCrashRecord({ crash_record_id: 'recent-1' })] });

			const crashes = await getRecentCrashes(7);
			const url = lastFetchUrl();

			expect(url.pathname).toBe('/api/crashes/recent');
			expect(url.searchParams.get('limit')).toBe('7');
			expect(crashes[0].crash_record_id).toBe('recent-1');
		});
	});
});
