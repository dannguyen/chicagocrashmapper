<script lang="ts">
	import { base } from '$app/paths';
	import { onMount } from 'svelte';
	import { SEVERITY_COLORS } from '$lib/constants';
	import { Mapper } from '$lib/mapping';
	import CrashDetail from '$lib/components/CrashDetail.svelte';
	import type { Crash } from '$lib/models/crash';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
	const crash: Crash = $derived(data.crash);
	const neighborhood = $derived(data.neighborhood);
	const ward = $derived(data.ward);
	const intersections = $derived(data.intersections);
	const nearby_crashes = $derived(data.nearby_crashes);

	let mapEl: HTMLDivElement | undefined = $state(undefined);
	const MapperInstance = new Mapper();

	function buildCircleElement(color: string, size: number, opacity: number, borderWidth: number) {
		const element = document.createElement('div');
		element.style.width = `${size}px`;
		element.style.height = `${size}px`;
		element.style.borderRadius = '9999px';
		element.style.background = color;
		element.style.opacity = String(opacity);
		element.style.border = `${borderWidth}px solid rgba(255, 255, 255, 0.85)`;
		element.style.boxShadow = '0 2px 6px rgba(15, 23, 42, 0.25)';
		return element;
	}

	onMount(() => {
		let destroyed = false;
		(async () => {
			if (!mapEl) return;
			await MapperInstance.init(mapEl, [crash.latitude, crash.longitude], 16);
			if (destroyed || !MapperInstance.map || !MapperInstance.maplibre) return;

			const markerColor = crash.isFatal ? SEVERITY_COLORS.fatal : SEVERITY_COLORS.serious;
			new MapperInstance.maplibre.Marker({
				element: buildCircleElement(markerColor, 20, 0.9, 3),
				anchor: 'center'
			})
				.setLngLat([crash.longitude, crash.latitude])
				.addTo(MapperInstance.map);

			if (nearby_crashes?.length) {
				for (const nc of nearby_crashes) {
					const ncColor =
						nc.injuries_fatal > 0
							? SEVERITY_COLORS.fatal
							: nc.injuries_incapacitating > 0
								? SEVERITY_COLORS.serious
								: SEVERITY_COLORS.none;
					const feetAway = Math.round(nc.distance_miles * 5280);
					const popup = MapperInstance.createPopup(
						`<a href="${base}/crashes/${nc.crash_record_id}">${nc.crash_date.slice(0, 10)}</a><br/>${feetAway} ft away`,
						'220px'
					);
					const marker = new MapperInstance.maplibre.Marker({
						element: buildCircleElement(ncColor, 10, 0.7, 1),
						anchor: 'center'
					})
						.setLngLat([nc.longitude, nc.latitude])
						.addTo(MapperInstance.map);

					if (popup) {
						marker.setPopup(popup);
					}
				}
			}

			MapperInstance.resize();
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

<div class="max-w-7xl mx-auto px-4 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6">
	<nav class="text-sm">
		<button type="button" onclick={() => history.back()} class="back-link transition-colors"
			>← Back</button
		>
	</nav>

	<h1 class="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight break-words">
		{crash.title}
	</h1>

	<div class="w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm">
		<div bind:this={mapEl} class="w-full h-[240px] sm:h-[350px]"></div>
	</div>

	<CrashDetail {crash} {neighborhood} {ward} {intersections} {nearby_crashes} />

	<p class="text-xs text-gray-400 text-center pt-2">Crash record: {crash.crash_record_id}</p>
</div>

<style>
	.back-link {
		color: var(--color-link);
	}

	.back-link:hover {
		color: var(--color-link-hover);
	}
</style>
