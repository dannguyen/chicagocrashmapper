<script lang="ts">
	import { base } from '$app/paths';
	import LocationSearch from '$lib/components/LocationSearch.svelte';
	import { appState } from '$lib/components/AppState.svelte';
	import type { Location } from '$lib/location';

	function onLocationSelectGlobal(location: Location) {
		appState.selectLocation(location);
	}
</script>

<nav class="site-nav" aria-label="Search navigation">
	<p class="nav-hint">
		Type in a location name, or click <a class="near-me-link" href={`${base}/nearme`}>Near Me</a>
	</p>

	<div class="nav-row">
		<div class="nav-search">
			<LocationSearch onSelect={onLocationSelectGlobal} />
		</div>
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

	.nav-hint {
		margin: 0.25rem 0 0;
		font-size: 0.75rem;
		color: #6b7280;
	}

	.near-me-link {
		font-weight: 600;
		color: #2563eb;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.near-me-link:hover {
		color: #1d4ed8;
	}

	.nav-error {
		margin-top: 0.375rem;
		font-size: 0.75rem;
		color: #dc2626;
	}
</style>
