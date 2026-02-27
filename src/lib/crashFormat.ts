import { base } from '$app/paths';
import type { Crash, Person } from '$lib/crash';
import { crashSeverity, severityLabel } from '$lib/severity';
import type { SeverityLevel } from '$lib/severity';

export function fmtCause(cause: string): string {
	return cause.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
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

const severityColors: Record<SeverityLevel, string> = {
	fatal: '#dc2626',
	serious: '#7c3aed',
	minor: '#d97706',
	none: '#9ca3af'
};

export function popupHtml(item: Crash, index: number): string {
	const severity = crashSeverity(item);
	const label = severityLabel(severity).toUpperCase();
	const color = severityColors[severity];
	const people = peopleSummary(item);
	const context = contextInfo(item);

	return `<div class="popup-content">
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
	<span style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:${color}">${label}</span>
	<span style="font-size:11px;color:#9ca3af">${item.prettyDate}</span>
</div>
<div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:2px">${fmtCause(item.main_cause)}</div>
${people ? `<div style="font-size:12px;color:#374151;margin-bottom:2px">${people}</div>` : ''}
${context ? `<div style="font-size:12px;color:#9ca3af;margin-bottom:4px">${context}</div>` : ''}
<a href="${base}/crashes/${item.crash_record_id}" style="font-size:12px;color:#2563eb;text-decoration:none;font-weight:500">See details →</a>
</div>`;
}
