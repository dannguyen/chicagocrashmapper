import { describe, expect, it } from 'vitest';

import { escapeHtml, getSearchTokens, highlightFilteredText } from '$lib/inputHelpers';

describe('escapeHtml', () => {
	it('escapes all HTML-sensitive characters', () => {
		expect(escapeHtml(`<div class="x">Tom & 'Jerry'</div>`)).toBe(
			'&lt;div class=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/div&gt;'
		);
	});

	it('returns plain text unchanged', () => {
		expect(escapeHtml('hello world')).toBe('hello world');
	});
});

describe('getSearchTokens', () => {
	it('uppercases and splits on non-word characters', () => {
		expect(getSearchTokens('cedar shore')).toEqual(['CEDAR', 'SHORE']);
	});

	it('filters out AND keyword', () => {
		expect(getSearchTokens('shore AND cedar')).toEqual(['SHORE', 'CEDAR']);
	});

	it('strips punctuation and ampersands', () => {
		expect(getSearchTokens('  N. Michigan & Lake  ')).toEqual(['N', 'MICHIGAN', 'LAKE']);
	});

	it('returns empty array for blank input', () => {
		expect(getSearchTokens('')).toEqual([]);
		expect(getSearchTokens('   ')).toEqual([]);
	});

	it('returns empty array when only stop words remain', () => {
		expect(getSearchTokens('AND &')).toEqual([]);
	});
});

describe('highlightFilteredText', () => {
	it('wraps matching tokens in highlight spans', () => {
		const result = highlightFilteredText('Chicago Ave & State St', 'chicago state');
		expect(result).toContain('<span class="bg-yellow-300">Chicago</span>');
		expect(result).toContain('<span class="bg-yellow-300">State</span>');
	});

	it('escapes HTML in the text before highlighting', () => {
		const result = highlightFilteredText('N <Michigan> & Lake', 'lake michigan');
		expect(result).toContain('&lt;<span class="bg-yellow-300">Michigan</span>&gt;');
		expect(result).toContain('<span class="bg-yellow-300">Lake</span>');
	});

	it('escapes regex metacharacters in the query', () => {
		const result = highlightFilteredText('C++ at (State)', 'c++ state');
		expect(result).toContain('<span class="bg-yellow-300">C</span>++');
		expect(result).toContain('<span class="bg-yellow-300">State</span>');
	});

	it('returns escaped text when query has no usable tokens', () => {
		expect(highlightFilteredText('A & B', 'and &')).toBe('A &amp; B');
	});

	it('returns escaped text for empty query', () => {
		expect(highlightFilteredText('Hello <world>', '')).toBe('Hello &lt;world&gt;');
	});
});
