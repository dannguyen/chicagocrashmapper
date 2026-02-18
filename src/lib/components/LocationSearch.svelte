<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import { highlightFilteredText } from '$lib/inputHelpers';
	import { Location } from '$lib/location';
	import { searchLocations } from '$lib/api/client';
	import type { LocationRecord } from '$lib/db/types';

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
		}, 300);
	}

	function handleInputBlur() {
		setTimeout(() => {
			showAutocomplete = false;
		}, 200);
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
	/>

	{#if showAutocomplete && locationResults.length > 0}
		<div class="location-results-list">
			{#each locationResults as result, index}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="location-item"
					class:selected={index === selectedIndex}
					onclick={() => selectLocation(result)}
					onmouseenter={() => (selectedIndex = index)}
				>
					{@html highlightFilteredText(result.name, searchQuery)}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style lang="postcss">
	@reference "$lib/styles/app.css";

	.location-results-list {
		@apply absolute w-full max-h-72 overflow-y-auto bg-white border border-gray-300 border-t-0 rounded-b-md shadow-lg z-[1001];
	}

	.location-results-list .location-item {
		@apply p-3 cursor-pointer border-b border-gray-100 last:border-0;
	}

	.location-results-list .location-item:hover,
	.location-results-list .location-item.selected {
		@apply bg-gray-100;
	}

	#search-input-field {
		@apply w-full p-3 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500;
	}

	.search-container {
		@apply relative z-[1000] flex-1;
	}
</style>
