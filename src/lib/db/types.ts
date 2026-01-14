/**
 * Shared types and interfaces for the database layer
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbInstance = any;

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

export interface IntersectionStat {
	id: string;
	name: string;
	count?: number;
	mostRecentDate?: string;
	distance?: number;
}

export const maxLimit: number = 1000;
