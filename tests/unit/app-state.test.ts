import { beforeEach, describe, expect, it, vi } from 'vitest';

import { appState } from '$lib/components/AppState.svelte';
import { Location } from '$lib/location';
import type { CrashRecord } from '$lib/models/crash';
import { makeCrashRecord, makeLocationRecord } from './fixtures';

const { getCrashesNearPoint, getCrashesWithin, getRecentCrashes } = vi.hoisted(() => ({
	getCrashesNearPoint: vi.fn(),
	getCrashesWithin: vi.fn(),
	getRecentCrashes: vi.fn()
}));

vi.mock('$lib/api/client', () => ({
	getCrashesNearPoint,
	getCrashesWithin,
	getRecentCrashes
}));

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

describe('appState', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		appState.reset();
	});

	it('keeps the newest location search results when requests resolve out of order', async () => {
		const first = deferred<CrashRecord[]>();
		const second = deferred<CrashRecord[]>();
		getCrashesNearPoint.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

		const firstLocation = new Location(makeLocationRecord({ id: 'loc-1', name: 'First' }));
		const secondLocation = new Location(makeLocationRecord({ id: 'loc-2', name: 'Second' }));

		const firstSearch = appState.searchCrashesByLocation(firstLocation);
		const secondSearch = appState.searchCrashesByLocation(secondLocation);

		second.resolve([makeCrashRecord({ crash_record_id: 'latest-crash' })]);
		await secondSearch;

		expect(appState.loading).toBe(false);
		expect(appState.crashes.map((crash) => crash.crash_record_id)).toEqual(['latest-crash']);

		first.resolve([makeCrashRecord({ crash_record_id: 'stale-crash' })]);
		await firstSearch;

		expect(appState.crashes.map((crash) => crash.crash_record_id)).toEqual(['latest-crash']);
	});

	it('clearing the location cancels pending searches and resets loading', async () => {
		const pending = deferred<CrashRecord[]>();
		getCrashesNearPoint.mockReturnValueOnce(pending.promise);

		const location = new Location(makeLocationRecord({ id: 'loc-3', name: 'Pending' }));
		const search = appState.searchCrashesByLocation(location);

		expect(appState.loading).toBe(true);

		appState.clearLocation();

		expect(appState.loading).toBe(false);
		expect(appState.crashes).toHaveLength(0);

		pending.resolve([makeCrashRecord({ crash_record_id: 'ignored-crash' })]);
		await search;

		expect(appState.crashes).toHaveLength(0);
	});
});
