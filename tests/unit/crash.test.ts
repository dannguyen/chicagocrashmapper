import { describe, expect, it } from 'vitest';

import { Crash, parseCrashes, Person, Vehicle } from '$lib/crash';
import { makeCrashRecord, makePersonRecord, makeVehicleRecord } from './fixtures';

function datelineFor(crashDate: string): string {
	return new Date(Date.parse(crashDate)).toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	});
}

describe('Crash', () => {
	describe('vehicle and non_passenger parsing', () => {
		it('parses JSON string vehicles and non_passengers into instances', () => {
			const crash = new Crash(
				makeCrashRecord({
					vehicles: JSON.stringify([
						makeVehicleRecord({ passengers: [makePersonRecord({ person_id: 'P1' })] })
					]),
					non_passengers: JSON.stringify([makePersonRecord({ person_id: 'NP1' })])
				})
			);

			expect(crash.vehicles).toHaveLength(1);
			expect(crash.vehicles[0]).toBeInstanceOf(Vehicle);
			expect(crash.vehicles[0].passengers[0]).toBeInstanceOf(Person);
			expect(crash.non_passengers).toHaveLength(1);
			expect(crash.non_passengers[0]).toBeInstanceOf(Person);
		});

		it('accepts array inputs directly', () => {
			const crash = new Crash(
				makeCrashRecord({
					vehicles: [makeVehicleRecord({ vehicle_id: 2 })],
					non_passengers: [makePersonRecord({ person_id: 'NP2' })]
				})
			);

			expect(crash.vehicles[0].vehicle_id).toBe(2);
			expect(crash.non_passengers[0].person_id).toBe('NP2');
		});

		it('returns empty arrays for invalid JSON', () => {
			const crash = new Crash(
				makeCrashRecord({ vehicles: '{not json', non_passengers: 'also-bad' })
			);
			expect(crash.vehicles).toEqual([]);
			expect(crash.non_passengers).toEqual([]);
		});

		it('filters out vehicles with null vehicle_id', () => {
			const crash = new Crash(
				makeCrashRecord({
					vehicles: JSON.stringify([makeVehicleRecord({ vehicle_id: 1 }), { vehicle_id: null }])
				})
			);
			expect(crash.vehicles).toHaveLength(1);
			expect(crash.vehicles[0].vehicle_id).toBe(1);
		});

		it('returns empty arrays for null/undefined vehicles', () => {
			const crash = new Crash(makeCrashRecord({ vehicles: null, non_passengers: null }));
			expect(crash.vehicles).toEqual([]);
			expect(crash.non_passengers).toEqual([]);
		});
	});

	describe('distance', () => {
		it('rounds distance to the nearest integer', () => {
			expect(new Crash(makeCrashRecord({ distance: 153.4 })).distance).toBe(153);
			expect(new Crash(makeCrashRecord({ distance: 153.8 })).distance).toBe(154);
			expect(new Crash(makeCrashRecord({ distance: 1234.56 })).distance).toBe(1235);
		});

		it('is undefined when not provided', () => {
			expect(new Crash(makeCrashRecord({ distance: undefined })).distance).toBeUndefined();
		});
	});

	describe('cause fields', () => {
		it('identifies known primary causes', () => {
			const crash = new Crash(
				makeCrashRecord({ prim_contributory_cause: 'FOLLOWING TOO CLOSELY' })
			);
			expect(crash.hasKnownCause).toBe(true);
			expect(crash.main_cause).toBe('FOLLOWING TOO CLOSELY');
		});

		it('falls back to UNKNOWN CAUSE for unresolved causes', () => {
			for (const cause of ['UNABLE TO DETERMINE', 'NOT APPLICABLE', undefined]) {
				const crash = new Crash(makeCrashRecord({ prim_contributory_cause: cause }));
				expect(crash.hasKnownCause).toBe(false);
				expect(crash.main_cause).toBe('UNKNOWN CAUSE');
			}
		});

		it('includes secondary cause in fullCause when both are known', () => {
			const crash = new Crash(
				makeCrashRecord({
					prim_contributory_cause: 'SPEEDING',
					sec_contributory_cause: 'IMPROPER LANE CHANGE'
				})
			);
			expect(crash.fullCause).toBe('SPEEDING (IMPROPER LANE CHANGE)');
		});

		it('omits secondary cause from fullCause when secondary is unknown', () => {
			const crash = new Crash(
				makeCrashRecord({
					prim_contributory_cause: 'SPEEDING',
					sec_contributory_cause: 'UNABLE TO DETERMINE'
				})
			);
			expect(crash.fullCause).toBe('SPEEDING');
		});

		it('omits secondary cause from fullCause when it matches primary', () => {
			const crash = new Crash(
				makeCrashRecord({
					prim_contributory_cause: 'SPEEDING',
					sec_contributory_cause: 'SPEEDING'
				})
			);
			expect(crash.fullCause).toBe('SPEEDING');
		});

		it('returns UNKNOWN CAUSE for fullCause when primary is unknown', () => {
			const crash = new Crash(makeCrashRecord({ prim_contributory_cause: 'UNABLE TO DETERMINE' }));
			expect(crash.fullCause).toBe('UNKNOWN CAUSE');
		});
	});

	describe('street_address', () => {
		it('joins street_no, direction, and name', () => {
			const crash = new Crash(
				makeCrashRecord({ street_no: '1200', street_direction: 'S', street_name: 'State' })
			);
			expect(crash.street_address).toBe('1200 S State');
		});

		it('handles missing street_no gracefully', () => {
			const noNumber = new Crash(
				makeCrashRecord({ street_no: null, street_direction: 'N', street_name: 'Michigan' })
			);
			expect(noNumber.street_address).toBe('N Michigan');
		});
	});

	describe('title', () => {
		it('includes killed count and location', () => {
			const crashDate = '2024-03-01';
			const crash = new Crash(
				makeCrashRecord({
					injuries_fatal: 1,
					injuries_incapacitating: 0,
					crash_date: crashDate,
					street_no: '1200',
					street_direction: 'S',
					street_name: 'State'
				})
			);
			expect(crash.title).toBe(`1 killed near 1200 S State on ${datelineFor(crashDate)}`);
		});

		it('includes seriously injured count', () => {
			const crashDate = '2024-02-01';
			const crash = new Crash(
				makeCrashRecord({
					injuries_fatal: 0,
					injuries_incapacitating: 2,
					crash_date: crashDate,
					street_no: '500',
					street_direction: 'W',
					street_name: 'Madison'
				})
			);
			expect(crash.title).toContain('2 seriously injured near 500 W Madison');
		});
	});

	describe('isFatal', () => {
		it('is true when there are fatal injuries', () => {
			expect(new Crash(makeCrashRecord({ injuries_fatal: 1 })).isFatal).toBe(true);
		});

		it('is false when there are no fatal injuries', () => {
			expect(new Crash(makeCrashRecord({ injuries_fatal: 0 })).isFatal).toBe(false);
		});
	});
});

describe('parseCrashes', () => {
	it('maps an array of records into Crash instances', () => {
		const crashes = parseCrashes([
			makeCrashRecord({ crash_record_id: 'a' }),
			makeCrashRecord({ crash_record_id: 'b', injuries_fatal: 1 })
		]);
		expect(crashes).toHaveLength(2);
		expect(crashes.map((c) => c.crash_record_id)).toEqual(['a', 'b']);
		expect(crashes[1].isFatal).toBe(true);
	});
});
