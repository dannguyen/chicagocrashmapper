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
	<div class="nav-row">
		<div class="nav-search">
			<LocationSearch onSelect={onLocationSelectGlobal} />
		</div>
		<button
			class="near-button"
			onclick={handleNearMe}
			disabled={appState.geoLoading}
			title="Find crashes near your current location"
		>
			<svg class="near-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
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
		<p class="nav-error">{appState.geoError}</p>
	{/if}
</nav>

<style>
	.site-nav {
		width: 100%;
	}

	.nav-row {
		display: flex;
		align-items: stretch;
		gap: 0.5rem;
	}

	.nav-search {
		flex: 1;
		min-width: 0;
	}

	.near-button {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		background: #f97316;
		color: #fff;
		border-radius: 0.5rem;
		border: none;
		white-space: nowrap;
		flex-shrink: 0;
		transition: background-color 120ms ease, opacity 120ms ease;
	}

	.near-button:hover:not(:disabled) {
		background: #ea580c;
	}

	.near-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.near-icon {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	.nav-error {
		margin-top: 0.375rem;
		font-size: 0.75rem;
		color: #dc2626;
	}
</style>
