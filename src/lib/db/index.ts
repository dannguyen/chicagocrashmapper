/**
 * Re-exports shared types from the data layer.
 * Database-specific code has been replaced by the API client in $lib/api/client.ts
 */

export type {
	LocationRecord,
	NeighborhoodStat,
	IntersectionStat,
	IncidentSummary,
	DateCountPeriod
} from './types';
export { maxLimit } from './types';
