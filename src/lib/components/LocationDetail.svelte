<script lang="ts">
	import { Crash, parseCrashes } from '$lib/models/crash';
	import { Location } from '$lib/location';
	import {
		getCrashSummary,
		getCrashesList,
		getCrashesBrief,
		getNearbyLocations
	} from '$lib/api/client';
	import type { CrashListResult, NearbyLocation } from '$lib/api/client';
	import type { BriefCrash, CrashSummary } from '$lib/models/types';
	import { MAX_CRASH_RESULTS_PER_PAGE } from '$lib/constants';
	import LocationSummary from '$lib/components/LocationSummary.svelte';
	import MapContainer from '$lib/components/MapContainer.svelte';
	import CrashList from '$lib/components/CrashList.svelte';
	import CrashListSkeleton from '$lib/components/CrashListSkeleton.svelte';
	import PaginationControls from '$lib/components/PaginationControls.svelte';
	import LocationNearbyTable from '$lib/components/LocationNearbyTable.svelte';
	import { paginationState, showCrashOnMap } from '$lib/pagination';

	let { location } = $props<{ location: Location }>();

	let mapCrashes: BriefCrash[] = $state([]);
	let pagedCrashes: Crash[] = $state([]);
	let totalCrashes: number = $state(0);
	let currentPage: number = $state(0);
	const perPage = MAX_CRASH_RESULTS_PER_PAGE;
	let loading: boolean = $state(true);
	let allTimeSummary: CrashSummary | null = $state(null);
	let nearbyLocations: NearbyLocation[] = $state([]);
	let topMapRef: MapContainer | undefined = $state(undefined);
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
				const [briefResult, pageResult, summary, nearby] = await Promise.all([
					getCrashesBrief({ locationId }),
					fetchPage(locationId, 0),
					getCrashSummary({ locationId }),
					getNearbyLocations(locationId)
				]);

				if (requestId !== loadRequestId) return;

				mapCrashes = briefResult.crashes;
				pagedCrashes = pageResult.crashes;
				totalCrashes = pageResult.total;
				currentPage = 0;
				allTimeSummary = summary;
				nearbyLocations = nearby;

				requestAnimationFrame(() => {
					if (requestId !== loadRequestId || !topMapRef) return;
					topMapRef.updateMapWithLocation(locationSnapshot);
					topMapRef.updateNearbyMarkers(briefResult.crashes);
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
	<div class="top-grid">
		<div class="stats-col">
			<LocationSummary crashes={pagedCrashes} {location} summary={allTimeSummary} compact={true} />
		</div>
		<div class="map-col">
			<div class="map-card top-map-card">
				<MapContainer
					bind:this={topMapRef}
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
	{:else if pagedCrashes.length === 0}
		<div class="empty-state">
			<p class="empty-text">No crashes found for this location.</p>
		</div>
	{:else}
		<CrashList
			crashes={pagedCrashes}
			selectedLocation={location}
			showCrashOnMap={(id) => showCrashOnMap(topMapRef, id)}
		/>
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

	.top-map-card :global(.map-root) {
		height: 20rem;
		margin-bottom: 0;
	}

	@media (min-width: 768px) {
		.top-map-card :global(.map-root) {
			height: 28rem;
		}
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
