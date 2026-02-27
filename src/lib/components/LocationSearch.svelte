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
		if (event.key === 'Escape') {
			showAutocomplete = false;
			return;
		}

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
				return { label: 'Neighborhood', classes: 'badge badge-neighborhood' };
			case 'ward':
				return { label: 'Ward', classes: 'badge badge-ward' };
			case 'intersection':
				return { label: 'Intersection', classes: 'badge badge-neutral' };
			case 'street':
				return { label: 'Street', classes: 'badge badge-neutral' };
			default:
				return { label: category, classes: 'badge badge-neutral' };
		}
	}
</script>

<div class="search-shell">
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
		class="search-input"
	/>

	{#if showAutocomplete && searchQuery.trim().length >= 1}
		<div class="search-dropdown">
			{#if locationResults.length > 0}
				{#each locationResults as result, index}
					<button
						type="button"
						class="search-option"
						class:selected={index === selectedIndex}
						onclick={() => selectLocation(result)}
						onmouseenter={() => (selectedIndex = index)}
					>
						<span class={categoryBadge(result.category).classes}>
							{categoryBadge(result.category).label}
						</span>
						<span class="option-name">{@html highlightFilteredText(result.name, searchQuery)}</span>
					</button>
				{/each}
			{:else}
				<div class="search-empty">
					No locations found for "{searchQuery}"
				</div>
			{/if}
		</div>
	{/if}

	{#if showAutocomplete && searchQuery.trim().length >= 1}
		<p class="search-hint">&#8593;&#8595; to navigate, Enter to select, Esc to close</p>
	{/if}
</div>

<style>
	.search-shell {
		position: relative;
		z-index: 1000;
		flex: 1;
	}

	.search-input {
		width: 100%;
		border-radius: 0.5rem;
		border: 1px solid #d1d5db;
		padding: 0.625rem 1rem;
		font-size: 0.875rem;
		background: #fff;
		transition:
			border-color 120ms ease,
			box-shadow 120ms ease;
	}

	.search-input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgb(59 130 246 / 0.35);
	}

	.search-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		margin-top: 0.25rem;
		background: #fff;
		border-radius: 0.75rem;
		border: 1px solid #e5e7eb;
		box-shadow: 0 10px 20px -12px rgb(15 23 42 / 0.35);
		z-index: 50;
		overflow: hidden;
		max-height: 18rem;
		overflow-y: auto;
	}

	.search-option {
		width: 100%;
		text-align: left;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #f3f4f6;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		cursor: pointer;
		transition: background-color 120ms ease;
		background: #fff;
	}

	.search-option:last-child {
		border-bottom: 0;
	}

	.search-option:hover {
		background: #eff6ff;
	}

	.selected {
		background-color: #eff6ff;
	}

	.badge {
		flex-shrink: 0;
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.125rem 0.5rem;
		border-radius: 9999px;
	}

	.badge-neighborhood {
		background: #dbeafe;
		color: #1d4ed8;
	}

	.badge-ward {
		background: #ffedd5;
		color: #c2410c;
	}

	.badge-neutral {
		background: #f3f4f6;
		color: #4b5563;
	}

	.option-name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.875rem;
		font-weight: 500;
		color: #111827;
	}

	.search-empty {
		padding: 1.5rem 1rem;
		text-align: center;
		font-size: 0.875rem;
		color: #9ca3af;
	}

	.search-hint {
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: #9ca3af;
	}
</style>
