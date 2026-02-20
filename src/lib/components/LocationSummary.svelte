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
		<div class="summary-grid">
			<div class="summary-card">
				<div class="summary-value summary-value-total">{stats.total}</div>
				<div class="summary-label">Total Incidents</div>
			</div>

			<div class="summary-card">
				<div class="summary-value summary-value-fatal">{stats.fatalCount}</div>
				<div class="summary-label">Fatal</div>
			</div>

			<div class="summary-card">
				<div class="summary-value summary-value-serious">{stats.incapCount}</div>
				<div class="summary-label">Serious Injury</div>
			</div>

			<div class="summary-card summary-card-tight">
				{#if stats.yearRange}
					<div class="summary-value summary-value-total" title={stats.yearRange}>{stats.yearRange}</div>
					<div class="summary-label">Year Range</div>
				{:else if stats.oldest && stats.mostRecent}
					<div class="summary-value summary-value-range">{shortDate(stats.oldest)}</div>
					<div class="summary-label">to {shortDate(stats.mostRecent)}</div>
				{:else}
					<div class="summary-value summary-value-muted">—</div>
					<div class="summary-label">Date Range</div>
				{/if}
			</div>
		</div>

		<!-- Top Contributing Causes -->
		{#if stats.topCauses.length > 0}
			<div class="summary-card summary-card-block">
				<h4 class="summary-heading">
					Top Contributing Causes
				</h4>
				{#each stats.topCauses as [cause, count]}
					<div class="chart-row">
						<div class="chart-label" title={cause}>
							{fmt(cause)}
						</div>
						<div class="chart-track">
							<div
								class="chart-bar"
								style="width: {(count / stats.maxCauseCount) * 100}%"
							></div>
						</div>
						<div class="chart-count">{count}</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Year by Year -->
		{#if stats.byYear.length > 1}
			<div class="summary-card summary-card-block">
				<h4 class="summary-heading">
					Year by Year
				</h4>
				{#each stats.byYear as [year, count]}
					<div class="chart-row">
						<div class="chart-year">{year}</div>
						<div class="chart-track">
							<div
								class="chart-bar"
								style="width: {((count as number) / stats.maxYearCount) * 100}%"
							></div>
						</div>
						<div class="chart-count">{count}</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	.summary-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	@media (min-width: 640px) {
		.summary-grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	.summary-card {
		background: #fff;
		border-radius: 0.75rem;
		border: 1px solid #e5e7eb;
		padding: 1rem;
		text-align: center;
	}

	.summary-card-tight {
		overflow: hidden;
	}

	.summary-card-block {
		text-align: left;
		margin-bottom: 1rem;
	}

	.summary-value {
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1.2;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.summary-value-total {
		color: #1d4ed8;
	}

	.summary-value-fatal {
		color: #dc2626;
	}

	.summary-value-serious {
		color: #7c3aed;
	}

	.summary-value-range {
		font-size: 0.875rem;
		color: #1d4ed8;
		font-weight: 700;
	}

	.summary-value-muted {
		color: #9ca3af;
	}

	.summary-label {
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: #6b7280;
	}

	.summary-heading {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #6b7280;
		margin-bottom: 0.75rem;
	}

	.chart-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.chart-row:last-child {
		margin-bottom: 0;
	}

	.chart-label {
		width: 10rem;
		flex-shrink: 0;
		font-size: 0.75rem;
		color: #374151;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chart-year {
		width: 2.5rem;
		flex-shrink: 0;
		font-size: 0.75rem;
		font-weight: 500;
		color: #374151;
	}

	.chart-track {
		flex: 1;
		background: #bfdbfe;
		border-radius: 9999px;
		height: 0.5rem;
		overflow: hidden;
	}

	.chart-bar {
		background: #2563eb;
		height: 100%;
		border-radius: 9999px;
		transition: width 300ms ease;
	}

	.chart-count {
		width: 2rem;
		text-align: right;
		font-size: 0.75rem;
		color: #6b7280;
		flex-shrink: 0;
	}
</style>
