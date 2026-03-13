<script lang="ts">
	import { base } from '$app/paths';
	import { getCrashSummary, getCrashesBrief, getDateCount } from '$lib/api/client';
	import type { CrashSummary } from '$lib/models/types';
	import type { BriefCrash } from '$lib/models/briefCrash';
	import { CHICAGO_CENTER, MONTH_NAMES, MONTH_SHORT } from '$lib/constants';
	import { fillMissingMonthsForYear } from '$lib/transformHelpers';

	import {
		computePrevRange,
		computeRange,
		computeTwoYearsAgoRange,
		computeYearAgoRange,
		summaryDelta,
		zeroPad
	} from '$lib/periodRange';
	import MapContainer from '$lib/components/MapContainer.svelte';
	import BriefCrashBrowser from '$lib/components/BriefCrashBrowser.svelte';
	import KpiCompareRow from '$lib/components/KpiCompareRow.svelte';
	import TrendChart, { type TrendBar } from '$lib/components/TrendChart.svelte';
	import { showCrashOnMap } from '$lib/pagination';

	let { year, month = null } = $props<{ year: number; month?: number | null }>();

	const defaultGeoCenter = CHICAGO_CENTER;

	// ── Reactive date windows ────────────────────────────────────────────────────

	const range = $derived(computeRange(year, month));
	const prevRange = $derived(computePrevRange(year, month));
	const yearAgoRange = $derived(computeYearAgoRange(year, month));
	const twoYearsAgoRange = $derived(computeTwoYearsAgoRange(year, month));

	// ── Data state ───────────────────────────────────────────────────────────────

	let summary: CrashSummary | null = $state(null);
	let prevSummary: CrashSummary | null = $state(null);
	let yearAgoSummary: CrashSummary | null = $state(null);
	let twoYearsAgoSummary: CrashSummary | null = $state(null);

	let chartBars: TrendBar[] = $state([]);

	let allCrashes: BriefCrash[] = $state([]);
	let visibleCrashes: BriefCrash[] = $state([]);

	let statsLoading = $state(true);
	let chartLoading = $state(true);
	let crashesLoading = $state(true);
	let statsError = $state(false);
	let crashesError = $state(false);

	let topMapRef: MapContainer | undefined = $state(undefined);

	// ── KPI deltas ───────────────────────────────────────────────────────────────

	const crashesPrevDelta = $derived(summaryDelta(summary, prevSummary, (s) => s.total));
	const fatalPrevDelta = $derived(summaryDelta(summary, prevSummary, (s) => s.fatal_injuries));
	const seriousPrevDelta = $derived(
		summaryDelta(summary, prevSummary, (s) => s.injuries_incapacitating)
	);
	const crashesYoyDelta = $derived(summaryDelta(summary, yearAgoSummary, (s) => s.total));
	const fatalYoyDelta = $derived(summaryDelta(summary, yearAgoSummary, (s) => s.fatal_injuries));
	const seriousYoyDelta = $derived(
		summaryDelta(summary, yearAgoSummary, (s) => s.injuries_incapacitating)
	);
	const crashesTwoYearsDelta = $derived(summaryDelta(summary, twoYearsAgoSummary, (s) => s.total));
	const fatalTwoYearsDelta = $derived(
		summaryDelta(summary, twoYearsAgoSummary, (s) => s.fatal_injuries)
	);
	const seriousTwoYearsDelta = $derived(
		summaryDelta(summary, twoYearsAgoSummary, (s) => s.injuries_incapacitating)
	);
	const chartTitle = $derived(`${month != null ? 'Daily' : 'Monthly'} Crashes — ${range.label}`);
	const chartAriaLabel = $derived(
		`${month != null ? 'Daily' : 'Monthly'} crash trend for ${range.label}`
	);

	// ── Fetch functions ──────────────────────────────────────────────────────────

	async function fetchStats(signal: AbortSignal) {
		statsLoading = true;
		statsError = false;
		try {
			const queries: Promise<CrashSummary>[] = [
				getCrashSummary({ since: range.since, until: range.until }, signal),
				getCrashSummary({ since: prevRange.since, until: prevRange.until }, signal)
			];
			if (yearAgoRange) {
				queries.push(
					getCrashSummary({ since: yearAgoRange.since, until: yearAgoRange.until }, signal)
				);
			}
			if (twoYearsAgoRange) {
				queries.push(
					getCrashSummary({ since: twoYearsAgoRange.since, until: twoYearsAgoRange.until }, signal)
				);
			}
			const results = await Promise.all(queries);
			if (signal.aborted) return;
			summary = results[0];
			prevSummary = results[1];
			yearAgoSummary = results[2] ?? null;
			twoYearsAgoSummary = results[yearAgoRange ? 3 : 2] ?? null;
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') return;
			statsError = true;
		} finally {
			if (!signal.aborted) statsLoading = false;
		}
	}

	async function fetchCrashes(signal: AbortSignal) {
		crashesLoading = true;
		crashesError = false;
		try {
			const result = await getCrashesBrief(
				{
					since: range.since,
					until: range.until
				},
				signal
			);
			if (signal.aborted) return;
			allCrashes = result.crashes;
			visibleCrashes = result.crashes;
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') return;
			allCrashes = [];
			visibleCrashes = [];
			crashesError = true;
		} finally {
			if (!signal.aborted) crashesLoading = false;
		}
	}

	async function fetchChart(signal: AbortSignal) {
		chartLoading = true;
		try {
			if (month != null) {
				const now = new Date();
				const firstDay = new Date(year, month - 1, 1);
				const daysBack = Math.ceil((now.getTime() - firstDay.getTime()) / 86400000) + 5;
				const data = await getDateCount('day', Math.max(daysBack, 35), signal);
				if (signal.aborted) return;
				const prefix = `${year}-${zeroPad(month)}-`;
				chartBars = Object.entries(data)
					.filter(([p]) => p.startsWith(prefix))
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([p, v]) => ({
						period: p,
						label: parseInt(p.split('-')[2]).toString(),
						tooltipLabel: `${MONTH_NAMES[month - 1]} ${parseInt(p.split('-')[2])}, ${year}`,
						injuries_fatal: v.injuries_fatal ?? 0,
						injuries_incapacitating: v.injuries_incapacitating ?? 0
					}));
			} else {
				const now = new Date();
				const last = Math.max((now.getFullYear() - year) * 12 + now.getMonth() + 2, 13);
				const data = await getDateCount('month', last, signal);
				if (signal.aborted) return;
				const currentYear = now.getFullYear();
				const currentMonth = now.getMonth() + 1;
				const completedMonths = fillMissingMonthsForYear(
					year,
					Object.fromEntries(
						Object.entries(data).filter(([period]) => period.startsWith(`${year}-`))
					)
				);
				chartBars = completedMonths.map(
					({ period, month, injuries_fatal, injuries_incapacitating }) => ({
						period,
						label: MONTH_SHORT[month - 1] ?? period,
						href:
							year < currentYear || (year === currentYear && month <= currentMonth)
								? `${base}/periods/${year}/${month}`
								: undefined,
						tooltipLabel: `${MONTH_NAMES[month - 1]} ${year}`,
						injuries_fatal,
						injuries_incapacitating
					})
				);
			}
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') return;
			chartBars = [];
		} finally {
			if (!signal.aborted) chartLoading = false;
		}
	}

	function showChartLabel(bar: TrendBar): boolean {
		if (month == null) return true;
		const day = parseInt(bar.period.split('-')[2]);
		return day === 1 || day % 7 === 1;
	}

	async function loadAll(signal: AbortSignal) {
		summary = null;
		prevSummary = null;
		yearAgoSummary = null;
		twoYearsAgoSummary = null;
		chartBars = [];
		allCrashes = [];
		visibleCrashes = [];

		await Promise.all([fetchStats(signal), fetchCrashes(signal), fetchChart(signal)]);
	}

	$effect(() => {
		year;
		month;
		const controller = new AbortController();
		loadAll(controller.signal);

		return () => controller.abort();
	});
</script>

<div class="period-detail">
	<div class="top-grid">
		<div class="top-panel">
			<!-- KPI Stats -->
			{#if statsLoading}
				<div class="kpi-card">
					<div class="stats-loading">Loading stats...</div>
				</div>
			{:else if statsError}
				<!-- silently omit on error -->
			{:else if summary}
				<div class="kpi-card">
					<h3 class="kpi-heading">{range.label}</h3>

					<div class="kpi-grid">
						<div class="kpi-col">
							<div class="kpi-primary">{summary.total.toLocaleString()}</div>
							<div class="kpi-label">Serious Crashes</div>
						</div>
						<div class="kpi-col">
							<div class="kpi-primary kpi-serious">
								{summary.injuries_incapacitating.toLocaleString()}
							</div>
							<div class="kpi-label">Serious Injuries</div>
						</div>
						<div class="kpi-col">
							<div class="kpi-primary kpi-fatal">{summary.fatal_injuries.toLocaleString()}</div>
							<div class="kpi-label">People Killed</div>
						</div>
					</div>

					{#if prevSummary}
						<KpiCompareRow
							label="vs. {prevRange.label}"
							crashes={prevSummary.total}
							serious={prevSummary.injuries_incapacitating}
							fatal={prevSummary.fatal_injuries}
							crashesDelta={crashesPrevDelta}
							seriousDelta={seriousPrevDelta}
							fatalDelta={fatalPrevDelta}
						/>
					{/if}

					{#if yearAgoSummary && yearAgoRange}
						<KpiCompareRow
							label="vs. {yearAgoRange.label}"
							crashes={yearAgoSummary.total}
							serious={yearAgoSummary.injuries_incapacitating}
							fatal={yearAgoSummary.fatal_injuries}
							crashesDelta={crashesYoyDelta}
							seriousDelta={seriousYoyDelta}
							fatalDelta={fatalYoyDelta}
						/>
					{/if}

					{#if twoYearsAgoSummary && twoYearsAgoRange}
						<KpiCompareRow
							label="vs. {twoYearsAgoRange.label}"
							crashes={twoYearsAgoSummary.total}
							serious={twoYearsAgoSummary.injuries_incapacitating}
							fatal={twoYearsAgoSummary.fatal_injuries}
							crashesDelta={crashesTwoYearsDelta}
							seriousDelta={seriousTwoYearsDelta}
							fatalDelta={fatalTwoYearsDelta}
						/>
					{/if}
				</div>
			{/if}
		</div>

		<div class="top-panel">
			<TrendChart
				loading={chartLoading}
				bars={chartBars}
				title={chartTitle}
				ariaLabel={chartAriaLabel}
				emptyMessage="No trend data available"
				showBarLabel={showChartLabel}
				scrollable={false}
				chartHeight={month != null ? 96 : 80}
				labelFontSize={6}
				showLegend={false}
			/>
		</div>
	</div>

	<BriefCrashBrowser
		crashes={allCrashes}
		loading={crashesLoading}
		error={crashesError}
		emptyMessage="No serious crashes found for this period."
		showCrashOnMap={(id) => showCrashOnMap(topMapRef, id)}
		onFilteredCrashesChange={(items) => {
			visibleCrashes = items;
		}}
	>
		<div class="map-card period-map-card">
			<MapContainer bind:this={topMapRef} crashes={visibleCrashes} {defaultGeoCenter} />
		</div>
	</BriefCrashBrowser>
</div>

<style>
	.period-detail {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* ── Two-column layout ── */
	.top-grid {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	@media (min-width: 768px) {
		.top-grid {
			display: grid;
			grid-template-columns: 1fr 1fr;
			align-items: start;
		}
	}

	.top-panel {
		min-width: 0;
	}

	/* ── KPI card ── */
	.kpi-card {
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 0.75rem;
		padding: 1rem;
	}

	.stats-loading {
		font-size: 0.875rem;
		color: #9ca3af;
		padding: 0.5rem 0;
	}

	.kpi-heading {
		font-size: 0.8125rem;
		font-weight: 600;
		color: #374151;
		margin-bottom: 0.75rem;
	}

	.kpi-grid {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		text-align: center;
	}

	.kpi-col {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.kpi-primary {
		font-size: 1.75rem;
		font-weight: 700;
		line-height: 1;
		color: #111827;
	}

	.kpi-primary.kpi-fatal {
		color: #dc2626;
	}

	.kpi-primary.kpi-serious {
		color: var(--color-serious);
	}

	.kpi-label {
		font-size: 0.6875rem;
		font-weight: 500;
		color: #6b7280;
		margin-top: 0.25rem;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	/* ── Map ── */
	.map-card {
		border-radius: 0.75rem;
		overflow: hidden;
		border: 1px solid #e5e7eb;
		background: #fff;
	}

	.period-map-card :global(.map-root) {
		height: 22rem;
		margin-bottom: 0;
	}

	@media (min-width: 1024px) {
		.period-map-card {
			position: sticky;
			top: 1rem;
		}

		.period-map-card :global(.map-root) {
			height: 34rem;
		}
	}
</style>
