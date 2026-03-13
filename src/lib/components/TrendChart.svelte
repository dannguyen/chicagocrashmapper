<script lang="ts">
	export type TrendBar = {
		period: string;
		label: string;
		injuries_fatal: number;
		injuries_incapacitating: number;
		href?: string;
		tooltipLabel?: string;
	};

	let {
		loading = false,
		bars = [],
		title,
		ariaLabel,
		emptyMessage = 'No trend data available',
		showBarLabel = defaultShowBarLabel,
		scrollable = true,
		labelFontSize = 9,
		maxChartHeight = 320,
		showLegend = true
	} = $props<{
		loading?: boolean;
		bars: TrendBar[];
		title: string;
		ariaLabel: string;
		emptyMessage?: string;
		showBarLabel?: (bar: TrendBar, index: number) => boolean;
		scrollable?: boolean;
		labelFontSize?: number;
		maxChartHeight?: number;
		showLegend?: boolean;
	}>();

	let hoveredIndex = $state<number | null>(null);
	let tooltipX = $state(0);
	let tooltipY = $state(0);

	const chartHeight = 80;
	const labelHeight = 22;
	const barGap = 3;
	const barWidth = $derived(bars.length > 20 ? 16 : 18);
	const svgWidth = $derived(bars.length > 0 ? bars.length * (barWidth + barGap) : 456);
	const totalFatal = $derived(
		bars.reduce((sum: number, bar: TrendBar) => sum + bar.injuries_fatal, 0)
	);
	const totalSerious = $derived(
		bars.reduce((sum: number, bar: TrendBar) => sum + bar.injuries_incapacitating, 0)
	);
	const hasData = $derived(totalFatal + totalSerious > 0);
	const maxVal = $derived(
		bars.length > 0
			? Math.max(
					...bars.map((bar: TrendBar) => bar.injuries_fatal + bar.injuries_incapacitating),
					1
				)
			: 1
	);

	function defaultShowBarLabel(_bar: TrendBar, index: number): boolean {
		return index % 3 === 0;
	}

	function barH(value: number): number {
		if (value <= 0) return 0;
		return Math.max(2, (value / maxVal) * chartHeight);
	}

	function formatTooltipLabel(bar: TrendBar): string {
		return bar.tooltipLabel ?? bar.period;
	}

	function formatAriaLabel(bar: TrendBar): string {
		return `${formatTooltipLabel(bar)}: ${bar.injuries_fatal} killed, ${bar.injuries_incapacitating} seriously injured`;
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
</script>

{#if loading}
	<div class="trend-loading">Loading trend data...</div>
{:else if bars.length > 0 && !hasData}
	<div class="trend-card">
		<div class="trend-empty">{emptyMessage}</div>
	</div>
{:else if bars.length > 0}
	<div class="trend-card">
		<div class="trend-header">
			<h3 class="trend-title">{title}</h3>
			<div class="trend-stats">
				<span class="trend-stat trend-stat-fatal">{totalFatal} killed</span>
				<span class="trend-stat trend-stat-serious">{totalSerious} seriously injured</span>
			</div>
		</div>

		<div class="trend-chart">
			<div class:trend-chart-scrollable={scrollable}>
				<svg
					viewBox="0 0 {svgWidth} {chartHeight + labelHeight}"
					preserveAspectRatio="xMinYMin meet"
					class="trend-svg"
					style:min-width={scrollable ? `${svgWidth}px` : undefined}
					style:max-height={`${maxChartHeight}px`}
					role="img"
					aria-label={ariaLabel}
				>
					{#each bars as bar, i}
						{@const inCapH = barH(bar.injuries_incapacitating)}
						{@const fatalH = barH(bar.injuries_fatal)}
						{@const x = i * (barWidth + barGap)}
						{@const isHovered = hoveredIndex === i}
						{#if bar.href}
							<a
								href={bar.href}
								aria-label={formatAriaLabel(bar)}
								onmouseenter={(event) => handleBarHover(event, i)}
								onmousemove={(event) => handleBarHover(event, i)}
								onmouseleave={handleBarLeave}
							>
								<rect
									{x}
									y={0}
									width={barWidth}
									height={chartHeight}
									fill="transparent"
									class="bar-hit bar-hit-clickable"
								/>
								<rect
									{x}
									y={chartHeight - inCapH}
									width={barWidth}
									height={inCapH}
									class="bar-segment bar-serious"
									opacity={isHovered ? 0.8 : 1}
									pointer-events="none"
								/>
								<rect
									{x}
									y={chartHeight - inCapH - fatalH}
									width={barWidth}
									height={fatalH}
									class="bar-segment bar-fatal"
									opacity={isHovered ? 0.8 : 1}
									pointer-events="none"
								/>
							</a>
						{:else}
							<rect
								{x}
								y={0}
								width={barWidth}
								height={chartHeight}
								fill="transparent"
								class="bar-hit"
								onmouseenter={(event) => handleBarHover(event, i)}
								onmousemove={(event) => handleBarHover(event, i)}
								onmouseleave={handleBarLeave}
								role="img"
								aria-label={formatAriaLabel(bar)}
							/>
							<rect
								{x}
								y={chartHeight - inCapH}
								width={barWidth}
								height={inCapH}
								class="bar-segment bar-serious"
								opacity={isHovered ? 0.8 : 1}
								pointer-events="none"
							/>
							<rect
								{x}
								y={chartHeight - inCapH - fatalH}
								width={barWidth}
								height={fatalH}
								class="bar-segment bar-fatal"
								opacity={isHovered ? 0.8 : 1}
								pointer-events="none"
							/>
						{/if}
						{#if showBarLabel(bar, i)}
							<text
								x={x + barWidth / 2}
								y={chartHeight + 14}
								text-anchor="middle"
								font-size={labelFontSize}
								fill="#9ca3af"
								pointer-events="none"
							>
								{bar.label}
							</text>
						{/if}
					{/each}
				</svg>
			</div>

			{#if hoveredIndex !== null && bars[hoveredIndex]}
				{@const bar = bars[hoveredIndex]}
				<div class="chart-tooltip" style="left: {tooltipX}px; top: {tooltipY}px;">
					<div class="tooltip-title">{formatTooltipLabel(bar)}</div>
					<div class="tooltip-row">
						<span class="tooltip-swatch tooltip-fatal"></span>
						{bar.injuries_fatal} killed
					</div>
					<div class="tooltip-row">
						<span class="tooltip-swatch tooltip-serious"></span>
						{bar.injuries_incapacitating} seriously injured
					</div>
				</div>
			{/if}
		</div>

		{#if showLegend}
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
		{/if}
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
		color: var(--color-fatal);
	}

	.trend-stat-serious {
		color: var(--color-serious);
	}

	.trend-chart {
		position: relative;
		padding-bottom: 0.25rem;
	}

	.trend-chart-scrollable {
		overflow-x: auto;
	}

	.trend-svg {
		display: block;
		width: 100%;
		height: auto;
	}

	.bar-hit-clickable {
		cursor: pointer;
	}

	.bar-segment {
		transition: opacity 100ms ease;
	}

	.bar-fatal {
		fill: var(--color-fatal);
	}

	.bar-serious {
		fill: var(--color-serious);
	}

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
		background: var(--color-fatal);
	}

	.tooltip-serious {
		background: var(--color-serious);
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
		background: var(--color-fatal);
	}

	.legend-serious {
		background: var(--color-serious);
	}
</style>
