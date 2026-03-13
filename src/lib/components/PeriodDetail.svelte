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

	// ── Data state ───────────────────────────────────────────────────────────────

	let summary: CrashSummary | null = $state(null);
	let prevSummary: CrashSummary | null = $state(null);
	let yearAgoSummary: CrashSummary | null = $state(null);

	let chartBars: TrendBar[] = $state([]);

	let allCrashes: BriefCrash[] = $state([]);
	let visibleCrashes: BriefCrash[] = $state([]);

	let statsLoading = $state(true);
	let chartLoading = $state(true);
	let crashesLoading = $state(true);
	let statsError = $state(false);
	let crashesError = $state(false);

	let topMapRef: MapContainer | undefined = $state(undefined);
	let loadRequestId = 0;

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
	const chartTitle = $derived(`${month != null ? 'Daily' : 'Monthly'} Crashes — ${range.label}`);
	const chartAriaLabel = $derived(
		`${month != null ? 'Daily' : 'Monthly'} crash trend for ${range.label}`
	);

	// ── Fetch functions ──────────────────────────────────────────────────────────

	async function fetchStats(requestId: number) {
		statsLoading = true;
		statsError = false;
		try {
			const queries: Promise<CrashSummary>[] = [
				getCrashSummary({ since: range.since, until: range.until }),
				getCrashSummary({ since: prevRange.since, until: prevRange.until })
			];
			if (yearAgoRange) {
				queries.push(getCrashSummary({ since: yearAgoRange.since, until: yearAgoRange.until }));
			}
			const results = await Promise.all(queries);
			if (requestId !== loadRequestId) return;
			summary = results[0];
			prevSummary = results[1];
			yearAgoSummary = results[2] ?? null;
		} catch {
			if (requestId !== loadRequestId) return;
			statsError = true;
		} finally {
			if (requestId !== loadRequestId) return;
			statsLoading = false;
		}
	}

	async function fetchCrashes(requestId: number) {
		crashesLoading = true;
		crashesError = false;
		try {
			const result = await getCrashesBrief({
				since: range.since,
				until: range.until
			});
			if (requestId !== loadRequestId) return;
			allCrashes = result.crashes;
			visibleCrashes = result.crashes;
		} catch {
			if (requestId !== loadRequestId) return;
			allCrashes = [];
			visibleCrashes = [];
			crashesError = true;
		} finally {
			if (requestId !== loadRequestId) return;
			crashesLoading = false;
		}
	}

	async function fetchChart(requestId: number) {
		chartLoading = true;
		try {
			if (month != null) {
				const now = new Date();
				const firstDay = new Date(year, month - 1, 1);
				const daysBack = Math.ceil((now.getTime() - firstDay.getTime()) / 86400000) + 5;
				const data = await getDateCount('day', Math.max(daysBack, 35));
				if (requestId !== loadRequestId) return;
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
				const data = await getDateCount('month', last);
				if (requestId !== loadRequestId) return;
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
		} catch {
			if (requestId !== loadRequestId) return;
			chartBars = [];
		} finally {
			if (requestId !== loadRequestId) return;
			chartLoading = false;
		}
	}

	function showChartLabel(bar: TrendBar): boolean {
		if (month == null) return true;
		const day = parseInt(bar.period.split('-')[2]);
		return day === 1 || day % 7 === 1;
	}

	async function loadAll(requestId: number) {
		summary = null;
		prevSummary = null;
		yearAgoSummary = null;
		chartBars = [];
		allCrashes = [];
		visibleCrashes = [];

		await Promise.all([fetchStats(requestId), fetchCrashes(requestId), fetchChart(requestId)]);
	}

	$effect(() => {
		year;
		month;
		const requestId = ++loadRequestId;
		loadAll(requestId);

		return () => {
			if (requestId === loadRequestId) {
				loadRequestId++;
			}
		};
	});
</script>

<div class="period-detail">
	<div class="top-grid">
		<div class="stats-col">
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
				</div>
			{/if}

			<TrendChart
				loading={chartLoading}
				bars={chartBars}
				title={chartTitle}
				ariaLabel={chartAriaLabel}
				emptyMessage="No trend data available"
				showBarLabel={showChartLabel}
				scrollable={false}
				labelFontSize={6}
				showLegend={false}
			/>
		</div>

		<div class="map-col">
			<div class="map-card top-map-card">
				<MapContainer bind:this={topMapRef} crashes={visibleCrashes} {defaultGeoCenter} />
			</div>
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
	/>
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

	.stats-col {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.map-col {
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
		color: #f59e0b;
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

	.top-map-card :global(.map-root) {
		height: 20rem;
		margin-bottom: 0;
	}

	@media (min-width: 768px) {
		.top-map-card :global(.map-root) {
			height: 28rem;
		}
	}
</style>
