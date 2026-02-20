<script lang="ts">
	import { base } from '$app/paths';
	import type { NeighborhoodStat, WardStat } from '$lib/db/types';
	import { prettifyDate, currentAgeSimplified } from '$lib/transformHelpers';

	function parseAreaDate(s: string): Date {
		// Append time so JS treats it as local time, not UTC midnight
		return new Date(s + 'T00:00:00');
	}

	type AreaStat = NeighborhoodStat | WardStat;

	let { title, stats, loading, error, category } = $props<{
		title: string;
		stats: AreaStat[];
		loading: boolean;
		error: string | null;
		category: string;
	}>();

	type SortField =
		| 'name'
		| 'mostRecent'
		| 'avgPerYear'
		| 'totalIncidents'
		| 'totalFatal'
		| 'totalSeriousInjuries';
	let sortField: SortField = $state('avgPerYear');
	let sortDirection: 1 | -1 = $state(-1); // 1 for asc, -1 for desc

	let sortedStats = $derived.by(() => {
		return [...stats].sort((a, b) => {
			let valA: string | number | null = a[sortField as keyof AreaStat] as string | number | null;
			let valB: string | number | null = b[sortField as keyof AreaStat] as string | number | null;

			// Handle nulls
			if (valA === null) valA = '';
			if (valB === null) valB = '';

			if (valA < valB) return -1 * sortDirection;
			if (valA > valB) return 1 * sortDirection;
			return 0;
		});
	});

	function toggleSort(field: SortField) {
		if (sortField === field) {
			sortDirection = (sortDirection * -1) as 1 | -1;
		} else {
			sortField = field;
			sortDirection = 1;
		}
	}

	function sortIcon(field: SortField): string {
		if (sortField === field) return sortDirection === 1 ? '▲' : '▼';
		return '↕';
	}

	// Singular label for the name column header
	let singularLabel = $derived(
		category === 'neighborhoods' ? 'Neighborhood' : category === 'wards' ? 'Ward' : category
	);
</script>

<div class="mx-auto max-w-7xl p-4">
	<h1 class="mb-6 text-3xl font-bold">{title}</h1>

	{#if loading}
		<div class="flex flex-col items-center justify-center p-12">
			<div
				class="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
			></div>
			<p class="text-xl text-gray-500">Loading statistics...</p>
		</div>
	{:else if error}
		<div class="rounded-md bg-red-50 p-4">
			<p class="text-red-700">{error}</p>
		</div>
	{:else if stats.length === 0}
		<p class="text-gray-600">No {category} found.</p>
	{:else}
		<div class="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
			<table class="min-w-full divide-y divide-gray-200 text-sm">
				<thead class="bg-gray-50">
					<tr>
						<th
							scope="col"
							class="group cursor-pointer px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
							onclick={() => toggleSort('name')}
						>
							{singularLabel}
							<span class="text-gray-400 group-hover:text-gray-600">{sortIcon('name')}</span>
						</th>
						<th
							scope="col"
							class="group cursor-pointer px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100 whitespace-nowrap"
							onclick={() => toggleSort('mostRecent')}
						>
							Most Recent <span class="text-gray-400 group-hover:text-gray-600"
								>{sortIcon('mostRecent')}</span
							>
						</th>
						<th
							scope="col"
							class="group cursor-pointer px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100 whitespace-nowrap"
							onclick={() => toggleSort('avgPerYear')}
						>
							Avg/Year <span class="text-gray-400 group-hover:text-gray-600"
								>{sortIcon('avgPerYear')}</span
							>
						</th>
						<th
							scope="col"
							class="group cursor-pointer px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100 whitespace-nowrap"
							onclick={() => toggleSort('totalIncidents')}
						>
							Serious Crashes <span class="text-gray-400 group-hover:text-gray-600"
								>{sortIcon('totalIncidents')}</span
							>
						</th>
						<th
							scope="col"
							class="group cursor-pointer px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100 whitespace-nowrap"
							onclick={() => toggleSort('totalSeriousInjuries')}
						>
							Serious Inj. <span class="text-gray-400 group-hover:text-gray-600"
								>{sortIcon('totalSeriousInjuries')}</span
							>
						</th>
						<th
							scope="col"
							class="group cursor-pointer px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100 whitespace-nowrap"
							onclick={() => toggleSort('totalFatal')}
						>
							Fatalities <span class="text-gray-400 group-hover:text-gray-600"
								>{sortIcon('totalFatal')}</span
							>
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white">
					{#each sortedStats as item (item.id)}
						<tr class="hover:bg-gray-50">
							<td class="px-3 py-2">
								<a
									href="{base}/{category}/{item.id}"
									class="font-medium text-blue-600 hover:text-blue-900"
								>
									{item.name}
								</a>
							</td>
							<td class="px-3 py-2 text-gray-500">
								{#if item.mostRecent}
									{@const d = parseAreaDate(item.mostRecent)}
									<span class="block text-xs">{prettifyDate(d)}</span>
									<span class="block text-xs italic text-gray-400">{currentAgeSimplified(d)}</span>
								{:else}
									N/A
								{/if}
							</td>
							<td class="whitespace-nowrap px-3 py-2 text-gray-500">
								{item.avgPerYear.toFixed(1)}
							</td>
							<td class="whitespace-nowrap px-3 py-2 text-gray-500">
								{item.totalIncidents}
							</td>
							<td class="whitespace-nowrap px-3 py-2 font-medium text-orange-600">
								{item.totalSeriousInjuries}
							</td>
							<td class="whitespace-nowrap px-3 py-2 font-medium text-red-600">
								{item.totalFatal}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
