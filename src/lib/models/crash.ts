import { prettifyDate } from '$lib/transformHelpers';

import { Person, People } from '$lib/models/person';
import { Vehicle } from '$lib/models/vehicle';
import type { CrashRecord, PersonRecord, VehicleRecord } from '$lib/models/types';

const UNKNOWN_CAUSE_LABEL: string = 'UNKNOWN CAUSE';

function isUnknownCause(cause: string | null | undefined): boolean {
	if (cause == null || cause.trim() === '') return true;
	return ['UNABLE TO DETERMINE', 'NOT APPLICABLE', UNKNOWN_CAUSE_LABEL].includes(cause);
}

export class Crash {
	category: string;
	crash_record_id: string;
	date: Date;
	distance?: number;
	hit_and_run: boolean | null;
	injuries_fatal: number;
	injuries_incapacitating: number;
	injuries_no_indication: number;
	injuries_non_incapacitating: number;
	injuries_reported_not_evident: number;
	injuries_total: number;
	injuries_unknown: number;
	latitude: number;
	longitude: number;
	non_passengers: People;
	passengers: People;
	people: People;
	posted_speed_limit: number | null;
	primary_cause: string;
	secondary_cause: string;
	street_direction: string;
	street_name: string;
	street_no?: string | null;
	trafficway_type: string | null;
	vehicles: Vehicle[];
	weather_condition: string | null;

	constructor(record: CrashRecord) {
		this.crash_record_id = record.crash_record_id;
		this.category = record.first_crash_type;
		this.date = new Date(Date.parse(record.crash_date));
		this.distance = record.distance != null ? parseFloat(record.distance.toFixed(0)) : undefined;
		this.hit_and_run = record.hit_and_run_i ?? null;
		this.injuries_fatal = record.injuries_fatal;
		this.injuries_incapacitating = record.injuries_incapacitating;
		this.injuries_no_indication = record.injuries_no_indication;
		this.injuries_non_incapacitating = record.injuries_non_incapacitating;
		this.injuries_reported_not_evident = record.injuries_reported_not_evident;
		this.injuries_total = record.injuries_total;
		this.injuries_unknown = record.injuries_unknown;
		this.latitude = record.latitude;
		this.longitude = record.longitude;
		this.posted_speed_limit = record.posted_speed_limit ?? null;
		this.primary_cause = record.prim_contributory_cause ?? UNKNOWN_CAUSE_LABEL;
		this.secondary_cause = record.sec_contributory_cause ?? UNKNOWN_CAUSE_LABEL;
		this.street_direction = record.street_direction;
		this.street_name = record.street_name;
		this.street_no = record.street_no ?? null;
		this.trafficway_type = record.trafficway_type ?? null;
		this.vehicles = parseVehicles(record.vehicles);
		this.passengers = new People(...parsePassengers(this.vehicles));
		this.non_passengers = new People(...parsePeople(record.non_passengers));
		this.people = new People(...this.passengers, ...this.non_passengers);
		this.weather_condition = record.weather_condition ?? null;
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

	get harmedChildren(): boolean {
		return this.people.seriously_harmed.children.length > 0;
	}

	get harmedCyclists(): boolean {
		return this.people.seriously_harmed.cyclists.length > 0;
	}

	get harmedPedestrians(): boolean {
		return this.people.seriously_harmed.pedestrians.length > 0;
	}

	get hasKnownCause(): boolean {
		return !isUnknownCause(this.primary_cause);
	}

	get isFatal(): boolean {
		return this.injuries_fatal > 0;
	}

	get killedChildren(): boolean {
		return this.people.killed.children.length > 0;
	}

	get killedCyclists(): boolean {
		return this.people.killed.cyclists.length > 0;
	}

	get killedPedestrians(): boolean {
		return this.people.killed.pedestrians.length > 0;
	}

	get main_cause(): string {
		return this.hasKnownCause ? this.primary_cause : UNKNOWN_CAUSE_LABEL;
	}

	get prettyDate(): string {
		return prettifyDate(this.date);
	}

	get prettyTime(): string {
		return this.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
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
}

export class Crashes extends Array<Crash> {
	get fatal(): Crashes {
		return new Crashes(...this.filter((c) => c.isFatal));
	}
	get harmed_children(): Crashes {
		return new Crashes(...this.filter((c) => c.harmedChildren));
	}
	get harmed_cyclists(): Crashes {
		return new Crashes(...this.filter((c) => c.harmedCyclists));
	}
	get harmed_pedestrians(): Crashes {
		return new Crashes(...this.filter((c) => c.harmedPedestrians));
	}
	get killed_children(): Crashes {
		return new Crashes(...this.filter((c) => c.killedChildren));
	}
	get killed_cyclists(): Crashes {
		return new Crashes(...this.filter((c) => c.killedCyclists));
	}
	get killed_pedestrians(): Crashes {
		return new Crashes(...this.filter((c) => c.killedPedestrians));
	}

	get people(): People {
		return new People(...this.flatMap((c) => c.people));
	}
}

export function parseCrashes(items: CrashRecord[]): Crashes {
	return new Crashes(...items.map((item) => new Crash(item)));
}

function parsePassengers(vehicles: Vehicle[]): Person[] {
	return vehicles.flatMap((v) => v.passengers);
}

function parsePeople(raw: CrashRecord['non_passengers']): Person[] {
	if (!raw) return [];

	if (!Array.isArray(raw)) {
		console.warn('Unexpected non_passengers payload', raw);
		return [];
	}

	return raw.map((p: PersonRecord) => new Person(p));
}

function parseVehicles(raw: CrashRecord['vehicles']): Vehicle[] {
	if (!raw) return [];
	if (!Array.isArray(raw)) {
		console.warn('Unexpected vehicles payload', raw);
		return [];
	}

	return raw.filter((v: VehicleRecord) => v.vehicle_id != null).map((v) => new Vehicle(v));
}
