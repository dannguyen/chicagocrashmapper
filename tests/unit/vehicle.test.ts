import { describe, expect, it } from 'vitest';

import { Person, Vehicle } from '$lib/crash';
import { makePersonRecord, makeVehicleRecord } from './fixtures';

describe('Vehicle', () => {
	it('maps passengers into Person instances', () => {
		const vehicle = new Vehicle(
			makeVehicleRecord({
				passengers: [
					makePersonRecord({ person_id: 'P1', person_type: 'DRIVER' }),
					makePersonRecord({
						person_id: 'P2',
						person_type: 'PASSENGER',
						injury_classification: 'INCAPACITATING INJURY'
					})
				]
			})
		);

		expect(vehicle.passengers).toHaveLength(2);
		expect(vehicle.passengers[0]).toBeInstanceOf(Person);
		expect(vehicle.passengers[0].person_id).toBe('P1');
		expect(vehicle.passengers[1].injury).toBe('an incapacitating injury');
	});

	it('defaults passengers to empty array when not provided', () => {
		const record = makeVehicleRecord();
		delete record.passengers;
		const vehicle = new Vehicle(record);
		expect(vehicle.passengers).toEqual([]);
	});

	describe('description', () => {
		it('joins year/make/model', () => {
			const vehicle = new Vehicle(
				makeVehicleRecord({ vehicle_year: 2020, make: 'Toyota', model: 'Camry' })
			);
			expect(vehicle.description).toBe('2020 Toyota Camry');
		});

		it('omits null parts', () => {
			expect(new Vehicle(makeVehicleRecord({ vehicle_year: null, model: null })).description).toBe(
				'Honda'
			);
			expect(
				new Vehicle(makeVehicleRecord({ vehicle_year: null, make: null, model: null })).description
			).toBe('');
		});
	});

	describe('reportableType', () => {
		it('returns null for DRIVER or null unit_type', () => {
			expect(new Vehicle(makeVehicleRecord({ unit_type: 'DRIVER' })).reportableType).toBeNull();
			expect(new Vehicle(makeVehicleRecord({ unit_type: null })).reportableType).toBeNull();
		});

		it('returns the unit_type for non-driver types', () => {
			expect(new Vehicle(makeVehicleRecord({ unit_type: 'PARKED' })).reportableType).toBe('PARKED');
			expect(new Vehicle(makeVehicleRecord({ unit_type: 'BICYCLE' })).reportableType).toBe(
				'BICYCLE'
			);
			expect(new Vehicle(makeVehicleRecord({ unit_type: 'PEDESTRIAN' })).reportableType).toBe(
				'PEDESTRIAN'
			);
			expect(new Vehicle(makeVehicleRecord({ unit_type: 'BUS' })).reportableType).toBe('BUS');
		});
	});
});
