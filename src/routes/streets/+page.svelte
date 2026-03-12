<script lang="ts">
	import { onMount } from 'svelte';
	import { getStreetStats } from '$lib/api/client';
	import { SITE_TITLE } from '$lib/constants';
	import type { AreaStat } from '$lib/models/types';
	import StreetList from '$lib/components/StreetList.svelte';

	let stats: AreaStat[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let cityGeoJson: GeoJSON.FeatureCollection | null = $state(null);

	onMount(async () => {
		try {
			const [streetData, geoRes] = await Promise.all([
				getStreetStats(),
				fetch(`${import.meta.env.BASE_URL}chicago-city-boundaries.json`)
			]);
			stats = streetData;
			cityGeoJson = await geoRes.json();
		} catch (e) {
			error = 'Failed to load street statistics.';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Chicago Streets — {SITE_TITLE}</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8">
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-gray-900">Chicago Streets</h1>
		<p class="mt-1 text-sm text-gray-500">
			Sorted by average crashes per year · Click any street to explore
		</p>
	</div>

	<StreetList {stats} {loading} {error} {cityGeoJson} />
</div>
