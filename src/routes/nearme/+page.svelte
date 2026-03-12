<script lang="ts">
	import { onMount } from 'svelte';

	import {
		SEARCH_DEBOUNCE_MS,
		SITE_NAME,
		CHICAGO_CENTER,
		DEFAULT_MAX_DISTANCE_FT,
		DEFAULT_MAX_DAYS
	} from '$lib/constants';
	import { Location } from '$lib/location';
	import type { LocationRecord } from '$lib/db/types';
	import { parseCrashes, type Crash } from '$lib/models/crash';
	import { getCrashesNearPoint, getCrashesWithin } from '$lib/api/client';
	import { toDateStr, addDays } from '$lib/transformHelpers';
	import CrashList from '$lib/components/CrashList.svelte';
	import MapContainer from '$lib/components/MapContainer.svelte';
	import LocationSummary from '$lib/components/LocationSummary.svelte';
	import CauseFilter from '$lib/components/CauseFilter.svelte';

	const defaultGeoCenter = CHICAGO_CENTER;
	const searchDelayMs = SEARCH_DEBOUNCE_MS;
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;
	let lastSearchedLocation: Location | null = null;
	let selectedLocation: Location | null = $state(null);
	let crashes: Crash[] = $state([]);
	let maxDaysAgo = $state(DEFAULT_MAX_DAYS);
	let selectedDate = $state(new Date());
	let maxDistance = $state(DEFAULT_MAX_DISTANCE_FT);
	let loading = $state(false);
	let causeFilter: string | null = $state(null);
	let geoLoading = $state(false);
	let geoError: string | null = $state(null);
	let searchRequestId = 0;
	let mapRef: MapContainer | undefined = $state(undefined);

	const filteredCrashes = $derived(
		causeFilter ? crashes.filter((crash) => crash.primary_cause === causeFilter) : crashes
	);

	function invalidateSearch() {
		searchRequestId++;
	}

	async function searchCrashesByLocation(location: Location) {
		const requestId = ++searchRequestId;
		loading = true;
		causeFilter = null;
		try {
			const since = toDateStr(addDays(selectedDate, -maxDaysAgo));
			const until = toDateStr(addDays(selectedDate, maxDaysAgo));

			const records = location.isShape
				? await getCrashesWithin(location.id, since, until)
				: await getCrashesNearPoint(
						location.latitude,
						location.longitude,
						since,
						until,
						maxDistance
					);

			if (requestId !== searchRequestId) return;
			crashes = Array.from(parseCrashes(records));
		} catch {
			if (requestId !== searchRequestId) return;
			crashes = [];
		} finally {
			if (requestId !== searchRequestId) return;
			loading = false;
		}
	}

	async function useMyLocation() {
		if (typeof navigator === 'undefined' || !navigator.geolocation) {
			geoError = 'Geolocation is not supported by your browser';
			return;
		}

		geoLoading = true;
		geoError = null;

		try {
			const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
				navigator.geolocation.getCurrentPosition(resolve, reject, {
					timeout: 10000,
					maximumAge: 60000
				})
			);
			const { latitude, longitude } = pos.coords;
			const record: LocationRecord = {
				id: '',
				name: 'My Location',
				category: 'intersection',
				latitude,
				longitude,
				the_geom: `POINT(${longitude} ${latitude})`
			};
			selectedLocation = new Location(record);
		} catch (e: unknown) {
			const err = e as GeolocationPositionError;
			if (err?.code === 1) {
				geoError = 'Location access denied. Please allow location access.';
			} else {
				geoError = 'Could not get your location. Try searching by name instead.';
			}
		} finally {
			geoLoading = false;
		}
	}

	function scheduleCrashSearch() {
		const location = selectedLocation;
		if (!location) return;
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}
		searchTimeout = setTimeout(() => {
			searchCrashesByLocation(location);
		}, searchDelayMs);
	}

	function handleMaxDistanceChange(event: Event) {
		const value = parseFloat((event.target as HTMLInputElement).value);
		if (!isNaN(value) && value >= 1) {
			maxDistance = value;
			scheduleCrashSearch();
		}
	}

	function handleMaxDaysAgoChange(event: Event) {
		const value = parseInt((event.target as HTMLInputElement).value, 10);
		if (!isNaN(value) && value >= 1) {
			maxDaysAgo = value;
			scheduleCrashSearch();
		}
	}

	function handleSelectedDateChange(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		if (value) {
			const nextDate = new Date(value);
			if (!isNaN(nextDate.getTime())) {
				selectedDate = nextDate;
			}
			scheduleCrashSearch();
		}
	}

	function formatDateInput(date: Date): string {
		return date.toISOString().split('T')[0];
	}

	function showCrashOnMap(crashId: string) {
		if (!mapRef) return;
		mapRef.openCrashPopup(crashId);
		const mapEl = document.getElementById('map');
		if (mapEl) {
			mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
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
		const loc = selectedLocation;
		if (loc && loc !== lastSearchedLocation) {
			lastSearchedLocation = loc;
			searchCrashesByLocation(loc);
		} else if (!loc) {
			lastSearchedLocation = null;
			invalidateSearch();
			crashes = [];
			causeFilter = null;
			loading = false;
		}
	});

	onMount(() => {
		useMyLocation();

		return () => {
			if (searchTimeout) {
				clearTimeout(searchTimeout);
			}
			invalidateSearch();
		};
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
			{#if geoLoading && !selectedLocation}
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
			{:else if geoError}
				<div class="geo-error">
					<p>{geoError}</p>
					<button class="retry-button" onclick={() => useMyLocation()}>Try again</button>
				</div>
			{:else if selectedLocation}
				<div class="filter-chips">
					{#if selectedLocation.isPoint}
						<span class="filter-chip">
							Within {maxDistance.toLocaleString()}
							feet
						</span>
					{:else}
						<span class="filter-chip">
							Within {selectedLocation.name}
						</span>
					{/if}
					<span class="filter-chip">
						Last {maxDaysAgo} days
					</span>
					{#if !isToday(selectedDate)}
						<span class="filter-chip">
							As of {formatDateInput(selectedDate)}
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
						{#if selectedLocation.isPoint}
							<div>
								<label for="max-distance-input" class="filter-label"> Search radius (feet) </label>
								<input
									id="max-distance-input"
									type="number"
									min="1"
									value={maxDistance}
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
								value={maxDaysAgo}
								oninput={handleMaxDaysAgoChange}
								class="filter-input"
							/>
						</div>
						<div>
							<label for="selected-date-input" class="filter-label"> Reference date </label>
							<input
								id="selected-date-input"
								type="date"
								value={formatDateInput(selectedDate)}
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
			{#if loading}
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
			{:else if selectedLocation}
				<span class="results-location">{selectedLocation.name}</span>
				<span class="results-divider">&middot;</span>
				<span class="results-count">
					<span class="results-count-strong">{filteredCrashes.length.toLocaleString()}</span>
					crashes
				</span>
			{/if}
		</div>

		<!-- LocationSummary -->
		{#if selectedLocation && !loading && crashes.length > 0}
			<div class="panel-block">
				<LocationSummary {crashes} location={selectedLocation} />
			</div>
		{/if}

		<!-- CauseFilter -->
		{#if selectedLocation && crashes.length > 1}
			<div class="panel-block">
				<CauseFilter
					{crashes}
					activeCause={causeFilter}
					onSelectCause={(cause) => {
						causeFilter = cause;
					}}
				/>
			</div>
		{/if}

		<!-- Crash list -->
		{#if selectedLocation && filteredCrashes.length > 0}
			<div class="panel-list">
				<CrashList
					crashes={filteredCrashes}
					{selectedLocation}
					distanceUnits="feet"
					{showCrashOnMap}
				/>
			</div>
		{/if}
	</div>

	<!-- RIGHT PANEL: map -->
	<div class="map-panel">
		<div class="map-shell">
			<MapContainer
				bind:this={mapRef}
				{selectedLocation}
				{crashes}
				{defaultGeoCenter}
				{maxDistance}
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
