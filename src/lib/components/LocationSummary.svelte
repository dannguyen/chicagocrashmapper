<script lang="ts">
	import type { Crash } from '$lib/crash';
	import type { Location } from '$lib/location';
	import type { CrashSummary } from '$lib/db/types';
	let {
		crashes,
		location,
		summary = null,
		compact = false
	} = $props<{
		crashes: Crash[];
		location: Location | null;
		summary?: CrashSummary | null;
		compact?: boolean;
	}>();

	let stats = $derived.by(() => {
		// If a pre-computed all-time summary is provided, use it directly.
		if (summary) {
			const byYear = Object.entries(summary.by_year).sort((a, b) => a[0].localeCompare(b[0]));
			const maxYearCount = byYear.reduce((m, [, c]) => Math.max(m, c as number), 1);
			const numYears = byYear.length || 1;
			const avgPerYear = Math.round(summary.total / numYears);

			// Compute most recent from crashes array
			const mostRecent =
				crashes.length > 0
					? crashes.reduce(
							(latest: Date, c: Crash) => (c.date > latest ? c.date : latest),
							crashes[0].date
						)
					: null;

			return {
				total: summary.total,
				fatalCount: summary.fatal_injuries,
				incapCount: summary.incapacitating_injuries,
				avgPerYear,
				mostRecent,
				byYear,
				maxYearCount
			};
		}

		// Otherwise compute from the passed crashes array.
		if (crashes.length === 0) return null;

		const total = crashes.length;
		const fatalCount = crashes.filter((i: Crash) => i.isFatal).length;
		const incapCount = total - fatalCount;

		const dates = crashes
			.map((i: Crash) => i.date)
			.sort((a: Date, b: Date) => b.getTime() - a.getTime());
		const mostRecent = dates[0];

		const yearCounts = new Map<string, number>();
		for (const inc of crashes) {
			const yr = String(inc.date.getFullYear());
			yearCounts.set(yr, (yearCounts.get(yr) ?? 0) + 1);
		}
		const byYear = [...yearCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
		const maxYearCount = byYear.reduce((m, [, c]) => Math.max(m, c), 1);
		const numYears = byYear.length || 1;
		const avgPerYear = Math.round(total / numYears);

		return {
			total,
			fatalCount,
			incapCount,
			avgPerYear,
			mostRecent,
			byYear,
			maxYearCount
		};
	});

	function daysSince(d: Date): number {
		const now = new Date();
		now.setHours(0, 0, 0, 0);
		const then = new Date(d);
		then.setHours(0, 0, 0, 0);
		return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
	}
</script>

{#if stats}
	<div class="summary-wrap">
		<!-- Stat chips: 2x2 + 1 grid -->
		<div class="summary-grid">
			<div class="summary-card">
				<div class="summary-value summary-value-total">{stats.total}</div>
				<div class="summary-label">Crashes</div>
			</div>

			<div class="summary-card">
				<div class="summary-value summary-value-serious">{stats.incapCount}</div>
				<div class="summary-label">Serious Injury</div>
			</div>

			<div class="summary-card">
				<div class="summary-value summary-value-fatal">{stats.fatalCount}</div>
				<div class="summary-label">Fatal</div>
			</div>

			<div class="summary-card">
				<div class="summary-value summary-value-total">{stats.avgPerYear}</div>
				<div class="summary-label">Avg. Per Year</div>
			</div>

			<div class="summary-card summary-card-wide">
				{#if stats.mostRecent}
					{@const days = daysSince(stats.mostRecent)}
					<div
						class="summary-value"
						class:summary-value-urgent={days <= 7}
						class:summary-value-recent={days > 7 && days <= 30}
						class:summary-value-muted={days > 30}
					>
						{days}
					</div>
					<div class="summary-label">Days Since Latest Crash</div>
				{:else}
					<div class="summary-value summary-value-muted">—</div>
					<div class="summary-label">Days Since Latest Crash</div>
				{/if}
			</div>
		</div>

		<!-- Year by Year (compact) -->
		{#if stats.byYear.length > 1}
			<div class="chart-card">
				<h4 class="chart-heading">Year by Year</h4>
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
	.summary-wrap {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;
	}

	@media (min-width: 640px) and (max-width: 767px) {
		.summary-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	.summary-card {
		background: #fff;
		border-radius: 0.625rem;
		border: 1px solid #e5e7eb;
		padding: 0.5rem 0.625rem;
		text-align: center;
	}

	.summary-value {
		font-size: 1.125rem;
		font-weight: 700;
		line-height: 1.2;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.summary-card-wide {
		grid-column: 1 / -1;
	}

	.summary-value-total {
		color: #1d4ed8;
	}

	.summary-value-fatal {
		color: #dc2626;
	}

	.summary-value-serious {
		color: #d97706;
	}

	.summary-value-urgent {
		color: #dc2626;
	}

	.summary-value-recent {
		color: #f59e0b;
	}

	.summary-value-muted {
		color: #9ca3af;
	}

	.summary-label {
		margin-top: 0.125rem;
		font-size: 0.6875rem;
		color: #6b7280;
	}

	.chart-card {
		background: #fff;
		border-radius: 0.625rem;
		border: 1px solid #e5e7eb;
		padding: 0.625rem 0.75rem;
	}

	.chart-heading {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #6b7280;
		margin-bottom: 0.375rem;
	}

	.chart-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.25rem;
	}

	.chart-row:last-child {
		margin-bottom: 0;
	}

	.chart-year {
		width: 2.25rem;
		flex-shrink: 0;
		font-size: 0.6875rem;
		font-weight: 500;
		color: #374151;
	}

	.chart-track {
		flex: 1;
		background: #bfdbfe;
		border-radius: 9999px;
		height: 0.375rem;
		overflow: hidden;
	}

	.chart-bar {
		background: #2563eb;
		height: 100%;
		border-radius: 9999px;
		transition: width 300ms ease;
	}

	.chart-count {
		width: 1.5rem;
		text-align: right;
		font-size: 0.6875rem;
		color: #6b7280;
		flex-shrink: 0;
	}
</style>
