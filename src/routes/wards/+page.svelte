<script lang="ts">
	import { onMount } from 'svelte';
	import { getWardStats } from '$lib/api/client';
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

<AreaList title="Chicago Wards" {stats} {loading} {error} category="wards" />
