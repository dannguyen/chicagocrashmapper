<script lang="ts">
	import { onMount } from 'svelte';
	import { Mapper } from '$lib/mapping';
	import { SITE_NAME } from '$lib/constants';
	import CrashDetail from '$lib/components/CrashDetail.svelte';
	import type { Crash } from '$lib/crash';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
	const crash: Crash = $derived(data.crash);
	const neighborhood = $derived(data.neighborhood);
	const ward = $derived(data.ward);

	let mapEl: HTMLDivElement | undefined = $state(undefined);
	const MapperInstance = new Mapper();

	onMount(() => {
		let destroyed = false;
		(async () => {
			if (!mapEl) return;
			const mapId = 'crash-map';
			mapEl.id = mapId;
			await MapperInstance.init(mapId, [crash.latitude, crash.longitude], 16);
			if (destroyed || !MapperInstance.map || !MapperInstance.L) return;

			const markerColor = crash.isFatal ? '#dc2626' : '#7c3aed';
			MapperInstance.L.circleMarker([crash.latitude, crash.longitude], {
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

<svelte:head>
	<title>{crash.title}</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6">
	<!-- Back link -->
	<nav class="text-sm">
		<button
			type="button"
			onclick={() => history.back()}
			class="text-blue-600 hover:text-blue-800 transition-colors">← Back</button
		>
	</nav>

	<!-- Page title -->
	<h1 class="text-2xl font-bold text-gray-900">{crash.title}</h1>

	<!-- Map -->
	<div class="w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm">
		<div bind:this={mapEl} class="w-full" style="height:350px"></div>
	</div>

	<!-- Main content delegated to CrashDetail -->
	<CrashDetail {crash} {neighborhood} {ward} />

	<!-- Footer -->
	<p class="text-xs text-gray-400 text-center pt-2">Crash record: {crash.crash_record_id}</p>
</div>
