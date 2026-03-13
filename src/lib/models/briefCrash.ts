import type { BriefCrashRecord } from '$lib/models/types';

function normalizeHitAndRun(value: unknown): boolean | null {
	if (value == null) return null;
	if (typeof value === 'boolean') return value;
	if (typeof value === 'number') return value !== 0;
	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase();
		if (normalized === '1' || normalized === 'true' || normalized === 'y') return true;
		if (normalized === '0' || normalized === 'false' || normalized === 'n') return false;
	}
	return null;
}

export class BriefCrash {
	address: string | null;
	cause_prim: string | null;
	crash_date: string;
	crash_record_id: string;
	crash_type: string;
	hit_and_run_i: boolean | null;
	injuries_fatal: number;
	injuries_incapacitating: number;
	injuries_total: number;
	latitude: number;
	longitude: number;

	constructor(record: BriefCrashRecord) {
		this.address = record.address;
		this.cause_prim = record.cause_prim;
		this.crash_date = record.crash_date;
		this.crash_record_id = record.crash_record_id;
		this.crash_type = record.crash_type;
		this.hit_and_run_i = normalizeHitAndRun(record.hit_and_run_i);
		this.injuries_fatal = record.injuries_fatal;
		this.injuries_incapacitating = record.injuries_incapacitating;
		this.injuries_total = record.injuries_total;
		this.latitude = record.latitude;
		this.longitude = record.longitude;
	}

	get isFatal(): boolean {
		return this.injuries_fatal > 0;
	}

	get isHitAndRun(): boolean {
		return this.hit_and_run_i === true;
	}

	get totalCasualties(): number {
		return this.injuries_fatal + this.injuries_incapacitating;
	}

	get hasMultipleCasualties(): boolean {
		return this.totalCasualties > 1;
	}
}

export function parseBriefCrashes(items: BriefCrashRecord[]): BriefCrash[] {
	return items.map((item) => new BriefCrash(item));
}
