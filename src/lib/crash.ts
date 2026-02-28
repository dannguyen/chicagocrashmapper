import { prettifyDate } from '$lib/transformHelpers';

const UNKNOWN_CAUSE_LABEL: string = 'UNKNOWN CAUSE';

function isUnknownCause(cause: string | null | undefined): boolean {
	if (cause == null || cause.trim() === '') return true;
	return ['UNABLE TO DETERMINE', 'NOT APPLICABLE', UNKNOWN_CAUSE_LABEL].includes(cause);
}

export interface PersonRecord {
	person_id: string;
	person_type: string;
	sex: string | null;
	age: number | null;
	city: string | null;
	state: string | null;
	injury_classification: string;
	drivers_license_state: string | null;
	airbag_deployed: string | null;
	ejection: string | null;
	safety_equipment: string | null;
	hospital: string | null;
	physical_condition: string | null;
	driver_vision: string | null;
	driver_action: string | null;
}

export class Person {
	person_id: string;
	person_type: string;
	sex: string | null;
	age: number | null;
	city: string | null;
	state: string | null;
	injury_classification: string;
	drivers_license_state: string | null;
	airbag_deployed: string | null;
	ejection: string | null;
	safety_equipment: string | null;
	hospital: string | null;
	physical_condition: string | null;
	driver_vision: string | null;
	driver_action: string | null;

	constructor(record: PersonRecord) {
		this.person_id = record.person_id;
		this.person_type = record.person_type;
		this.sex = record.sex ?? null;
		this.age = record.age ?? null;
		this.city = record.city ?? null;
		this.state = record.state ?? null;
		this.injury_classification = record.injury_classification;
		this.drivers_license_state = record.drivers_license_state ?? null;
		this.airbag_deployed = record.airbag_deployed ?? null;
		this.ejection = record.ejection ?? null;
		this.safety_equipment = record.safety_equipment ?? null;
		this.hospital = record.hospital ?? null;
		this.physical_condition = record.physical_condition ?? null;
		this.driver_vision = record.driver_vision ?? null;
		this.driver_action = record.driver_action ?? null;
	}

	get noun(): string {
		if (this.ageUnknown) {
			return 'person';
		} else if (this.age === 0 && this.person_type === 'PASSENGER') {
			return 'baby or person of unknown age';
		} else if (this.sex === 'M') {
			return this.age != null && this.age >= 18 ? 'man' : 'boy';
		} else if (this.sex === 'F') {
			return this.age != null && this.age >= 18 ? 'woman' : 'girl';
		} else {
			return 'person';
		}
	}

	get ageLabel(): string {
		if (this.ageUnknown) {
			return 'age unknown';
		} else if (this.age === 0 && this.person_type === 'PASSENGER') {
			return 'baby or person of unknown age';
		} else if (this.age != null && this.age > 0) {
			return `${this.age}-year-old`;
		} else {
			return 'age unknown';
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

	get category(): string {
		return this.person_type;
	}
	get isDriver(): boolean {
		return this.category === 'DRIVER';
	}

	get ageUnknown(): boolean {
		return this.age === null || (this.age === 0 && this.person_type !== 'PASSENGER');
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

export interface CrashRecord {
	crash_record_id: string;
	longitude: number;
	latitude: number;
	injuries_fatal: number;
	injuries_incapacitating: number;
	injuries_total: number;
	injuries_non_incapacitating: number;
	injuries_reported_not_evident: number;
	injuries_no_indication: number;
	injuries_unknown: number;
	hit_and_run_i?: boolean | null;
	posted_speed_limit?: number | null;
	vehicles?: VehicleRecord[] | string | null;
	non_passengers?: PersonRecord[] | string | null;
	first_crash_type: string;
	crash_type?: string;
	street_no?: string | null;
	street_direction: string;
	street_name: string;
	crash_date: string;
	prim_contributory_cause?: string;
	sec_contributory_cause?: string;
	weather_condition?: string | null;
	trafficway_type?: string | null;
	distance?: number;
}

export class Crash {
	crash_record_id: string;
	longitude: number;
	latitude: number;
	date: Date;
	category: string;
	distance?: number;
	injuries_fatal: number;
	injuries_incapacitating: number;
	injuries_total: number;
	injuries_non_incapacitating: number;
	injuries_reported_not_evident: number;
	injuries_no_indication: number;
	injuries_unknown: number;
	hit_and_run: boolean | null;
	posted_speed_limit: number | null;
	street_no?: string | null;
	street_direction: string;
	street_name: string;
	vehicles: Vehicle[];
	non_passengers: Person[];
	primary_cause: string;
	secondary_cause: string;
	weather_condition: string | null;
	trafficway_type: string | null;

	constructor(record: CrashRecord) {
		this.crash_record_id = record.crash_record_id;
		this.longitude = record.longitude;
		this.latitude = record.latitude;
		this.injuries_fatal = record.injuries_fatal;
		this.injuries_incapacitating = record.injuries_incapacitating;
		this.injuries_total = record.injuries_total;
		this.injuries_non_incapacitating = record.injuries_non_incapacitating;
		this.injuries_reported_not_evident = record.injuries_reported_not_evident;
		this.injuries_no_indication = record.injuries_no_indication;
		this.injuries_unknown = record.injuries_unknown;
		this.hit_and_run = record.hit_and_run_i ?? null;
		this.posted_speed_limit = record.posted_speed_limit ?? null;
		this.street_no = record.street_no ?? null;
		this.street_direction = record.street_direction;
		this.street_name = record.street_name;
		this.date = new Date(Date.parse(record.crash_date));
		this.category = record.first_crash_type;
		this.distance = record.distance != null ? parseFloat(record.distance.toFixed(0)) : undefined;
		this.vehicles = parseVehicles(record.vehicles);
		this.non_passengers = parsePeople(record.non_passengers);
		this.primary_cause = record.prim_contributory_cause ?? UNKNOWN_CAUSE_LABEL;
		this.secondary_cause = record.sec_contributory_cause ?? UNKNOWN_CAUSE_LABEL;
		this.weather_condition = record.weather_condition ?? null;
		this.trafficway_type = record.trafficway_type ?? null;
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
		return [this.street_no, this.street_direction, this.street_name]
			.filter((x) => x != null)
			.join(' ');
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
			`${this.street_no ?? ''} ${this.street_direction} ` +
			`${this.street_name}` +
			` on ${dateline}`
		);
	}
	get isFatal(): boolean {
		return this.injuries_fatal > 0;
	}
	get prettyDate(): string {
		return prettifyDate(this.date);
	}
	get prettyTime(): string {
		return this.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	}
}

export function parseCrashes(items: CrashRecord[]): Crash[] {
	return items.map((item) => new Crash(item));
}

function parseVehicles(raw: CrashRecord['vehicles']): Vehicle[] {
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

function parsePeople(raw: CrashRecord['non_passengers']): Person[] {
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
