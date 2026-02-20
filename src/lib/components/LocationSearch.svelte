<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import { highlightFilteredText } from '$lib/inputHelpers';
	import { Location } from '$lib/location';
	import { searchLocations } from '$lib/api/client';
	import type { LocationRecord } from '$lib/db/types';
	import { AUTOCOMPLETE_DEBOUNCE_MS, BLUR_DELAY_MS } from '$lib/constants';

	let { onSelect, locationName = '' } = $props<{
		onSelect: (loc: Location) => void;
		locationName?: string;
	}>();

	let inputValue = $state<string>(locationName);
	let searchQuery = $state<string>('');
	let showAutocomplete = $state<boolean>(false);
	let debounceTimer: ReturnType<typeof setTimeout>;
	let selectedIndex = $state<number>(-1);

	let locationResults = $state<Location[]>([]);

	$effect(() => {
		const q = searchQuery.trim();
		if (q.length >= 1) {
			searchLocations(q).then((results: LocationRecord[]) => {
				locationResults = results.map((r) => new Location(r));
				selectedIndex = -1;
			});
		} else {
			locationResults = [];
			selectedIndex = -1;
		}
	});

	function handleInput() {
		showAutocomplete = true;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			searchQuery = inputValue;
		}, AUTOCOMPLETE_DEBOUNCE_MS);
	}

	function handleInputBlur() {
		setTimeout(() => {
			showAutocomplete = false;
		}, BLUR_DELAY_MS);
	}

	function handleInputFocus() {
		if (inputValue.trim()) {
			showAutocomplete = true;
		}
	}

	function handleInputClick() {
		inputValue = '';
		searchQuery = '';
		showAutocomplete = false;
		clearTimeout(debounceTimer);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (locationResults.length === 0) return;

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			selectedIndex = (selectedIndex + 1) % locationResults.length;
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			selectedIndex = (selectedIndex - 1 + locationResults.length) % locationResults.length;
		} else if (event.key === 'Enter') {
			event.preventDefault();
			if (selectedIndex >= 0) {
				selectLocation(locationResults[selectedIndex]);
			} else {
				selectLocation(locationResults[0]);
			}
			showAutocomplete = false;
		}
	}

	function selectLocation(location: Location) {
		inputValue = location.name;
		searchQuery = location.name;
		showAutocomplete = false;
		onSelect(location);
		if (location.id) {
			goto(resolve(`/${location.pluralCategory}/${location.id}`));
		}
	}

	type BadgeInfo = { label: string; classes: string };

	function categoryBadge(category: string): BadgeInfo {
		switch (category) {
			case 'neighborhood':
				return { label: 'Neighborhood', classes: 'bg-blue-100 text-blue-700' };
			case 'ward':
				return { label: 'Ward', classes: 'bg-orange-100 text-orange-600' };
			case 'intersection':
				return { label: 'Intersection', classes: 'bg-gray-100 text-gray-600' };
			default:
				return { label: category, classes: 'bg-gray-100 text-gray-600' };
		}
	}
</script>

<div class="search-container">
	<input
		type="text"
		bind:value={inputValue}
		onfocus={handleInputFocus}
		onblur={handleInputBlur}
		oninput={handleInput}
		onkeydown={handleKeydown}
		onclick={handleInputClick}
		placeholder={locationName || 'Enter location name...'}
		id="search-input-field"
		autocomplete="off"
		class="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
	/>

	{#if showAutocomplete && locationResults.length > 0}
		<div class="location-results-list">
			{#each locationResults as result, index}
				<button
					type="button"
					class="location-item"
					class:selected={index === selectedIndex}
					onclick={() => selectLocation(result)}
					onmouseenter={() => (selectedIndex = index)}
				>
					<span class="category-badge {categoryBadge(result.category).classes}">
						{categoryBadge(result.category).label}
					</span>
					<span class="location-item-name"
						>{@html highlightFilteredText(result.name, searchQuery)}</span
					>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style lang="postcss">
	@reference "$lib/styles/app.css";

	.search-container {
		@apply relative z-[1000] flex-1;
	}

	.location-results-list {
		@apply absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden max-h-72 overflow-y-auto;
	}

	.location-item {
		@apply w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-3 border-b border-gray-100 last:border-b-0 cursor-pointer;
	}

	.location-item.selected {
		@apply bg-blue-50;
	}

	.location-item-name {
		@apply flex-1 min-w-0 truncate text-sm font-medium text-gray-900;
	}

	.category-badge {
		@apply shrink-0 text-xs px-2 py-0.5 rounded-full font-medium;
	}
</style>
