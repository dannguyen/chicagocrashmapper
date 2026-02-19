/**
 * HTTP API client for chicagocrashes-server
 */

import { PUBLIC_API_BASE_URL } from '$env/static/public';
import type {
	LocationRecord,
	NeighborhoodStat,
	WardStat,
	IntersectionStat,
	IncidentSummary,
	DateCountPeriod
} from '$lib/db/types';
import type { IncidentRecord } from '$lib/incident';

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

export async function getLocationById(id: string): Promise<LocationRecord | null> {
	try {
		const data = await apiGet<{ location: LocationRecord }>(`/api/locations/${id}`);
		return data.location;
	} catch {
		return null;
	}
}

export async function getIncidentsNearPoint(
	lat: number,
	lng: number,
	since: string,
	until: string,
	distanceFeet: number,
	limit: number = 1000
): Promise<IncidentRecord[]> {
	const distanceMiles = distanceFeet / 5280;
	const data = await apiGet<{ incidents: (IncidentRecord & { distance_miles?: number })[] }>(
		'/api/incidents/nearpoint',
		{ latitude: lat, longitude: lng, since, until, distance: distanceMiles, limit }
	);
	// Convert distance_miles -> distance in feet for the Incident model
	return data.incidents.map((inc) => ({
		...inc,
		distance: inc.distance_miles != null ? inc.distance_miles * 5280 : undefined
	}));
}

export async function getIncidentsWithin(
	locationId: string,
	since: string,
	until: string,
	limit: number = 1000
): Promise<IncidentRecord[]> {
	const data = await apiGet<{ incidents: IncidentRecord[] }>('/api/incidents/within', {
		location_id: locationId,
		since,
		until,
		limit
	});
	return data.incidents;
}

export async function getRecentIncidents(limit: number = 10): Promise<IncidentRecord[]> {
	const data = await apiGet<{ incidents: IncidentRecord[] }>('/api/incidents/recent', {
		limit
	});
	return data.incidents;
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
	by_recency: IntersectionStat[];
}> {
	return apiGet('/api/intersections/top');
}

export async function getIncidentSummary(params: {
	locationId?: string;
	latitude?: number;
	longitude?: number;
	distance?: number;
	since?: string;
	until?: string;
}): Promise<IncidentSummary> {
	return apiGet<IncidentSummary>('/api/incidents/summary', {
		location_id: params.locationId,
		latitude: params.latitude,
		longitude: params.longitude,
		distance: params.distance,
		since: params.since,
		until: params.until
	});
}

export interface IncidentListResult {
	total: number;
	page: number;
	per_page: number;
	incidents: IncidentRecord[];
}

export async function getIncidentsList(params: {
	locationId?: string;
	latitude?: number;
	longitude?: number;
	distance?: number;
	since?: string;
	until?: string;
	page?: number;
	sort?: 'asc' | 'desc';
}): Promise<IncidentListResult> {
	return apiGet<IncidentListResult>('/api/incidents/list', {
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
	}>('/api/incidents/date-count', { unit, last });
	return data.periods;
}
