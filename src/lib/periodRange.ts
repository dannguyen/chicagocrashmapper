import { MONTH_NAMES } from '$lib/constants';
import { pctChange } from '$lib/transformHelpers';
import type { CrashSummary } from '$lib/models/types';

export interface DateRange {
	since: string;
	until: string;
	label: string;
}

export function zeroPad(n: number): string {
	return String(n).padStart(2, '0');
}

function lastDayOfMonth(year: number, month: number): string {
	const date = new Date(year, month, 0);
	return `${year}-${zeroPad(month)}-${zeroPad(date.getDate())}`;
}

function todayStr(): string {
	const date = new Date();
	return `${date.getFullYear()}-${zeroPad(date.getMonth() + 1)}-${zeroPad(date.getDate())}`;
}

function isCurrentYear(year: number): boolean {
	return year === new Date().getFullYear();
}

export function computeRange(year: number, month: number | null): DateRange {
	if (month != null) {
		return {
			since: `${year}-${zeroPad(month)}-01`,
			until: lastDayOfMonth(year, month),
			label: `${MONTH_NAMES[month - 1]} ${year}`
		};
	}

	if (isCurrentYear(year)) {
		return { since: `${year}-01-01`, until: todayStr(), label: `${year} YTD` };
	}

	return { since: `${year}-01-01`, until: `${year}-12-31`, label: String(year) };
}

export function computePrevRange(year: number, month: number | null): DateRange {
	if (month != null) {
		const prevMonth = month === 1 ? 12 : month - 1;
		const prevYear = month === 1 ? year - 1 : year;
		return {
			since: `${prevYear}-${zeroPad(prevMonth)}-01`,
			until: lastDayOfMonth(prevYear, prevMonth),
			label: `${MONTH_NAMES[prevMonth - 1]} ${prevYear}`
		};
	}

	if (isCurrentYear(year)) {
		const today = new Date();
		const prevUntil = `${year - 1}-${zeroPad(today.getMonth() + 1)}-${zeroPad(today.getDate())}`;
		return { since: `${year - 1}-01-01`, until: prevUntil, label: `${year - 1} YTD` };
	}

	return { since: `${year - 1}-01-01`, until: `${year - 1}-12-31`, label: String(year - 1) };
}

export function computeYearAgoRange(year: number, month: number | null): DateRange | null {
	if (month == null) return null;
	return {
		since: `${year - 1}-${zeroPad(month)}-01`,
		until: lastDayOfMonth(year - 1, month),
		label: `${MONTH_NAMES[month - 1]} ${year - 1}`
	};
}

export function computeTwoYearsAgoRange(year: number, month: number | null): DateRange | null {
	if (month != null) return null;

	if (isCurrentYear(year)) {
		const today = new Date();
		return {
			since: `${year - 2}-01-01`,
			until: `${year - 2}-${zeroPad(today.getMonth() + 1)}-${zeroPad(today.getDate())}`,
			label: `${year - 2} YTD`
		};
	}

	return {
		since: `${year - 2}-01-01`,
		until: `${year - 2}-12-31`,
		label: String(year - 2)
	};
}

export function summaryDelta(
	current: CrashSummary | null,
	previous: CrashSummary | null,
	getter: (summary: CrashSummary) => number
): number | null {
	if (!current || !previous) return null;
	return pctChange(getter(current), getter(previous));
}
