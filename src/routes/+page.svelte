<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';

	import { type Incident } from '$lib/incident';

	import {
		highlightFilteredText,
		filterLocationsBySearchString,
		type Location
	} from '$lib/location';

	import { initDb, registerGeospatialFunctions, type DatabaseConnection } from '$lib/dbUtils';

	const databasePath: string = resolve('/database.sqlite');
	let database: DatabaseConnection = { db: null };

	const locationsPath: string = resolve('/locations.json');
	let locationsArray: Location[] = $state.raw([]);
	let locationCount: number = $derived(locationsArray.length);

	const defaultGeoCenter: [number, number] = [41.8781, -87.6298];
	let isDataLoaded = $state<boolean>(false);

	let inputValue = $state<string>('');
	let searchQuery = $state<string>('');
	let showAutocomplete = $state<boolean>(false);
	let debounceTimer: ReturnType<typeof setTimeout>;

	let incidents: Incident[] = $state([]);
	let selectedLocation = $state<Location | null>(null);

	let map: any;
	let marker: any;
	let markerLayerGroup: any;
	let L: any;

	function enumerateIncidents(items: any[]) {
		let returnItems: Incident[] = [];
		items.forEach((item) => {
			let i = {
				longitude: item.longitude,
				latitude: item.latitude,
				title: `${item.injuries_fatal} fatalities on ${item.street_no} ${item.street_direction} ${item.street_name}`,
				category: item.prim_contributory_cause,
				distance: item.distance.toFixed(0),
				date: item.crash_date
			};
			returnItems.push(i);
		});

		return returnItems;
	}

	function findNearbyIncidents(location: Location) {
		if (!database.db) return;
		const iLat = location.latitude;
		const iLon = location.longitude;

		// Query for 5 closest records
		const stmt = database.db.prepare(`
          SELECT *, HAVERSINE_DISTANCE(latitude, longitude, :lat, :lon) as distance
          FROM incidents
          ORDER BY distance ASC
          LIMIT 20
          ;
      `);

		stmt.bind({ ':lat': iLat, ':lon': iLon });

		const results = [];
		while (stmt.step()) {
			const row = stmt.getAsObject();
			results.push(row);
		}
		stmt.free();

		incidents = enumerateIncidents(results);
		console.log(`incident 0 of ${incidents.length}: ${JSON.stringify(incidents[0])}`);

		updateNearbyMarkers(incidents);

		let mappoints: Array = [[iLat, iLon]];
		results.forEach((r) => {
			mappoints.push([r.latitude, r.longitude]);
		});
		map.fitBounds(mappoints, { padding: [50, 20], maxZoom: 15 });
	}

	function handleInput() {
		showAutocomplete = true;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			searchQuery = inputValue;
		}, 300);
	}

	function handleInputBlur() {
		// Small delay to allow click event on results to register
		setTimeout(() => {
			showAutocomplete = false;
		}, 200);
	}

	function handleInputFocus() {
		if (inputValue.trim()) {
			showAutocomplete = true;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && locationResults.length > 0) {
			selectLocation(locationResults[0]);
			showAutocomplete = false; // Hide autocomplete after selection
			event.preventDefault(); // Prevent form submission if input is part of a form
		}
	}

	async function initDatabase() {
		database.db = await initDb(databasePath);
		if (database.db) {
			registerGeospatialFunctions(database.db);
		}
	}

	async function initMap() {
		L = (await import('leaflet')).default;

		// Chicago center coordinates
		map = L.map('map').setView(defaultGeoCenter, 11);
		markerLayerGroup = L.layerGroup().addTo(map);

		// Use OpenStreetMap
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
			maxZoom: 19
		}).addTo(map);
	}

	function selectLocation(location: Location) {
		selectedLocation = location;
		inputValue = location.name;
		searchQuery = location.name;
		showAutocomplete = false;

		// Update map
		if (map) {
			map.setView([location.latitude, location.longitude], 17);

			if (marker) {
				marker.setLatLng([location.latitude, location.longitude]);
			} else {
				marker = L.marker([location.latitude, location.longitude]).addTo(map);
			}

			marker.bindPopup(location.name).openPopup();

			findNearbyIncidents(location);
		}
	}

	function updateNearbyMarkers(items: Incident[]) {
		if (!map || !L || !markerLayerGroup) return;

		markerLayerGroup.clearLayers();

		items.forEach((item, index) => {
			const lat = item.latitude;
			const lon = item.longitude;

			if (!isNaN(lat) && !isNaN(lon)) {
				const markerHtml = `<div class="flex items-center justify-center w-6 h-6 bg-purple-700 text-white font-bold rounded-full border-2 border-white shadow-md">${index + 1}</div>`;
				const customIcon = L.divIcon({
					html: markerHtml,
					className: '',
					iconSize: [24, 24],
					iconAnchor: [12, 12],
					popupAnchor: [0, -12] // Adjust popup position
				});

				L.marker([lat, lon], { icon: customIcon })
					.bindPopup(
						`<b>${item.title}</b><br>Distance: ${item.distance} feet<br>Date: ${item.date}`
					)
					.addTo(markerLayerGroup);
			}
		});
	}

	// Fetch data on mount
	onMount(async () => {
		await initMap();
		await initDatabase();

		try {
			const response = await fetch(locationsPath);
			locationsArray = await response.json();
			isDataLoaded = true;
		} catch (error) {
			console.error('Error loading locations data:', error);
		}
	});

	let locationResults = $derived.by(() => {
		if (!isDataLoaded) return [];
		return filterLocationsBySearchString(locationsArray, searchQuery);
	});
</script>

<main class="main-container">
	<div class="container">
		<h1>
			Chicago Vehicle Crash Finder
			<i class="fa-regular fa-thumbs-up"></i>
		</h1>

		<section class="deck">
			Locations: {locationCount}
		</section>

		<!-- Search Container -->
		<div class="search-container">
			<input
				type="text"
				bind:value={inputValue}
				onfocus={handleInputFocus}
				onblur={handleInputBlur}
				oninput={handleInput}
				onkeydown={handleKeydown}
				placeholder="Enter location name..."
				id="search-input-field"
				autocomplete="off"
			/>

			{#if showAutocomplete && locationResults.length > 0}
				<div class="location-results-list">
					{#each locationResults as result}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div class="location-item" onclick={() => selectLocation(result)}>
							{@html highlightFilteredText(result.name, searchQuery)}
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Result Container -->
		<div class="block">
			<div id="map"></div>

			{#if selectedLocation}
				<div class="selected-location">
					<div class="selected-location-info">
						<div>{selectedLocation.name}</div>

						<div>
							Latitude: {selectedLocation.latitude}
						</div>
						<div>
							Longitude: {selectedLocation.longitude}
						</div>
					</div>
				</div>
			{/if}

			{#if incidents.length > 0}
				<section class="incidents-list">
					<table>
						<thead>
							<tr>
								<th>Incident</th>
								<th>Date</th>
								<th>Category</th>
								<th>Distance</th>
							</tr>
						</thead>
						<tbody>
							{#each incidents as item, index}
								<tr>
									<td>{index + 1}. {item.title}</td>
									<td>{item.date}</td>
									<td>{item.category}</td>
									<td>{item.distance}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</section>
			{/if}
		</div>
	</div>
</main>

<style>
	@reference "../app.css";

	/* Leaflet requires a height to be set explicitly if not using Tailwind classes or if they don't propagate */
	:global(#map) {
		height: 400px;
		z-index: 0; /* Ensure map stays below autocomplete */
		@apply h-96 w-full rounded-md border border-gray-300 mb-4 z-0;
	}

	h1 {
		@apply text-3xl font-bold text-center text-gray-800 mb-6;
	}

	.incidents-list {
	}
	.main-container {
		@apply min-h-screen bg-gray-100 p-4 md:p-8 font-sans;
	}

	.container {
		@apply max-w-5xl mx-auto bg-white rounded-lg shadow-md p-6;
	}

	.location-results-list {
		@apply absolute w-full max-h-72 overflow-y-auto bg-white border border-gray-300 border-t-0 rounded-b-md shadow-lg z-[1001];
	}

	.location-results-list .location-item {
		@apply p-3 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-0;
	}

	#search-input-field {
		@apply w-full p-3 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500;
	}

	.search-container {
		@apply relative mb-6 z-[1000];
	}

	.selected-location {
		@apply bg-gray-50 p-4 border border-gray-200 rounded-md;
	}

	.selected-location-info {
		@apply font-mono text-sm text-gray-700;
	}
</style>
