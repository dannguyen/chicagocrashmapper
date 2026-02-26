import { prettifyDate } from '$lib/transformHelpers';

const UNKNOWN_CAUSE_LABEL: string = 'UNKNOWN CAUSE';

function normalizeString(value: any): string | null {
	if (value === undefined) {
		return null;
	} else if (Number.isFinite(value)) {
		return value;
	} else {
		return value != null && value.trim() === '' ? null : (value ?? null);
	}
}

function isUnknownCause(cause: string | null | undefined): boolean {
	if (cause == null || cause.trim() === '') return true;
	return ['UNABLE TO DETERMINE', 'NOT APPLICABLE', UNKNOWN_CAUSE_LABEL].includes(cause);
}

export interface PersonRecord {
	person_id?: string | null;
	person_type?: string | null;
	sex?: string | null;
	age?: string | null;
	city?: string | null;
	state?: string | null;
	injury_classification?: string | null;
	drivers_license_state?: string | null;
	airbag_deployed?: string | null;
	ejection?: string | null;
	safety_equipment?: string | null;
	hospital?: string | null;
	physical_condition?: string | null;
	driver_vision?: string | null;
	driver_action?: string | null;
}

export class Person {
	person_id: string | null;
	person_type: string | null;
	sex: string | null;
	age: number | null;
	city: string | null;
	state: string | null;
	injury_classification: string | null;
	drivers_license_state: string | null;
	airbag_deployed: string | null;
	ejection: string | null;
	safety_equipment: string | null;
	hospital: string | null;
	physical_condition: string | null;
	driver_vision: string | null;
	driver_action: string | null;

	constructor(record: PersonRecord = {}) {
		this.person_id = normalizeString(record.person_id);
		this.person_type = normalizeString(record.person_type);
		this.sex = normalizeString(record.sex);
		const ageValue = normalizeString(record.age);
		const parsedAge = ageValue == null ? null : Number(ageValue);
		this.age = parsedAge == null || Number.isNaN(parsedAge) ? null : parsedAge;
		this.city = normalizeString(record.city);
		this.state = normalizeString(record.state);
		this.injury_classification = normalizeString(record.injury_classification);
		this.drivers_license_state = normalizeString(record.drivers_license_state);
		this.airbag_deployed = normalizeString(record.airbag_deployed);
		this.ejection = normalizeString(record.ejection);
		this.safety_equipment = normalizeString(record.safety_equipment);
		this.hospital = normalizeString(record.hospital);
		this.physical_condition = normalizeString(record.physical_condition);
		this.driver_vision = normalizeString(record.driver_vision);
		this.driver_action = normalizeString(record.driver_action);
	}

	get noun(): string {
		if (this.ageUnknown === true) {
			return 'person';
		} else if (this.sex === 'M') {
			return this.age != null && this.age >= 18 ? 'man' : 'boy';
		} else if (this.sex === 'F') {
			return this.age != null && this.age >= 18 ? 'woman' : 'girl';
		} else if (this.age != null && this.age < 1) {
			return 'baby (or age unknown)';
		} else {
			return 'person';
		}
	}

	get ageLabel(): string {
		if (this.ageUnknown === true) {
			return 'age unknown';
		} else if (this.age != null && this.age < 1) {
			return 'baby (or age unknown)';
		} else if (this.age != null && this.age > 0) {
			return `${this.age}-year-old`;
		} else {
			return '(age unknown)';
		}
	}

	get description(): string {
		const thing = [this.ageLabel, this.noun].filter((t) => t != null && t !== '');
		return [...new Set(thing)].join(' ');
	}

	get injury_level(): string {
		if (this.injury_classification === 'FATAL') {
			return 'fatal';
		} else if (this.injury_classification === 'INCAPACITATING INJURY') {
			return 'incapacitating';
		} else if (this.injury_classification === 'NONINCAPACITATING INJURY') {
			return 'non-incapacitating';
		} else if (this.injury_classification === 'NO INDICATION OF INJURY') {
			return 'none';
		} else if (this.injury_classification === 'REPORTED, NOT EVIDENT') {
			return 'unclear';
		} else {
			return 'unknown';
		}
	}

	get isInjured(): boolean {
		return ['fatal', 'incapacitating', 'non-incapacitating', 'unclear'].includes(this.injury_level);
	}

	get injury(): string {
		if (['a', 'e', 'i', 'o', 'u'].includes(this.injury_level[0])) {
			return `an ${this.injury_level} injury`;
		} else {
			return `a ${this.injury_level} injury`;
		}
	}

	get isUninjured(): boolean {
		return ['none'].includes(this.injury_level);
	}

	get isKilled(): boolean {
		return this.injury_level === 'fatal';
	}

	get category(): string | null {
		return this.person_type;
	}
	get isDriver(): boolean {
		return this.category === 'DRIVER';
	}

	get ageUnknown(): boolean {
		return this.isDriver && (this.age == null || this.age <= 1);
	}
}

export interface VehicleRecord {
	vehicle_id?: string | null;
	unit_type?: string | null;
	make?: string | null;
	model?: string | null;
	vehicle_year?: string | null;
	vehicle_defect?: string | null;
	vehicle_type?: string | null;
	vehicle_use?: string | null;
	lic_plate_state?: string | null;
	travel_direction?: string | null;
	maneuver?: string | null;
	passengers?: PersonRecord[];
}

export class Vehicle {
	vehicle_id: string | null;
	unit_type: string | null;
	make: string | null;
	model: string | null;
	vehicle_year: string | null;
	vehicle_defect: string | null;
	vehicle_type: string | null;
	vehicle_use: string | null;
	lic_plate_state: string | null;
	travel_direction: string | null;
	maneuver: string | null;
	passengers: Person[];

	constructor(record: VehicleRecord = {}) {
		this.vehicle_id = normalizeString(record.vehicle_id);
		this.unit_type = normalizeString(record.unit_type);
		this.make = normalizeString(record.make);
		this.model = normalizeString(record.model);
		this.vehicle_year = normalizeString(record.vehicle_year);
		this.vehicle_defect = normalizeString(record.vehicle_defect);
		this.vehicle_type = normalizeString(record.vehicle_type);
		this.vehicle_use = normalizeString(record.vehicle_use);
		this.lic_plate_state = normalizeString(record.lic_plate_state);
		this.travel_direction = normalizeString(record.travel_direction);
		this.maneuver = normalizeString(record.maneuver);
		this.passengers = (record.passengers ?? []).map((p) => new Person(p));
	}

	get description(): string {
		return [this.vehicle_year, this.make, this.model].filter((x) => x != null).join(' ');
	}

	get reportableType(): string | null {
		return this.unit_type == null || this.unit_type === 'DRIVER' ? null : this.unit_type;
	}
}

export interface IncidentRecord {
	crash_record_id: string;
	longitude: number;
	latitude: number;
	injuries_fatal: number;
	injuries_incapacitating: number;
	injuries_total?: number | null;
	injuries_non_incapacitating?: number | null;
	injuries_reported_not_evident?: number | null;
	injuries_no_indication?: number | null;
	injuries_unknown?: number | null;
	hit_and_run_i?: boolean | null;
	posted_speed_limit?: number | null;
	vehicles?: VehicleRecord[] | string | null;
	non_passengers?: PersonRecord[] | string | null;
	first_crash_type: string;
	crash_type?: string;
	street_no?: string | null;
	street_direction?: string;
	street_name?: string;
	crash_date: string;
	prim_contributory_cause?: string;
	sec_contributory_cause?: string;
	weather_condition?: string | null;
	trafficway_type?: string | null;
	distance?: number;
}

export class Incident {
	crash_record_id: string;
	longitude: number;
	latitude: number;
	date: Date;
	category: string;
	distance?: number;
	injuries_fatal: number;
	injuries_incapacitating: number;
	injuries_total: number | null;
	injuries_non_incapacitating: number | null;
	injuries_reported_not_evident: number | null;
	injuries_no_indication: number | null;
	injuries_unknown: number | null;
	hit_and_run: boolean | null;
	posted_speed_limit: number | null;
	street_no?: string | null;
	street_direction?: string | null;
	street_name?: string | null;
	vehicles: Vehicle[];
	non_passengers: Person[];
	primary_cause: string;
	secondary_cause: string;
	weather_condition: string | null;
	trafficway_type: string | null;

	// Constructor now takes raw database row
	constructor(record: IncidentRecord) {
		this.crash_record_id = record.crash_record_id;
		this.longitude = record.longitude;
		this.latitude = record.latitude;
		this.injuries_fatal = record.injuries_fatal;
		this.injuries_incapacitating = record.injuries_incapacitating;
		this.injuries_total = record.injuries_total ?? null;
		this.injuries_non_incapacitating = record.injuries_non_incapacitating ?? null;
		this.injuries_reported_not_evident = record.injuries_reported_not_evident ?? null;
		this.injuries_no_indication = record.injuries_no_indication ?? null;
		this.injuries_unknown = record.injuries_unknown ?? null;
		this.hit_and_run = record.hit_and_run_i ?? null;
		this.posted_speed_limit = record.posted_speed_limit ?? null;
		this.street_no = normalizeString(record.street_no);
		this.street_direction = normalizeString(record.street_direction);
		this.street_name = normalizeString(record.street_name);
		this.date = new Date(Date.parse(record.crash_date));
		this.category = normalizeString(record.first_crash_type) ?? 'Unknown Category';
		// Ensure distance is a number and handle undefined or null values
		this.distance = record.distance != null ? parseFloat(record.distance.toFixed(0)) : undefined;
		this.vehicles = parseVehicles(record.vehicles);
		this.non_passengers = parsePeople(record.non_passengers);
		this.primary_cause = normalizeString(record.prim_contributory_cause) ?? UNKNOWN_CAUSE_LABEL;
		this.secondary_cause = normalizeString(record.sec_contributory_cause) ?? UNKNOWN_CAUSE_LABEL;
		this.weather_condition = normalizeString(record.weather_condition);
		this.trafficway_type = normalizeString(record.trafficway_type);
	}

	get hasKnownCause(): boolean {
		return !isUnknownCause(this.primary_cause);
	}

	get main_cause(): string {
		return this.hasKnownCause ? this.primary_cause : UNKNOWN_CAUSE_LABEL;
	}

	get fullCause(): string {
		if (!this.hasKnownCause) {
			return UNKNOWN_CAUSE_LABEL;
		}

		if (this.primary_cause === this.secondary_cause || isUnknownCause(this.secondary_cause)) {
			return this.primary_cause;
		}

		return `${this.primary_cause} (${this.secondary_cause})`;
	}

	get street_address(): string {
		return [this.street_no, this.street_direction, this.street_name].join(' ');
	}

	get title(): string {
		const headline = [
			this.injuries_fatal > 0 ? `${this.injuries_fatal} killed` : null,
			this.injuries_incapacitating > 0 ? `${this.injuries_incapacitating} seriously injured` : null
		]
			.filter((d) => d !== null)
			.join(', ');

		const dateline = this.date.toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});

		return (
			headline +
			` near ` +
			`${this.street_no ?? ''} ${this.street_direction ?? ''} ` +
			`${this.street_name ?? 'Unknown Street'}` +
			` on ${dateline}`
		);
	}
	get isFatal(): boolean {
		return this.injuries_fatal > 0;
	}
	get prettyDate(): string {
		return prettifyDate(this.date);
	}
}

export function reifyIncidents(items: IncidentRecord[]): Incident[] {
	return items.map((item) => new Incident(item));
}

function parseVehicles(raw: IncidentRecord['vehicles']): Vehicle[] {
	if (!raw) return [];

	let vehicles: VehicleRecord[] = [];
	if (typeof raw === 'string') {
		try {
			vehicles = JSON.parse(raw) as VehicleRecord[];
		} catch (e) {
			return [];
		}
	} else {
		vehicles = raw;
	}

	if (!Array.isArray(vehicles)) return [];
	return vehicles.filter((v) => v.vehicle_id != null).map((v) => new Vehicle(v));
}

function parsePeople(raw: IncidentRecord['non_passengers']): Person[] {
	if (!raw) return [];

	let people: PersonRecord[] = [];
	if (typeof raw === 'string') {
		try {
			people = JSON.parse(raw) as PersonRecord[];
		} catch (e) {
			return [];
		}
	} else {
		people = raw;
	}

	if (!Array.isArray(people)) return [];
	return people.map((p) => new Person(p));
}
