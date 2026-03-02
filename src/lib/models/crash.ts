import { prettifyDate } from '$lib/transformHelpers';

import { Person } from '$lib/models/person';
import type { PersonRecord } from '$lib/models/person';
import { Vehicle } from '$lib/models/vehicle';
import type { VehicleRecord } from '$lib/models/vehicle';

const UNKNOWN_CAUSE_LABEL: string = 'UNKNOWN CAUSE';

function isUnknownCause(cause: string | null | undefined): boolean {
	if (cause == null || cause.trim() === '') return true;
	return ['UNABLE TO DETERMINE', 'NOT APPLICABLE', UNKNOWN_CAUSE_LABEL].includes(cause);
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
		const time = this.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

		return (
			headline +
			` near ` +
			`${this.street_no ?? ''} ${this.street_direction} ` +
			`${this.street_name}` +
			` on ${dateline} at ${time}`
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
