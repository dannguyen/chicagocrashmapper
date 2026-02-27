import { describe, it, expect } from 'vitest';
import { highlightFilteredText } from '$lib/inputHelpers';

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
