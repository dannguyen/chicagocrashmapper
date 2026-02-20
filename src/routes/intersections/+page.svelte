<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { getTopIntersections } from '$lib/api/client';
	import type { IntersectionStat } from '$lib/db';

	let topByCount: IntersectionStat[] = $state([]);
	let topByRecency: IntersectionStat[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			const data = await getTopIntersections();
			topByCount = data.by_count;
			topByRecency = data.by_recency;
		} catch (e) {
			error = 'Failed to load intersection statistics.';
		} finally {
			loading = false;
		}
	});
</script>

<div class="mx-auto max-w-7xl px-4 py-8">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-gray-900">Dangerous Intersections</h1>
		<p class="mt-1 text-sm text-gray-500">Chicago intersections with the most crashes</p>
	</div>

	{#if loading}
		<p class="py-8 text-center text-sm text-gray-500">Loading...</p>
	{:else if error}
		<div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
			<p class="text-sm text-red-700">{error}</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
			<!-- Most Incidents List -->
			<div class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
				<div class="bg-gray-50 border-b border-gray-200 px-5 py-4">
					<h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Most Incidents (within 500ft)</h2>
				</div>
				<ul class="divide-y divide-gray-100">
					{#each topByCount as item, i}
						<li class="flex items-center gap-4 px-5 py-3 hover:bg-blue-50 transition-colors">
							<span class="text-2xl font-bold text-gray-300 w-8 shrink-0 tabular-nums">{i + 1}</span>
							<div class="min-w-0 flex-1">
								<a href="{base}/intersections/{item.id}" class="font-semibold text-gray-900 hover:text-blue-700 hover:underline text-sm leading-snug block truncate">
									{item.name}
								</a>
								<span class="text-sm text-gray-600">{item.count} crashes</span>
							</div>
							<span class="shrink-0 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full whitespace-nowrap">
								{item.count} crashes
							</span>
						</li>
					{/each}
				</ul>
			</div>

			<!-- Most Recent List -->
			<div class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
				<div class="bg-gray-50 border-b border-gray-200 px-5 py-4">
					<h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Most Recent Incidents</h2>
				</div>
				<ul class="divide-y divide-gray-100">
					{#each topByRecency as item, i}
						<li class="flex items-center gap-4 px-5 py-3 hover:bg-blue-50 transition-colors">
							<span class="text-2xl font-bold text-gray-300 w-8 shrink-0 tabular-nums">{i + 1}</span>
							<div class="min-w-0 flex-1">
								<a href="{base}/intersections/{item.id}" class="font-semibold text-gray-900 hover:text-blue-700 hover:underline text-sm leading-snug block truncate">
									{item.name}
								</a>
								<span class="text-xs text-gray-500">Approx. {item.distance} ft from incident</span>
							</div>
							<span class="shrink-0 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full whitespace-nowrap">
								{item.mostRecentDate}
							</span>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	{/if}
</div>
