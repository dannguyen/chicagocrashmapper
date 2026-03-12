<script lang="ts">
	import { base } from '$app/paths';
	import LocationSearch from '$lib/components/LocationSearch.svelte';
	import type { Location } from '$lib/location';

	function onLocationSelect(_location: Location) {
		// LocationSearch handles navigation directly; the nav does not own shared app state.
	}
</script>

<nav class="site-nav" aria-label="Search navigation">
	<p class="nav-hint">
		Show crashes
		<a class="near-me-link" href={`${base}/nearme`}>near you</a>
		or type in a location name:
	</p>

	<div class="nav-row">
		<div class="nav-search">
			<LocationSearch onSelect={onLocationSelect} />
		</div>
	</div>
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

</style>
