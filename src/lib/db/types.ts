/**
 * Shared types and interfaces for the data layer
 */

export interface LocationRecord {
	name: string;
	category: string;
	latitude: number;
	longitude: number;
	id: string;
	the_geom: string;
}

export interface NeighborhoodStat {
	id: string;
	name: string;
	totalIncidents: number;
	mostRecent: string | null;
	avgPerYear: number;
}

export interface WardStat {
	id: string;
	name: string;
	totalIncidents: number;
	mostRecent: string | null;
	avgPerYear: number;
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
	injuries_fatal: number;
	injuries_incapacitating: number;
}

export const maxLimit: number = 1000;
