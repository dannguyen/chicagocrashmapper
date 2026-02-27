<script lang="ts">
	import { onMount } from 'svelte';

	import { appState } from '$lib/components/AppState.svelte';
	import { SEARCH_DEBOUNCE_MS, SITE_NAME } from '$lib/constants';
	import type { Location } from '$lib/location';
	import type { Crash } from '$lib/crash';
	import CrashList from '$lib/components/CrashList.svelte';
	import MapContainer from '$lib/components/MapContainer.svelte';
	import LocationSummary from '$lib/components/LocationSummary.svelte';
	import CauseFilter from '$lib/components/CauseFilter.svelte';

	const defaultGeoCenter: [number, number] = [41.8781, -87.6298];
	const searchDelayMs = SEARCH_DEBOUNCE_MS;
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;
	let lastSearchedLocation: Location | null = null;

	function setCrashDetail(item: Crash | null) {
		appState.selectCrash(item);
	}

	function scheduleCrashSearch() {
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
			scheduleCrashSearch();
		}
	}

	function handleMaxDaysAgoChange(event: Event) {
		const value = parseInt((event.target as HTMLInputElement).value, 10);
		if (!isNaN(value) && value >= 1) {
			appState.setMaxDaysAgo(value);
			scheduleCrashSearch();
		}
	}

	function handleSelectedDateChange(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		if (value) {
			appState.setSelectedDate(new Date(value));
			scheduleCrashSearch();
		}
	}

	function formatDateInput(date: Date): string {
		return date.toISOString().split('T')[0];
	}

	function showCrashOnMap(index: number) {
		const filtered = appState.filteredCrashes;
		setCrashDetail(filtered[index]);
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
			appState.searchCrashesByLocation(loc);
		} else if (!loc) {
			lastSearchedLocation = null;
		}
	});

	onMount(() => {
		appState.useMyLocation();
	});
</script>

<svelte:head>
	<title>Near Me — {SITE_NAME}</title>
</svelte:head>

<div class="dashboard-layout" id="main-results-section">
	<!-- LEFT PANEL -->
	<div class="dashboard-panel">
		<!-- Geolocating / error / filters -->
		<div class="panel-section">
			{#if appState.geoLoading && !appState.selectedLocation}
				<div class="geo-status">
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
					<span>Finding your location...</span>
				</div>
			{:else if appState.geoError}
				<div class="geo-error">
					<p>{appState.geoError}</p>
					<button class="retry-button" onclick={() => appState.useMyLocation()}>Try again</button>
				</div>
			{:else if appState.selectedLocation}
				<div class="filter-chips">
					{#if appState.selectedLocation.isPoint}
						<span class="filter-chip">
							Within {appState.maxDistance.toLocaleString()}
							{appState.distanceUnits}
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
						<svg
							class="filter-caret"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 5l7 7-7 7"
							/>
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
							<label for="max-days-ago-input" class="filter-label"> Days of history </label>
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
							<label for="selected-date-input" class="filter-label"> Reference date </label>
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
			{/if}
		</div>

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
			{:else if appState.selectedLocation}
				<span class="results-location">{appState.selectedLocation.name}</span>
				<span class="results-divider">&middot;</span>
				<span class="results-count">
					<span class="results-count-strong"
						>{appState.filteredCrashes.length.toLocaleString()}</span
					> crashes
				</span>
			{/if}
		</div>

		<!-- LocationSummary -->
		{#if appState.selectedLocation && !appState.loading && appState.crashes.length > 0}
			<div class="panel-block">
				<LocationSummary crashes={appState.crashes} location={appState.selectedLocation} />
			</div>
		{/if}

		<!-- CauseFilter -->
		{#if appState.selectedLocation && appState.crashes.length > 1}
			<div class="panel-block">
				<CauseFilter
					crashes={appState.crashes}
					activeCause={appState.causeFilter}
					onSelectCause={(cause) => appState.setCauseFilter(cause)}
				/>
			</div>
		{/if}

		<!-- Crash list -->
		{#if appState.selectedLocation && appState.filteredCrashes.length > 0}
			<div class="panel-list">
				<CrashList
					crashes={appState.filteredCrashes}
					selectedLocation={appState.selectedLocation}
					distanceUnits={appState.distanceUnits}
					{showCrashOnMap}
				/>
			</div>
		{/if}
	</div>

	<!-- RIGHT PANEL: map -->
	<div class="map-panel">
		<div class="map-shell">
			<MapContainer
				selectedLocation={appState.selectedLocation}
				crashes={appState.crashes}
				{setCrashDetail}
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

	.geo-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.geo-error {
		font-size: 0.875rem;
		color: #dc2626;
	}

	.geo-error p {
		margin: 0 0 0.5rem;
	}

	.retry-button {
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: #2563eb;
		background: #eff6ff;
		border: 1px solid #bfdbfe;
		border-radius: 0.375rem;
		cursor: pointer;
	}

	.retry-button:hover {
		background: #dbeafe;
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
		transition:
			border-color 120ms ease,
			box-shadow 120ms ease;
	}

	.filter-input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgb(59 130 246 / 0.35);
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
