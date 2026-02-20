<script lang="ts">
	import { onMount } from 'svelte';
	import { getNeighborhoodStats } from '$lib/api/client';
	import type { NeighborhoodStat } from '$lib/db';
	import AreaList from '$lib/components/AreaList.svelte';

	let stats: NeighborhoodStat[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			stats = await getNeighborhoodStats();
		} catch (e) {
			error = 'Failed to load neighborhood statistics.';
		} finally {
			loading = false;
		}
	});
</script>

<div class="mx-auto max-w-7xl px-4 py-8">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-gray-900">Chicago Neighborhoods</h1>
		<p class="mt-1 text-sm text-gray-500">Crash statistics by neighborhood, 2019–present</p>
	</div>

	<AreaList title="Chicago Neighborhoods" {stats} {loading} {error} category="neighborhoods" />
</div>
