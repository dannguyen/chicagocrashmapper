<script lang="ts">
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';

	import { appState } from '$lib/components/AppState.svelte';
	import { getLocationById } from '$lib/api/client';
	import { Location } from '$lib/location';
	import type { Incident } from '$lib/incident';
	import IncidentList from '$lib/components/IncidentList.svelte';
	import MapContainer from '$lib/components/MapContainer.svelte';
	import LocationSummary from '$lib/components/LocationSummary.svelte';
	import CauseFilter from '$lib/components/CauseFilter.svelte';
	import TrendChart from '$lib/components/TrendChart.svelte';

	let { initialLocationId = null } = $props<{
		initialLocationId?: string | null;
	}>();

	const defaultGeoCenter: [number, number] = [41.8781, -87.6298];
	const searchDelayMs = 700;
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;
	let lastSearchedLocation: Location | null = null;

	function setIncidentDetail(item: Incident | null) {
		appState.selectIncident(item);
	}

	function onLocationSelect(location: Location) {
		appState.selectLocationAndSearch(location);
	}

	function scheduleIncidentSearch() {
		if (!appState.selectedLocation) return;
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}
		searchTimeout = setTimeout(() => {
			appState.refreshSearch();
		}, searchDelayMs);
	}

	function handleMaxDistanceChange(event: Event) {
		const value = parseFloat((event.target as HTMLInputElement).value);
		if (!isNaN(value) && value >= 1) {
			appState.setMaxDistance(value);
			scheduleIncidentSearch();
		}
	}

	function handleMaxDaysAgoChange(event: Event) {
		const value = parseInt((event.target as HTMLInputElement).value, 10);
		if (!isNaN(value) && value >= 1) {
			appState.setMaxDaysAgo(value);
			scheduleIncidentSearch();
		}
	}

	function handleSelectedDateChange(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		if (value) {
			appState.setSelectedDate(new Date(value));
			scheduleIncidentSearch();
		}
	}

	function formatDateInput(date: Date): string {
		return date.toISOString().split('T')[0];
	}

	function showIncidentOnMap(index: number) {
		// find the index in the full incidents list matching the filtered item
		const filtered = appState.filteredIncidents;
		setIncidentDetail(filtered[index]);
	}

	$effect(() => {
		const loc = appState.selectedLocation;
		if (loc && loc !== lastSearchedLocation) {
			lastSearchedLocation = loc;
			appState.searchIncidentsByLocation(loc);
		} else if (!loc) {
			lastSearchedLocation = null;
		}
	});

	onMount(async () => {
		if (initialLocationId) {
			const record = await getLocationById(initialLocationId);
			if (record) {
				onLocationSelect(new Location(record));
			}
		} else {
			appState.loadRecentSeriousIncidents(20);
		}
	});
</script>

<!-- Result Container -->
<div class="block" id="main-results-section">
	<section id="query-result-meta-section">
		{#key `${appState.selectedLocation?.name ?? 'none'}-${appState.incidents.length}`}
			<div class="meta-wrapper" out:slide={{ duration: 300 }}>
				<div class="search-results-for-selected-location">
					<div class="selected-location-info">
						{#if appState.loading}
							<div class="meta-line">
								<span class="meta-label">Loading...</span>
							</div>
						{:else if appState.selectedLocation}
							<div class="meta-line">
								<span class="meta-label">Location:</span>
								<span class="location-name">{appState.selectedLocation.name}</span>
							</div>
							<div class="search-results-summary">
								<div class="search-attr">
									{appState.incidents.length}
								</div>
								incidents found within

								{#if appState.selectedLocation.isPoint}
									<div class="search-attr">
										<input
											id="inline-max-distance-input"
											class="inline-input number-input"
											type="number"
											min="1"
											value={appState.maxDistance}
											oninput={handleMaxDistanceChange}
										/>
										{appState.distanceUnits}
									</div>
								{:else}
									the boundaries of
									<div class="search-attr">
										{appState.selectedLocation.name}
									</div>
								{/if}
								and
								<div class="search-attr">
									<input
										id="inline-max-days-ago-input"
										class="inline-input number-input"
										type="number"
										min="1"
										value={appState.maxDaysAgo}
										oninput={handleMaxDaysAgoChange}
									/>
									days from
								</div>
								<input
									id="inline-selected-date-input"
									class="inline-input date-input"
									type="date"
									value={formatDateInput(appState.selectedDate)}
									oninput={handleSelectedDateChange}
								/>
							</div>
						{:else}
							<div class="meta-line">
								<span class="meta-label">
									Showing {appState.incidents.length} most recent serious crashes citywide.
								</span>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/key}
	</section>

	<!-- Summary panel (shown when a location is selected and incidents are loaded) -->
	{#if appState.selectedLocation && !appState.loading && appState.incidents.length > 0}
		<LocationSummary incidents={appState.incidents} location={appState.selectedLocation} />
	{/if}

	<!-- City-wide trend chart (shown on homepage with no location selected) -->
	{#if !appState.selectedLocation && !appState.loading}
		<TrendChart />
	{/if}

	<div class="details-container">
		<section id="map-section">
			<MapContainer
				selectedLocation={appState.selectedLocation}
				incidents={appState.incidents}
				{setIncidentDetail}
				{defaultGeoCenter}
				maxDistance={appState.maxDistance}
			/>
		</section>
	</div>

	<!-- Cause filter (shown when incidents are loaded for a location) -->
	{#if appState.selectedLocation && appState.incidents.length > 1}
		<CauseFilter
			incidents={appState.incidents}
			activeCause={appState.causeFilter}
			onSelectCause={(cause) => appState.setCauseFilter(cause)}
		/>
	{/if}

	<section id="incidents-list-section">
		<IncidentList
			incidents={appState.filteredIncidents}
			selectedLocation={appState.selectedLocation}
			distanceUnits={appState.distanceUnits}
			{showIncidentOnMap}
		/>
	</section>
</div>

<style lang="postcss">
	@reference "$lib/styles/app.css";

	.search-results-summary {
		@apply py-3;
	}
	.search-attr {
		display: inline;
		font-weight: bold;
	}

	.inline-input {
		display: inline-block;
		padding: 0.2rem 0.35rem;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		font-weight: 600;
		margin: 0 0.25rem;
	}

	.inline-input.number-input {
		width: 5.5rem;
	}

	.inline-input.date-input {
		width: 12rem;
	}

	#main-results-section {
		@apply mb-4 p-4;
	}
</style>
