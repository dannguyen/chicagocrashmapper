/**
 * Spatial/geometric functions for database queries
 */

import wellknown from 'wellknown';
import type { DbInstance } from './types';

/**
 * Calculate haversine distance between two points in feet
 */
export function haversineDistanceFeet(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number
): number {
	const toRad = (x: number) => (x * Math.PI) / 180;
	const R = 3.28084 * 6371e3; // feet

	const φ1 = toRad(lat1);
	const φ2 = toRad(lat2);
	const Δφ = toRad(lat2 - lat1);
	const Δλ = toRad(lon2 - lon1);

	const a =
		Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
		Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return R * c;
}

/**
 * Helper function for point-in-polygon check using ray-casting algorithm
 * @param point - [x, y] coordinates
 * @param vs - Array of polygon rings: [ [ [x,y], [x,y]... ], [hole]... ]
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pointInPolygon(point: any, vs: any): boolean {
	// ray-casting algorithm based on
	// https://github.com/substack/point-in-polygon
	// vs = [ [ [x,y], [x,y]... ], [hole]... ]
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
		if (insideHole) return false; // Inside a hole means outside the polygon
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

/**
 * Register custom geospatial functions in SQLite
 */
export function registerGeospatialFunctions(db: DbInstance): void {
	db.createFunction({
		name: 'HAVERSINE_DISTANCE',
		arity: 4,
		deterministic: true,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		xFunc: (ctxPtr: any, lat1: number, lon1: number, lat2: number, lon2: number) => {
			return haversineDistanceFeet(lat1, lon1, lat2, lon2);
		}
	});

	db.createFunction({
		name: 'MakePoint',
		arity: 3,
		deterministic: true,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		xFunc: (_: any, x: number, y: number, srid: number) => {
			return `POINT (${x} ${y})`;
		}
	});

	let lastGeomWkt = '';
	let lastGeom: any = null;

	db.createFunction({
		name: 'ST_Contains',
		arity: 2,
		deterministic: true,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		xFunc: (_: any, geomWkt: string, pointWkt: string) => {
			if (!geomWkt || !pointWkt) return 0;

			// Simple Memoization for the polygon geometry
			if (geomWkt !== lastGeomWkt) {
				try {
					lastGeom = wellknown.parse(geomWkt);
					lastGeomWkt = geomWkt;
				} catch (e) {
					return 0;
				}
			}
			if (!lastGeom) return 0;

			// Parse Point (manual parse is faster than wellknown for simple points)
			// pointWkt is "POINT (x y)"
			const match = pointWkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
			if (!match) return 0;
			const x = parseFloat(match[1]);
			const y = parseFloat(match[2]);
			const point = { type: 'Point', coordinates: [x, y] };

			if (lastGeom.type === 'Polygon') {
				return pointInPolygon(point.coordinates, lastGeom.coordinates) ? 1 : 0;
			} else if (lastGeom.type === 'MultiPolygon') {
				return pointInMultiPolygon(point.coordinates, lastGeom.coordinates) ? 1 : 0;
			}

			return 0;
		}
	});
}
