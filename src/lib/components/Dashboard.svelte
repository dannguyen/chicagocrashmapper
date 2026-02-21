<script lang="ts">
	import { onMount } from 'svelte';

	import { appState } from '$lib/components/AppState.svelte';
	import { SEARCH_DEBOUNCE_MS } from '$lib/constants';
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
	const searchDelayMs = SEARCH_DEBOUNCE_MS;
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

	function isToday(date: Date): boolean {
		const today = new Date();
		return (
			date.getFullYear() === today.getFullYear() &&
			date.getMonth() === today.getMonth() &&
			date.getDate() === today.getDate()
		);
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

<!-- Two-column layout: left panel + map -->
<div class="dashboard-layout" id="main-results-section">

	<!-- LEFT PANEL: controls + list -->
	<!-- Task 4: added border-r border-gray-200 for visual separation from map -->
	<div class="dashboard-panel">

		<!-- Filters collapsible -->
		<div class="panel-section">
			{#if appState.selectedLocation}
				<!-- Task 3: filter summary as chips -->
				<div class="filter-chips">
					{#if appState.selectedLocation.isPoint}
						<span class="filter-chip">
							Within {appState.maxDistance.toLocaleString()} {appState.distanceUnits}
						</span>
					{:else}
						<span class="filter-chip">
							Within {appState.selectedLocation.name}
						</span>
					{/if}
					<span class="filter-chip">
						Last {appState.maxDaysAgo} days
					</span>
					{#if !isToday(appState.selectedDate)}
						<span class="filter-chip">
							As of {formatDateInput(appState.selectedDate)}
						</span>
					{/if}
				</div>

				<details class="filter-details">
					<summary class="filter-summary">
						<svg class="filter-caret" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
						Filters
					</summary>
					<div class="filter-body">
						{#if appState.selectedLocation.isPoint}
							<div>
								<label for="max-distance-input" class="filter-label">
									Search radius ({appState.distanceUnits})
								</label>
								<input
									id="max-distance-input"
									type="number"
									min="1"
									value={appState.maxDistance}
									oninput={handleMaxDistanceChange}
									class="filter-input"
								/>
							</div>
						{/if}
						<div>
							<label for="max-days-ago-input" class="filter-label">
								Days of history
							</label>
							<input
								id="max-days-ago-input"
								type="number"
								min="1"
								value={appState.maxDaysAgo}
								oninput={handleMaxDaysAgoChange}
								class="filter-input"
							/>
						</div>
						<div>
							<label for="selected-date-input" class="filter-label">
								Reference date
							</label>
							<input
								id="selected-date-input"
								type="date"
								value={formatDateInput(appState.selectedDate)}
								oninput={handleSelectedDateChange}
								class="filter-input"
							/>
						</div>
					</div>
				</details>
			{:else}
				<p class="panel-hint">Search for a location or tap Near Me to filter crashes.</p>
			{/if}
		</div>

		<!-- Task 2: Results header — sticky, polished count + location badge -->
		<div class="results-header">
			{#if appState.loading}
				<svg class="loading-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
				</svg>
				<span class="loading-label">Loading...</span>
			{:else if appState.selectedLocation}
				<span class="results-location">{appState.selectedLocation.name}</span>
				<span class="results-divider">&middot;</span>
				<span class="results-count">
					<span class="results-count-strong">{appState.filteredIncidents.length.toLocaleString()}</span> crashes
				</span>
			{:else}
				<span class="results-summary">
					{appState.incidents.length} recent serious crashes citywide
				</span>
			{/if}
		</div>

		<!-- LocationSummary (when location selected + incidents loaded) -->
		{#if appState.selectedLocation && !appState.loading && appState.incidents.length > 0}
			<div class="panel-block">
				<LocationSummary incidents={appState.incidents} location={appState.selectedLocation} />
			</div>
		{/if}

		<!-- City-wide trend chart (homepage, no location) -->
		{#if !appState.selectedLocation && !appState.loading}
			<div class="panel-block">
				<TrendChart />
			</div>
		{/if}

		<!-- Cause filter -->
		{#if appState.selectedLocation && appState.incidents.length > 1}
			<div class="panel-block">
				<CauseFilter
					incidents={appState.incidents}
					activeCause={appState.causeFilter}
					onSelectCause={(cause) => appState.setCauseFilter(cause)}
				/>
			</div>
		{/if}

		<!-- Incident list (scrollable on desktop, stacked below map on mobile) -->
		{#if !appState.selectedLocation && appState.incidents.length === 0 && !appState.loading}
			<!-- Task 1: Compelling welcome empty state -->
			<div class="empty-state">
				<!-- Map pin icon, 48px, blue-700 -->
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
				<h2 class="empty-title">Chicago Crash Data</h2>
				<p class="empty-body">
					Explore traffic crash data for any Chicago neighborhood, ward, or intersection.
				</p>
				<p class="empty-note">Search above or use Near Me to get started.</p>
			</div>
		{:else}
			<div class="panel-list">
				<IncidentList
					incidents={appState.filteredIncidents}
					selectedLocation={appState.selectedLocation}
					distanceUnits={appState.distanceUnits}
					{showIncidentOnMap}
				/>
			</div>
		{/if}
	</div>

	<!-- RIGHT PANEL: map (desktop), or stacked above list (mobile) -->
	<!-- Task 4: sticky positioning + full viewport height on desktop -->
	<div class="map-panel">
		<div class="map-shell">
			<MapContainer
				selectedLocation={appState.selectedLocation}
				incidents={appState.incidents}
				{setIncidentDetail}
				{defaultGeoCenter}
				maxDistance={appState.maxDistance}
			/>
		</div>
	</div>

</div>

<style>
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

	.panel-section {
		padding: 1rem;
		border-bottom: 1px solid #e5e7eb;
		background: #fff;
	}

	.filter-chips {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
		margin-bottom: 0.5rem;
	}

	.filter-chip {
		display: inline-flex;
		align-items: center;
		padding: 0.125rem 0.5rem;
		border-radius: 0.375rem;
		background: #f3f4f6;
		font-size: 0.75rem;
		color: #4b5563;
	}

	.filter-details {
		border-radius: 0.5rem;
	}

	.filter-summary {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.5rem 0.75rem;
		margin: 0 -0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
		cursor: pointer;
		user-select: none;
		list-style: none;
		min-height: 44px;
		transition: color 150ms ease;
	}

	.filter-summary:hover {
		color: #1d4ed8;
	}

	.filter-summary::-webkit-details-marker {
		display: none;
	}

	.filter-caret {
		width: 0.875rem;
		height: 0.875rem;
		transition: transform 150ms ease;
	}

	.filter-details[open] .filter-caret {
		transform: rotate(90deg);
	}

	.filter-body {
		margin-top: 0.75rem;
		padding-left: 0.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.filter-label {
		display: block;
		margin-bottom: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: #4b5563;
	}

	.filter-input {
		width: 100%;
		height: 2.5rem;
		padding: 0 0.5rem;
		font-size: 0.875rem;
		border: 1px solid #d1d5db;
		border-radius: 0.5rem;
		background: #fff;
		transition: border-color 120ms ease, box-shadow 120ms ease;
	}

	.filter-input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgb(59 130 246 / 0.35);
	}

	.panel-hint {
		font-size: 0.875rem;
		color: #6b7280;
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

	.results-location {
		font-weight: 500;
		color: #111827;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 150px;
	}

	.results-divider {
		color: #d1d5db;
		flex-shrink: 0;
	}

	.results-count {
		font-size: 0.875rem;
		color: #4b5563;
		flex-shrink: 0;
	}

	.results-count-strong {
		font-weight: 700;
		color: #1d4ed8;
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
