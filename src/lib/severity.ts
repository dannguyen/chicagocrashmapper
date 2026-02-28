import type { Crash } from '$lib/crash';
import type { Person } from '$lib/crash';

export type SeverityLevel = 'fatal' | 'serious' | 'minor' | 'none';
export type InjuryLevel = 'fatal' | 'serious' | 'minor' | 'unclear' | 'none' | 'unknown';

/** Derives severity level from an crash */
export function crashSeverity(inc: Crash): SeverityLevel {
	if (inc.isFatal) return 'fatal';
	if (inc.injuries_incapacitating > 0) return 'serious';
	if (inc.injuries_non_incapacitating > 0 || inc.injuries_reported_not_evident > 0) {
		return 'minor';
	}
	return 'none';
}

/** CSS class for card left border */
export function severityBorderClass(level: SeverityLevel): string {
	if (level === 'fatal') return 'border-l-red-600';
	if (level === 'serious') return 'border-l-purple-600';
	if (level === 'minor') return 'border-l-amber-500';
	return 'border-l-gray-200';
}

/** CSS class for circular badge background+text */
export function severityBadgeClass(level: SeverityLevel): string {
	if (level === 'fatal') return 'bg-red-100 text-red-700';
	if (level === 'serious') return 'bg-purple-100 text-purple-700';
	if (level === 'minor') return 'bg-amber-100 text-amber-700';
	return 'bg-gray-100 text-gray-600';
}

/** CSS class for map-pin / numbered badge background (solid color, white text) */
export function severityPinClass(level: SeverityLevel): string {
	if (level === 'fatal') return 'bg-red-600';
	if (level === 'serious') return 'bg-purple-600';
	if (level === 'minor') return 'bg-amber-500';
	return 'bg-gray-400';
}

/** Human-readable severity label */
export function severityLabel(level: SeverityLevel): string {
	if (level === 'fatal') return 'Fatal';
	if (level === 'serious') return 'Serious';
	if (level === 'minor') return 'Minor';
	return 'No injury';
}

/** CSS class for severity label text */
export function severityLabelClass(level: SeverityLevel): string {
	if (level === 'fatal') return 'text-red-600';
	if (level === 'serious') return 'text-purple-600';
	if (level === 'minor') return 'text-amber-600';
	return 'text-gray-400';
}

/** Derives injury level from a Person */
export function personInjuryLevel(p: Person): InjuryLevel {
	const lvl = p.injury_level;
	if (lvl === 'fatal') return 'fatal';
	if (lvl === 'incapacitating') return 'serious';
	if (lvl === 'non-incapacitating') return 'minor';
	if (lvl === 'unclear') return 'unclear';
	if (lvl === 'none') return 'none';
	return 'unknown';
}

/** CSS class for injury dot color */
export function injuryDotClass(level: InjuryLevel): string {
	if (level === 'fatal') return 'bg-red-600';
	if (level === 'serious') return 'bg-purple-600';
	if (level === 'minor') return 'bg-amber-500';
	if (level === 'none') return 'bg-green-600';
	return 'bg-gray-400';
}

/** CSS class for injury text color */
export function injuryTextClass(level: InjuryLevel): string {
	if (level === 'fatal') return 'text-red-600 font-semibold';
	if (level === 'serious') return 'text-purple-600 font-semibold';
	if (level === 'minor') return 'text-amber-600';
	if (level === 'none') return 'text-green-600';
	return 'text-gray-400';
}

/** Human-readable injury label (returns empty string for unknown) */
export function injuryLabel(level: InjuryLevel): string {
	if (level === 'fatal') return 'Fatal';
	if (level === 'serious') return 'Serious';
	if (level === 'minor') return 'Minor';
	if (level === 'none') return 'Uninjured';
	if (level === 'unclear') return 'Not evident';
	return '';
}
