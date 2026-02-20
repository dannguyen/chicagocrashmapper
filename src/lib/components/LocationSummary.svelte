<script lang="ts">
	import type { Incident } from '$lib/incident';
	import type { Location } from '$lib/location';
	import type { IncidentSummary } from '$lib/db/types';

	let {
		incidents,
		location,
		summary = null
	} = $props<{
		incidents: Incident[];
		location: Location | null;
		summary?: IncidentSummary | null;
	}>();

	let stats = $derived.by(() => {
		// If a pre-computed all-time summary is provided, use it directly.
		if (summary) {
			const topCauses = summary.top_causes
				.slice(0, 5)
				.map((t: { cause: string; count: number }) => [t.cause, t.count] as [string, number]);
			const maxCauseCount = topCauses[0]?.[1] ?? 1;
			const byYear = Object.entries(summary.by_year).sort((a, b) => a[0].localeCompare(b[0]));
			const maxYearCount = byYear.reduce((m, [, c]) => Math.max(m, c as number), 1);
			const yearKeys = byYear.map(([y]) => y);
			const yearRange =
				yearKeys.length > 0
					? yearKeys.length === 1
						? yearKeys[0]
						: `${yearKeys[0]}–${yearKeys[yearKeys.length - 1]}`
					: null;
			return {
				total: summary.total,
				fatalCount: summary.fatal_injuries,
				incapCount: summary.incapacitating_injuries,
				topCauses,
				maxCauseCount,
				mostRecent: null as Date | null,
				oldest: null as Date | null,
				byYear,
				maxYearCount,
				yearRange
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
		const yearKeys = byYear.map(([y]) => y);
		const yearRange =
			yearKeys.length > 0
				? yearKeys.length === 1
					? yearKeys[0]
					: `${yearKeys[0]}–${yearKeys[yearKeys.length - 1]}`
				: null;

		return {
			total,
			fatalCount,
			incapCount,
			topCauses,
			maxCauseCount,
			mostRecent,
			oldest,
			byYear,
			maxYearCount,
			yearRange
		};
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
	<div>
		<!-- Stat chips row -->
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
			<div class="bg-white rounded-xl border border-gray-200 p-4 text-center">
				<div class="text-2xl font-bold text-blue-700">{stats.total}</div>
				<div class="text-xs text-gray-500 mt-1">Total Incidents</div>
			</div>

			<div class="bg-white rounded-xl border border-gray-200 p-4 text-center">
				<div class="text-2xl font-bold text-red-600">{stats.fatalCount}</div>
				<div class="text-xs text-gray-500 mt-1">Fatal</div>
			</div>

			<div class="bg-white rounded-xl border border-gray-200 p-4 text-center">
				<div class="text-2xl font-bold text-purple-600">{stats.incapCount}</div>
				<div class="text-xs text-gray-500 mt-1">Serious Injury</div>
			</div>

			<div class="bg-white rounded-xl border border-gray-200 p-4 text-center">
				{#if stats.yearRange}
					<div class="text-2xl font-bold text-blue-700">{stats.yearRange}</div>
					<div class="text-xs text-gray-500 mt-1">Year Range</div>
				{:else if stats.oldest && stats.mostRecent}
					<div class="text-sm font-bold text-blue-700">{shortDate(stats.oldest)}</div>
					<div class="text-xs text-gray-500 mt-1">to {shortDate(stats.mostRecent)}</div>
				{:else}
					<div class="text-2xl font-bold text-gray-400">—</div>
					<div class="text-xs text-gray-500 mt-1">Date Range</div>
				{/if}
			</div>
		</div>

		<!-- Top Contributing Causes -->
		{#if stats.topCauses.length > 0}
			<div class="bg-white rounded-xl border border-gray-200 p-4 mb-4">
				<h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
					Top Contributing Causes
				</h4>
				{#each stats.topCauses as [cause, count]}
					<div class="flex items-center gap-3 mb-2 last:mb-0">
						<div class="w-40 shrink-0 text-xs text-gray-700 truncate" title={cause}>
							{fmt(cause)}
						</div>
						<div class="flex-1 bg-blue-200 rounded-full h-2 overflow-hidden">
							<div
								class="bg-blue-600 h-2 rounded-full transition-all duration-300"
								style="width: {(count / stats.maxCauseCount) * 100}%"
							></div>
						</div>
						<div class="w-8 text-right text-xs text-gray-500 shrink-0">{count}</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Year by Year -->
		{#if stats.byYear.length > 1}
			<div class="bg-white rounded-xl border border-gray-200 p-4">
				<h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
					Year by Year
				</h4>
				{#each stats.byYear as [year, count]}
					<div class="flex items-center gap-3 mb-2 last:mb-0">
						<div class="w-10 shrink-0 text-xs text-gray-700 font-medium">{year}</div>
						<div class="flex-1 bg-blue-200 rounded-full h-2 overflow-hidden">
							<div
								class="bg-blue-600 h-2 rounded-full transition-all duration-300"
								style="width: {((count as number) / stats.maxYearCount) * 100}%"
							></div>
						</div>
						<div class="w-8 text-right text-xs text-gray-500 shrink-0">{count}</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}
