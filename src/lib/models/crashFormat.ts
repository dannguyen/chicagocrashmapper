import { base } from '$app/paths';
import type { Crash } from '$lib/models/crash';
import type { BriefCrash } from '$lib/models/types';
import type { Person } from '$lib/models/person';
import { crashSeverity, severityLabel } from '$lib/severity';
import type { SeverityLevel } from '$lib/severity';
import { SEVERITY_COLORS } from '$lib/constants';

export type FatalityPersonType = 'all' | 'pedestrian' | 'cyclist' | 'driver' | 'passenger';

export function fmtCause(cause: string): string {
	return cause
		.toLowerCase()
		.replace(/\b\w/g, (c) => c.toUpperCase())
		.replace(/Unable To Determine/i, 'Unknown cause')
		.replace(/Not Applicable/i, 'N/A');
}

export function peopleSummary(item: Crash): string {
	const all: Person[] = [...item.vehicles.flatMap((v) => v.passengers), ...item.non_passengers];
	if (all.length === 0) return '';

	const killed = all.filter((p) => p.isKilled);
	const serious = all.filter((p) => p.injury_level === 'incapacitating');
	const minor = all.filter(
		(p) => p.injury_level === 'non-incapacitating' || p.injury_level === 'unclear'
	);

	if (killed.length + serious.length + minor.length === 0) return '';

	const parts: string[] = [];

	if (killed.length === 1) {
		parts.push(`${killed[0].description} killed`);
	} else if (killed.length > 1) {
		parts.push(`${killed.length} people killed`);
	}

	if (serious.length === 1) {
		parts.push(`${serious[0].description} seriously injured`);
	} else if (serious.length > 1) {
		parts.push(`${serious.length} seriously injured`);
	}

	if (minor.length > 0) {
		parts.push(`${minor.length} minor ${minor.length === 1 ? 'injury' : 'injuries'}`);
	}

	return parts.join(', ');
}

export function fatalityRoleLabel(person: Person): string {
	switch (person.person_type) {
		case 'PEDESTRIAN':
			return 'Pedestrian';
		case 'BICYCLE':
			return 'Cyclist';
		case 'DRIVER':
			return 'Driver';
		case 'PASSENGER':
			return 'Passenger';
		default:
			return person.person_type;
	}
}

export function fatalityPeople(item: Crash, filter: FatalityPersonType = 'all'): Person[] {
	const killed = [...item.people.killed];
	if (filter === 'all') {
		return killed;
	}

	return killed.filter((person) => {
		if (filter === 'pedestrian') return person.person_type === 'PEDESTRIAN';
		if (filter === 'cyclist') return person.person_type === 'BICYCLE';
		if (filter === 'driver') return person.person_type === 'DRIVER';
		if (filter === 'passenger') return person.person_type === 'PASSENGER';
		return true;
	});
}

export function contextInfo(item: Crash): string {
	const parts: string[] = [];
	if (item.weather_condition) {
		parts.push(item.weather_condition.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()));
	}
	if (item.trafficway_type && item.trafficway_type !== 'NOT DIVIDED') {
		parts.push(item.trafficway_type.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()));
	}
	return parts.join(' · ');
}

const severityColors: Record<SeverityLevel, string> = SEVERITY_COLORS;

export function popupHtml(item: Crash): string {
	const severity = crashSeverity(item);
	const label = severityLabel(severity).toUpperCase();
	const color = severityColors[severity];
	const people = peopleSummary(item);

	return `<div class="popup-content">
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
	<span style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:${color}">${label}</span>
	<span style="font-size:11px;color:#9ca3af">${item.prettyDate}</span>
</div>
<div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:2px">${fmtCause(item.main_cause)}</div>
${people ? `<div style="font-size:12px;color:#374151;margin-bottom:2px">${people}</div>` : ''}
<a href="${base}/crashes/${item.crash_record_id}" style="font-size:12px;color:#2563eb;text-decoration:none;font-weight:500">See details →</a>
</div>`;
}

function briefSeverity(item: BriefCrash): SeverityLevel {
	if (item.injuries_fatal > 0) return 'fatal';
	if (item.injuries_incapacitating > 0) return 'serious';
	return 'none';
}

export function briefPopupHtml(item: BriefCrash): string {
	const severity = briefSeverity(item);
	const label = severityLabel(severity).toUpperCase();
	const color = severityColors[severity];
	const dateStr = new Date(item.crash_date).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
	const cause = item.cause_prim ? fmtCause(item.cause_prim) : 'Unknown cause';

	return `<div class="popup-content">
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
	<span style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:${color}">${label}</span>
	<span style="font-size:11px;color:#9ca3af">${dateStr}</span>
</div>
<div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:2px">${cause}</div>
<a href="${base}/crashes/${item.crash_record_id}" style="font-size:12px;color:#2563eb;text-decoration:none;font-weight:500">See details →</a>
</div>`;
}

export function crashToBrief(c: Crash): BriefCrash {
	return {
		crash_record_id: c.crash_record_id,
		address: c.address || null,
		latitude: c.latitude,
		longitude: c.longitude,
		crash_date: c.date.toISOString().slice(0, 10),
		crash_type: c.category,
		hit_and_run_i: c.hit_and_run,
		injuries_fatal: c.injuries_fatal,
		injuries_incapacitating: c.injuries_incapacitating,
		injuries_total: c.injuries_total,
		cause_prim: c.primary_cause
	};
}
