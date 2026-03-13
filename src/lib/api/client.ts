/**
 * HTTP API client for chicagocrashes-server
 */

import { PUBLIC_API_BASE_URL } from '$env/static/public';
import { BriefCrash, parseBriefCrashes } from '$lib/models/briefCrash';
import type {
	LocationRecord,
	AreaStat,
	IntersectionStat,
	CrashSummary,
	DateCountPeriod,
	BriefCrashRecord,
	CrashRecord
} from '$lib/models/types';

const API_BASE = PUBLIC_API_BASE_URL ?? '';
type FetchImpl = typeof fetch;

function normalizeHitAndRun(value: unknown): boolean | null {
	if (value == null) return null;
	if (typeof value === 'boolean') return value;
	if (typeof value === 'number') return value !== 0;
	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase();
		if (normalized === '1' || normalized === 'true' || normalized === 'y') return true;
		if (normalized === '0' || normalized === 'false' || normalized === 'n') return false;
	}
	return null;
}

function normalizeCrashRecord(record: CrashRecord): CrashRecord {
	return {
		...record,
		hit_and_run_i: normalizeHitAndRun(record.hit_and_run_i)
	};
}

async function apiGet<T>(
	path: string,
	params: Record<string, string | number | undefined> = {},
	fetchImpl: FetchImpl = fetch
): Promise<T> {
	const qs = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined) qs.set(key, String(value));
	}
	const query = qs.toString();
	const url = `${API_BASE}${path}${query ? `?${query}` : ''}`;
	const res = await fetchImpl(url);
	if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
	const data = await res.json();
	return data.response as T;
}

export async function searchLocations(q: string): Promise<LocationRecord[]> {
	if (!q.trim()) return [];
	const data = await apiGet<{ locations: LocationRecord[] }>('/api/locations/search', { q });
	return data.locations;
}

export async function getLocationById(
	id: string,
	fetchImpl: FetchImpl = fetch
): Promise<LocationRecord | null> {
	try {
		const data = await apiGet<{ location: LocationRecord }>(`/api/locations/${id}`, {}, fetchImpl);
		return data.location;
	} catch {
		return null;
	}
}

export interface NearbyLocation {
	id: string;
	name: string;
	latitude: number;
	longitude: number;
	total_crashes: number;
}

export async function getNearbyLocations(
	locationId: string,
	limit: number = 5
): Promise<NearbyLocation[]> {
	const data = await apiGet<{ locations: NearbyLocation[] }>(
		`/api/locations/${encodeURIComponent(locationId)}/nearby`,
		{ limit }
	);
	return data.locations;
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
		...normalizeCrashRecord(inc),
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
	return data.crashes.map(normalizeCrashRecord);
}

export interface LocationInfo {
	id: string;
	name: string;
	category: string;
	latitude: number;
	longitude: number;
}

export interface NearbyCrash {
	crash_record_id: string;
	crash_date: string;
	latitude: number;
	longitude: number;
	address: string | null;
	crash_type: string;
	cause_prim: string | null;
	injuries_fatal: number;
	injuries_incapacitating: number;
	injuries_total: number;
	distance_miles: number;
}

export interface CrashByIdResult {
	crash: CrashRecord;
	neighborhood: LocationInfo | null;
	ward: LocationInfo | null;
	intersections: LocationInfo[];
	nearby_crashes: NearbyCrash[];
}

export async function getCrashById(
	id: string,
	fetchImpl: FetchImpl = fetch
): Promise<CrashByIdResult | null> {
	try {
		const data = await apiGet<CrashByIdResult>(
			`/api/crashes/${encodeURIComponent(id)}`,
			{},
			fetchImpl
		);
		return {
			...data,
			crash: normalizeCrashRecord(data.crash)
		};
	} catch {
		return null;
	}
}

export async function getNeighborhoodStats(): Promise<AreaStat[]> {
	const data = await apiGet<{ stats: AreaStat[] }>('/api/neighborhoods/stats');
	return data.stats;
}

export async function getWardStats(): Promise<AreaStat[]> {
	const data = await apiGet<{ stats: AreaStat[] }>('/api/wards/stats');
	return data.stats;
}

export async function getStreetStats(limit: number = 50): Promise<AreaStat[]> {
	const data = await apiGet<{ stats: AreaStat[] }>('/api/streets/stats', { limit });
	return data.stats;
}

export async function getTopIntersections(): Promise<{
	by_count: IntersectionStat[];
	by_recent: IntersectionStat[];
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
	perPage?: number;
	sort?: 'asc' | 'desc';
	fatalOnly?: boolean;
}): Promise<CrashListResult> {
	const data = await apiGet<CrashListResult>('/api/crashes/list', {
		location_id: params.locationId,
		latitude: params.latitude,
		longitude: params.longitude,
		distance: params.distance,
		since: params.since,
		until: params.until,
		page: params.page,
		per_page: params.perPage,
		sort: params.sort,
		fatal_only: params.fatalOnly ? 'true' : undefined
	});
	return {
		...data,
		crashes: data.crashes.map(normalizeCrashRecord)
	};
}

export interface BriefCrashResult {
	total: number;
	crashes: BriefCrash[];
}

export async function getCrashesBrief(params?: {
	since?: string;
	until?: string;
	locationId?: string;
}): Promise<BriefCrashResult> {
	const data = await apiGet<{ total: number; crashes: BriefCrashRecord[] }>('/api/crashes/brief', {
		since: params?.since,
		until: params?.until,
		location_id: params?.locationId
	});
	return {
		total: data.total,
		crashes: parseBriefCrashes(data.crashes)
	};
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
export async function getYearToDateComparison(
	date: Date = new Date()
): Promise<Record<string, DateCountPeriod>> {
	const dateStr = date.toISOString().slice(0, 10);
	const data = await apiGet<{
		unit: string;
		last: number;
		periods: Record<string, DateCountPeriod>;
	}>('/api/crashes/ytd-comparison', { date: dateStr });
	return data.periods;
}
