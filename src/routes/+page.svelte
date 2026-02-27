<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';

	import { appState } from '$lib/components/AppState.svelte';
	import { SITE_NAME, CHICAGO_CENTER } from '$lib/constants';
	import type { Crash } from '$lib/crash';
	import CrashList from '$lib/components/CrashList.svelte';
	import MapContainer from '$lib/components/MapContainer.svelte';
	import TrendChart from '$lib/components/TrendChart.svelte';
	import KpiCards from '$lib/components/KpiCards.svelte';
	import SiteNav from '$lib/components/layout/SiteNav.svelte';

	const defaultGeoCenter = CHICAGO_CENTER;

	function setCrashDetail(item: Crash | null) {
		appState.selectCrash(item);
	}

	function showCrashOnMap(index: number) {
		const filtered = appState.filteredCrashes;
		setCrashDetail(filtered[index]);
	}

	onMount(() => {
		appState.loadRecentCrashes(20);
	});
</script>

<svelte:head>
	<title>{SITE_NAME}</title>
</svelte:head>

<div class="homepage-search">
	<SiteNav />
</div>

<!-- Two-column layout: left panel + map -->
<div class="dashboard-layout" id="main-results-section">
	<!-- LEFT PANEL: controls + list -->
	<div class="dashboard-panel">
		<!-- KPI cards + trend chart -->
		{#if !appState.loading}
			<div class="panel-block">
				<KpiCards />
			</div>
			<div class="panel-block">
				<TrendChart />
			</div>
		{/if}

		<!-- Results header -->
		<div class="results-header">
			{#if appState.loading}
				<svg
					class="loading-icon"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
					></path>
				</svg>
				<span class="loading-label">Loading...</span>
			{:else}
				<span class="results-summary">
					{appState.crashes.length} recent serious crashes citywide
				</span>
			{/if}
		</div>
		<!-- Crash list -->
		{#if appState.crashes.length === 0 && !appState.loading}
			<!-- Welcome empty state -->
			<div class="empty-state">
				<svg
					class="empty-icon"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M12 2C8.686 2 6 4.686 6 8c0 4.418 6 12 6 12s6-7.582 6-12c0-3.314-2.686-6-6-6z"
					/>
					<circle cx="12" cy="8" r="2" stroke="currentColor" stroke-width="1.5" fill="none" />
				</svg>
				<h2 class="empty-title">{SITE_NAME}</h2>
				<p class="empty-body">
					Explore traffic crash data for any Chicago neighborhood, ward, or intersection.
				</p>
				<p class="empty-note">
					Search above or click <a class="near-me-link" href={`${base}/nearme`}>Near Me</a> to get started.
				</p>
			</div>
		{:else}
			<div class="panel-list">
				<CrashList
					crashes={appState.filteredCrashes}
					selectedLocation={appState.selectedLocation}
					distanceUnits="feet"
					{showCrashOnMap}
				/>
			</div>
		{/if}
	</div>

	<!-- RIGHT PANEL: map -->
	<div class="map-panel">
		<div class="map-shell">
			<MapContainer crashes={appState.crashes} {setCrashDetail} {defaultGeoCenter} />
		</div>
	</div>
</div>

<style>
	.homepage-search {
		margin-bottom: 1rem;
	}

	.dashboard-layout {
		display: flex;
		flex-direction: column;
		min-height: calc(100vh - 8rem);
	}

	@media (min-width: 1024px) {
		.dashboard-layout {
			flex-direction: row;
		}
	}

	.dashboard-panel {
		order: 2;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		border-right: 1px solid #e5e7eb;
		background: #f9fafb;
	}

	@media (min-width: 1024px) {
		.dashboard-panel {
			order: 1;
			width: 40%;
			max-height: calc(100vh - 8rem);
		}
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

	.results-header {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border-bottom: 1px solid #f3f4f6;
		background: #fff;
	}

	.loading-icon {
		width: 0.875rem;
		height: 0.875rem;
		color: #2563eb;
		flex-shrink: 0;
		animation: spin 1s linear infinite;
	}

	.loading-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #6b7280;
	}

	.results-summary {
		font-size: 0.875rem;
		font-weight: 500;
		color: #4b5563;
	}

	.panel-block {
		padding: 0.75rem 1rem 0.25rem;
	}

	.panel-list {
		padding: 0.75rem 1rem;
	}

	@media (min-width: 1024px) {
		.panel-list {
			flex: 1;
		}
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		flex: 1;
		gap: 0.75rem;
		padding: 3rem 1.5rem;
		text-align: center;
	}

	.empty-icon {
		width: 3rem;
		height: 3rem;
		color: #1d4ed8;
		margin-bottom: 0.25rem;
	}

	.empty-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: #111827;
	}

	.empty-body {
		font-size: 0.875rem;
		color: #6b7280;
		max-width: 20rem;
		line-height: 1.5;
	}

	.empty-note {
		font-size: 0.75rem;
		color: #9ca3af;
	}

	.map-panel {
		order: 1;
		height: 18rem;
	}

	@media (min-width: 640px) {
		.map-panel {
			height: 24rem;
		}
	}

	@media (min-width: 1024px) {
		.map-panel {
			order: 2;
			flex: 1;
			position: sticky;
			top: 3.5rem;
			height: calc(100vh - 3.5rem);
		}
	}

	.map-shell {
		height: 100%;
	}

	@media (min-width: 1024px) {
		.map-shell :global(#map) {
			height: 100%;
			margin-bottom: 0;
		}
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
