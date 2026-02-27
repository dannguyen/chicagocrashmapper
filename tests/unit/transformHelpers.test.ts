import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	addDays,
	currentAgeInDays,
	currentAgePrettified,
	currentAgeSimplified,
	formatPct,
	pctChange,
	prettifyDate,
	prettifyInteger,
	toDateStr
} from '$lib/transformHelpers';

describe('transformHelpers', () => {
	const MOCKED_NOW = new Date('2025-01-31T12:00:00Z');

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(MOCKED_NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('currentAgeInDays', () => {
		it('returns 0 for today', () => {
			expect(currentAgeInDays(new Date('2025-01-31T12:00:00Z'))).toBe(0);
		});

		it('computes days for a past Date object', () => {
			expect(currentAgeInDays(new Date('2025-01-21T12:00:00Z'))).toBe(10);
		});

		it('computes days for a past date string', () => {
			expect(currentAgeInDays('2025-01-29T00:00:00Z')).toBe(2);
		});

		it('floors partial days', () => {
			// 36 hours ago = 1.5 days → 1
			expect(currentAgeInDays(new Date('2025-01-30T00:00:00Z'))).toBe(1);
		});
	});

	describe('currentAgePrettified', () => {
		it('returns 0d for negative inputs', () => {
			expect(currentAgePrettified(-5)).toBe('0d');
		});

		it('returns 0d for zero', () => {
			expect(currentAgePrettified(0)).toBe('0d');
		});

		it('formats days only', () => {
			expect(currentAgePrettified(5)).toBe('5d');
			expect(currentAgePrettified(29)).toBe('29d');
		});

		it('formats months and days', () => {
			expect(currentAgePrettified(30)).toBe('1m');
			expect(currentAgePrettified(31)).toBe('1m 1d');
			expect(currentAgePrettified(45)).toBe('1m 15d');
		});

		it('formats years, months, and days', () => {
			expect(currentAgePrettified(400)).toBe('1y 1m 5d');
		});

		it('accepts a Date object', () => {
			const pastDate = new Date(MOCKED_NOW.getTime() - 45 * 24 * 60 * 60 * 1000);
			expect(currentAgePrettified(pastDate)).toBe('1m 15d');
		});
	});

	describe('currentAgeSimplified', () => {
		it('returns A day ago for 0 or 1 day', () => {
			expect(currentAgeSimplified(0)).toBe('A day ago');
			expect(currentAgeSimplified(1)).toBe('A day ago');
		});

		it('returns days ago for 2-60 days', () => {
			expect(currentAgeSimplified(2)).toBe('2 days ago');
			expect(currentAgeSimplified(59)).toBe('59 days ago');
		});

		it('returns months ago for > 60 days', () => {
			expect(currentAgeSimplified(61)).toBe('2 months ago');
			expect(currentAgeSimplified(90)).toBe('3 months ago');
		});

		it('returns years ago for > 730 days', () => {
			expect(currentAgeSimplified(731)).toBe('2 years ago');
			expect(currentAgeSimplified(900)).toBe('2 years ago');
			expect(currentAgeSimplified(1200)).toBe('3 years ago');
		});

		it('accepts a Date object', () => {
			const pastDate = new Date(MOCKED_NOW.getTime() - 100 * 24 * 60 * 60 * 1000);
			expect(currentAgeSimplified(pastDate)).toBe('3 months ago');
		});
	});

	describe('prettifyInteger', () => {
		it('formats with commas', () => {
			expect(prettifyInteger(0)).toBe('0');
			expect(prettifyInteger(100)).toBe('100');
			expect(prettifyInteger(1000)).toBe('1,000');
			expect(prettifyInteger(1234567)).toBe('1,234,567');
		});
	});

	describe('prettifyDate', () => {
		it('formats a date as weekday, month day, year', () => {
			expect(prettifyDate(new Date('2025-01-01T13:00:00Z'))).toBe('Wednesday, January 1, 2025');
		});
	});

	describe('toDateStr', () => {
		it('returns YYYY-MM-DD format', () => {
			expect(toDateStr(new Date('2025-02-03T12:00:00Z'))).toBe('2025-02-03');
		});
	});

	describe('addDays', () => {
		it('adds days to a date', () => {
			const date = new Date('2025-01-31T12:00:00Z');
			expect(toDateStr(addDays(date, 2))).toBe('2025-02-02');
		});

		it('does not mutate the original date', () => {
			const date = new Date('2025-01-31T12:00:00Z');
			addDays(date, 5);
			expect(toDateStr(date)).toBe('2025-01-31');
		});
	});

	describe('pctChange', () => {
		it('computes percentage increase', () => {
			expect(pctChange(20, 10)).toBe(100);
		});

		it('computes percentage decrease', () => {
			expect(pctChange(5, 10)).toBe(-50);
		});

		it('returns Infinity when previous is 0 and current > 0', () => {
			expect(pctChange(5, 0)).toBe(Infinity);
		});

		it('returns null when both are 0', () => {
			expect(pctChange(0, 0)).toBeNull();
		});
	});

	describe('formatPct', () => {
		it('formats positive values with + sign', () => {
			expect(formatPct(12.2)).toBe('+12%');
		});

		it('formats negative values with - sign', () => {
			expect(formatPct(-12.2)).toBe('-12%');
		});

		it('returns -- for null and Infinity', () => {
			expect(formatPct(null)).toBe('--');
			expect(formatPct(Infinity)).toBe('--');
		});
	});
});
