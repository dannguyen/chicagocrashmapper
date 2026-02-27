/**
 * HTTP API client for chicagocrashes-server
 */

import { PUBLIC_API_BASE_URL } from '$env/static/public';
import type {
	LocationRecord,
	NeighborhoodStat,
	WardStat,
	IntersectionStat,
	CrashSummary,
	DateCountPeriod
} from '$lib/db/types';
import type { CrashRecord } from '$lib/crash';

const API_BASE = PUBLIC_API_BASE_URL ?? '';

async function apiGet<T>(
	path: string,
	params: Record<string, string | number | undefined> = {}
): Promise<T> {
	const qs = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined) qs.set(key, String(value));
	}
	const query = qs.toString();
	const url = `${API_BASE}${path}${query ? `?${query}` : ''}`;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
	const data = await res.json();
	return data.response as T;
}

export async function searchLocations(q: string): Promise<LocationRecord[]> {
	if (!q.trim()) return [];
	const data = await apiGet<{ locations: LocationRecord[] }>('/api/locations/search', { q });
	return data.locations;
}

export interface LocationByIdRecord extends LocationRecord {}

export async function getLocationById(id: string): Promise<LocationByIdRecord | null> {
	try {
		const data = await apiGet<{ location: LocationByIdRecord }>(`/api/locations/${id}`);
		return data.location;
	} catch {
		return null;
	}
}

export async function getCrashesNearPoint(
	lat: number,
	lng: number,
	since: string,
	until: string,
	distanceFeet: number,
	limit: number = 1000
): Promise<CrashRecord[]> {
	const distanceMiles = distanceFeet / 5280;
	const data = await apiGet<{ crashes: (CrashRecord & { distance_miles?: number })[] }>(
		'/api/crashes/nearpoint',
		{ latitude: lat, longitude: lng, since, until, distance: distanceMiles, limit }
	);
	// Convert distance_miles -> distance in feet for the Crash model
	return data.crashes.map((inc) => ({
		...inc,
		distance: inc.distance_miles != null ? inc.distance_miles * 5280 : undefined
	}));
}

export async function getCrashesWithin(
	locationId: string,
	since: string,
	until: string,
	limit: number = 1000
): Promise<CrashRecord[]> {
	const data = await apiGet<{ crashes: CrashRecord[] }>('/api/crashes/within', {
		location_id: locationId,
		since,
		until,
		limit
	});
	return data.crashes;
}

export interface CrashByIdResult {
	crash: CrashRecord;
	neighborhood: {
		id: string;
		name: string;
		category: string;
		latitude: number;
		longitude: number;
	} | null;
	ward: { id: string; name: string; category: string; latitude: number; longitude: number } | null;
}

export async function getCrashById(id: string): Promise<CrashByIdResult | null> {
	try {
		return await apiGet<CrashByIdResult>(`/api/crashes/${encodeURIComponent(id)}`);
	} catch {
		return null;
	}
}

export async function getRecentCrashes(limit: number = 10): Promise<CrashRecord[]> {
	const data = await apiGet<{ crashes: CrashRecord[] }>('/api/crashes/recent', {
		limit
	});
	return data.crashes;
}

export async function getNeighborhoodStats(): Promise<NeighborhoodStat[]> {
	const data = await apiGet<{ stats: NeighborhoodStat[] }>('/api/neighborhoods/stats');
	return data.stats;
}

export async function getWardStats(): Promise<WardStat[]> {
	const data = await apiGet<{ stats: WardStat[] }>('/api/wards/stats');
	return data.stats;
}

export async function getTopIntersections(): Promise<{
	by_count: IntersectionStat[];
	by_recent_90_days: IntersectionStat[];
	by_recency: IntersectionStat[];
}> {
	return apiGet('/api/intersections/top', { limit: 20, recent_days: 90 });
}

export async function getCrashSummary(params: {
	locationId?: string;
	latitude?: number;
	longitude?: number;
	distance?: number;
	since?: string;
	until?: string;
}): Promise<CrashSummary> {
	return apiGet<CrashSummary>('/api/crashes/summary', {
		location_id: params.locationId,
		latitude: params.latitude,
		longitude: params.longitude,
		distance: params.distance,
		since: params.since,
		until: params.until
	});
}

export interface CrashListResult {
	total: number;
	page: number;
	per_page: number;
	crashes: CrashRecord[];
}

export async function getCrashesList(params: {
	locationId?: string;
	latitude?: number;
	longitude?: number;
	distance?: number;
	since?: string;
	until?: string;
	page?: number;
	sort?: 'asc' | 'desc';
}): Promise<CrashListResult> {
	return apiGet<CrashListResult>('/api/crashes/list', {
		location_id: params.locationId,
		latitude: params.latitude,
		longitude: params.longitude,
		distance: params.distance,
		since: params.since,
		until: params.until,
		page: params.page,
		sort: params.sort
	});
}

export async function getDateCount(
	unit: 'day' | 'month' | 'year' = 'month',
	last: number = 18
): Promise<Record<string, DateCountPeriod>> {
	const data = await apiGet<{
		unit: string;
		last: number;
		periods: Record<string, DateCountPeriod>;
	}>('/api/crashes/date-count', { unit, last });
	return data.periods;
}
