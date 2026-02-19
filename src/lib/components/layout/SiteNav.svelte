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

<nav class="navigation">
	<div class="search-label">Search crashes by neighborhood or intersection</div>
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
	<ul class="navigation-items">
		<li class="nav-link">
			<a href="{base}/">Home</a>
		</li>
		<li class="nav-link">
			<a href="{base}/neighborhoods">Neighborhoods</a>
		</li>
		<li class="nav-link">
			<a href="{base}/intersections">Intersections</a>
		</li>
	</ul>
</nav>

<style lang="postcss">
	@reference "$lib/styles/app.css";

	.navigation {
		@apply w-full;
	}

	.search-label {
		@apply text-sm text-gray-600 text-center mb-1;
	}

	.search-row {
		@apply flex items-stretch gap-2 max-w-lg mx-auto mb-2;
	}

	.search-wrapper {
		@apply flex-1 min-w-0;
	}

	.near-me-btn {
		@apply px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0 transition-colors;
	}

	.geo-error {
		@apply text-xs text-red-600 text-center mb-1;
	}

	.navigation-items {
		@apply flex flex-row flex-wrap justify-center gap-4;
	}

	li.nav-link {
		@apply text-blue-600;
	}

	.nav-link a {
		@apply hover:text-purple-600 font-medium transition-colors;
	}
</style>
