import { describe, expect, it } from 'vitest';

import { BriefCrash } from '$lib/models/briefCrash';
import type { BriefCrashRecord } from '$lib/models/types';

function makeBriefCrashRecord(overrides: Partial<BriefCrashRecord> = {}): BriefCrashRecord {
	return {
		crash_record_id: 'brief-1',
		address: '1200 S MICHIGAN AVE',
		latitude: 41.881,
		longitude: -87.623,
		crash_date: '2025-03-15T18:30:00Z',
		crash_type: 'REAR END',
		hit_and_run_i: false,
		injuries_fatal: 0,
		injuries_incapacitating: 1,
		injuries_total: 1,
		cause_prim: 'FAILING TO REDUCE SPEED TO AVOID CRASH',
		...overrides
	};
}

describe('BriefCrash casualty helpers', () => {
	describe('totalCasualties', () => {
		it('adds fatalities and incapacitating injuries', () => {
			const crash = new BriefCrash(
				makeBriefCrashRecord({
					injuries_fatal: 2,
					injuries_incapacitating: 3
				})
			);

			expect(crash.totalCasualties).toBe(5);
		});

		it('returns zero when there are no fatalities or serious injuries', () => {
			const crash = new BriefCrash(
				makeBriefCrashRecord({
					injuries_fatal: 0,
					injuries_incapacitating: 0,
					injuries_total: 0
				})
			);

			expect(crash.totalCasualties).toBe(0);
		});
	});

	describe('hasMultipleCasualties', () => {
		it('is true when totalCasualties is greater than one', () => {
			const crash = new BriefCrash(
				makeBriefCrashRecord({
					injuries_fatal: 1,
					injuries_incapacitating: 1
				})
			);

			expect(crash.hasMultipleCasualties).toBe(true);
		});

		it('is false when totalCasualties is exactly one', () => {
			const crash = new BriefCrash(
				makeBriefCrashRecord({
					injuries_fatal: 0,
					injuries_incapacitating: 1
				})
			);

			expect(crash.hasMultipleCasualties).toBe(false);
		});

		it('is false when totalCasualties is zero', () => {
			const crash = new BriefCrash(
				makeBriefCrashRecord({
					injuries_fatal: 0,
					injuries_incapacitating: 0,
					injuries_total: 0
				})
			);

			expect(crash.hasMultipleCasualties).toBe(false);
		});
	});
});
