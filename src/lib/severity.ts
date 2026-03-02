import type { Crash } from '$lib/models/crash';
import type { Person } from '$lib/models/person';

export type SeverityLevel = 'fatal' | 'serious' | 'minor' | 'none';
export type InjuryLevel = 'fatal' | 'serious' | 'minor' | 'unclear' | 'none' | 'unknown';

/** Derives severity level from a crash */
export function crashSeverity(inc: Crash): SeverityLevel {
	if (inc.isFatal) return 'fatal';
	if (inc.injuries_incapacitating > 0) return 'serious';
	if (inc.injuries_non_incapacitating > 0 || inc.injuries_reported_not_evident > 0) {
		return 'minor';
	}
	return 'none';
}

/** Human-readable severity label */
export function severityLabel(level: SeverityLevel): string {
	if (level === 'fatal') return 'Fatal';
	if (level === 'serious') return 'Serious';
	if (level === 'minor') return 'Minor';
	return 'No injury';
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

/** Human-readable injury label (returns empty string for unknown) */
export function injuryLabel(level: InjuryLevel): string {
	if (level === 'fatal') return 'Fatal';
	if (level === 'serious') return 'Serious';
	if (level === 'minor') return 'Minor';
	if (level === 'none') return 'Uninjured';
	if (level === 'unclear') return 'Not evident';
	return '';
}
