export const SITE_NAME = 'Chicago Crash Mapper';
export const SEARCH_DEBOUNCE_MS = 700;
export const AUTOCOMPLETE_DEBOUNCE_MS = 300;
export const BLUR_DELAY_MS = 200;
export const DEFAULT_MAX_DISTANCE_FT = 2500;
export const DEFAULT_MAX_DAYS = 540;

export const CHICAGO_CENTER: [number, number] = [41.8781, -87.6298];

export const MONTH_NAMES = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

export const MONTH_SHORT = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec'
];

export const SEVERITY_COLORS = {
	fatal: '#dc2626',
	serious: '#d97706',
	minor: '#eab308',
	none: '#9ca3af'
} as const;
