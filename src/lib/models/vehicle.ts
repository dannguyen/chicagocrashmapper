import { Person } from '$lib/models/person';
import type { PersonRecord } from '$lib/models/person';

export interface VehicleRecord {
	vehicle_id: number;
	lic_plate_state: string | null;
	make: string | null;
	maneuver: string | null;
	model: string | null;
	passengers?: PersonRecord[];
	travel_direction: string | null;
	unit_type: string | null;
	vehicle_defect: string | null;
	vehicle_type: string | null;
	vehicle_use: string | null;
	vehicle_year: number | null;
}

export class Vehicle {
	lic_plate_state: string | null;
	make: string | null;
	maneuver: string | null;
	model: string | null;
	passengers: Person[];
	travel_direction: string | null;
	unit_type: string | null;
	vehicle_defect: string | null;
	vehicle_id: number;
	vehicle_type: string | null;
	vehicle_use: string | null;
	vehicle_year: number | null;

	constructor(record: VehicleRecord) {
		this.lic_plate_state = record.lic_plate_state ?? null;
		this.make = record.make ?? null;
		this.maneuver = record.maneuver ?? null;
		this.model = record.model ?? null;
		this.passengers = (record.passengers ?? []).map((p) => new Person(p));
		this.travel_direction = record.travel_direction ?? null;
		this.unit_type = record.unit_type ?? null;
		this.vehicle_defect = record.vehicle_defect ?? null;
		this.vehicle_id = record.vehicle_id;
		this.vehicle_type = record.vehicle_type ?? null;
		this.vehicle_use = record.vehicle_use ?? null;
		this.vehicle_year = record.vehicle_year ?? null;
	}

	get description(): string {
		return [this.vehicle_year, this.make, this.model].filter((x) => x != null).join(' ');
	}

	get reportableType(): string | null {
		return this.unit_type == null || this.unit_type === 'DRIVER' ? null : this.unit_type;
	}
}
