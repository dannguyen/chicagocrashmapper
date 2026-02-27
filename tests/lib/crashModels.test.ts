import { describe, it, expect } from 'vitest';
import { Person, Vehicle, type PersonRecord, type VehicleRecord, Crash } from '$lib/crash';

function datelineFor(crashDate: string): string {
	return new Date(Date.parse(crashDate)).toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	});
}

describe('Person', () => {
	it('builds with provided fields', () => {
		const record: PersonRecord = {
			person_id: 'P1',
			person_type: 'DRIVER',
			sex: 'F',
			age: '30',
			city: 'Chicago',
			state: 'IL',
			injury_classification: 'FATAL'
		};

		const person = new Person(record);

		expect(person.person_id).toBe('P1');
		expect(person.person_type).toBe('DRIVER');
		expect(person.sex).toBe('F');
		expect(person.age).toBe(30);
		expect(person.city).toBe('Chicago');
		expect(person.state).toBe('IL');
		expect(person.injury_classification).toBe('FATAL');
		expect(person.injury_level).toBe('fatal');
		expect(person.injury).toBe('a fatal injury');

		expect(person.isKilled).toBe(true);
		expect(person.isInjured).toBe(true);
	});

	it('handles missing fields gracefully', () => {
		const person = new Person();
		expect(person.person_id).toBeNull();
		expect(person.city).toBeNull();
	});

	it('treats blank or non-numeric ages as null', () => {
		const blank = new Person({ age: '' });
		expect(blank.age).toBeNull();
		expect(blank.ageLabel).toBe('(age unknown)');

		const whitespace = new Person({ age: '  ' });
		expect(whitespace.age).toBeNull();

		const bad = new Person({ age: 'not-a-number' });
		expect(bad.age).toBeNull();
	});

	it('derives ageLabel', () => {
		const baby = new Person({ age: '0' });
		expect(baby.ageLabel).toBe('baby (or age unknown)');

		const kid = new Person({ age: '1' });
		expect(kid.ageLabel).toBe('1-year-old');

		const woman = new Person({ age: '123', sex: 'F' });
		expect(woman.ageLabel).toBe('123-year-old');

		const ageless = new Person({ sex: 'F' });
		expect(ageless.ageLabel).toBe('(age unknown)');
	});

	it('derives noun by sex/age and builds description', () => {
		const baby = new Person({ sex: 'M', age: '0' });
		expect(baby.age).toBe(0);
		expect(baby.noun).toBe('boy');
		expect(baby.description).toBe('baby (or age unknown) boy');

		const man = new Person({ sex: 'M', age: '30' });
		expect(man.noun).toBe('man');
		expect(man.description).toBe('30-year-old man');

		const girl = new Person({ sex: 'F', age: '15' });
		expect(girl.noun).toBe('girl');
		expect(girl.description).toBe('15-year-old girl');

		const neutral = new Person({ sex: 'X', age: '20' });
		expect(neutral.noun).toBe('person');
		expect(neutral.description).toBe('20-year-old person');

		const infant = new Person({ age: '0.5', sex: 'X' });
		expect(infant.age).toBe(0.5);
		expect(infant.noun).toBe('baby (or age unknown)');
		expect(infant.description).toBe('baby (or age unknown)');

		const babyboy = new Person({ age: '0.9', sex: 'M' });
		expect(babyboy.age).toBe(0.9);
		expect(babyboy.noun).toBe('boy');
		expect(babyboy.description).toBe('baby (or age unknown) boy');
	});

	it('derives isDriver from person_type', () => {
		const driver = new Person({ person_type: 'DRIVER' });
		expect(driver.isDriver).toBe(true);

		const passenger = new Person({ person_type: 'PASSENGER' });
		expect(passenger.isDriver).toBe(false);
	});

	it('treats driver age 0/1 or missing as ageUnknown', () => {
		const infantDriver = new Person({ person_type: 'DRIVER', age: '0' });
		expect(infantDriver.ageUnknown).toBe(true);

		const youngDriver = new Person({ person_type: 'DRIVER', age: '1' });
		expect(youngDriver.ageUnknown).toBe(true);

		const agelessDriver = new Person({ person_type: 'DRIVER' });
		expect(agelessDriver.ageUnknown).toBe(true);

		const olderDriver = new Person({ person_type: 'DRIVER', age: '2' });
		expect(olderDriver.ageUnknown).toBe(false);

		const infantPassenger = new Person({ person_type: 'PASSENGER', age: '0' });
		expect(infantPassenger.ageUnknown).toBe(false);
	});
});

describe('Vehicle', () => {
	it('maps passengers into Person instances', () => {
		const record: VehicleRecord = {
			vehicle_id: 'V1',
			unit_type: 'DRIVER',
			make: 'Ford',
			model: 'F-150',
			vehicle_year: '2020',
			vehicle_defect: 'NONE',
			vehicle_type: 'TRUCK',
			vehicle_use: 'PERSONAL',
			passengers: [
				{ person_id: 'P1', person_type: 'DRIVER', injury_classification: 'NONE' },
				{
					person_id: 'P2',
					person_type: 'PASSENGER',
					injury_classification: 'INCAPACITATING INJURY'
				}
			]
		};

		const vehicle = new Vehicle(record);

		expect(vehicle.vehicle_id).toBe('V1');
		expect(vehicle.make).toBe('Ford');
		expect(vehicle.passengers).toHaveLength(2);
		expect(vehicle.passengers[0]).toBeInstanceOf(Person);
		expect(vehicle.passengers[0].person_id).toBe('P1');
		expect(vehicle.passengers[1].injury_classification).toBe('INCAPACITATING INJURY');
		expect(vehicle.passengers[1].injury).toBe('an incapacitating injury');
	});

	it('defaults passengers to empty array when not provided', () => {
		const vehicle = new Vehicle({ vehicle_id: 'V2' });
		expect(vehicle.passengers).toEqual([]);
	});

	it('normalizes blank strings to null', () => {
		const vehicle = new Vehicle({
			vehicle_id: '',
			make: ' ',
			model: '',
			passengers: [{ person_id: '', city: '  ' }]
		});

		expect(vehicle.vehicle_id).toBeNull();
		expect(vehicle.make).toBeNull();
		expect(vehicle.model).toBeNull();
		expect(vehicle.passengers[0].person_id).toBeNull();
		expect(vehicle.passengers[0].city).toBeNull();
	});

	it('builds description from year/make/model', () => {
		const vehicle = new Vehicle({ vehicle_year: '2020', make: 'Toyota', model: 'Camry' });
		expect(vehicle.description).toBe('2020 Toyota Camry');

		const partial = new Vehicle({ make: 'Ford' });
		expect(partial.description).toBe('Ford');
	});

	it('reportableType is null for DRIVER or null unit_type, else returns unit_type', () => {
		expect(new Vehicle({ unit_type: 'DRIVER' }).reportableType).toBeNull();
		expect(new Vehicle({ unit_type: null }).reportableType).toBeNull();
		expect(new Vehicle({}).reportableType).toBeNull();

		expect(new Vehicle({ unit_type: 'PARKED' }).reportableType).toBe('PARKED');
		expect(new Vehicle({ unit_type: 'BICYCLE' }).reportableType).toBe('BICYCLE');
		expect(new Vehicle({ unit_type: 'PEDESTRIAN' }).reportableType).toBe('PEDESTRIAN');
		expect(new Vehicle({ unit_type: 'DRIVERLESS' }).reportableType).toBe('DRIVERLESS');
	});
});

describe('Crash vehicles and non_passengers parsing', () => {
	it('parses JSON string vehicles/non_passengers into instances', () => {
		const crash = new Crash({
			crash_record_id: 'TEST-1',
			longitude: -87.7,
			latitude: 41.9,
			injuries_fatal: 0,
			injuries_incapacitating: 1,
			crash_date: '2024-01-01',
			first_crash_type: 'UNKNOWN',
			vehicles: '[{"vehicle_id":"V1","passengers":[{"person_id":"P1"}]}]',
			non_passengers: '[{"person_id":"NP1"}]'
		});

		expect(crash.vehicles).toHaveLength(1);
		expect(crash.vehicles[0]).toBeInstanceOf(Vehicle);
		expect(crash.vehicles[0].passengers[0]).toBeInstanceOf(Person);
		expect(crash.non_passengers).toHaveLength(1);
		expect(crash.non_passengers[0]).toBeInstanceOf(Person);
	});

	it('handles array inputs and bad JSON safely', () => {
		// array input
		const crashFromArrays = new Crash({
			crash_record_id: 'TEST-2',
			longitude: 0,
			latitude: 0,
			injuries_fatal: 0,
			injuries_incapacitating: 0,
			crash_date: '2024-01-02',
			first_crash_type: 'UNKNOWN',
			vehicles: [{ vehicle_id: 'V2', passengers: [{ person_id: 'P2' }] }],
			non_passengers: [{ person_id: 'NP2' }]
		});
		expect(crashFromArrays.vehicles[0].vehicle_id).toBe('V2');
		expect(crashFromArrays.non_passengers[0].person_id).toBe('NP2');

		// bad JSON should not throw
		const crashBadJson = new Crash({
			crash_record_id: 'TEST-3',
			longitude: 0,
			latitude: 0,
			injuries_fatal: 0,
			injuries_incapacitating: 0,
			crash_date: '2024-01-03',
			vehicles: 'not-json',
			non_passengers: 'also-bad',
			first_crash_type: 'whatever'
		});
		expect(crashBadJson.vehicles).toEqual([]);
		expect(crashBadJson.non_passengers).toEqual([]);
	});

	it('formats title and distance with fallbacks', () => {
		const crashDate = '2024-02-01';
		const crash = new Crash({
			crash_record_id: 'TEST-4',
			longitude: -87.7,
			latitude: 41.9,
			injuries_fatal: 0,
			injuries_incapacitating: 2,
			crash_date: crashDate,
			first_crash_type: 'UNKNOWN',
			crash_type: '',
			street_no: null,
			street_direction: 'N',
			street_name: '',
			distance: 1234.56
		});

		expect(crash.title).toBe(
			`2 seriously injured near  N Unknown Street on ${datelineFor(crashDate)}`
		);
		expect(crash.distance).toBe(1235);
	});

	it('builds street_address from street parts', () => {
		const full = new Crash({
			crash_record_id: 'SFN-1',
			longitude: -87.7,
			latitude: 41.9,
			injuries_fatal: 0,
			injuries_incapacitating: 0,
			crash_date: '2024-01-01',
			first_crash_type: 'UNKNOWN',
			street_no: '1200',
			street_direction: 'S',
			street_name: 'State'
		});
		expect(full.street_address).toBe('1200 S State');

		const missingNo = new Crash({
			crash_record_id: 'SFN-2',
			longitude: 0,
			latitude: 0,
			injuries_fatal: 0,
			injuries_incapacitating: 0,
			crash_date: '2024-01-01',
			first_crash_type: 'UNKNOWN',
			street_direction: 'N',
			street_name: 'Michigan'
		});
		expect(full.street_address).toBe('1200 S State');
		expect(missingNo.street_address).toMatch(/N Michigan/);

		const allNull = new Crash({
			crash_record_id: 'SFN-3',
			longitude: 0,
			latitude: 0,
			injuries_fatal: 0,
			injuries_incapacitating: 0,
			crash_date: '2024-01-01',
			first_crash_type: 'UNKNOWN'
		});
		expect(allNull.street_address.trim()).toBe('');
	});

	it('builds title from injury counts and location fields', () => {
		const crashDate = '2024-03-01';
		const crash = new Crash({
			crash_record_id: 'TEST-5',
			longitude: -87.7,
			latitude: 41.9,
			injuries_fatal: 1,
			injuries_incapacitating: 0,
			crash_date: crashDate,
			first_crash_type: 'UNKNOWN',
			street_no: '1200',
			street_direction: 'S',
			street_name: 'State'
		});

		expect(crash.title).toBe(`1 killed near 1200 S State on ${datelineFor(crashDate)}`);
	});

	it('derives hasKnownCause and main_cause for known cause values', () => {
		const crash = new Crash({
			crash_record_id: 'CAUSE-1',
			longitude: 0,
			latitude: 0,
			injuries_fatal: 0,
			injuries_incapacitating: 0,
			crash_date: '2024-04-01',
			first_crash_type: 'UNKNOWN',
			prim_contributory_cause: 'FOLLOWING TOO CLOSELY'
		});

		expect(crash.hasKnownCause).toBe(true);
		expect(crash.main_cause).toBe('FOLLOWING TOO CLOSELY');
	});

	it('uses unknown cause fallback for unresolved primary causes', () => {
		const unableToDetermine = new Crash({
			crash_record_id: 'CAUSE-2',
			longitude: 0,
			latitude: 0,
			injuries_fatal: 0,
			injuries_incapacitating: 0,
			crash_date: '2024-04-01',
			first_crash_type: 'UNKNOWN',
			prim_contributory_cause: 'UNABLE TO DETERMINE'
		});
		expect(unableToDetermine.hasKnownCause).toBe(false);
		expect(unableToDetermine.main_cause).toBe('UNKNOWN CAUSE');

		const notApplicable = new Crash({
			crash_record_id: 'CAUSE-3',
			longitude: 0,
			latitude: 0,
			injuries_fatal: 0,
			injuries_incapacitating: 0,
			crash_date: '2024-04-01',
			first_crash_type: 'UNKNOWN',
			prim_contributory_cause: 'NOT APPLICABLE'
		});
		expect(notApplicable.hasKnownCause).toBe(false);
		expect(notApplicable.main_cause).toBe('UNKNOWN CAUSE');

		const missingPrimaryCause = new Crash({
			crash_record_id: 'CAUSE-4',
			longitude: 0,
			latitude: 0,
			injuries_fatal: 0,
			injuries_incapacitating: 0,
			crash_date: '2024-04-01',
			first_crash_type: 'UNKNOWN'
		});
		expect(missingPrimaryCause.hasKnownCause).toBe(false);
		expect(missingPrimaryCause.main_cause).toBe('UNKNOWN CAUSE');
	});
});
