import type { CrashRecord, PersonRecord, VehicleRecord } from '$lib/crash';
import type { LocationRecord } from '$lib/db/types';

export function makePersonRecord(overrides: Partial<PersonRecord> = {}): PersonRecord {
	return {
		person_id: 'person-1',
		person_type: 'DRIVER',
		sex: 'M',
		age: 31,
		city: 'Chicago',
		state: 'IL',
		injury_classification: 'NONINCAPACITATING INJURY',
		drivers_license_state: 'IL',
		airbag_deployed: null,
		ejection: null,
		safety_equipment: null,
		hospital: null,
		physical_condition: null,
		driver_vision: null,
		driver_action: null,
		...overrides
	};
}

export function makeVehicleRecord(overrides: Partial<VehicleRecord> = {}): VehicleRecord {
	return {
		vehicle_id: 1,
		unit_type: 'DRIVER',
		make: 'Honda',
		model: 'Civic',
		vehicle_year: 2018,
		vehicle_defect: null,
		vehicle_type: null,
		vehicle_use: null,
		lic_plate_state: null,
		travel_direction: null,
		maneuver: null,
		passengers: [],
		...overrides
	};
}

export function makeCrashRecord(overrides: Partial<CrashRecord> = {}): CrashRecord {
	return {
		crash_record_id: 'crash-1',
		longitude: -87.623,
		latitude: 41.881,
		injuries_fatal: 0,
		injuries_incapacitating: 1,
		injuries_total: 1,
		injuries_non_incapacitating: 0,
		injuries_reported_not_evident: 0,
		injuries_no_indication: 0,
		injuries_unknown: 0,
		hit_and_run_i: false,
		posted_speed_limit: 30,
		vehicles: [makeVehicleRecord()],
		non_passengers: [],
		first_crash_type: 'REAR END',
		crash_type: 'INJURY AND / OR TOW DUE TO CRASH',
		street_no: '1200',
		street_direction: 'S',
		street_name: 'MICHIGAN AVE',
		crash_date: '2025-03-15T18:30:00Z',
		prim_contributory_cause: 'FAILING TO REDUCE SPEED TO AVOID CRASH',
		sec_contributory_cause: 'UNABLE TO DETERMINE',
		weather_condition: 'RAIN',
		trafficway_type: 'FOUR WAY',
		distance: 153.4,
		...overrides
	};
}

export function makeLocationRecord(overrides: Partial<LocationRecord> = {}): LocationRecord {
	return {
		id: 'location-1',
		name: 'S MICHIGAN AVE & E ROOSEVELT RD',
		category: 'intersection',
		latitude: 41.866,
		longitude: -87.624,
		the_geom: 'POINT (-87.624 41.866)',
		...overrides
	};
}
