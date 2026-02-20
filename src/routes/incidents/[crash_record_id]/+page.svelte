<script lang="ts">
	import { onMount } from 'svelte';
	import { Mapper } from '$lib/mapping';
	import { currentAgeSimplified } from '$lib/transformHelpers';
	import IncidentDetail from '$lib/components/IncidentDetail.svelte';
	import type { Incident } from '$lib/incident';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
	const incident: Incident = $derived(data.incident);
	const neighborhood = $derived(data.neighborhood);
	const ward = $derived(data.ward);

	let mapEl: HTMLDivElement | undefined = $state(undefined);
	const MapperInstance = new Mapper();

	const crashDateTitle = $derived(() => {
		const d = incident.date;
		return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + ' Crash';
	});

	onMount(() => {
		let destroyed = false;
		(async () => {
			if (!mapEl) return;
			const mapId = 'incident-map';
			mapEl.id = mapId;
			await MapperInstance.init(mapId, [incident.latitude, incident.longitude], 16);
			if (destroyed || !MapperInstance.map || !MapperInstance.L) return;

			const markerColor = incident.isFatal ? '#dc2626' : '#7c3aed';
			MapperInstance.L.circleMarker([incident.latitude, incident.longitude], {
				radius: 10,
				color: markerColor,
				fillColor: markerColor,
				fillOpacity: 0.8,
				weight: 2
			}).addTo(MapperInstance.map);

			MapperInstance.map.invalidateSize();
		})();

		return () => {
			destroyed = true;
			MapperInstance.destroy();
		};
	});
</script>

<div class="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6">
	<!-- Back link -->
	<nav class="text-sm">
		<button type="button" onclick={() => history.back()} class="text-blue-600 hover:text-blue-800 transition-colors">← Back</button>
	</nav>

	<!-- Page title -->
	<h1 class="text-2xl font-bold text-gray-900">{crashDateTitle()}</h1>

	<!-- Map -->
	<div class="w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm">
		<div bind:this={mapEl} class="w-full" style="height:350px"></div>
	</div>

	<!-- Main content delegated to IncidentDetail -->
	<IncidentDetail {incident} {neighborhood} {ward} />

	<!-- Footer -->
	<p class="text-xs text-gray-400 text-center pt-2">Crash record: {incident.crash_record_id}</p>
</div>
