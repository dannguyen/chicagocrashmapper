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
	describe('constructor', () => {
		it('converts crash_date into a Date object', () => {
			const crash = new BriefCrash(makeBriefCrashRecord({ crash_date: '2025-03-15T18:30:00Z' }));

			expect(crash.crash_date).toBeInstanceOf(Date);
			expect(crash.crash_date.toISOString()).toBe('2025-03-15T18:30:00.000Z');
		});
	});

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

	describe('time helpers', () => {
		it('isWeekend is true for Friday, Saturday, and Sunday', () => {
			expect(
				new BriefCrash(makeBriefCrashRecord({ crash_date: '2025-03-14T18:30:00Z' })).isWeekend
			).toBe(true);
			expect(
				new BriefCrash(makeBriefCrashRecord({ crash_date: '2025-03-15T18:30:00Z' })).isWeekend
			).toBe(true);
			expect(
				new BriefCrash(makeBriefCrashRecord({ crash_date: '2025-03-16T18:30:00Z' })).isWeekend
			).toBe(true);
		});

		it('isWeekend is false Monday through Thursday', () => {
			const crash = new BriefCrash(makeBriefCrashRecord({ crash_date: '2025-03-13T18:30:00Z' }));

			expect(crash.isWeekend).toBe(false);
		});

		it('isNightime is true from 8PM through 4:59AM', () => {
			expect(
				new BriefCrash(makeBriefCrashRecord({ crash_date: '2025-03-15T20:00:00' })).isNightime
			).toBe(true);
			expect(
				new BriefCrash(makeBriefCrashRecord({ crash_date: '2025-03-15T04:59:00' })).isNightime
			).toBe(true);
		});

		it('isNightime is false during daytime hours', () => {
			const crash = new BriefCrash(makeBriefCrashRecord({ crash_date: '2025-03-15T12:30:00' }));

			expect(crash.isNightime).toBe(false);
			expect(crash.isNighttime).toBe(false);
		});
	});
});
