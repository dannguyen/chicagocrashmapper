<script lang="ts">
	import { Crash, parseCrashes } from '$lib/models/crash';
	import { Location } from '$lib/location';
	import {
		getCrashSummary,
		getCrashesList,
		getCrashesDense,
		getNearbyLocations
	} from '$lib/api/client';
	import type { CrashListResult, NearbyLocation } from '$lib/api/client';
	import type { CrashSummary, DenseCrash } from '$lib/models/types';
	import LocationSummary from '$lib/components/LocationSummary.svelte';
	import MapContainer from '$lib/components/MapContainer.svelte';
	import CrashList from '$lib/components/CrashList.svelte';
	import CrashListSkeleton from '$lib/components/CrashListSkeleton.svelte';
	import PaginationControls from '$lib/components/PaginationControls.svelte';
	import LocationNearbyTable from '$lib/components/LocationNearbyTable.svelte';
	import { paginationState, showCrashOnMap } from '$lib/pagination';

	let { location } = $props<{ location: Location }>();

	let mapCrashes: DenseCrash[] = $state([]);
	let pagedCrashes: Crash[] = $state([]);
	let totalCrashes: number = $state(0);
	let currentPage: number = $state(0);
	const perPage = 25;
	let loading: boolean = $state(true);
	let allTimeSummary: CrashSummary | null = $state(null);
	let nearbyLocations: NearbyLocation[] = $state([]);
	let mapRef: MapContainer | undefined = $state(undefined);
	let loadRequestId = 0;
	const mapRadiusFeet = $derived(location.isPoint ? 500 : 5280);

	// Server-side pagination
	const pg = paginationState(
		() => totalCrashes,
		() => currentPage,
		perPage
	);

	async function fetchPage(locationId: string, page: number) {
		const result: CrashListResult = await getCrashesList({
			locationId,
			page,
			perPage,
			sort: 'desc'
		});
		return { crashes: parseCrashes(result.crashes), total: result.total };
	}

	function goToPrev() {
		if (pg.hasPrev) loadPage(currentPage - 1);
	}

	function goToNext() {
		if (pg.hasNext) loadPage(currentPage + 1);
	}

	function goToPage(page: number) {
		loadPage(page);
	}

	async function loadPage(page: number) {
		const requestId = loadRequestId;
		try {
			const result = await fetchPage(location.id, page);
			if (requestId !== loadRequestId) return;
			pagedCrashes = result.crashes;
			totalCrashes = result.total;
			currentPage = page;
		} catch {
			if (requestId !== loadRequestId) return;
			pagedCrashes = [];
		}
	}

	$effect(() => {
		const requestId = ++loadRequestId;
		// Track location.id so this re-runs on navigation
		const locationId = location.id;
		const locationSnapshot = location;

		loading = true;
		mapCrashes = [];
		pagedCrashes = [];
		totalCrashes = 0;
		currentPage = 0;
		allTimeSummary = null;
		nearbyLocations = [];

		(async () => {
			try {
				const [denseResult, pageResult, summary, nearby] = await Promise.all([
					getCrashesDense({ locationId }),
					fetchPage(locationId, 0),
					getCrashSummary({ locationId }),
					getNearbyLocations(locationId)
				]);

				if (requestId !== loadRequestId) return;

				mapCrashes = denseResult.crashes;
				pagedCrashes = pageResult.crashes;
				totalCrashes = pageResult.total;
				currentPage = 0;
				allTimeSummary = summary;
				nearbyLocations = nearby;

				requestAnimationFrame(() => {
					if (requestId !== loadRequestId || !mapRef) return;
					mapRef.updateMapWithLocation(locationSnapshot);
					mapRef.updateNearbyMarkers(denseResult.crashes);
				});
			} catch {
				if (requestId !== loadRequestId) return;
				mapCrashes = [];
				pagedCrashes = [];
				totalCrashes = 0;
				currentPage = 0;
			} finally {
				if (requestId !== loadRequestId) return;
				loading = false;
			}
		})();

		return () => {
			if (requestId === loadRequestId) {
				loadRequestId++;
			}
		};
	});
</script>

<div class="location-detail">
	<!-- Top section: stats left, map right -->
	<div class="top-grid">
		<div class="stats-col">
			<LocationSummary crashes={pagedCrashes} {location} summary={allTimeSummary} compact={true} />
		</div>
		<div class="map-col">
			<div class="map-card">
				<MapContainer
					bind:this={mapRef}
					selectedLocation={location}
					crashes={mapCrashes}
					defaultGeoCenter={[location.latitude, location.longitude]}
					maxDistance={mapRadiusFeet}
				/>
			</div>
		</div>
	</div>

	<LocationNearbyTable
		title={`Nearby ${location.pluralCategory}`}
		hrefBase={location.pluralCategory}
		locations={nearbyLocations}
	/>

	<!-- Pagination + crash list -->
	{#if totalCrashes > 0}
		<PaginationControls
			rangeStart={pg.rangeStart}
			rangeEnd={pg.rangeEnd}
			totalItems={totalCrashes}
			{currentPage}
			totalPages={pg.totalPages}
			hasPrev={pg.hasPrev}
			hasNext={pg.hasNext}
			pageNumbers={pg.pageNumbers}
			onPrev={goToPrev}
			onNext={goToNext}
			onPage={goToPage}
		/>
	{/if}

	{#if loading}
		<CrashListSkeleton />
	{:else}
		<p class="crash-heading">
			{#if pg.totalPages > 1}
				Crashes &mdash; Page {currentPage + 1} of {pg.totalPages}
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
				showCrashOnMap={(id) => showCrashOnMap(mapRef, id)}
			/>
		{/if}
	{/if}

	<!-- Bottom pagination -->
	{#if pg.totalPages > 1 && !loading}
		<PaginationControls
			variant="footer"
			{currentPage}
			totalPages={pg.totalPages}
			hasPrev={pg.hasPrev}
			hasNext={pg.hasNext}
			pageNumbers={pg.pageNumbers}
			onPrev={goToPrev}
			onNext={goToNext}
			onPage={goToPage}
		/>
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
</style>
