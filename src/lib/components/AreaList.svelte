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
		if (sortField === field) return sortDirection === 1 ? '↑' : '↓';
		return '';
	}

	// Singular label for the name column header
	let singularLabel = $derived(
		category === 'neighborhoods' ? 'Neighborhood' : category === 'wards' ? 'Ward' : category
	);
</script>

{#if loading}
	<div class="overflow-x-auto">
		<div class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
			<div class="bg-gray-50 border-b border-gray-200 px-4 py-3">
				<div class="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
			</div>
			{#each Array(8) as _}
				<div class="flex items-center gap-4 px-4 py-3 border-b border-gray-100">
					<div class="h-4 bg-gray-200 rounded animate-pulse w-36"></div>
					<div class="h-4 bg-gray-200 rounded animate-pulse w-20 ml-auto"></div>
					<div class="h-4 bg-gray-200 rounded animate-pulse w-12"></div>
					<div class="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
					<div class="h-4 bg-gray-200 rounded animate-pulse w-14"></div>
					<div class="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
				</div>
			{/each}
		</div>
	</div>
{:else if error}
	<div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
		<p class="text-sm text-red-700">{error}</p>
	</div>
{:else if stats.length === 0}
	<p class="py-8 text-center text-sm text-gray-500">No {category} found.</p>
{:else}
	<div class="overflow-x-auto">
		<div class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
			<table class="min-w-full">
				<thead class="bg-gray-50 border-b border-gray-200">
					<tr>
						<th
							scope="col"
							class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide cursor-pointer select-none {sortField === 'name' ? 'text-blue-700' : 'text-gray-500 hover:text-blue-700'}"
							onclick={() => toggleSort('name')}
						>
							{singularLabel}{#if sortIcon('name')}&nbsp;<span class="text-blue-700">{sortIcon('name')}</span>{/if}
						</th>
						<th
							scope="col"
							class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap cursor-pointer select-none {sortField === 'totalIncidents' ? 'text-blue-700' : 'text-gray-500 hover:text-blue-700'}"
							onclick={() => toggleSort('totalIncidents')}
						>
							Total Crashes{#if sortIcon('totalIncidents')}&nbsp;<span class="text-blue-700">{sortIcon('totalIncidents')}</span>{/if}
						</th>
						<th
							scope="col"
							class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap cursor-pointer select-none {sortField === 'totalFatal' ? 'text-blue-700' : 'text-gray-500 hover:text-blue-700'}"
							onclick={() => toggleSort('totalFatal')}
						>
							Fatal{#if sortIcon('totalFatal')}&nbsp;<span class="text-blue-700">{sortIcon('totalFatal')}</span>{/if}
						</th>
						<th
							scope="col"
							class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap cursor-pointer select-none {sortField === 'totalSeriousInjuries' ? 'text-blue-700' : 'text-gray-500 hover:text-blue-700'}"
							onclick={() => toggleSort('totalSeriousInjuries')}
						>
							Serious Inj.{#if sortIcon('totalSeriousInjuries')}&nbsp;<span class="text-blue-700">{sortIcon('totalSeriousInjuries')}</span>{/if}
						</th>
						<th
							scope="col"
							class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap cursor-pointer select-none {sortField === 'avgPerYear' ? 'text-blue-700' : 'text-gray-500 hover:text-blue-700'}"
							onclick={() => toggleSort('avgPerYear')}
						>
							Avg/Year{#if sortIcon('avgPerYear')}&nbsp;<span class="text-blue-700">{sortIcon('avgPerYear')}</span>{/if}
						</th>
						<th
							scope="col"
							class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap cursor-pointer select-none {sortField === 'mostRecent' ? 'text-blue-700' : 'text-gray-500 hover:text-blue-700'}"
							onclick={() => toggleSort('mostRecent')}
						>
							Last Crash{#if sortIcon('mostRecent')}&nbsp;<span class="text-blue-700">{sortIcon('mostRecent')}</span>{/if}
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each sortedStats as item (item.id)}
						<tr class="hover:bg-blue-50 transition-colors">
							<td class="px-4 py-3 text-sm font-medium text-gray-900">
								<a
									href="{base}/{category}/{item.id}"
									class="text-blue-700 hover:underline"
								>
									{item.name}
								</a>
							</td>
							<td class="px-4 py-3 text-sm text-gray-700 tabular-nums whitespace-nowrap">
								{item.totalIncidents.toLocaleString()}
							</td>
							<td class="px-4 py-3 text-sm font-semibold text-red-600 tabular-nums whitespace-nowrap">
								{item.totalFatal}
							</td>
							<td class="px-4 py-3 text-sm text-gray-700 tabular-nums whitespace-nowrap">
								{item.totalSeriousInjuries}
							</td>
							<td class="px-4 py-3 text-sm text-gray-700 tabular-nums whitespace-nowrap">
								{item.avgPerYear.toFixed(1)}
							</td>
							<td class="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
								{#if item.mostRecent}
									{@const d = parseAreaDate(item.mostRecent)}
									<span class="block">{prettifyDate(d)}</span>
									<span class="block italic text-gray-400">{currentAgeSimplified(d)}</span>
								{:else}
									N/A
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
{/if}
