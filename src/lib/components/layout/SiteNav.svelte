<script lang="ts">
	import { base } from '$app/paths';
	import LocationSearch from '$lib/components/LocationSearch.svelte';
	import { appState } from '$lib/components/AppState.svelte';
	import type { Location } from '$lib/location';

	function onLocationSelectGlobal(location: Location) {
		appState.selectLocation(location);
	}

	function handleNearMe() {
		appState.useMyLocation();
	}
</script>

<nav class="site-nav" aria-label="Search navigation">
	<div class="search-row">
		<div class="search-wrapper">
			<LocationSearch onSelect={onLocationSelectGlobal} />
		</div>
		<button
			class="near-me-btn"
			onclick={handleNearMe}
			disabled={appState.geoLoading}
			title="Find crashes near your current location"
		>
			<svg class="near-me-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
				<circle cx="12" cy="12" r="3" />
				<path stroke-linecap="round" d="M12 2v3M12 19v3M2 12h3M19 12h3" />
			</svg>
			{#if appState.geoLoading}
				Locating...
			{:else}
				Near Me
			{/if}
		</button>
	</div>
	{#if appState.geoError}
		<p class="geo-error">{appState.geoError}</p>
	{/if}
</nav>

<style lang="postcss">
	@reference "$lib/styles/app.css";

	.site-nav {
		@apply w-full;
	}

	.search-row {
		@apply flex items-stretch gap-2;
	}

	.search-wrapper {
		@apply flex-1 min-w-0;
	}

	.near-me-btn {
		@apply inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0 transition-colors;
	}

	.near-me-icon {
		@apply w-4 h-4 shrink-0;
	}

	.geo-error {
		@apply mt-1.5 text-xs text-red-600;
	}
</style>
