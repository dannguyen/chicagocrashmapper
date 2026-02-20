<script lang="ts">
	import { onMount } from 'svelte';
	import { getDateCount } from '$lib/api/client';
	import type { DateCountPeriod } from '$lib/db/types';

	interface PeriodData {
		period: string;
		injuries_fatal: number;
		injuries_incapacitating: number;
	}

	let periods = $state<PeriodData[]>([]);
	let loading = $state(true);
	let error = $state(false);

	const chartHeight = 80;
	const barWidth = 16;
	const barGap = 3;

	onMount(async () => {
		try {
			const data = await getDateCount('month', 18);
			periods = Object.entries(data)
				.map(([period, vals]: [string, DateCountPeriod]) => ({
					period,
					injuries_fatal: vals.injuries_fatal ?? 0,
					injuries_incapacitating: vals.injuries_incapacitating ?? 0
				}))
				.sort((a, b) => a.period.localeCompare(b.period));
		} catch {
			error = true;
		} finally {
			loading = false;
		}
	});

	let maxVal = $derived(
		periods.length > 0
			? Math.max(...periods.map((p) => p.injuries_fatal + p.injuries_incapacitating), 1)
			: 1
	);

	function barH(val: number): number {
		return Math.max(2, (val / maxVal) * chartHeight);
	}

	const monthNames = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'May',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Oct',
		'Nov',
		'Dec'
	];

	function formatPeriod(period: string): string {
		const parts = period.split('-');
		const month = parseInt(parts[1]) - 1;
		return monthNames[month] ?? period;
	}

	function formatTooltip(p: PeriodData): string {
		return `${p.period}: ${p.injuries_fatal} killed, ${p.injuries_incapacitating} seriously injured`;
	}

	let totalFatal = $derived(periods.reduce((s, p) => s + p.injuries_fatal, 0));
	let totalIncap = $derived(periods.reduce((s, p) => s + p.injuries_incapacitating, 0));
	let hasData = $derived(totalFatal + totalIncap > 0);
</script>

{#if loading}
	<div class="trend-loading">Loading trend data...</div>
{:else if !error && periods.length > 0 && !hasData}
	<div class="trend-card">
		<div class="trend-empty">No trend data available</div>
	</div>
{:else if !error && periods.length > 0}
	<div class="trend-card">
		<!-- Header -->
		<div class="trend-header">
			<h3 class="trend-title">18-Month Injury Trend</h3>
			<div class="trend-stats">
				<span class="trend-stat trend-stat-fatal">{totalFatal} killed</span>
				<span class="trend-stat trend-stat-serious">{totalIncap} seriously injured</span>
			</div>
		</div>

		<!-- Chart -->
		<div class="trend-chart">
			<svg
				width={periods.length * (barWidth + barGap)}
				height={chartHeight + 22}
				class="trend-svg"
				role="img"
				aria-label="Monthly injury trend chart"
			>
				{#each periods as p, i}
					{@const inCapH = barH(p.injuries_incapacitating)}
					{@const fatalH = barH(p.injuries_fatal)}
					{@const x = i * (barWidth + barGap)}
					<rect {x} y={chartHeight - inCapH} width={barWidth} height={inCapH} fill="#9333ea">
						<title>{formatTooltip(p)}</title>
					</rect>
					<rect
						{x}
						y={chartHeight - inCapH - fatalH}
						width={barWidth}
						height={fatalH}
						fill="#dc2626"
					>
						<title>{formatTooltip(p)}</title>
					</rect>
					{#if i % 3 === 0}
						<text
							x={x + barWidth / 2}
							y={chartHeight + 14}
							text-anchor="middle"
							font-size="9"
							fill="#9ca3af"
						>
							{formatPeriod(p.period)}
						</text>
					{/if}
				{/each}
			</svg>
		</div>

		<!-- Legend -->
		<div class="trend-legend">
			<span class="legend-item">
				<span class="legend-swatch legend-fatal"></span>
				Fatal
			</span>
			<span class="legend-item">
				<span class="legend-swatch legend-serious"></span>
				Serious injury
			</span>
		</div>
	</div>
{/if}

<style>
	.trend-loading {
		font-size: 0.875rem;
		color: #9ca3af;
		padding: 0.5rem 0;
	}

	.trend-card {
		background: #fff;
		border-radius: 0.75rem;
		border: 1px solid #e5e7eb;
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.trend-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 8rem;
		font-size: 0.875rem;
		color: #9ca3af;
	}

	.trend-header {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.trend-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
	}

	.trend-stats {
		display: flex;
		gap: 0.75rem;
		font-size: 0.75rem;
	}

	.trend-stat {
		font-weight: 600;
	}

	.trend-stat-fatal {
		color: #dc2626;
	}

	.trend-stat-serious {
		color: #7c3aed;
	}

	.trend-chart {
		overflow-x: auto;
	}

	.trend-svg {
		display: block;
	}

	.trend-legend {
		display: flex;
		gap: 1rem;
		margin-top: 0.75rem;
	}

	.legend-item {
		font-size: 0.75rem;
		color: #6b7280;
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
	}

	.legend-swatch {
		display: inline-block;
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 0.125rem;
	}

	.legend-fatal {
		background: #dc2626;
	}

	.legend-serious {
		background: #7c3aed;
	}
</style>
