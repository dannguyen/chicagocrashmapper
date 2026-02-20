<script lang="ts">
	import type { Incident } from '$lib/incident';
	import type { Location } from '$lib/location';
	import type { IncidentSummary } from '$lib/db/types';

	let { incidents, location, summary = null } = $props<{
		incidents: Incident[];
		location: Location | null;
		summary?: IncidentSummary | null;
	}>();

	let stats = $derived.by(() => {
		// If a pre-computed all-time summary is provided, use it directly.
		if (summary) {
			const topCauses = summary.top_causes.slice(0, 5).map((t: { cause: string; count: number }) => [t.cause, t.count] as [string, number]);
			const maxCauseCount = topCauses[0]?.[1] ?? 1;
			const byYear = Object.entries(summary.by_year).sort((a, b) => a[0].localeCompare(b[0]));
			const maxYearCount = byYear.reduce((m, [, c]) => Math.max(m, c as number), 1);
			return {
				total: summary.total,
				fatalCount: summary.fatal_injuries,
				incapCount: summary.incapacitating_injuries,
				topCauses,
				maxCauseCount,
				mostRecent: null as Date | null,
				oldest: null as Date | null,
				byYear,
				maxYearCount
			};
		}

		// Otherwise compute from the passed incidents array.
		if (incidents.length === 0) return null;

		const total = incidents.length;
		const fatalCount = incidents.filter((i: Incident) => i.isFatal).length;
		const incapCount = total - fatalCount;

		const causeCounts = new Map<string, number>();
		for (const inc of incidents) {
			const cause = inc.primary_cause || 'UNKNOWN';
			causeCounts.set(cause, (causeCounts.get(cause) ?? 0) + 1);
		}

		const topCauses = [...causeCounts.entries()]
			.sort((a: [string, number], b: [string, number]) => b[1] - a[1])
			.slice(0, 5);
		const maxCauseCount = topCauses[0]?.[1] ?? 1;

		const dates = incidents
			.map((i: Incident) => i.date)
			.sort((a: Date, b: Date) => b.getTime() - a.getTime());
		const mostRecent = dates[0];
		const oldest = dates[dates.length - 1];

		const yearCounts = new Map<string, number>();
		for (const inc of incidents) {
			const yr = String(inc.date.getFullYear());
			yearCounts.set(yr, (yearCounts.get(yr) ?? 0) + 1);
		}
		const byYear = [...yearCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
		const maxYearCount = byYear.reduce((m, [, c]) => Math.max(m, c), 1);

		return { total, fatalCount, incapCount, topCauses, maxCauseCount, mostRecent, oldest, byYear, maxYearCount };
	});

	function fmt(cause: string): string {
		return cause
			.toLowerCase()
			.replace(/\b\w/g, (c) => c.toUpperCase())
			.replace(/Unable To Determine/i, 'Unknown cause')
			.replace(/Not Applicable/i, 'N/A');
	}

	function shortDate(d: Date): string {
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

{#if stats}
	<div class="summary-panel">
		<div class="summary-counts">
			<div class="stat-block">
				<span class="stat-num">{stats.total}</span>
				<span class="stat-label">incidents</span>
			</div>
			<div class="stat-block stat-fatal">
				<span class="stat-num">{stats.fatalCount}</span>
				<span class="stat-label">fatal</span>
			</div>
			<div class="stat-block stat-serious">
				<span class="stat-num">{stats.incapCount}</span>
				<span class="stat-label">serious injury</span>
			</div>
			{#if stats.oldest && stats.mostRecent}
			<div class="stat-block stat-dates">
				<span class="stat-num date-range">{shortDate(stats.oldest)}</span>
				<span class="stat-label">to {shortDate(stats.mostRecent)}</span>
			</div>
		{/if}
		</div>

		{#if stats.topCauses.length > 0}
			<div class="top-causes">
				<h4 class="causes-title">Top contributing causes</h4>
				{#each stats.topCauses as [cause, count]}
					<div class="cause-row">
						<div class="cause-label" title={cause}>{fmt(cause)}</div>
						<div class="cause-bar-track">
							<div class="cause-bar" style="width: {(count / stats.maxCauseCount) * 100}%"></div>
						</div>
						<div class="cause-count">{count}</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if stats.byYear.length > 1}
			<div class="year-chart">
				<h4 class="causes-title">Year by year</h4>
				{#each stats.byYear as [year, count]}
					<div class="cause-row">
						<div class="year-label">{year}</div>
						<div class="cause-bar-track">
							<div class="year-bar" style="width: {((count as number) / stats.maxYearCount) * 100}%"></div>
						</div>
						<div class="cause-count">{count}</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style lang="postcss">
	@reference "$lib/styles/app.css";

	.summary-panel {
		@apply bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4;
	}

	.summary-counts {
		@apply flex flex-wrap gap-5 mb-3;
	}

	.stat-block {
		@apply flex flex-col items-center min-w-[3.5rem];
	}

	.stat-num {
		@apply text-2xl font-bold text-gray-800;
	}

	.date-range {
		@apply text-sm;
	}

	.stat-fatal .stat-num {
		@apply text-red-700;
	}

	.stat-serious .stat-num {
		@apply text-orange-600;
	}

	.stat-dates .stat-num {
		@apply text-gray-600;
	}

	.stat-label {
		@apply text-xs text-gray-500 uppercase tracking-wide text-center;
	}

	.causes-title {
		@apply text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2;
	}

	.cause-row {
		@apply flex items-center gap-2 mb-1;
	}

	.cause-label {
		@apply text-xs text-gray-700 w-44 truncate shrink-0;
	}

	.year-label {
		@apply text-xs text-gray-700 w-10 shrink-0 font-medium;
	}

	.cause-bar-track {
		@apply flex-1 h-2 bg-blue-100 rounded-full overflow-hidden;
	}

	.cause-bar {
		@apply h-full bg-blue-500 rounded-full transition-all duration-300;
	}

	.year-bar {
		@apply h-full bg-indigo-500 rounded-full transition-all duration-300;
	}

	.cause-count {
		@apply text-xs text-gray-500 w-8 text-right shrink-0;
	}

	.year-chart {
		@apply mt-3;
	}

	.top-causes {
		@apply mb-1;
	}
</style>
