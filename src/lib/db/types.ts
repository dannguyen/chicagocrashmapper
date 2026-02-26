/**
 * Shared types and interfaces for the data layer
 */

export type LocationCategory = 'neighborhood' | 'ward' | 'intersection';

export interface LocationRecord {
	name: string;
	category: LocationCategory;
	latitude: number;
	longitude: number;
	id: string;
	the_geom: string;
}

export interface NeighborhoodStat {
	id: string;
	name: string;
	totalIncidents: number;
	totalFatal: number;
	totalSeriousInjuries: number;
	mostRecent: string | null;
	avgPerYear: number;
	rank: number;
	percentile: number;
}

export interface WardStat {
	id: string;
	name: string;
	totalIncidents: number;
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
	count?: number;
	mostRecentDate?: string;
	distance?: number;
}

export interface IncidentSummary {
	total: number;
	fatal_injuries: number;
	incapacitating_injuries: number;
	top_causes: { cause: string; count: number }[];
	by_year: Record<string, number>;
}

export interface DateCountPeriod {
	incident_count: number;
	injuries_fatal: number;
	injuries_incapacitating: number;
}

export const maxLimit: number = 1000;
