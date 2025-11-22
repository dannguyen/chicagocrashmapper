export interface Location {
	name: string;
	longitude: number;
	latitude: number;
	id: string;
}

export function escapeRegExp(str: string): string {
	return RegExp.escape(str);
}

export function getSearchTokens(query: string): string[] {
	return query
		.toUpperCase()
		.split(/\W+/)
		.filter((token) => token !== 'AND' && token.replace(/\W+/g, '').trim() !== '');
}

export function highlightFilteredText(text: string, query: string): string {
	const tokens = getSearchTokens(query);

	if (!tokens || tokens.length === 0) {
		return text;
	}

	const escapedTokens = tokens.map((token) => escapeRegExp(token));
	const pattern = escapedTokens.join('|');
	const regex = new RegExp(`(${pattern})`, 'gi');

	return text.replace(regex, '<span class="bg-yellow-300">$1</span>');
}

export function filterLocationsBySearchString(
	locations: Location[],
	query: string,
	limit: number = 25
): Location[] {
	if (!query.trim()) return [];

	const tokens = getSearchTokens(query);

	if (tokens.length === 0) return [];

	const results: Location[] = [];

	for (const loc of locations) {
		const name = loc.name;
		if (tokens.every((token) => name.includes(token))) {
			results.push(loc);
			if (results.length >= limit) break;
		}
	}
	return results;
}
