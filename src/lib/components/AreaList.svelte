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
	<div class="table-shell">
		<div class="table-card">
			<div class="table-head-skeleton">
				<div class="skeleton-line skeleton-title"></div>
			</div>
			{#each Array(8) as _}
				<div class="skeleton-row">
					<div class="skeleton-line skeleton-wide"></div>
					<div class="skeleton-line skeleton-medium skeleton-spacer"></div>
					<div class="skeleton-line skeleton-narrow"></div>
					<div class="skeleton-line skeleton-small"></div>
					<div class="skeleton-line skeleton-smallest"></div>
					<div class="skeleton-line skeleton-medium"></div>
				</div>
			{/each}
		</div>
	</div>
{:else if error}
	<div class="error-card">
		<p class="error-text">{error}</p>
	</div>
{:else if stats.length === 0}
	<p class="empty-text">No {category} found.</p>
{:else}
	<div class="table-shell">
		<div class="table-card">
			<table class="area-table">
				<thead class="table-head">
					<tr>
						<th
							scope="col"
							class="table-th"
							class:sort-active={sortField === 'name'}
							tabindex="0"
							onclick={() => toggleSort('name')}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									toggleSort('name');
								}
							}}
						>
							{singularLabel}{#if sortIcon('name')}&nbsp;<span class="sort-icon"
									>{sortIcon('name')}</span
								>{/if}
						</th>
						<th
							scope="col"
							class="table-th table-th-nowrap"
							class:sort-active={sortField === 'totalIncidents'}
							tabindex="0"
							onclick={() => toggleSort('totalIncidents')}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									toggleSort('totalIncidents');
								}
							}}
						>
							Total Crashes{#if sortIcon('totalIncidents')}&nbsp;<span class="sort-icon"
									>{sortIcon('totalIncidents')}</span
								>{/if}
						</th>
						<th
							scope="col"
							class="table-th table-th-nowrap"
							class:sort-active={sortField === 'totalFatal'}
							tabindex="0"
							onclick={() => toggleSort('totalFatal')}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									toggleSort('totalFatal');
								}
							}}
						>
							Fatal{#if sortIcon('totalFatal')}&nbsp;<span class="sort-icon"
									>{sortIcon('totalFatal')}</span
								>{/if}
						</th>
						<th
							scope="col"
							class="table-th table-th-nowrap"
							class:sort-active={sortField === 'totalSeriousInjuries'}
							tabindex="0"
							onclick={() => toggleSort('totalSeriousInjuries')}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									toggleSort('totalSeriousInjuries');
								}
							}}
						>
							Serious Inj.{#if sortIcon('totalSeriousInjuries')}&nbsp;<span class="sort-icon"
									>{sortIcon('totalSeriousInjuries')}</span
								>{/if}
						</th>
						<th
							scope="col"
							class="table-th table-th-nowrap"
							class:sort-active={sortField === 'avgPerYear'}
							tabindex="0"
							onclick={() => toggleSort('avgPerYear')}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									toggleSort('avgPerYear');
								}
							}}
						>
							Avg/Year{#if sortIcon('avgPerYear')}&nbsp;<span class="sort-icon"
									>{sortIcon('avgPerYear')}</span
								>{/if}
						</th>
						<th
							scope="col"
							class="table-th table-th-nowrap"
							class:sort-active={sortField === 'mostRecent'}
							tabindex="0"
							onclick={() => toggleSort('mostRecent')}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									toggleSort('mostRecent');
								}
							}}
						>
							Last Crash{#if sortIcon('mostRecent')}&nbsp;<span class="sort-icon"
									>{sortIcon('mostRecent')}</span
								>{/if}
						</th>
					</tr>
				</thead>
				<tbody class="table-body">
					{#each sortedStats as item (item.id)}
						<tr class="table-row">
							<td class="table-cell table-cell-strong">
								<a href="{base}/{category}/{item.id}" class="table-link">
									{item.name}
								</a>
							</td>
							<td class="table-cell table-num">
								{item.totalIncidents.toLocaleString()}
							</td>
							<td class="table-cell table-num table-fatal">
								{item.totalFatal}
							</td>
							<td class="table-cell table-num">
								{item.totalSeriousInjuries}
							</td>
							<td class="table-cell table-num">
								{item.avgPerYear.toFixed(1)}
							</td>
							<td class="table-cell table-date">
								{#if item.mostRecent}
									{@const d = parseAreaDate(item.mostRecent)}
									<span class="table-date-main">{prettifyDate(d)}</span>
									<span class="table-date-sub">{currentAgeSimplified(d)}</span>
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

<style>
	.table-shell {
		overflow-x: auto;
	}

	.table-card {
		background: #fff;
		border-radius: 0.75rem;
		border: 1px solid #e5e7eb;
		overflow: hidden;
		box-shadow: 0 1px 2px 0 rgb(15 23 42 / 0.05);
	}

	.table-head-skeleton {
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
		padding: 0.75rem 1rem;
	}

	.skeleton-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #f3f4f6;
	}

	.skeleton-line {
		height: 1rem;
		border-radius: 0.375rem;
		background: #e5e7eb;
		animation: pulse 1.2s ease-in-out infinite;
	}

	.skeleton-title {
		width: 8rem;
		height: 0.75rem;
	}

	.skeleton-wide {
		width: 9rem;
	}

	.skeleton-medium {
		width: 6rem;
	}

	.skeleton-narrow {
		width: 3rem;
	}

	.skeleton-small {
		width: 4rem;
	}

	.skeleton-smallest {
		width: 3.5rem;
	}

	.skeleton-spacer {
		margin-left: auto;
	}

	.error-card {
		border-radius: 0.75rem;
		border: 1px solid #fecaca;
		background: #fef2f2;
		padding: 0.75rem 1rem;
	}

	.error-text {
		font-size: 0.875rem;
		color: #b91c1c;
	}

	.empty-text {
		padding: 2rem 0;
		text-align: center;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.area-table {
		width: 100%;
		border-collapse: collapse;
	}

	.table-head {
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
	}

	.table-th {
		padding: 0.75rem 1rem;
		text-align: left;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #6b7280;
		cursor: pointer;
		user-select: none;
		transition: color 120ms ease;
	}

	.table-th:hover {
		color: #1d4ed8;
	}

	.table-th-nowrap {
		white-space: nowrap;
	}

	.sort-active {
		color: #1d4ed8;
	}

	.sort-icon {
		color: #1d4ed8;
	}

	.table-body {
		border-top: 1px solid #f3f4f6;
	}

	.table-row {
		transition: background-color 120ms ease;
	}

	.table-row:hover {
		background: #eff6ff;
	}

	.table-cell {
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		color: #374151;
		white-space: nowrap;
	}

	.table-cell-strong {
		font-weight: 500;
		color: #111827;
	}

	.table-link {
		color: #1d4ed8;
		text-decoration: none;
	}

	.table-link:hover {
		text-decoration: underline;
	}

	.table-num {
		font-variant-numeric: tabular-nums;
	}

	.table-fatal {
		color: #dc2626;
		font-weight: 600;
	}

	.table-date {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.table-date-main {
		display: block;
	}

	.table-date-sub {
		display: block;
		font-style: italic;
		color: #9ca3af;
	}

	@keyframes pulse {
		0% {
			opacity: 0.85;
		}
		50% {
			opacity: 0.4;
		}
		100% {
			opacity: 0.85;
		}
	}
</style>
