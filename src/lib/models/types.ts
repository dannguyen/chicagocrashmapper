/**
 * Shared types and interfaces for client-side models and API payloads.
 */

export type LocationCategory = 'neighborhood' | 'ward' | 'intersection' | 'street';

export interface LocationRecord {
	name: string;
	category: LocationCategory;
	latitude: number;
	longitude: number;
	id: string;
	the_geom: string;
}

export interface AreaStat {
	id: string;
	name: string;
	the_geom?: string | null;
	totalCrashes: number;
	totalFatal: number;
	totalSeriousInjuries: number;
	mostRecent: string | null;
	avgPerYear: number;
	rank: number;
	percentile: number;
}

export interface IntersectionStat {
	id: string;
	name: string;
	latitude: number;
	longitude: number;
	count: number;
	fatal_injuries: number;
	serious_injuries: number;
	mostRecentDate: string | null;
}

export interface CrashSummary {
	total: number;
	fatal_injuries: number;
	injuries_incapacitating: number;
	top_causes: { cause: string; count: number }[];
	by_year: Record<string, number>;
}

export interface DateCountPeriod {
	crash_count: number;
	injuries_fatal: number;
	injuries_incapacitating: number;
}

export interface DenseCrash {
	crash_record_id: string;
	latitude: number;
	longitude: number;
	crash_date: string;
	injuries_fatal: number;
	injuries_incapacitating: number;
	prim_contributory_cause: string | null;
}

export interface PersonRecord {
	person_id: string;
	person_type: string;
	age: number | null;
	airbag_deployed: string | null;
	city: string | null;
	driver_action: string | null;
	driver_vision: string | null;
	drivers_license_state: string | null;
	ejection: string | null;
	hospital: string | null;
	injury_classification: string;
	physical_condition: string | null;
	safety_equipment: string | null;
	sex: string | null;
	state: string | null;
}

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

export interface CrashRecord {
	crash_record_id: string;
	crash_date: string;
	crash_type?: string;
	distance?: number;
	first_crash_type: string;
	hit_and_run_i?: boolean | null;
	injuries_fatal: number;
	injuries_incapacitating: number;
	injuries_no_indication: number;
	injuries_non_incapacitating: number;
	injuries_reported_not_evident: number;
	injuries_total: number;
	injuries_unknown: number;
	latitude: number;
	longitude: number;
	non_passengers?: PersonRecord[] | string | null;
	posted_speed_limit?: number | null;
	prim_contributory_cause?: string;
	sec_contributory_cause?: string;
	street_direction: string;
	street_name: string;
	street_no?: string | null;
	trafficway_type?: string | null;
	vehicles?: VehicleRecord[] | string | null;
	weather_condition?: string | null;
}
