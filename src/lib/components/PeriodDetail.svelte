<script lang="ts">
	import { base } from '$app/paths';
	import { Crash, parseCrashes } from '$lib/models/crash';
	import { getCrashSummary, getCrashesList, getCrashesDense, getDateCount } from '$lib/api/client';
	import type { CrashListResult } from '$lib/api/client';
	import type { CrashSummary, DenseCrash } from '$lib/models/types';
	import { CHICAGO_CENTER, MONTH_NAMES, MONTH_SHORT } from '$lib/constants';
	import { formatPct } from '$lib/transformHelpers';
	import {
		computePrevRange,
		computeRange,
		computeYearAgoRange,
		summaryDelta,
		zeroPad
	} from '$lib/periodRange';
	import MapContainer from '$lib/components/MapContainer.svelte';
	import CrashList from '$lib/components/CrashList.svelte';
	import CrashListSkeleton from '$lib/components/CrashListSkeleton.svelte';
	import PaginationControls from '$lib/components/PaginationControls.svelte';
	import TrendChart, { type TrendBar } from '$lib/components/TrendChart.svelte';
	import { paginationState, showCrashOnMap } from '$lib/pagination';

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

	let mapCrashes: DenseCrash[] = $state([]);
	let pagedCrashes: Crash[] = $state([]);
	let totalCrashes = $state(0);
	let currentPage = $state(0);
	const perPage = 25;

	let statsLoading = $state(true);
	let chartLoading = $state(true);
	let crashesLoading = $state(true);
	let statsError = $state(false);
	let crashesError = $state(false);

	let mapRef: MapContainer | undefined = $state(undefined);
	let loadRequestId = 0;

	// ── Server-side pagination ──────────────────────────────────────────────────

	const pg = paginationState(
		() => totalCrashes,
		() => currentPage,
		perPage
	);

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

	async function fetchPage(requestId: number, page: number = 0) {
		crashesLoading = true;
		crashesError = false;
		try {
			const result: CrashListResult = await getCrashesList({
				since: range.since,
				until: range.until,
				page,
				perPage,
				sort: 'desc'
			});
			if (requestId !== loadRequestId) return;
			pagedCrashes = parseCrashes(result.crashes);
			totalCrashes = result.total;
			currentPage = page;
		} catch {
			if (requestId !== loadRequestId) return;
			crashesError = true;
		} finally {
			if (requestId !== loadRequestId) return;
			crashesLoading = false;
		}
	}

	async function fetchMapCrashes(requestId: number) {
		try {
			const result = await getCrashesDense({
				since: range.since,
				until: range.until
			});
			if (requestId !== loadRequestId) return;
			mapCrashes = result.crashes;
		} catch {
			if (requestId !== loadRequestId) return;
			mapCrashes = [];
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
				chartBars = Object.entries(data)
					.filter(([p]) => p.startsWith(`${year}-`))
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([p, v]) => ({
						period: p,
						label: MONTH_SHORT[parseInt(p.split('-')[1]) - 1] ?? p,
						href: `${base}/periods/${year}/${parseInt(p.split('-')[1])}`,
						tooltipLabel: `${MONTH_NAMES[parseInt(p.split('-')[1]) - 1]} ${year}`,
						injuries_fatal: v.injuries_fatal ?? 0,
						injuries_incapacitating: v.injuries_incapacitating ?? 0
					}));
			}
		} catch {
			if (requestId !== loadRequestId) return;
			chartBars = [];
		} finally {
			if (requestId !== loadRequestId) return;
			chartLoading = false;
		}
	}

	function goToPrev() {
		if (pg.hasPrev) goToPage(currentPage - 1);
	}

	function goToNext() {
		if (pg.hasNext) goToPage(currentPage + 1);
	}

	function goToPage(page: number) {
		fetchPage(loadRequestId, page);
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
		mapCrashes = [];
		pagedCrashes = [];
		totalCrashes = 0;
		currentPage = 0;

		await Promise.all([
			fetchStats(requestId),
			fetchPage(requestId, 0),
			fetchMapCrashes(requestId),
			fetchChart(requestId)
		]);
		if (requestId !== loadRequestId) return;
		requestAnimationFrame(() => {
			if (requestId !== loadRequestId || !mapRef) return;
			mapRef.updateNearbyMarkers(mapCrashes);
			if (mapCrashes.length > 0) mapRef.fitToCrashes(mapCrashes);
		});
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
	<!-- Top section: KPIs + chart left, map right -->
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
						<div class="kpi-compare">
							<div class="kpi-compare-label">vs. {prevRange.label}</div>
							<div class="kpi-grid">
								<div class="kpi-col">
									<span class="kpi-abs">{prevSummary.total.toLocaleString()}</span>
									<span
										class="kpi-delta"
										class:up={crashesPrevDelta !== null && crashesPrevDelta > 0}
										class:down={crashesPrevDelta !== null && crashesPrevDelta < 0}
										class:flat={crashesPrevDelta === null || crashesPrevDelta === 0}
										>{formatPct(crashesPrevDelta)}</span
									>
								</div>
								<div class="kpi-col">
									<span class="kpi-abs kpi-abs-serious"
										>{prevSummary.injuries_incapacitating.toLocaleString()}</span
									>
									<span
										class="kpi-delta"
										class:up={seriousPrevDelta !== null && seriousPrevDelta > 0}
										class:down={seriousPrevDelta !== null && seriousPrevDelta < 0}
										class:flat={seriousPrevDelta === null || seriousPrevDelta === 0}
										>{formatPct(seriousPrevDelta)}</span
									>
								</div>
								<div class="kpi-col">
									<span class="kpi-abs kpi-abs-fatal"
										>{prevSummary.fatal_injuries.toLocaleString()}</span
									>
									<span
										class="kpi-delta"
										class:up={fatalPrevDelta !== null && fatalPrevDelta > 0}
										class:down={fatalPrevDelta !== null && fatalPrevDelta < 0}
										class:flat={fatalPrevDelta === null || fatalPrevDelta === 0}
										>{formatPct(fatalPrevDelta)}</span
									>
								</div>
							</div>
						</div>
					{/if}

					{#if yearAgoSummary && yearAgoRange}
						<div class="kpi-compare">
							<div class="kpi-compare-label">vs. {yearAgoRange.label}</div>
							<div class="kpi-grid">
								<div class="kpi-col">
									<span class="kpi-abs">{yearAgoSummary.total.toLocaleString()}</span>
									<span
										class="kpi-delta"
										class:up={crashesYoyDelta !== null && crashesYoyDelta > 0}
										class:down={crashesYoyDelta !== null && crashesYoyDelta < 0}
										class:flat={crashesYoyDelta === null || crashesYoyDelta === 0}
										>{formatPct(crashesYoyDelta)}</span
									>
								</div>
								<div class="kpi-col">
									<span class="kpi-abs kpi-abs-serious"
										>{yearAgoSummary.injuries_incapacitating.toLocaleString()}</span
									>
									<span
										class="kpi-delta"
										class:up={seriousYoyDelta !== null && seriousYoyDelta > 0}
										class:down={seriousYoyDelta !== null && seriousYoyDelta < 0}
										class:flat={seriousYoyDelta === null || seriousYoyDelta === 0}
										>{formatPct(seriousYoyDelta)}</span
									>
								</div>
								<div class="kpi-col">
									<span class="kpi-abs kpi-abs-fatal"
										>{yearAgoSummary.fatal_injuries.toLocaleString()}</span
									>
									<span
										class="kpi-delta"
										class:up={fatalYoyDelta !== null && fatalYoyDelta > 0}
										class:down={fatalYoyDelta !== null && fatalYoyDelta < 0}
										class:flat={fatalYoyDelta === null || fatalYoyDelta === 0}
										>{formatPct(fatalYoyDelta)}</span
									>
								</div>
							</div>
						</div>
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
			/>
		</div>

		<div class="map-col">
			<div class="map-card">
				<MapContainer bind:this={mapRef} crashes={mapCrashes} {defaultGeoCenter} />
			</div>
		</div>
	</div>

	<!-- Pagination + crash list -->
	{#if totalCrashes > 0}
		<PaginationControls
			rangeStart={pg.rangeStart}
			rangeEnd={pg.rangeEnd}
			totalItems={totalCrashes}
			{currentPage}
			totalPages={pg.totalPages}
			hasPrev={pg.hasPrev}
			hasNext={pg.hasNext}
			pageNumbers={pg.pageNumbers}
			onPrev={goToPrev}
			onNext={goToNext}
			onPage={goToPage}
		/>
	{/if}

	{#if crashesError}
		<div class="empty-state">
			<p class="empty-text">Failed to load crashes.</p>
		</div>
	{:else if crashesLoading}
		<CrashListSkeleton />
	{:else}
		<p class="crash-heading">
			{#if pg.totalPages > 1}
				Crashes &mdash; Page {currentPage + 1} of {pg.totalPages}
			{:else}
				Crashes
			{/if}
		</p>

		{#if pagedCrashes.length === 0}
			<div class="empty-state">
				<p class="empty-text">No serious crashes found for this period.</p>
			</div>
		{:else}
			<CrashList
				crashes={pagedCrashes}
				selectedLocation={null}
				showCrashOnMap={(id) => showCrashOnMap(mapRef, id)}
			/>
		{/if}
	{/if}

	<!-- Bottom pagination -->
	{#if pg.totalPages > 1 && !crashesLoading}
		<PaginationControls
			variant="footer"
			{currentPage}
			totalPages={pg.totalPages}
			hasPrev={pg.hasPrev}
			hasNext={pg.hasNext}
			pageNumbers={pg.pageNumbers}
			onPrev={goToPrev}
			onNext={goToNext}
			onPage={goToPage}
		/>
	{/if}
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
			gap: 1rem;
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

	.kpi-compare {
		margin-top: 0.625rem;
		padding-top: 0.5rem;
		border-top: 1px solid #f3f4f6;
	}

	.kpi-compare-label {
		font-size: 0.6875rem;
		color: #9ca3af;
		margin-bottom: 0.25rem;
	}

	.kpi-abs {
		font-size: 1.125rem;
		font-weight: 600;
		color: #111827;
		line-height: 1;
	}

	.kpi-abs-fatal {
		color: #dc2626;
	}

	.kpi-abs-serious {
		color: #f59e0b;
	}

	.kpi-delta {
		font-size: 0.8125rem;
	}

	.kpi-delta.up {
		color: #b08a8a;
	}

	.kpi-delta.down {
		color: #7a9e7a;
	}

	.kpi-delta.flat {
		color: #b0b0b0;
	}

	/* ── Map ── */
	.map-card {
		border-radius: 0.75rem;
		overflow: hidden;
		border: 1px solid #e5e7eb;
		background: #fff;
	}

	.map-card :global(#map) {
		height: 20rem;
	}

	@media (min-width: 768px) {
		.map-card :global(#map) {
			height: 28rem;
		}
	}

	/* ── Crash list header ── */
	.crash-heading {
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
		margin-bottom: 0.75rem;
	}

	.empty-state {
		text-align: center;
		padding: 3rem 0;
		color: #9ca3af;
	}

	.empty-text {
		font-size: 0.875rem;
	}
</style>
