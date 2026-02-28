<script lang="ts">
	import { onMount } from 'svelte';
	import { Crash, parseCrashes } from '$lib/crash';
	import type { CrashRecord } from '$lib/crash';
	import { Location } from '$lib/location';
	import { getCrashSummary, getCrashesList } from '$lib/api/client';
	import type { CrashListResult } from '$lib/api/client';
	import type { CrashSummary } from '$lib/db/types';
	import LocationSummary from '$lib/components/LocationSummary.svelte';
	import MapContainer from '$lib/components/MapContainer.svelte';
	import CrashList from '$lib/components/CrashList.svelte';

	let { location } = $props<{ location: Location }>();

	let allCrashes: Crash[] = $state([]);
	let totalCrashes: number = $state(0);
	let currentPage: number = $state(0);
	const perPage = 25;
	let loading: boolean = $state(true);
	let allTimeSummary: CrashSummary | null = $state(null);
	let mapRef: MapContainer | undefined = $state(undefined);
	const isIntersection = $derived(location.category === 'intersection');
	const mapRadiusFeet = $derived(location.isPoint ? 500 : 5280);

	// Client-side pagination derived from allCrashes
	const pagedCrashes = $derived(
		allCrashes.slice(currentPage * perPage, (currentPage + 1) * perPage)
	);
	const rangeStart = $derived(totalCrashes === 0 ? 0 : currentPage * perPage + 1);
	const rangeEnd = $derived(Math.min((currentPage + 1) * perPage, totalCrashes));
	const totalPages = $derived(Math.ceil(totalCrashes / perPage));
	const hasPrev = $derived(currentPage > 0);
	const hasNext = $derived(currentPage < totalPages - 1);
	const pageNumbers = $derived<(number | null)[]>(
		totalPages <= 6
			? Array.from({ length: totalPages }, (_, i) => i)
			: [0, 1, 2, null, totalPages - 3, totalPages - 2, totalPages - 1]
	);

	async function fetchAllCrashes() {
		loading = true;
		try {
			const result: CrashListResult = await getCrashesList({
				locationId: location.id,
				perPage: 1000,
				sort: 'desc'
			});
			const hydrated = parseCrashes(result.crashes);
			if (location.category === 'intersection') {
				hydrated.sort((a, b) => b.date.getTime() - a.date.getTime());
			}
			allCrashes = hydrated;
			totalCrashes = result.total;
			currentPage = 0;
		} finally {
			loading = false;
		}
	}

	function goToPrev() {
		if (hasPrev) currentPage--;
	}

	function goToNext() {
		if (hasNext) currentPage++;
	}

	function showCrashOnMap(crashId: string) {
		if (mapRef) {
			mapRef.openCrashPopup(crashId);
			const mapEl = document.getElementById('map');
			if (mapEl) {
				mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		}
	}

	onMount(async () => {
		const [, summary] = await Promise.all([
			fetchAllCrashes(),
			getCrashSummary({ locationId: location.id })
		]);
		allTimeSummary = summary;

		requestAnimationFrame(() => {
			if (mapRef) {
				mapRef.updateMapWithLocation(location);
				mapRef.updateNearbyMarkers(allCrashes);
			}
		});
	});
</script>

<div class="location-detail">
	<!-- Top section: stats left, map right -->
	<div class="top-grid">
		<div class="stats-col">
			<LocationSummary crashes={allCrashes} {location} summary={allTimeSummary} compact={true} />
		</div>
		<div class="map-col">
			<div class="map-card">
				<MapContainer
					bind:this={mapRef}
					selectedLocation={location}
					crashes={allCrashes}
					defaultGeoCenter={[location.latitude, location.longitude]}
					maxDistance={mapRadiusFeet}
				/>
			</div>
		</div>
	</div>

	<!-- Pagination + crash list -->
	{#if totalCrashes > 0}
		<div class="pagination-bar">
			<span class="pagination-text">
				Showing {rangeStart}–{rangeEnd} of {totalCrashes} crashes
			</span>
			{#if totalPages > 1}
				<div class="pager-controls">
					<button class="pager-button pager-nav" disabled={!hasPrev} onclick={goToPrev}>
						Prev
					</button>
					{#each pageNumbers as pg}
						{#if pg === null}
							<span class="pager-ellipsis">…</span>
						{:else}
							<button
								class="pager-button pager-page"
								class:active-page={pg === currentPage}
								class:inactive-page={pg !== currentPage}
								onclick={() => {
									currentPage = pg;
								}}
							>
								{pg + 1}
							</button>
						{/if}
					{/each}
					<button class="pager-button pager-nav" disabled={!hasNext} onclick={goToNext}>
						Next
					</button>
				</div>
			{/if}
		</div>
	{/if}

	{#if loading}
		<div class="loading-stack">
			{#each Array(5) as _}
				<div class="loading-card">
					<div class="loading-line loading-line-wide"></div>
					<div class="loading-line loading-line-narrow"></div>
				</div>
			{/each}
		</div>
	{:else}
		<p class="crash-heading">
			{#if totalPages > 1}
				Crashes &mdash; Page {currentPage + 1} of {totalPages}
			{:else}
				Crashes
			{/if}
		</p>

		{#if pagedCrashes.length === 0}
			<div class="empty-state">
				<p class="empty-text">No crashes found for this location.</p>
			</div>
		{:else}
			<CrashList
				crashes={pagedCrashes}
				selectedLocation={location}
				distanceUnits="feet"
				{showCrashOnMap}
			/>
		{/if}
	{/if}

	<!-- Bottom pagination -->
	{#if totalPages > 1 && !loading}
		<div class="pager-footer">
			<button class="pager-button pager-nav" disabled={!hasPrev} onclick={goToPrev}> Prev </button>
			{#each pageNumbers as pg}
				{#if pg === null}
					<span class="pager-ellipsis">…</span>
				{:else}
					<button
						class="pager-button pager-page"
						class:active-page={pg === currentPage}
						class:inactive-page={pg !== currentPage}
						onclick={() => {
							currentPage = pg;
						}}
					>
						{pg + 1}
					</button>
				{/if}
			{/each}
			<button class="pager-button pager-nav" disabled={!hasNext} onclick={goToNext}> Next </button>
		</div>
	{/if}
</div>

<style>
	.location-detail {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.top-grid {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	@media (min-width: 768px) {
		.top-grid {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 1rem;
			align-items: start;
		}
	}

	.stats-col {
		min-width: 0;
	}

	.map-col {
		min-width: 0;
	}

	.map-card {
		border-radius: 0.75rem;
		overflow: hidden;
		border: 1px solid #e5e7eb;
		background: #fff;
	}

	/* Make map tall/vertical on desktop to match Chicago's shape */
	.map-card :global(#map) {
		height: 20rem;
	}

	@media (min-width: 768px) {
		.map-card :global(#map) {
			height: 28rem;
		}
	}

	.pagination-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 0.75rem;
		background: #fff;
	}

	.pagination-text {
		font-size: 0.875rem;
		color: #4b5563;
	}

	.pager-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.pager-button {
		padding: 0.375rem 0.75rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		border: 1px solid #d1d5db;
		background: #fff;
		transition:
			border-color 120ms ease,
			color 120ms ease,
			background-color 120ms ease;
	}

	.pager-button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.pager-nav:hover:not(:disabled) {
		border-color: #3b82f6;
		color: #1d4ed8;
	}

	.pager-page {
		min-width: 2.25rem;
	}

	.pager-ellipsis {
		padding: 0 0.25rem;
		font-size: 0.875rem;
		color: #9ca3af;
		align-self: center;
	}

	.loading-stack {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.loading-card {
		border-radius: 0.75rem;
		border: 1px solid #e5e7eb;
		background: #fff;
		padding: 1rem;
	}

	.loading-line {
		background: #e5e7eb;
		border-radius: 0.375rem;
		animation: pulse 1.2s ease-in-out infinite;
	}

	.loading-line-wide {
		height: 1rem;
		width: 75%;
		margin-bottom: 0.5rem;
	}

	.loading-line-narrow {
		height: 0.75rem;
		width: 50%;
	}

	.crash-heading {
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
		margin-bottom: 0.75rem;
	}

	.empty-state {
		text-align: center;
		padding: 3rem 0;
		color: #9ca3af;
	}

	.empty-text {
		font-size: 0.875rem;
	}

	.pager-footer {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin-top: 1.5rem;
	}

	.active-page {
		background-color: #1d4ed8;
		color: white;
		border-color: #1d4ed8;
	}

	.inactive-page {
		border-color: rgb(209 213 219);
	}

	.inactive-page:hover {
		border-color: rgb(59 130 246);
		color: #1d4ed8;
	}

	@keyframes pulse {
		0% {
			opacity: 0.8;
		}
		50% {
			opacity: 0.4;
		}
		100% {
			opacity: 0.8;
		}
	}
</style>
