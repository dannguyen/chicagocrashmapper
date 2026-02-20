<script lang="ts">
	import { onMount } from 'svelte';
	import { Incident, reifyIncidents } from '$lib/incident';
	import type { IncidentRecord } from '$lib/incident';
	import { Location } from '$lib/location';
	import { getIncidentSummary, getIncidentsList } from '$lib/api/client';
	import type { IncidentListResult } from '$lib/api/client';
	import type { IncidentSummary } from '$lib/db/types';
	import LocationSummary from '$lib/components/LocationSummary.svelte';
	import MapContainer from '$lib/components/MapContainer.svelte';
	import IncidentList from '$lib/components/IncidentList.svelte';

	let { location } = $props<{ location: Location }>();

	let incidents: Incident[] = $state([]);
	let totalIncidents: number = $state(0);
	let currentPage: number = $state(0);
	let perPage: number = $state(25);
	let loading: boolean = $state(true);
	let allTimeSummary: IncidentSummary | null = $state(null);
	let mapRef: MapContainer | undefined = $state(undefined);

	const rangeStart = $derived(totalIncidents === 0 ? 0 : currentPage * perPage + 1);
	const rangeEnd = $derived(Math.min((currentPage + 1) * perPage, totalIncidents));
	const totalPages = $derived(Math.ceil(totalIncidents / perPage));
	const hasPrev = $derived(currentPage > 0);
	const hasNext = $derived(currentPage < totalPages - 1);

	async function fetchPage(page: number) {
		loading = true;
		try {
			const result: IncidentListResult = await getIncidentsList({
				locationId: location.id,
				page,
				sort: 'desc'
			});
			incidents = reifyIncidents(result.incidents);
			totalIncidents = result.total;
			perPage = result.per_page;
			currentPage = result.page;
		} finally {
			loading = false;
		}
	}

	function goToPrev() {
		if (hasPrev) fetchPage(currentPage - 1);
	}

	function goToNext() {
		if (hasNext) fetchPage(currentPage + 1);
	}

	function showIncidentOnMap(index: number) {
		const item = incidents[index];
		if (item && mapRef) {
			mapRef.fitToIncidents([item]);
		}
	}

	function setIncidentDetail(_item: Incident | null) {
		// no-op for now
	}

	$effect(() => {
		if (incidents.length > 0 && mapRef) {
			mapRef.updateNearbyMarkers(incidents);
		}
	});

	onMount(async () => {
		// Fetch all-time summary and first page in parallel
		const [, summary] = await Promise.all([
			fetchPage(0),
			getIncidentSummary({ locationId: location.id })
		]);
		allTimeSummary = summary;

		// After map mounts and data loads, show location shape/marker
		requestAnimationFrame(() => {
			if (mapRef) {
				mapRef.updateMapWithLocation(location);
			}
		});
	});
</script>

<div class="location-detail">
	<LocationSummary {incidents} {location} summary={allTimeSummary} />

	<MapContainer
		bind:this={mapRef}
		selectedLocation={location}
		{incidents}
		{setIncidentDetail}
		defaultGeoCenter={[location.latitude, location.longitude]}
		maxDistance={5280}
	/>

	{#if totalIncidents > 0}
		<div class="pagination-bar">
			<span class="pagination-info">
				Showing {rangeStart}–{rangeEnd} of {totalIncidents} incidents
			</span>
			<div class="pagination-buttons">
				<button class="btn-page" disabled={!hasPrev || loading} onclick={goToPrev}>
					Prev
				</button>
				<button class="btn-page" disabled={!hasNext || loading} onclick={goToNext}>
					Next
				</button>
			</div>
		</div>
	{/if}

	{#if loading}
		<p class="loading-text">Loading incidents...</p>
	{:else}
		<IncidentList
			{incidents}
			selectedLocation={location}
			distanceUnits="feet"
			{showIncidentOnMap}
		/>
	{/if}
</div>

<style lang="postcss">
	@reference "$lib/styles/app.css";

	.location-detail {
		@apply flex flex-col gap-4;
	}

	.pagination-bar {
		@apply flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2;
	}

	.pagination-info {
		@apply text-sm text-gray-600;
	}

	.pagination-buttons {
		@apply flex gap-2;
	}

	.btn-page {
		@apply px-3 py-1 text-sm font-medium rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors;
	}

	.loading-text {
		@apply text-sm text-gray-500 text-center py-4;
	}
</style>
