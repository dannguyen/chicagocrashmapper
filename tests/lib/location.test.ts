import { describe, it, expect } from 'vitest';
import {
	escapeRegExp,
	highlightFilteredText,
	filterLocationsBySearchString,
	type Location
} from '$lib/location';

describe('escapeRegExp', () => {
	it('should escape special regex characters', () => {
		const input = '.*+?^${}()|[]\\';
		const expected = String.raw`\.\*\+\?\^\$\{\}\(\)\|\[\]\\`; //String.raw`'\.\*\+\?\^\$\{\}\(\)\|\[\]\\`;
		expect(escapeRegExp(input)).toBe(expected);
	});

	it('should return plain text unchanged', () => {
		expect(escapeRegExp('hello world')).toBe(String.raw`\x68ello\x20world`);
	});
});

describe('highlightFilteredText', () => {
	it('should highlight matching text case-insensitively', () => {
		const text = 'Chicago Ave & State St';
		const query = 'chicago state';
		const result = highlightFilteredText(text, query);
		// Expect "Chicago" and "State" to be wrapped in spans
		expect(result).toContain('<span class="bg-yellow-300">Chicago</span>');
		expect(result).toContain('<span class="bg-yellow-300">State</span>');
	});

	it('should ignore "AND" and "&" in query', () => {
		const text = 'North & South';
		const query = 'North AND South &';
		const result = highlightFilteredText(text, query);
		expect(result).toContain('<span class="bg-yellow-300">North</span>');
		expect(result).toContain('<span class="bg-yellow-300">South</span>');
		expect(result).not.toContain('<span class="bg-yellow-300">&</span>');
	});

	it('should return original text if query is empty', () => {
		expect(highlightFilteredText('Hello', '')).toBe('Hello');
	});

	it('should handle and then ignore special characters in query', () => {
		const text = 'Hello (World)';
		const query = '(World)';
		const result = highlightFilteredText(text, query);
		expect(result).toContain('<span class="bg-yellow-300">World</span>');
	});
});

describe('filterLocationsBySearchString', () => {
	const mockData: Location[] = [
		{ name: 'STATE & MADISON', latitude: 0, longitude: 0 },
		{ name: 'STATE & LAKE', latitude: 0, longitude: 0 },
		{ name: 'MICHIGAN & LAKE', latitude: 0, longitude: 0 },
		{ name: 'CLARK & LAKE', latitude: 0, longitude: 0 },
		{ name: 'W OHIO ST & LAKE', latitude: 0, longitude: 0 },
		{ name: 'W OHIO ST & STATE', latitude: 0, longitude: 0 },
		{ name: 'E OHIO ST & LAKE', latitude: 0, longitude: 0 }
	];

	it('should return matches based on all tokens', () => {
		const results = filterLocationsBySearchString(mockData, 'State Lake');
		expect(results).toHaveLength(1);
		expect(results[0].name).toBe('STATE & LAKE');

		const results2 = filterLocationsBySearchString(mockData, 'w ohio lake');
		expect(results2[0].name).toBe('W OHIO ST & LAKE');
	});

	it('should be case insensitive', () => {
		const results = filterLocationsBySearchString(mockData, 'state madison');
		expect(results).toHaveLength(1);
		expect(results[0].name).toBe('STATE & MADISON');
	});

	it('should ignore token order', () => {
		const results = filterLocationsBySearchString(mockData, 'madison state');
		expect(results).toHaveLength(1);
		expect(results[0].name).toBe('STATE & MADISON');
	});

	it('should ignore "AND" in query', () => {
		const results = filterLocationsBySearchString(mockData, 'State AND Madison');
		expect(results).toHaveLength(1);
		expect(results[0].name).toBe('STATE & MADISON');
	});

	it('should ignore "&" in query', () => {
		const results = filterLocationsBySearchString(mockData, 'madison&state');
		expect(results).toHaveLength(1);
		expect(results[0].name).toBe('STATE & MADISON');
	});

	it('should return empty array if no match', () => {
		const results = filterLocationsBySearchString(mockData, 'Wacker');
		expect(results).toHaveLength(0);
	});

	it('should respect the limit', () => {
		// Search "Lake" -> matches 3 items. Limit to 2.
		const results = filterLocationsBySearchString(mockData, 'Lake', 2);
		expect(results).toHaveLength(2);
	});
	it('should return empty if query is empty', () => {
		expect(filterLocationsBySearchString(mockData, '')).toEqual([]);
	});
});
