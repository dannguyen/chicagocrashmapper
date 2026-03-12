<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';

	import { SITE_NAME, CHICAGO_CENTER } from '$lib/constants';
	import type { Crash } from '$lib/models/crash';
	import { parseCrashes } from '$lib/models/crash';
	import { getCrashesList, getDateCount } from '$lib/api/client';
	import { toDateStr, addDays } from '$lib/transformHelpers';
	import MapContainer from '$lib/components/MapContainer.svelte';
	import TrendChart from '$lib/components/TrendChart.svelte';
	import NarrativeSummary from '$lib/components/NarrativeSummary.svelte';
	import KpiCards from '$lib/components/KpiCards.svelte';

	const defaultGeoCenter = CHICAGO_CENTER;
	let crashes: Crash[] = $state([]);
	let loading = $state(true);

	// Latest 2 fatal crashes from loaded data
	const latestFatals = $derived(
		crashes
			.filter((c) => c.isFatal)
			.sort((a, b) => b.date.getTime() - a.date.getTime())
			.slice(0, 2)
	);

	// Year table data
	interface YearRow {
		year: number;
		crashes: number;
		fatal: number;
		serious: number;
		href: string;
	}

	let yearRows: YearRow[] = $state([]);
	let yearTableLoading = $state(true);

	async function loadYearTable() {
		yearTableLoading = true;
		try {
			const data = await getDateCount('year', 20);
			yearRows = Object.entries(data)
				.map(([period, v]) => ({
					year: parseInt(period),
					crashes: v.crash_count ?? 0,
					fatal: v.injuries_fatal ?? 0,
					serious: v.injuries_incapacitating ?? 0,
					href: `${base}/periods/${parseInt(period)}`
				}))
				.sort((a, b) => b.year - a.year);
		} finally {
			yearTableLoading = false;
		}
	}

	// Max value for inline bars
	const maxVal = $derived(
		Math.max(
			...yearRows.map((r) => r.crashes),
			...yearRows.map((r) => r.serious),
			...yearRows.map((r) => r.fatal),
			1
		)
	);

	function barPct(val: number): string {
		return `${Math.max(0, (val / maxVal) * 100)}%`;
	}

	onMount(async () => {
		loading = true;
		loadYearTable();
		try {
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const jan1 = new Date(today.getFullYear(), 0, 1);
			const daysYtd = Math.round((today.getTime() - jan1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
			const useYtd = daysYtd >= 31;

			const since = toDateStr(useYtd ? jan1 : addDays(today, -29));
			const until = toDateStr(today);
			const result = await getCrashesList({
				since,
				until,
				perPage: 1000,
				sort: 'desc'
			});
			crashes = Array.from(parseCrashes(result.crashes));
		} catch {
			crashes = [];
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>{SITE_NAME}</title>
</svelte:head>

{#if !loading}
	<div class="narrative-summary">
		<NarrativeSummary />
	</div>
{/if}

<!-- Two-column layout: left (fatalities + map) | right (YTD + trend + year table) -->
<div class="dashboard-layout" id="main-results-section">
	<!-- LEFT COLUMN: Latest fatalities + Map -->
	<div class="left-column">
		{#if !loading}
			<!-- Latest fatalities -->
			{#if latestFatals.length > 0}
				<div class="fatalities-section">
					<h3 class="fatalities-heading">Latest Fatalities</h3>
					<div class="fatalities-grid">
						{#each latestFatals as crash}
							<a href="{base}/crashes/{crash.crash_record_id}" class="fatality-card">
								<div class="fatality-killed">{crash.injuries_fatal} killed</div>
								<div class="fatality-location">{crash.street_address}</div>
								<div class="fatality-date">{crash.prettyDate} at {crash.prettyTime}</div>
								{#if crash.primary_cause && crash.hasKnownCause}
									<div class="fatality-cause">{crash.primary_cause}</div>
								{/if}
							</a>
						{/each}
					</div>
				</div>
			{/if}
		{/if}

		<div class="map-container">
			<MapContainer {crashes} {defaultGeoCenter} />
		</div>
	</div>

	<!-- RIGHT COLUMN: YTD + Trend chart + Year table -->
	<div class="right-column">
		{#if !loading}
			<div class="panel-block">
				<KpiCards />
			</div>
		{:else}
			<div class="loading-placeholder">
				<svg
					class="loading-icon"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
					></path>
				</svg>
				<span class="loading-label">Loading...</span>
			</div>
		{/if}

		<div class="panel-block">
			<TrendChart months={24} />
		</div>

		<!-- Year table -->
		{#if !yearTableLoading && yearRows.length > 0}
			<div class="table-card">
				<table class="year-table">
					<thead>
						<tr>
							<th class="col-year">Year</th>
							<th class="col-num">Crashes</th>
							<th class="col-num">Serious Injuries</th>
							<th class="col-num">Deaths</th>
						</tr>
					</thead>
					<tbody>
						{#each yearRows as row}
							<tr class="row-year">
								<td class="col-year">
									<a href={row.href} class="table-link">{row.year}</a>
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
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<style>
	.narrative-summary {
		font-size: 1.2rem;
		font-weight: 400;
		margin: 0.1rem 0 1rem 0;
	}

	.dashboard-layout {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-height: calc(100vh - 8rem);
	}

	@media (min-width: 768px) {
		.dashboard-layout {
			flex-direction: row;
			gap: 1.5rem;
		}
	}

	/* ── Left column: KPIs + map ── */
	.left-column {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	@media (min-width: 768px) {
		.left-column {
			flex: 55 1 0%;
			min-width: 0;
			position: sticky;
			top: 3.5rem;
			height: calc(100vh - 3.5rem);
		}
	}

	.map-container {
		flex: 1;
		min-height: 20rem;
		border-radius: 0.75rem;
		overflow: hidden;
		border: 1px solid #e5e7eb;
	}

	.map-container :global(#map) {
		height: 100%;
		margin-bottom: 0;
	}

	/* ── Right column: trend + year table ── */
	.right-column {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	@media (min-width: 768px) {
		.right-column {
			flex: 45 1 0%;
			min-width: 0;
			overflow-y: auto;
			max-height: calc(100vh - 3.5rem);
		}
	}

	.panel-block {
		padding: 0;
	}

	.loading-placeholder {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
	}

	.loading-icon {
		width: 0.875rem;
		height: 0.875rem;
		color: #2563eb;
		flex-shrink: 0;
		animation: spin 1s linear infinite;
	}

	.loading-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #6b7280;
	}

	/* ── Latest fatalities ── */
	.fatalities-section {
		padding: 0 0.25rem;
	}

	.fatalities-heading {
		font-size: 0.8125rem;
		font-weight: 600;
		color: #374151;
		margin-bottom: 0.5rem;
	}

	.fatalities-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.625rem;
	}

	.fatality-card {
		display: block;
		background: #fff;
		border: 1px solid #e5e7eb;
		border-left: 3px solid #dc2626;
		border-radius: 0.5rem;
		padding: 0.625rem 0.75rem;
		text-decoration: none;
		color: inherit;
		transition:
			border-color 150ms ease,
			box-shadow 150ms ease;
	}

	.fatality-card:hover {
		border-color: #dc2626;
		box-shadow: 0 1px 4px rgb(0 0 0 / 0.08);
	}

	.fatality-killed {
		font-size: 0.875rem;
		font-weight: 700;
		color: #dc2626;
		margin-bottom: 0.2rem;
	}

	.fatality-location {
		font-size: 0.8125rem;
		font-weight: 600;
		color: #111827;
		line-height: 1.3;
	}

	.fatality-date {
		font-size: 0.75rem;
		color: #6b7280;
		margin-top: 0.15rem;
	}

	.fatality-cause {
		font-size: 0.6875rem;
		color: #9ca3af;
		margin-top: 0.2rem;
	}

	/* ── Year table ── */
	.table-card {
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 0.75rem;
		overflow: hidden;
	}

	.year-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;
	}

	.year-table thead {
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
	}

	.year-table th {
		padding: 0.5rem 0.75rem;
		font-size: 0.6875rem;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		text-align: left;
	}

	.year-table td {
		padding: 0.5rem 0.75rem;
	}

	.col-num {
		text-align: left !important;
		font-variant-numeric: tabular-nums;
	}

	.col-year {
		width: 5rem;
	}

	.row-year {
		border-bottom: 1px solid #f3f4f6;
	}

	.row-year td {
		font-weight: 600;
		color: #111827;
	}

	.row-year:last-child {
		border-bottom: none;
	}

	.col-fatal {
		color: #dc2626;
	}

	.col-serious {
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

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
