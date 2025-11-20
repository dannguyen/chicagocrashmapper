<script>
  import { onMount } from 'svelte';
  import L from 'leaflet';
  import { basemapLayer } from 'esri-leaflet';

  let searchQuery = $state('');
  let inputValue = $state('');
  let intersections = [];
  let dataLoaded = $state(false);
  let selectedIntersection = $state(null);
  let map;
  let marker;
  let showAutocomplete = $state(false);
  let debounceTimer;

  // Fetch data on mount
  onMount(async () => {
    initMap();
    try {
      const response = await fetch('/chicago-intersections.json');
      intersections = await response.json();
      dataLoaded = true;
    } catch (error) {
      console.error('Error loading intersections data:', error);
    }
  });

  function initMap() {
    // Chicago center coordinates
    const chicagoCenter = [41.8781, -87.6298];
    map = L.map('map').setView(chicagoCenter, 11);

    // Use Esri's satellite imagery with streets overlay
    basemapLayer('Streets').addTo(map);

    // Fallback
    map.on('baselayererror', function() {
      console.log('Falling back to OpenStreetMap');
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);
    });
  }

  // Derived state for filtering
  let filteredResults = $derived.by(() => {
    if (!dataLoaded || !searchQuery.trim()) return [];

    const tokens = searchQuery.toUpperCase().split(/\s+/).filter(token =>
      token !== 'AND' && token !== '&' && token.trim() !== ''
    );

    if (tokens.length === 0) return [];

    const results = [];
    // Optimized filtering: stop after 25 matches
    for (const intersection of intersections) {
      const name = intersection.intersection;
      if (tokens.every(token => name.includes(token))) {
        results.push(intersection);
        if (results.length >= 25) break;
      }
    }
    return results;
  });

  function handleInput() {
    showAutocomplete = true;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchQuery = inputValue;
    }, 300);
  }

  function selectIntersection(intersection) {
    selectedIntersection = intersection;
    inputValue = intersection.intersection;
    searchQuery = intersection.intersection;
    showAutocomplete = false;

    // Update map
    if (map) {
      map.setView([intersection.latitude, intersection.longitude], 17);

      if (marker) {
        marker.setLatLng([intersection.latitude, intersection.longitude]);
      } else {
        marker = L.marker([intersection.latitude, intersection.longitude]).addTo(map);
      }

      marker.bindPopup(intersection.intersection).openPopup();
    }
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\\]/g, '\\$&');
  }

  function highlightText(text, query) {
    const tokens = query.toUpperCase().split(/\s+/).filter(token =>
      token !== 'AND' && token !== '&' && token.trim() !== ''
    );

    if (!tokens || tokens.length === 0) {
      return text;
    }

    const escapedTokens = tokens.map(token => escapeRegExp(token));
    const pattern = escapedTokens.join('|');
    const regex = new RegExp(`(${pattern})`, 'gi');

    return text.replace(regex, '<span class="bg-yellow-300">$1</span>');
  }

  function handleInputFocus() {
    if (inputValue.trim()) {
        showAutocomplete = true;
    }
  }

  function handleInputBlur() {
    // Small delay to allow click event on results to register
    setTimeout(() => {
        showAutocomplete = false;
    }, 200);
  }

</script>

<main class="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
  <div class="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
    <h1 class="text-3xl font-bold text-center text-gray-800 mb-6">Chicago Intersections Finder</h1>

    <!-- Search Container -->
    <div class="relative mb-6 z-[1000]">
      <input
        type="text"
        bind:value={inputValue}
        onfocus={handleInputFocus}
        onblur={handleInputBlur}
        oninput={handleInput}
        placeholder="Enter intersection name..."
        class="w-full p-3 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        autocomplete="off"
      />

      {#if showAutocomplete && filteredResults.length > 0}
        <div class="absolute w-full max-h-72 overflow-y-auto bg-white border border-gray-300 border-t-0 rounded-b-md shadow-lg z-[1001]">
          {#each filteredResults as result}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="p-3 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-0"
              onclick={() => selectIntersection(result)}
            >
              {@html highlightText(result.intersection, searchQuery)}
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Result Container -->
    <div class="block">
      <div id="map" class="h-96 w-full rounded-md border border-gray-300 mb-4 z-0"></div>

      {#if selectedIntersection}
        <div class="bg-gray-50 p-4 border border-gray-200 rounded-md">
          <div class="font-mono text-sm text-gray-700">
            <div>Latitude: <span class="text-blue-600 font-bold">{selectedIntersection.latitude.toFixed(5)}</span></div>
            <div>Longitude: <span class="text-blue-600 font-bold">{selectedIntersection.longitude.toFixed(5)}</span></div>
          </div>
        </div>
      {/if}
    </div>

    {#if !selectedIntersection}
        <!-- Placeholder/Initial State Map Container (optional, or just keep the map visible always) -->
         <!-- Actually, the original app hid the map until selection.
              To render Leaflet correctly, the container must exist.
              I used a class toggle above.
         -->
    {/if}
  </div>
</main>

<style>
  /* Leaflet requires a height to be set explicitly if not using Tailwind classes or if they don't propagate */
  :global(#map) {
    height: 400px;
    z-index: 0; /* Ensure map stays below autocomplete */
  }
</style>
