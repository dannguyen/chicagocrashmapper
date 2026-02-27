<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { getDateCount } from '$lib/api/client';
	import type { DateCountPeriod } from '$lib/db/types';
	import { MONTH_NAMES, MONTH_SHORT } from '$lib/constants';

	interface PeriodData {
		period: string;
		injuries_fatal: number;
		injuries_incapacitating: number;
	}

	let periods = $state<PeriodData[]>([]);
	let loading = $state(true);
	let error = $state(false);

	let hoveredIndex = $state<number | null>(null);
	let tooltipX = $state(0);
	let tooltipY = $state(0);

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

	function formatPeriod(period: string): string {
		const parts = period.split('-');
		const month = parseInt(parts[1]) - 1;
		return MONTH_SHORT[month] ?? period;
	}

	function periodUrl(period: string): string {
		const [year, month] = period.split('-');
		return `${base}/crashes/period/${year}/${parseInt(month)}`;
	}

	function formatTooltipLabel(p: PeriodData): string {
		const parts = p.period.split('-');
		const monthIdx = parseInt(parts[1]) - 1;
		return `${MONTH_NAMES[monthIdx]} ${parts[0]}`;
	}

	function handleBarClick(p: PeriodData) {
		goto(periodUrl(p.period));
	}

	function handleBarHover(event: MouseEvent, index: number) {
		hoveredIndex = index;
		const chartEl = (event.currentTarget as SVGElement).closest('.trend-chart');
		if (chartEl) {
			const rect = chartEl.getBoundingClientRect();
			tooltipX = event.clientX - rect.left;
			tooltipY = event.clientY - rect.top;
		}
	}

	function handleBarLeave() {
		hoveredIndex = null;
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
					{@const isHovered = hoveredIndex === i}
					<!-- Invisible hit area covering the full column height -->
					<rect
						{x}
						y={0}
						width={barWidth}
						height={chartHeight}
						fill="transparent"
						class="bar-hit"
						onclick={() => handleBarClick(p)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								handleBarClick(p);
							}
						}}
						onmouseenter={(e) => handleBarHover(e, i)}
						onmousemove={(e) => handleBarHover(e, i)}
						onmouseleave={handleBarLeave}
						role="link"
						tabindex="0"
						aria-label="{formatTooltipLabel(
							p
						)}: {p.injuries_fatal} killed, {p.injuries_incapacitating} seriously injured"
					/>
					<!-- Serious injury bar -->
					<rect
						{x}
						y={chartHeight - inCapH}
						width={barWidth}
						height={inCapH}
						fill="#9333ea"
						opacity={isHovered ? 0.8 : 1}
						class="bar-segment"
						pointer-events="none"
					/>
					<!-- Fatal bar -->
					<rect
						{x}
						y={chartHeight - inCapH - fatalH}
						width={barWidth}
						height={fatalH}
						fill="#dc2626"
						opacity={isHovered ? 0.8 : 1}
						class="bar-segment"
						pointer-events="none"
					/>
					{#if i % 3 === 0}
						<text
							x={x + barWidth / 2}
							y={chartHeight + 14}
							text-anchor="middle"
							font-size="9"
							fill="#9ca3af"
							pointer-events="none"
						>
							{formatPeriod(p.period)}
						</text>
					{/if}
				{/each}
			</svg>

			<!-- Custom tooltip -->
			{#if hoveredIndex !== null && periods[hoveredIndex]}
				{@const p = periods[hoveredIndex]}
				<div class="chart-tooltip" style="left: {tooltipX}px; top: {tooltipY}px;">
					<div class="tooltip-title">{formatTooltipLabel(p)}</div>
					<div class="tooltip-row">
						<span class="tooltip-swatch tooltip-fatal"></span>
						{p.injuries_fatal} killed
					</div>
					<div class="tooltip-row">
						<span class="tooltip-swatch tooltip-serious"></span>
						{p.injuries_incapacitating} seriously injured
					</div>
				</div>
			{/if}
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
		position: relative;
	}

	.trend-svg {
		display: block;
	}

	.bar-hit {
		cursor: pointer;
	}

	.bar-segment {
		transition: opacity 100ms ease;
	}

	/* ── Tooltip ── */
	.chart-tooltip {
		position: absolute;
		pointer-events: none;
		transform: translate(-50%, -100%);
		margin-top: -10px;
		background: #1f2937;
		color: #fff;
		border-radius: 0.5rem;
		padding: 0.5rem 0.625rem;
		font-size: 0.6875rem;
		line-height: 1.4;
		white-space: nowrap;
		box-shadow: 0 4px 12px rgb(0 0 0 / 0.15);
		z-index: 20;
	}

	.tooltip-title {
		font-weight: 600;
		margin-bottom: 0.2rem;
	}

	.tooltip-row {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.tooltip-swatch {
		display: inline-block;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 0.125rem;
		flex-shrink: 0;
	}

	.tooltip-fatal {
		background: #dc2626;
	}

	.tooltip-serious {
		background: #9333ea;
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
