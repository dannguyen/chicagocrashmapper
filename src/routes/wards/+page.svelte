<script lang="ts">
	import { onMount } from 'svelte';
	import { getWardStats } from '$lib/api/client';
	import { SITE_NAME } from '$lib/constants';
	import type { WardStat } from '$lib/db';
	import AreaList from '$lib/components/AreaList.svelte';

	let stats: WardStat[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			stats = await getWardStats();
		} catch (e) {
			error = 'Failed to load ward statistics.';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Chicago Wards — {SITE_NAME}</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8">
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-gray-900">Chicago City Council Wards</h1>
		<p class="mt-1 text-sm text-gray-500">Sorted by total crashes · Click any ward to explore</p>
	</div>

	<AreaList title="Chicago City Council Wards" {stats} {loading} {error} category="wards" />
</div>
