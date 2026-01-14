/**
 * Database query functions for locations, incidents, and statistics
 */

import wellknown from 'wellknown';
import { Location } from '$lib/location';
import type { IncidentRecord } from '$lib/incident';
import type { DatabaseConnection } from './connection';
import type { LocationRecord, NeighborhoodStat, IntersectionStat, maxLimit } from './types';
import { haversineDistanceFeet } from './spatial';

// Re-export maxLimit for use in queries
export { maxLimit } from './types';

/**
 * Normalize date input to ISO date string (YYYY-MM-DD)
 */
function normalizeDateInput(date: Date | string | null | undefined): string {
	const d = date ? new Date(date) : new Date();
	return d.toISOString().split('T')[0];
}

/**
 * Helper to calculate distance in feet between two lat/lon points
 */
function getDistanceInFeet(lat1: number, lon1: number, lat2: number, lon2: number): number {
	return haversineDistanceFeet(lat1, lon1, lat2, lon2);
}

/**
 * Helper function for point-in-polygon check using ray-casting algorithm
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pointInPolygon(point: any, vs: any): boolean {
	const x = point[0],
		y = point[1];

	let inside = false;
	// Check shell
	const shell = vs[0];
	for (let i = 0, j = shell.length - 1; i < shell.length; j = i++) {
		const xi = shell[i][0],
			yi = shell[i][1];
		const xj = shell[j][0],
			yj = shell[j][1];

		const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
		if (intersect) inside = !inside;
	}

	if (!inside) return false;

	// Check holes
	for (let h = 1; h < vs.length; h++) {
		const hole = vs[h];
		let insideHole = false;
		for (let i = 0, j = hole.length - 1; i < hole.length; j = i++) {
			const xi = hole[i][0],
				yi = hole[i][1];
			const xj = hole[j][0],
				yj = hole[j][1];
			const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
			if (intersect) insideHole = !insideHole;
		}
		if (insideHole) return false;
	}

	return true;
}

/**
 * Check if a point is inside a MultiPolygon
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pointInMultiPolygon(point: any, coords: any): boolean {
	for (let i = 0; i < coords.length; i++) {
		if (pointInPolygon(point, coords[i])) {
			return true;
		}
	}
	return false;
}

// ============================================================================
// Location Queries
// ============================================================================

/**
 * Search locations by name using tokenized search
 */
export function queryLocationsByName(
	conn: DatabaseConnection,
	searchString: string,
	limit: number = 25
): Location[] {
	if (!conn.db || !searchString.trim()) return [];

	const tokens = searchString
		.toUpperCase()
		.split(/\W+/)
		.filter((token) => token !== 'AND' && token.replace(/\W+/g, '').trim() !== '');

	if (tokens.length === 0) return [];

	const conditions = tokens.map((_, index) => `name LIKE :token${index}`).join(' AND ');
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const bind: Record<string, any> = {};
	tokens.forEach((token, index) => {
		bind[`:token${index}`] = `%${token}%`;
	});
	bind[':limit'] = limit;

	const results = conn.db.exec({
		sql: `
			SELECT name, category, latitude, longitude, id, the_geom
			FROM locations
			WHERE ${conditions}
			ORDER BY
				CASE WHEN category = 'intersection' THEN 'zzzz' ELSE category END ASC
			LIMIT :limit
			;

		`,
		bind,
		rowMode: 'object'
	});

	return (results as LocationRecord[]).map((row) => new Location(row));
}

/**
 * Query a single location by ID
 */
export function queryLocationById(conn: DatabaseConnection, id: string): Location | null {
	if (!conn.db) return null;

	const results = conn.db.exec({
		sql: `
			SELECT name, category, latitude, longitude, id, the_geom
			FROM locations
			WHERE id = :id
			LIMIT 1
		`,
		bind: { ':id': id },
		rowMode: 'object'
	});

	return results.length > 0 ? new Location(results[0] as LocationRecord) : null;
}

/**
 * Query locations by category
 */
export function queryLocationsByCategory(conn: DatabaseConnection, category: string): Location[] {
	if (!conn.db) return [];

	const results = conn.db.exec({
		sql: `
			SELECT name, category, latitude, longitude, id, the_geom
			FROM locations
			WHERE category = :category
			ORDER BY name ASC
		`,
		bind: { ':category': category },
		rowMode: 'object'
	});

	return (results as LocationRecord[]).map((row) => new Location(row));
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get statistics for all neighborhoods
 * Note: This performs an in-memory spatial join and may be slow
 */
export function getAllNeighborhoodStats(conn: DatabaseConnection): NeighborhoodStat[] {
	if (!conn.db) return [];

	// 1. Get all neighborhoods
	const neighborhoods = conn.db.exec({
		sql: `SELECT id, name, the_geom FROM locations WHERE category = 'neighborhood'`,
		rowMode: 'object'
	}) as LocationRecord[];

	// 2. Get all incidents
	const incidents = conn.db.exec({
		sql: `SELECT crash_date, latitude, longitude FROM incidents`,
		rowMode: 'object'
	}) as IncidentRecord[];

	// 3. Prepare neighborhoods with parsed geometries
	const hoodStats = neighborhoods.map((hood) => {
		let geom = null;
		try {
			geom = wellknown.parse(hood.the_geom);
		} catch (e) {
			console.warn(`Failed to parse geometry for ${hood.name}`, e);
		}
		return {
			...hood,
			geom,
			count: 0,
			dates: [] as number[] // timestamps
		};
	});

	// 4. Spatial join
	for (const incident of incidents) {
		const lat = incident.latitude;
		const lon = incident.longitude;
		const date = new Date(incident.crash_date).getTime();

		for (const hood of hoodStats) {
			if (!hood.geom) continue;

			let inside = false;
			// Simple point in polygon check
			if (hood.geom.type === 'Polygon') {
				inside = pointInPolygon([lon, lat], hood.geom.coordinates);
			} else if (hood.geom.type === 'MultiPolygon') {
				inside = pointInMultiPolygon([lon, lat], hood.geom.coordinates);
			}

			if (inside) {
				hood.count++;
				hood.dates.push(date);
				// optimization: an incident is likely in only one neighborhood
				// but strictly speaking, polygons could overlap.
				// For neighborhoods, they usually don't.
				// We can break here if we assume disjoint neighborhoods for performance
				break;
			}
		}
	}

	// 5. Aggregate
	return hoodStats.map((hood) => {
		let mostRecent = null;
		let avgPerYear = 0;

		if (hood.count > 0) {
			const dates = hood.dates.sort((a, b) => a - b);
			mostRecent = new Date(dates[dates.length - 1]).toISOString().split('T')[0];

			const minDate = new Date(dates[0]);
			const maxDate = new Date(dates[dates.length - 1]);
			const yearSpan = maxDate.getFullYear() - minDate.getFullYear();
			// If incidents span less than a year (e.g. same year), divide by 1?
			// Or maybe divide by exact time difference?
			// Request said "Incidents/Year Avg".
			// Let's use (count) / (yearSpan + 1) to avoid division by zero and handle single year.
			// Or if yearSpan is 0, it's count/1.
			avgPerYear = hood.count / (yearSpan + 1);
		}

		return {
			id: hood.id,
			name: hood.name,
			totalIncidents: hood.count,
			mostRecent,
			avgPerYear
		};
	});
}

/**
 * Get top 10 intersections by incident count (within 500 feet)
 * Note: This performs an in-memory spatial join and may be slow
 */
export function getTopIntersectionsByIncidentCount(conn: DatabaseConnection): IntersectionStat[] {
	if (!conn.db) return [];

	// 1. Get all intersections
	const intersections = conn.db.exec({
		sql: `SELECT id, name, latitude, longitude FROM locations WHERE category = 'intersection'`,
		rowMode: 'object'
	}) as LocationRecord[];

	// 2. Get all incidents
	const incidents = conn.db.exec({
		sql: `SELECT latitude, longitude FROM incidents`,
		rowMode: 'object'
	}) as IncidentRecord[];

	// 3. Brute force spatial join (optimized for JS)
	// For each intersection, count incidents within 500 feet
	const stats = intersections.map((loc) => {
		let count = 0;
		for (const inc of incidents) {
			const d = getDistanceInFeet(loc.latitude, loc.longitude, inc.latitude, inc.longitude);
			if (d <= 500) {
				count++;
			}
		}
		return {
			id: loc.id,
			name: loc.name,
			count
		};
	});

	// 4. Sort and take top 10
	return stats.sort((a, b) => b.count - a.count).slice(0, 10);
}

/**
 * Get top 10 intersections by most recent incidents
 * Note: This performs an in-memory spatial join and may be slow
 */
export function getTopIntersectionsByRecentIncidents(conn: DatabaseConnection): IntersectionStat[] {
	if (!conn.db) return [];

	// 1. Get recent incidents (fetch more than 10 to account for duplicates or no match)
	const recentIncidents = conn.db.exec({
		sql: `SELECT latitude, longitude, crash_date FROM incidents ORDER BY crash_date DESC LIMIT 50`,
		rowMode: 'object'
	}) as IncidentRecord[];

	// 2. Get all intersections (caching this in memory would be better if called often,
	// but for a page load it's fine)
	const intersections = conn.db.exec({
		sql: `SELECT id, name, latitude, longitude FROM locations WHERE category = 'intersection'`,
		rowMode: 'object'
	}) as LocationRecord[];

	const results: IntersectionStat[] = [];
	const seenIds = new Set<string>();

	for (const inc of recentIncidents) {
		if (results.length >= 10) break;

		// Find nearest intersection within threshold (e.g. 200 feet)
		let nearest: LocationRecord | null = null;
		let minDist = Infinity;

		for (const loc of intersections) {
			const d = getDistanceInFeet(inc.latitude, inc.longitude, loc.latitude, loc.longitude);
			if (d < minDist && d <= 200) {
				minDist = d;
				nearest = loc;
			}
		}

		if (nearest && !seenIds.has(nearest.id)) {
			seenIds.add(nearest.id);
			results.push({
				id: nearest.id,
				name: nearest.name,
				mostRecentDate: new Date(inc.crash_date).toISOString().split('T')[0],
				distance: Math.round(minDist)
			});
		}
	}

	return results;
}

// ============================================================================
// Incident Queries
// ============================================================================

/**
 * Query most recent fatal incidents citywide.
 */
export function queryMostRecentFatalIncidents(
	conn: DatabaseConnection,
	limit: number = 10
): IncidentRecord[] {
	if (!conn.db) return [];

	const results = conn.db.exec({
		sql: `
			SELECT *
				, NULL as distance
			FROM incidents
			WHERE injuries_fatal > 0
			ORDER BY crash_date desc
			LIMIT :limit
			;`,
		bind: {
			':limit': limit
		},
		rowMode: 'object'
	});

	return results as IncidentRecord[];
}

/**
 * Query incidents inside a shape location (e.g., neighborhood, ward)
 */
export function queryIncidentsInsideLocation(
	conn: DatabaseConnection,
	location: Location,
	maxDaysAgo: number = 90,
	selectedDate: Date | string = new Date(),
	limit: number = 1000
): IncidentRecord[] {
	if (!conn.db) return [];
	const pastOffset = `-${maxDaysAgo} days`;
	const futureOffset = `+${maxDaysAgo} days`;
	const selectedDateStr = normalizeDateInput(selectedDate);
	const results = conn.db.exec({
		sql: `
			SELECT *
				, NULL as distance
			FROM incidents
			WHERE
				ST_Contains(
					:geom,
					MakePoint(longitude, latitude, 4326)
				)
				AND crash_date BETWEEN DATE(:selectedDate, :pastOffset) AND DATE(:selectedDate, :futureOffset)
			ORDER BY crash_date desc
			LIMIT :limit
			;`,
		bind: {
			':geom': location.the_geom,
			':limit': limit,
			':selectedDate': selectedDateStr,
			':pastOffset': pastOffset,
			':futureOffset': futureOffset
		},
		rowMode: 'object'
	});

	return results as IncidentRecord[];
}

/**
 * Query incidents near a point location (e.g., intersection, address)
 */
export function queryIncidentsMostRecentNearLocation(
	conn: DatabaseConnection,
	location: Location,
	maxDistance: number = 5280,
	maxDaysAgo: number = 90,
	selectedDate: Date | string = new Date(),
	limit: number = 1000
): IncidentRecord[] {
	if (!conn.db) return [];
	const pastOffset = `-${maxDaysAgo} days`;
	const futureOffset = `+${maxDaysAgo} days`;
	const selectedDateStr = normalizeDateInput(selectedDate);

	const results = conn.db.exec({
		sql: `
			SELECT *
				, HAVERSINE_DISTANCE(latitude, longitude, :lat, :lon) as distance
			FROM incidents
			WHERE
				crash_date BETWEEN DATE(:selectedDate, :pastOffset) AND DATE(:selectedDate, :futureOffset)
				AND HAVERSINE_DISTANCE(latitude, longitude, :lat, :lon) <= :maxDistance
			ORDER BY crash_date desc
			LIMIT :limit
			;`,
		bind: {
			':lat': location.latitude,
			':lon': location.longitude,
			':maxDistance': maxDistance,
			':selectedDate': selectedDateStr,
			':pastOffset': pastOffset,
			':futureOffset': futureOffset,
			':limit': limit
		},
		rowMode: 'object'
	});

	return results as IncidentRecord[];
}

/**
 * Query nearest incidents to a location
 * @deprecated Use queryIncidentsMostRecentNearLocation instead
 */
export function queryIncidentsNearestToLocation(
	conn: DatabaseConnection,
	location: Location,
	maxDistance: number = 5280,
	limit: number = 1000
): IncidentRecord[] {
	if (!conn.db) return [];

	const results = conn.db.exec({
		sql: `
			SELECT *
				, HAVERSINE_DISTANCE(latitude, longitude, :lat, :lon) as distance
			FROM incidents
			WHERE HAVERSINE_DISTANCE(latitude, longitude, :lat, :lon) <= :maxDistance
			ORDER BY crash_date desc
			LIMIT :limit
			;`,
		bind: {
			':lat': location.latitude,
			':lon': location.longitude,
			':maxDistance': maxDistance,
			':limit': limit
		},
		rowMode: 'object'
	});

	return results as IncidentRecord[];
}
