import { describe, expect, it } from 'vitest';

import { Crash } from '$lib/models/crash';
import { Person } from '$lib/models/person';
import {
	fatalityPeople,
	fatalityRoleLabel,
	fmtCause,
	peopleSummary
} from '$lib/models/crashFormat';
import { makeCrashRecord, makePersonRecord, makeVehicleRecord } from './fixtures';

describe('fmtCause', () => {
	it('title-cases known causes', () => {
		expect(fmtCause('FAILING TO REDUCE SPEED TO AVOID CRASH')).toBe(
			'Failing To Reduce Speed To Avoid Crash'
		);
	});

	it('replaces UNABLE TO DETERMINE with Unknown cause', () => {
		expect(fmtCause('UNABLE TO DETERMINE')).toBe('Unknown cause');
	});

	it('replaces NOT APPLICABLE with N/A', () => {
		expect(fmtCause('NOT APPLICABLE')).toBe('N/A');
	});
});

describe('peopleSummary', () => {
	it('describes a single killed person', () => {
		const crash = new Crash(
			makeCrashRecord({
				vehicles: [
					makeVehicleRecord({
						passengers: [
							makePersonRecord({
								person_id: 'k1',
								injury_classification: 'FATAL',
								age: 40,
								sex: 'M'
							})
						]
					})
				],
				non_passengers: []
			})
		);
		expect(peopleSummary(crash)).toBe('40-y.o. man killed');
	});

	it('uses count for multiple killed people', () => {
		const crash = new Crash(
			makeCrashRecord({
				vehicles: [
					makeVehicleRecord({
						passengers: [
							makePersonRecord({ person_id: 'k1', injury_classification: 'FATAL' }),
							makePersonRecord({ person_id: 'k2', injury_classification: 'FATAL' })
						]
					})
				],
				non_passengers: []
			})
		);
		expect(peopleSummary(crash)).toContain('2 people killed');
	});

	it('summarizes killed, serious, and minor injuries together', () => {
		const crash = new Crash(
			makeCrashRecord({
				vehicles: [
					makeVehicleRecord({
						passengers: [
							makePersonRecord({ person_id: 'k', injury_classification: 'FATAL', age: 40 }),
							makePersonRecord({
								person_id: 's',
								injury_classification: 'INCAPACITATING INJURY',
								age: 12,
								sex: 'F'
							}),
							makePersonRecord({
								person_id: 'm',
								injury_classification: 'REPORTED, NOT EVIDENT'
							})
						]
					})
				],
				non_passengers: []
			})
		);
		expect(peopleSummary(crash)).toBe(
			'40-y.o. man killed, 12-y.o. girl seriously injured, 1 minor injury'
		);
	});

	it('returns empty string when no people', () => {
		const crash = new Crash(makeCrashRecord({ vehicles: [], non_passengers: [] }));
		expect(peopleSummary(crash)).toBe('');
	});

	it('returns empty string when all people are uninjured', () => {
		const crash = new Crash(
			makeCrashRecord({
				vehicles: [
					makeVehicleRecord({
						passengers: [makePersonRecord({ injury_classification: 'NO INDICATION OF INJURY' })]
					})
				],
				non_passengers: []
			})
		);
		expect(peopleSummary(crash)).toBe('');
	});
});

describe('fatalityPeople', () => {
	it('returns all killed people by default', () => {
		const crash = new Crash(
			makeCrashRecord({
				vehicles: [
					makeVehicleRecord({
						passengers: [
							makePersonRecord({
								person_id: 'p1',
								person_type: 'PEDESTRIAN',
								injury_classification: 'FATAL'
							}),
							makePersonRecord({
								person_id: 'p2',
								person_type: 'DRIVER',
								injury_classification: 'FATAL'
							})
						]
					})
				],
				non_passengers: []
			})
		);

		expect(fatalityPeople(crash).map((person) => person.person_id)).toEqual(['p1', 'p2']);
	});

	it('filters killed people by requested role', () => {
		const crash = new Crash(
			makeCrashRecord({
				vehicles: [
					makeVehicleRecord({
						passengers: [
							makePersonRecord({
								person_id: 'p1',
								person_type: 'PEDESTRIAN',
								injury_classification: 'FATAL'
							}),
							makePersonRecord({
								person_id: 'p2',
								person_type: 'DRIVER',
								injury_classification: 'FATAL'
							})
						]
					})
				],
				non_passengers: []
			})
		);

		expect(fatalityPeople(crash, 'pedestrian').map((person) => person.person_id)).toEqual(['p1']);
		expect(fatalityPeople(crash, 'driver').map((person) => person.person_id)).toEqual(['p2']);
		expect(fatalityPeople(crash, 'cyclist')).toEqual([]);
	});
});

describe('fatalityRoleLabel', () => {
	it('formats known person types for fatality subitems', () => {
		expect(fatalityRoleLabel(new Person(makePersonRecord({ person_type: 'PEDESTRIAN' })))).toBe(
			'Pedestrian'
		);
		expect(fatalityRoleLabel(new Person(makePersonRecord({ person_type: 'BICYCLE' })))).toBe(
			'Cyclist'
		);
	});
});
