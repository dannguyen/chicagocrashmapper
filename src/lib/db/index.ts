/**
 * Barrel export file for backwards compatibility
 * Re-exports all database functionality from the refactored modules
 */

// Types
export type { DbInstance, LocationRecord, NeighborhoodStat, IntersectionStat } from './types';
export { maxLimit } from './types';

// Connection
export { DatabaseConnection, initDb } from './connection';

// Spatial
export { registerGeospatialFunctions, haversineDistanceFeet } from './spatial';

// Queries
export {
	queryLocationsByName,
	queryLocationById,
	queryLocationsByCategory,
	getAllNeighborhoodStats,
	getTopIntersectionsByIncidentCount,
	getTopIntersectionsByRecentIncidents,
	queryMostRecentFatalIncidents,
	queryIncidentsInsideLocation,
	queryIncidentsMostRecentNearLocation,
	queryIncidentsNearestToLocation
} from './queries';
