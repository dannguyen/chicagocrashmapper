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
	<div class="text-sm text-gray-400 py-2">Loading trend data...</div>
{:else if !error && periods.length > 0 && !hasData}
	<div class="bg-white rounded-xl border border-gray-200 p-4 mb-4">
		<div class="flex items-center justify-center h-32 text-sm text-gray-400">No trend data available</div>
	</div>
{:else if !error && periods.length > 0}
	<div class="bg-white rounded-xl border border-gray-200 p-4 mb-4">
		<!-- Header -->
		<div class="flex flex-wrap items-baseline justify-between gap-2 mb-3">
			<h3 class="text-sm font-semibold text-gray-700">18-Month Injury Trend</h3>
			<div class="flex gap-3 text-xs">
				<span class="text-red-600 font-semibold">{totalFatal} killed</span>
				<span class="text-purple-600 font-semibold">{totalIncap} seriously injured</span>
			</div>
		</div>

		<!-- Chart -->
		<div class="overflow-x-auto">
			<svg
				width={periods.length * (barWidth + barGap)}
				height={chartHeight + 22}
				class="block"
				role="img"
				aria-label="Monthly injury trend chart"
			>
				{#each periods as p, i}
					{@const inCapH = barH(p.injuries_incapacitating)}
					{@const fatalH = barH(p.injuries_fatal)}
					{@const x = i * (barWidth + barGap)}
					<title>{formatTooltip(p)}</title>
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
		<div class="flex gap-4 mt-3">
			<span class="text-xs text-gray-500 flex items-center gap-1.5">
				<span class="inline-block w-3 h-3 rounded-sm bg-red-600"></span>
				Fatal
			</span>
			<span class="text-xs text-gray-500 flex items-center gap-1.5">
				<span class="inline-block w-3 h-3 rounded-sm bg-purple-600"></span>
				Serious injury
			</span>
		</div>
	</div>
{/if}
