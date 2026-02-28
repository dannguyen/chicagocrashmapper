<script lang="ts">
	import { base } from '$app/paths';
	import { SITE_NAME, MONTH_SHORT, MONTH_NAMES } from '$lib/constants';
	import { getDateCount } from '$lib/api/client';
	import type { DateCountPeriod } from '$lib/db/types';

	interface BarData {
		period: string;
		year: number;
		month: number;
		label: string;
		crash_count: number;
		injuries_fatal: number;
		injuries_incapacitating: number;
	}

	let bars: BarData[] = $state([]);
	let loading = $state(true);

	async function loadData() {
		loading = true;
		try {
			const data = await getDateCount('month', 120);
			bars = Object.entries(data)
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([period, v]) => {
					const [y, m] = period.split('-');
					return {
						period,
						year: parseInt(y),
						month: parseInt(m),
						label: MONTH_SHORT[parseInt(m) - 1],
						crash_count: v.crash_count ?? 0,
						injuries_fatal: v.injuries_fatal ?? 0,
						injuries_incapacitating: v.injuries_incapacitating ?? 0
					};
				});
		} finally {
			loading = false;
		}
	}

	// Totals
	const totalCrashes = $derived(bars.reduce((s, b) => s + b.crash_count, 0));
	const totalFatal = $derived(bars.reduce((s, b) => s + b.injuries_fatal, 0));
	const totalSerious = $derived(bars.reduce((s, b) => s + b.injuries_incapacitating, 0));
	const firstYear = $derived(bars.length > 0 ? bars[0].year : null);
	const lastYear = $derived(bars.length > 0 ? bars[bars.length - 1].year : null);

	// Table rows: year totals + month rows, reverse chronological
	interface TableRow {
		type: 'year' | 'month';
		year: number;
		month?: number;
		monthName?: string;
		crashes: number;
		fatal: number;
		serious: number;
		href: string;
	}

	function buildTableRows(data: BarData[]): TableRow[] {
		const byYear = new Map<number, BarData[]>();
		for (const b of data) {
			if (!byYear.has(b.year)) byYear.set(b.year, []);
			byYear.get(b.year)!.push(b);
		}
		const rows: TableRow[] = [];
		const sortedYears = [...byYear.keys()].sort((a, b) => b - a);
		for (const y of sortedYears) {
			const months = byYear.get(y)!.sort((a, b) => b.month - a.month);
			const totCrashes = months.reduce((s, m) => s + m.crash_count, 0);
			const totFatal = months.reduce((s, m) => s + m.injuries_fatal, 0);
			const totSerious = months.reduce((s, m) => s + m.injuries_incapacitating, 0);
			rows.push({
				type: 'year',
				year: y,
				crashes: totCrashes,
				fatal: totFatal,
				serious: totSerious,
				href: `${base}/periods/${y}`
			});
			for (const m of months) {
				rows.push({
					type: 'month',
					year: y,
					month: m.month,
					monthName: MONTH_NAMES[m.month - 1],
					crashes: m.crash_count,
					fatal: m.injuries_fatal,
					serious: m.injuries_incapacitating,
					href: `${base}/periods/${y}/${m.month}`
				});
			}
		}
		return rows;
	}

	const tableRows = $derived(buildTableRows(bars));

	// Shared max across all columns for proportional inline bars
	const maxVal = $derived(
		Math.max(
			...bars.map((b) => b.crash_count),
			...bars.map((b) => b.injuries_incapacitating),
			...bars.map((b) => b.injuries_fatal),
			1
		)
	);

	function barPct(val: number): string {
		return `${Math.max(0, (val / maxVal) * 100)}%`;
	}

	loadData();
</script>

<svelte:head>
	<title>Crash Trends — {SITE_NAME}</title>
</svelte:head>

<div class="periods-page">
	<h1 class="page-title">Serious Crash Trends</h1>
	{#if firstYear && lastYear}
		<p class="page-subtitle">Monthly serious crashes in Chicago, {firstYear}–{lastYear}</p>
	{/if}

	{#if loading}
		<div class="chart-card loading-card">
			<div class="loading-text">Loading crash data...</div>
		</div>
	{:else if bars.length > 0}
		<!-- KPI row -->
		<div class="kpi-row">
			<div class="kpi-item">
				<div class="kpi-value">{totalCrashes.toLocaleString()}</div>
				<div class="kpi-label">Serious Crashes</div>
			</div>
			<div class="kpi-item">
				<div class="kpi-value kpi-serious">{totalSerious.toLocaleString()}</div>
				<div class="kpi-label">Serious Injuries</div>
			</div>
			<div class="kpi-item">
				<div class="kpi-value kpi-fatal">{totalFatal.toLocaleString()}</div>
				<div class="kpi-label">People Killed</div>
			</div>
		</div>

		<!-- Period table -->
		<div class="table-card">
			<table class="period-table">
				<thead>
					<tr>
						<th class="col-year">Year</th>
						<th class="col-month">Month</th>
						<th class="col-num">Crashes</th>
						<th class="col-num">Serious Injuries</th>
						<th class="col-num">Deaths</th>
					</tr>
				</thead>
				<tbody>
					{#each tableRows as row}
						{#if row.type === 'year'}
							<tr class="row-year">
								<td class="col-year">
									<a href={row.href} class="table-link">{row.year}</a>
								</td>
								<td class="col-month"></td>
								<td class="col-num">{row.crashes.toLocaleString()}</td>
								<td class="col-num col-serious">{row.serious.toLocaleString()}</td>
								<td class="col-num col-fatal">{row.fatal.toLocaleString()}</td>
							</tr>
						{:else}
							<tr class="row-month">
								<td class="col-year"></td>
								<td class="col-month">
									<a href={row.href} class="table-link">{row.monthName}</a>
								</td>
								<td class="col-num col-bar">
									<span class="bar-bg bar-crashes" style="width:{barPct(row.crashes)}"></span>
									<span class="bar-val">{row.crashes.toLocaleString()}</span>
								</td>
								<td class="col-num col-bar">
									<span class="bar-bg bar-serious" style="width:{barPct(row.serious)}"></span>
									<span class="bar-val col-serious">{row.serious.toLocaleString()}</span>
								</td>
								<td class="col-num col-bar">
									<span class="bar-bg bar-fatal" style="width:{barPct(row.fatal)}"></span>
									<span class="bar-val col-fatal">{row.fatal.toLocaleString()}</span>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.periods-page {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: #111827;
		line-height: 1.2;
	}

	.page-subtitle {
		font-size: 0.875rem;
		color: #6b7280;
		margin-top: -1rem;
	}

	/* ── KPI row ── */
	.kpi-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
	}

	.kpi-item {
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 0.75rem;
		padding: 1rem;
		text-align: center;
	}

	.kpi-value {
		font-size: 1.75rem;
		font-weight: 700;
		line-height: 1;
		color: #111827;
	}

	.kpi-fatal {
		color: #dc2626;
	}

	.kpi-serious {
		color: #d97706;
	}

	.kpi-label {
		font-size: 0.6875rem;
		font-weight: 500;
		color: #6b7280;
		margin-top: 0.375rem;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.loading-card {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 10rem;
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 0.75rem;
	}

	.loading-text {
		font-size: 0.875rem;
		color: #9ca3af;
	}

	/* ── Period table ── */
	.table-card {
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 0.75rem;
		overflow: hidden;
	}

	.period-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;
	}

	.period-table thead {
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
	}

	.period-table th {
		padding: 0.5rem 0.75rem;
		font-size: 0.6875rem;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		text-align: left;
	}

	.period-table td {
		padding: 0.375rem 0.75rem;
	}

	.col-num {
		text-align: left !important;
		font-variant-numeric: tabular-nums;
	}

	.col-year {
		width: 5rem;
	}

	.col-month {
		width: 7rem;
	}

	.row-year {
		background: #f9fafb;
		border-top: 1px solid #e5e7eb;
	}

	.row-year td {
		font-weight: 700;
		color: #111827;
		padding-top: 0.5rem;
		padding-bottom: 0.5rem;
	}

	.row-month td {
		color: #374151;
		border-bottom: 1px solid #f3f4f6;
	}

	.row-month:last-child td {
		border-bottom: none;
	}

	.col-fatal {
		color: #dc2626;
	}

	.col-serious {
		color: #d97706;
	}

	.row-year .col-fatal {
		color: #dc2626;
	}

	.row-year .col-serious {
		color: #d97706;
	}

	.table-link {
		color: #2563eb;
		text-decoration: none;
		font-weight: inherit;
	}

	.table-link:hover {
		text-decoration: underline;
	}

	/* ── Inline bars ── */
	.col-bar {
		position: relative;
		padding-right: 0.75rem !important;
	}

	.bar-bg {
		position: absolute;
		left: 0;
		top: 2px;
		bottom: 2px;
		border-radius: 2px;
		opacity: 0.15;
	}

	.bar-crashes {
		background: #6b7280;
	}

	.bar-serious {
		background: #d97706;
	}

	.bar-fatal {
		background: #dc2626;
	}

	.bar-val {
		position: relative;
	}
</style>
