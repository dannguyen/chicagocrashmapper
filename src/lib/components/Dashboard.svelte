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
<div class="flex flex-col lg:flex-row min-h-[calc(100vh-8rem)] gap-0" id="main-results-section">

	<!-- LEFT PANEL: controls + list -->
	<!-- Task 4: added border-r border-gray-200 for visual separation from map -->
	<div class="order-2 lg:order-1 lg:w-[40%] flex flex-col overflow-y-auto lg:max-h-[calc(100vh-8rem)] border-r border-gray-200 bg-gray-50">

		<!-- Filters collapsible -->
		<div class="p-4 border-b border-gray-200 bg-white">
			{#if appState.selectedLocation}
				<!-- Task 3: filter summary as chips -->
				<div class="flex flex-wrap items-center gap-1.5 mb-2">
					{#if appState.selectedLocation.isPoint}
						<span class="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-xs text-gray-600">
							Within {appState.maxDistance.toLocaleString()} {appState.distanceUnits}
						</span>
					{:else}
						<span class="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-xs text-gray-600">
							Within {appState.selectedLocation.name}
						</span>
					{/if}
					<span class="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-xs text-gray-600">
						Last {appState.maxDaysAgo} days
					</span>
					{#if !isToday(appState.selectedDate)}
						<span class="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-xs text-gray-600">
							As of {formatDateInput(appState.selectedDate)}
						</span>
					{/if}
				</div>

				<details class="group">
					<summary class="text-sm font-medium text-gray-700 cursor-pointer select-none list-none flex items-center gap-1 hover:text-blue-700 transition-colors py-2 px-3 min-h-[44px] -mx-3">
						<svg class="w-3.5 h-3.5 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
						Filters
					</summary>
					<div class="mt-3 space-y-3 pl-1">
						{#if appState.selectedLocation.isPoint}
							<div>
								<label for="max-distance-input" class="block text-xs font-medium text-gray-600 mb-1">
									Search radius ({appState.distanceUnits})
								</label>
								<input
									id="max-distance-input"
									type="number"
									min="1"
									value={appState.maxDistance}
									oninput={handleMaxDistanceChange}
									class="w-full px-2 h-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
							</div>
						{/if}
						<div>
							<label for="max-days-ago-input" class="block text-xs font-medium text-gray-600 mb-1">
								Days of history
							</label>
							<input
								id="max-days-ago-input"
								type="number"
								min="1"
								value={appState.maxDaysAgo}
								oninput={handleMaxDaysAgoChange}
								class="w-full px-2 h-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>
						<div>
							<label for="selected-date-input" class="block text-xs font-medium text-gray-600 mb-1">
								Reference date
							</label>
							<input
								id="selected-date-input"
								type="date"
								value={formatDateInput(appState.selectedDate)}
								oninput={handleSelectedDateChange}
								class="w-full px-2 h-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>
					</div>
				</details>
			{:else}
				<p class="text-sm text-gray-500">Search for a location or tap Near Me to filter crashes.</p>
			{/if}
		</div>

		<!-- Task 2: Results header — sticky, polished count + location badge -->
		<div class="sticky top-0 bg-white border-b border-gray-100 z-10 px-4 py-2 flex items-center gap-2">
			{#if appState.loading}
				<svg class="animate-spin h-3.5 w-3.5 text-blue-600 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
				</svg>
				<span class="text-sm font-medium text-gray-500">Loading...</span>
			{:else if appState.selectedLocation}
				<span class="font-medium text-gray-900 truncate max-w-[150px]">{appState.selectedLocation.name}</span>
				<span class="text-gray-300 flex-shrink-0">&middot;</span>
				<span class="text-sm text-gray-600 flex-shrink-0">
					<span class="font-bold text-blue-700">{appState.filteredIncidents.length.toLocaleString()}</span> crashes
				</span>
			{:else}
				<span class="text-sm font-medium text-gray-600">
					{appState.incidents.length} recent serious crashes citywide
				</span>
			{/if}
		</div>

		<!-- LocationSummary (when location selected + incidents loaded) -->
		{#if appState.selectedLocation && !appState.loading && appState.incidents.length > 0}
			<div class="px-4 pt-3 pb-1">
				<LocationSummary incidents={appState.incidents} location={appState.selectedLocation} />
			</div>
		{/if}

		<!-- City-wide trend chart (homepage, no location) -->
		{#if !appState.selectedLocation && !appState.loading}
			<div class="px-4 pt-3 pb-1">
				<TrendChart />
			</div>
		{/if}

		<!-- Cause filter -->
		{#if appState.selectedLocation && appState.incidents.length > 1}
			<div class="px-4 pt-3 pb-1">
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
			<div class="flex flex-col items-center justify-center flex-1 px-6 py-12 text-center gap-3">
				<!-- Map pin icon, 48px, blue-700 -->
				<svg
					class="w-12 h-12 text-blue-700 mb-1"
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
				<h2 class="text-xl font-bold text-gray-900">Chicago Crash Data</h2>
				<p class="text-sm text-gray-500 max-w-xs leading-relaxed">
					Explore traffic crash data for any Chicago neighborhood, ward, or intersection.
				</p>
				<p class="text-xs text-gray-400">Search above or use Near Me to get started.</p>
			</div>
		{:else}
			<div class="px-4 py-3 lg:flex-1">
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
	<div class="order-1 lg:order-2 lg:flex-1 h-72 sm:h-96 lg:h-auto lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)]">
		<div class="h-full">
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
