import { describe, expect, it } from 'vitest';

import { Crash, Crashes, parseCrashes } from '$lib/models/crash';
import { Person, People } from '$lib/models/person';
import { Vehicle } from '$lib/models/vehicle';

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
		it('accepts array inputs directly', () => {
			const crash = new Crash(
				makeCrashRecord({
					vehicles: [
						makeVehicleRecord({
							vehicle_id: 2,
							passengers: [makePersonRecord({ person_id: 'P1' })]
						})
					],
					non_passengers: [makePersonRecord({ person_id: 'NP1' })]
				})
			);

			expect(crash.vehicles).toHaveLength(1);
			expect(crash.vehicles[0]).toBeInstanceOf(Vehicle);
			expect(crash.vehicles[0].passengers[0]).toBeInstanceOf(Person);
			expect(crash.non_passengers).toHaveLength(1);
			expect(crash.non_passengers[0]).toBeInstanceOf(Person);
			expect(crash.vehicles[0].vehicle_id).toBe(2);
			expect(crash.non_passengers[0].person_id).toBe('NP1');
		});

		it('filters out vehicles with null vehicle_id', () => {
			const invalidVehicle = {
				...makeVehicleRecord(),
				vehicle_id: null
			} as unknown as import('$lib/models/types').VehicleRecord;

			const crash = new Crash(
				makeCrashRecord({
					vehicles: [makeVehicleRecord({ vehicle_id: 1 }), invalidVehicle]
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
			const crash = new Crash(makeCrashRecord({ cause_prim: 'FOLLOWING TOO CLOSELY' }));
			expect(crash.hasKnownCause).toBe(true);
			expect(crash.main_cause).toBe('FOLLOWING TOO CLOSELY');
		});

		it('falls back to UNKNOWN CAUSE for unresolved causes', () => {
			for (const cause of ['UNABLE TO DETERMINE', 'NOT APPLICABLE', undefined]) {
				const crash = new Crash(makeCrashRecord({ cause_prim: cause }));
				expect(crash.hasKnownCause).toBe(false);
				expect(crash.main_cause).toBe('UNKNOWN CAUSE');
			}
		});

		it('includes secondary cause in fullCause when both are known', () => {
			const crash = new Crash(
				makeCrashRecord({
					cause_prim: 'SPEEDING',
					cause_sec: 'IMPROPER LANE CHANGE'
				})
			);
			expect(crash.fullCause).toBe('SPEEDING (IMPROPER LANE CHANGE)');
		});

		it('omits secondary cause from fullCause when secondary is unknown', () => {
			const crash = new Crash(
				makeCrashRecord({
					cause_prim: 'SPEEDING',
					cause_sec: 'UNABLE TO DETERMINE'
				})
			);
			expect(crash.fullCause).toBe('SPEEDING');
		});

		it('omits secondary cause from fullCause when it matches primary', () => {
			const crash = new Crash(
				makeCrashRecord({
					cause_prim: 'SPEEDING',
					cause_sec: 'SPEEDING'
				})
			);
			expect(crash.fullCause).toBe('SPEEDING');
		});

		it('returns UNKNOWN CAUSE for fullCause when primary is unknown', () => {
			const crash = new Crash(makeCrashRecord({ cause_prim: 'UNABLE TO DETERMINE' }));
			expect(crash.fullCause).toBe('UNKNOWN CAUSE');
		});
	});

	describe('address', () => {
		it('uses the provided address field', () => {
			const crash = new Crash(makeCrashRecord({ address: '1200 S State' }));
			expect(crash.address).toBe('1200 S State');
		});

		it('falls back to empty string when address is missing', () => {
			const noAddress = new Crash(makeCrashRecord({ address: undefined }));
			expect(noAddress.address).toBe('');
		});
	});

	describe('title', () => {
		it('includes killed count and location, and date and time', () => {
			const crashDate = '2024-03-01 13:01';
			const crash = new Crash(
				makeCrashRecord({
					injuries_fatal: 1,
					injuries_incapacitating: 0,
					crash_date: crashDate,
					address: '1200 S State'
				})
			);
			expect(crash.title).toBe(
				`1 killed near 1200 S State on ${datelineFor(crashDate)} at 1:01 PM`
			);
		});

		it('includes seriously injured count', () => {
			const crashDate = '2024-02-01';
			const crash = new Crash(
				makeCrashRecord({
					injuries_fatal: 0,
					injuries_incapacitating: 2,
					crash_date: crashDate,
					address: '500 W Madison'
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

describe('passengers and people', () => {
	it('collects passengers from all vehicles', () => {
		const crash = new Crash(
			makeCrashRecord({
				vehicles: [
					makeVehicleRecord({
						vehicle_id: 1,
						passengers: [
							makePersonRecord({ person_id: 'V1P1' }),
							makePersonRecord({ person_id: 'V1P2' })
						]
					}),
					makeVehicleRecord({
						vehicle_id: 2,
						passengers: [makePersonRecord({ person_id: 'V2P1' })]
					})
				],
				non_passengers: []
			})
		);

		expect(crash.passengers).toHaveLength(3);
		expect(crash.passengers.map((p) => p.person_id)).toEqual(['V1P1', 'V1P2', 'V2P1']);
	});

	it('combines passengers and non_passengers into people', () => {
		const crash = new Crash(
			makeCrashRecord({
				vehicles: [
					makeVehicleRecord({
						passengers: [makePersonRecord({ person_id: 'P1' })]
					})
				],
				non_passengers: [makePersonRecord({ person_id: 'NP1', person_type: 'PEDESTRIAN' })]
			})
		);

		expect(crash.people).toHaveLength(2);
		expect(crash.people.map((p) => p.person_id)).toEqual(['P1', 'NP1']);
	});

	it('has empty passengers and people when there are no vehicles or non_passengers', () => {
		const crash = new Crash(makeCrashRecord({ vehicles: [], non_passengers: [] }));
		expect(crash.passengers).toEqual([]);
		expect(crash.people).toEqual([]);
	});
});

describe('people filter properties (via People class)', () => {
	function crashWithPeople(personOverrides: Partial<import('$lib/models/types').PersonRecord>[]) {
		return new Crash(
			makeCrashRecord({
				vehicles: [
					makeVehicleRecord({
						passengers: personOverrides.map((o, i) =>
							makePersonRecord({ person_id: `P${i}`, ...o })
						)
					})
				],
				non_passengers: []
			})
		);
	}

	it('crash.people is a People instance', () => {
		const crash = crashWithPeople([{ person_type: 'DRIVER' }]);
		expect(crash.people).toBeInstanceOf(People);
	});

	it('filters pedestrians', () => {
		const crash = crashWithPeople([
			{ person_type: 'PEDESTRIAN' },
			{ person_type: 'DRIVER' },
			{ person_type: 'PEDESTRIAN' }
		]);
		expect(crash.people.pedestrians).toHaveLength(2);
		expect(crash.people.pedestrians.every((p) => p.isPedestrian)).toBe(true);
	});

	it('filters cyclists', () => {
		const crash = crashWithPeople([{ person_type: 'BICYCLE' }, { person_type: 'DRIVER' }]);
		expect(crash.people.cyclists).toHaveLength(1);
		expect(crash.people.cyclists[0].isCyclist).toBe(true);
	});

	it('filters drivers', () => {
		const crash = crashWithPeople([
			{ person_type: 'DRIVER' },
			{ person_type: 'PEDESTRIAN' },
			{ person_type: 'DRIVER' }
		]);
		expect(crash.people.drivers).toHaveLength(2);
		expect(crash.people.drivers.every((p) => p.isDriver)).toBe(true);
	});

	it('filters killed', () => {
		const crash = crashWithPeople([
			{ injury_classification: 'FATAL' },
			{ injury_classification: 'INCAPACITATING INJURY' },
			{ injury_classification: 'FATAL' }
		]);
		expect(crash.people.killed).toHaveLength(2);
		expect(crash.people.killed.every((p) => p.isKilled)).toBe(true);
	});

	it('filters seriously wounded', () => {
		const crash = crashWithPeople([
			{ injury_classification: 'FATAL' },
			{ injury_classification: 'INCAPACITATING INJURY' },
			{ injury_classification: 'NONINCAPACITATING INJURY' }
		]);
		expect(crash.people.seriously_injured).toHaveLength(1);
		expect(crash.people.seriously_injured[0].isSeriouslyInjured).toBe(true);
	});

	it('returns empty People when no people match', () => {
		const crash = crashWithPeople([
			{ person_type: 'DRIVER', injury_classification: 'NO INDICATION OF INJURY' }
		]);
		expect(crash.people.pedestrians).toHaveLength(0);
		expect(crash.people.cyclists).toHaveLength(0);
		expect(crash.people.killed).toHaveLength(0);
		expect(crash.people.seriously_injured).toHaveLength(0);
	});

	it('chains category and injury filters: pedestrians.killed', () => {
		const crash = crashWithPeople([
			{ person_type: 'PEDESTRIAN', injury_classification: 'FATAL' },
			{ person_type: 'PEDESTRIAN', injury_classification: 'NONINCAPACITATING INJURY' },
			{ person_type: 'DRIVER', injury_classification: 'FATAL' }
		]);
		const result = crash.people.pedestrians.killed;
		expect(result).toHaveLength(1);
		expect(result[0].isPedestrian).toBe(true);
		expect(result[0].isKilled).toBe(true);
	});

	it('chains category and injury filters: cyclists.injured', () => {
		const crash = crashWithPeople([
			{ person_type: 'BICYCLE', injury_classification: 'INCAPACITATING INJURY' },
			{ person_type: 'BICYCLE', injury_classification: 'NO INDICATION OF INJURY' },
			{ person_type: 'DRIVER', injury_classification: 'INCAPACITATING INJURY' }
		]);
		const result = crash.people.cyclists.injured;
		expect(result).toHaveLength(1);
		expect(result[0].isCyclist).toBe(true);
		expect(result[0].isInjured).toBe(true);
	});

	it('chained results are still People instances', () => {
		const crash = crashWithPeople([{ person_type: 'PEDESTRIAN', injury_classification: 'FATAL' }]);
		expect(crash.people.pedestrians).toBeInstanceOf(People);
		expect(crash.people.pedestrians.killed).toBeInstanceOf(People);
	});

	it('People is iterable, spreadable, and has .length', () => {
		const crash = crashWithPeople([{ person_type: 'PEDESTRIAN' }, { person_type: 'PEDESTRIAN' }]);
		const peds = crash.people.pedestrians;
		expect(peds.length).toBe(2);
		expect([...peds]).toHaveLength(2);
		const collected: Person[] = [];
		for (const p of peds) collected.push(p);
		expect(collected).toHaveLength(2);
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

	it('returns a Crashes instance', () => {
		const crashes = parseCrashes([makeCrashRecord()]);
		expect(crashes).toBeInstanceOf(Crashes);
	});
});

describe('Crashes collection', () => {
	it('flattens people from all crashes into one People', () => {
		const crashes = parseCrashes([
			makeCrashRecord({
				vehicles: [
					makeVehicleRecord({
						passengers: [makePersonRecord({ person_id: 'C1P1', person_type: 'DRIVER' })]
					})
				],
				non_passengers: [makePersonRecord({ person_id: 'C1NP1', person_type: 'PEDESTRIAN' })]
			}),
			makeCrashRecord({
				vehicles: [
					makeVehicleRecord({
						passengers: [makePersonRecord({ person_id: 'C2P1', person_type: 'BICYCLE' })]
					})
				],
				non_passengers: []
			})
		]);

		expect(crashes.people).toHaveLength(3);
		expect(crashes.people).toBeInstanceOf(People);
		expect(crashes.people.map((p) => p.person_id)).toEqual(['C1P1', 'C1NP1', 'C2P1']);
	});

	it('chains through People filters: crashes.people.pedestrians.killed', () => {
		const crashes = parseCrashes([
			makeCrashRecord({
				non_passengers: [
					makePersonRecord({
						person_id: 'A',
						person_type: 'PEDESTRIAN',
						injury_classification: 'FATAL'
					})
				]
			}),
			makeCrashRecord({
				non_passengers: [
					makePersonRecord({
						person_id: 'B',
						person_type: 'PEDESTRIAN',
						injury_classification: 'NONINCAPACITATING INJURY'
					}),
					makePersonRecord({
						person_id: 'C',
						person_type: 'DRIVER',
						injury_classification: 'FATAL'
					})
				]
			})
		]);

		const result = crashes.people.pedestrians.killed;
		expect(result).toHaveLength(1);
		expect(result[0].person_id).toBe('A');
	});

	it('is iterable and has .length', () => {
		const crashes = new Crashes(
			new Crash(makeCrashRecord({ crash_record_id: 'x' })),
			new Crash(makeCrashRecord({ crash_record_id: 'y' }))
		);
		expect(crashes.length).toBe(2);
		expect([...crashes]).toHaveLength(2);
		const ids: string[] = [];
		for (const c of crashes) ids.push(c.crash_record_id);
		expect(ids).toEqual(['x', 'y']);
	});

	it('returns empty People when there are no crashes', () => {
		const crashes = new Crashes();
		expect(crashes.people).toHaveLength(0);
		expect(crashes.people).toBeInstanceOf(People);
	});

	it('filters fatal crashes', () => {
		const crashes = parseCrashes([
			makeCrashRecord({ crash_record_id: 'a', injuries_fatal: 1 }),
			makeCrashRecord({ crash_record_id: 'b', injuries_fatal: 0 }),
			makeCrashRecord({ crash_record_id: 'c', injuries_fatal: 2 })
		]);
		const fatal = crashes.fatal;
		expect(fatal).toBeInstanceOf(Crashes);
		expect(fatal).toHaveLength(2);
		expect(fatal.map((c) => c.crash_record_id)).toEqual(['a', 'c']);
	});

	it('filters pedestrian-harmed crashes', () => {
		const crashes = parseCrashes([
			makeCrashRecord({
				crash_record_id: 'ped-hurt',
				non_passengers: [
					makePersonRecord({
						person_type: 'PEDESTRIAN',
						injury_classification: 'INCAPACITATING INJURY'
					})
				]
			}),
			makeCrashRecord({
				crash_record_id: 'driver-only',
				vehicles: [
					makeVehicleRecord({
						passengers: [makePersonRecord({ person_type: 'DRIVER' })]
					})
				],
				non_passengers: []
			}),
			makeCrashRecord({
				crash_record_id: 'ped2',
				vehicles: [
					makeVehicleRecord({
						passengers: [makePersonRecord({ person_type: 'PEDESTRIAN' })]
					})
				]
			})
		]);
		const pedCrashes = crashes.harmed_pedestrians;
		expect(pedCrashes).toBeInstanceOf(Crashes);
		expect(pedCrashes).toHaveLength(1);
		expect(pedCrashes.map((c) => c.crash_record_id)).toEqual(['ped-hurt']);
	});

	it('returns empty Crashes when no (seriously) pedestrian-harmed crashes exist', () => {
		const crashes = parseCrashes([
			makeCrashRecord({
				vehicles: [
					makeVehicleRecord({
						passengers: [makePersonRecord({ person_type: 'DRIVER' })]
					})
				],
				non_passengers: [
					makePersonRecord({
						person_type: 'PEDESTRIAN',
						injury_classification: 'NONINCAPACITATING INJURY' //non-incapacitating injuries not considered "serious harm"
					})
				]
			})
		]);
		expect(crashes.harmed_pedestrians).toHaveLength(0);
		expect(crashes.harmed_pedestrians).toBeInstanceOf(Crashes);
	});

	it('chains: killed_pedestrian', () => {
		const crashes = parseCrashes([
			makeCrashRecord({
				crash_record_id: 'ped-fatal',
				injuries_fatal: 1,
				non_passengers: [
					makePersonRecord({ person_type: 'PEDESTRIAN', injury_classification: 'FATAL' })
				]
			}),
			makeCrashRecord({
				crash_record_id: 'ped-nonfatal',
				injuries_fatal: 0,
				non_passengers: [makePersonRecord({ person_type: 'PEDESTRIAN' })]
			}),
			makeCrashRecord({
				crash_record_id: 'non-ped-fatal',
				injuries_fatal: 1,
				vehicles: [
					makeVehicleRecord({
						passengers: [
							makePersonRecord({ person_type: 'DRIVER', injury_classification: 'FATAL' })
						]
					})
				],
				non_passengers: []
			})
		]);
		const result = crashes.killed_pedestrians;
		expect(result).toHaveLength(1);
		expect(result[0].crash_record_id).toBe('ped-fatal');
	});

	it('harmed_cyclists filters crashes that killed/injured cyclists', () => {
		const crashes = parseCrashes([
			makeCrashRecord({
				crash_record_id: 'biker-dead',
				non_passengers: [
					makePersonRecord({ person_type: 'BICYCLE', injury_classification: 'FATAL' })
				]
			}),
			makeCrashRecord({
				crash_record_id: 'driver-only',
				vehicles: [
					makeVehicleRecord({
						passengers: [makePersonRecord({ person_type: 'DRIVER' })]
					})
				],
				non_passengers: []
			}),
			makeCrashRecord({
				crash_record_id: 'biker-safe',
				vehicles: [
					makeVehicleRecord({
						passengers: [makePersonRecord({ person_type: 'BICYCLE' })]
					})
				]
			})
		]);
		const bikeCrashes = crashes.harmed_cyclists;
		expect(bikeCrashes).toBeInstanceOf(Crashes);
		expect(bikeCrashes).toHaveLength(1);
		expect(bikeCrashes.map((c) => c.crash_record_id)).toEqual(['biker-dead']);
	});
});
