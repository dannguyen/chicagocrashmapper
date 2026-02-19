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
			console.error(e);
			error = 'Failed to load neighborhood statistics.';
		} finally {
			loading = false;
		}
	});
</script>

<AreaList title="Chicago Neighborhoods" {stats} {loading} {error} category="neighborhoods" />
