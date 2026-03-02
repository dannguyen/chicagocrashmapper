import { Person } from '$lib/models/person';
import type { PersonRecord } from '$lib/models/person';

export class Vehicle {
	vehicle_id: number;
	unit_type: string | null;
	make: string | null;
	model: string | null;
	vehicle_year: number | null;
	vehicle_defect: string | null;
	vehicle_type: string | null;
	vehicle_use: string | null;
	lic_plate_state: string | null;
	travel_direction: string | null;
	maneuver: string | null;
	passengers: Person[];

	constructor(record: VehicleRecord) {
		this.vehicle_id = record.vehicle_id;
		this.unit_type = record.unit_type ?? null;
		this.make = record.make ?? null;
		this.model = record.model ?? null;
		this.vehicle_year = record.vehicle_year ?? null;
		this.vehicle_defect = record.vehicle_defect ?? null;
		this.vehicle_type = record.vehicle_type ?? null;
		this.vehicle_use = record.vehicle_use ?? null;
		this.lic_plate_state = record.lic_plate_state ?? null;
		this.travel_direction = record.travel_direction ?? null;
		this.maneuver = record.maneuver ?? null;
		this.passengers = (record.passengers ?? []).map((p) => new Person(p));
	}

	get description(): string {
		return [this.vehicle_year, this.make, this.model].filter((x) => x != null).join(' ');
	}

	get reportableType(): string | null {
		return this.unit_type == null || this.unit_type === 'DRIVER' ? null : this.unit_type;
	}
}

export interface VehicleRecord {
	vehicle_id: number;
	unit_type: string | null;
	make: string | null;
	model: string | null;
	vehicle_year: number | null;
	vehicle_defect: string | null;
	vehicle_type: string | null;
	vehicle_use: string | null;
	lic_plate_state: string | null;
	travel_direction: string | null;
	maneuver: string | null;
	passengers?: PersonRecord[];
}
