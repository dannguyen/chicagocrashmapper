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
</script>

{#if loading}
	<div class="trend-loading">Loading trend data...</div>
{:else if !error && periods.length > 0}
	<div class="trend-chart">
		<div class="chart-header">
			<h3 class="chart-title">City-wide serious injuries — last 18 months</h3>
			<div class="chart-totals">
				<span class="total-fatal">{totalFatal} killed</span>
				<span class="total-incap">{totalIncap} seriously injured</span>
			</div>
		</div>
		<div class="chart-wrap">
			<svg
				width={periods.length * (barWidth + barGap)}
				height={chartHeight + 22}
				class="chart-svg"
				role="img"
				aria-label="Monthly injury trend chart"
			>
				{#each periods as p, i}
					{@const inCapH = barH(p.injuries_incapacitating)}
					{@const fatalH = barH(p.injuries_fatal)}
					{@const x = i * (barWidth + barGap)}
					<title>{formatTooltip(p)}</title>
					<rect {x} y={chartHeight - inCapH} width={barWidth} height={inCapH} class="bar-incap">
						<title>{formatTooltip(p)}</title>
					</rect>
					<rect
						{x}
						y={chartHeight - inCapH - fatalH}
						width={barWidth}
						height={fatalH}
						class="bar-fatal"
					>
						<title>{formatTooltip(p)}</title>
					</rect>
					{#if i % 3 === 0}
						<text x={x + barWidth / 2} y={chartHeight + 14} class="bar-label" text-anchor="middle">
							{formatPeriod(p.period)}
						</text>
					{/if}
				{/each}
			</svg>
		</div>
		<div class="chart-legend">
			<span class="legend-item">
				<span class="swatch swatch-fatal"></span>
				Fatal
			</span>
			<span class="legend-item">
				<span class="swatch swatch-incap"></span>
				Serious injury
			</span>
		</div>
	</div>
{/if}

<style lang="postcss">
	@reference "$lib/styles/app.css";

	.trend-loading {
		@apply text-sm text-gray-400 py-2;
	}

	.trend-chart {
		@apply bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4;
	}

	.chart-header {
		@apply flex flex-wrap items-baseline justify-between gap-2 mb-3;
	}

	.chart-title {
		@apply text-sm font-semibold text-gray-600;
	}

	.chart-totals {
		@apply flex gap-3 text-xs;
	}

	.total-fatal {
		@apply text-red-700 font-semibold;
	}

	.total-incap {
		@apply text-orange-600 font-semibold;
	}

	.chart-wrap {
		@apply overflow-x-auto;
	}

	.chart-svg {
		@apply block;
	}

	:global(.bar-fatal) {
		fill: #dc2626;
	}

	:global(.bar-incap) {
		fill: #fb923c;
	}

	:global(.bar-label) {
		font-size: 9px;
		fill: #9ca3af;
	}

	.chart-legend {
		@apply flex gap-4 mt-2;
	}

	.legend-item {
		@apply text-xs text-gray-500 flex items-center gap-1;
	}

	.swatch {
		@apply inline-block w-3 h-3 rounded-sm;
	}

	.swatch-fatal {
		@apply bg-red-600;
	}

	.swatch-incap {
		@apply bg-orange-400;
	}
</style>
