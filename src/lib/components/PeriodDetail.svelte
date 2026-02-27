<script lang="ts">
	import { Crash, parseCrashes } from '$lib/crash';
	import { getCrashSummary, getCrashesList, getDateCount } from '$lib/api/client';
	import type { CrashListResult } from '$lib/api/client';
	import type { CrashSummary } from '$lib/db/types';
	import { CHICAGO_CENTER, MONTH_NAMES, MONTH_SHORT } from '$lib/constants';
	import { pctChange, formatPct } from '$lib/transformHelpers';
	import MapContainer from '$lib/components/MapContainer.svelte';
	import CrashList from '$lib/components/CrashList.svelte';

	let { year, month = null } = $props<{ year: number; month?: number | null }>();

	const defaultGeoCenter = CHICAGO_CENTER;

	// ── Pure helpers ────────────────────────────────────────────────────────────

	function pad(n: number): string {
		return String(n).padStart(2, '0');
	}

	function lastDayOfMonth(y: number, m: number): string {
		const d = new Date(y, m, 0); // day 0 of month m+1
		return `${y}-${pad(m)}-${pad(d.getDate())}`;
	}

	function summaryDelta(
		cur: CrashSummary | null,
		prev: CrashSummary | null,
		getter: (s: CrashSummary) => number
	): number | null {
		if (!cur || !prev) return null;
		return pctChange(getter(cur), getter(prev));
	}

	interface DateRange {
		since: string;
		until: string;
		label: string;
	}

	function todayStr(): string {
		const d = new Date();
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
	}

	function isCurrentYear(y: number): boolean {
		return y === new Date().getFullYear();
	}

	function computeRange(y: number, m: number | null): DateRange {
		if (m != null) {
			return {
				since: `${y}-${pad(m)}-01`,
				until: lastDayOfMonth(y, m),
				label: `${MONTH_NAMES[m - 1]} ${y}`
			};
		}
		if (isCurrentYear(y)) {
			return { since: `${y}-01-01`, until: todayStr(), label: `${y} YTD` };
		}
		return { since: `${y}-01-01`, until: `${y}-12-31`, label: String(y) };
	}

	function computePrevRange(y: number, m: number | null): DateRange {
		if (m != null) {
			const prevM = m === 1 ? 12 : m - 1;
			const prevY = m === 1 ? y - 1 : y;
			return {
				since: `${prevY}-${pad(prevM)}-01`,
				until: lastDayOfMonth(prevY, prevM),
				label: `${MONTH_NAMES[prevM - 1]} ${prevY}`
			};
		}
		if (isCurrentYear(y)) {
			// Compare YTD to the same date window last year
			const today = new Date();
			const prevUntil = `${y - 1}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
			return { since: `${y - 1}-01-01`, until: prevUntil, label: `${y - 1} YTD` };
		}
		return { since: `${y - 1}-01-01`, until: `${y - 1}-12-31`, label: String(y - 1) };
	}

	function computeYearAgoRange(y: number, m: number | null): DateRange | null {
		if (m == null) return null;
		return {
			since: `${y - 1}-${pad(m)}-01`,
			until: lastDayOfMonth(y - 1, m),
			label: `${MONTH_NAMES[m - 1]} ${y - 1}`
		};
	}

	// ── Reactive date windows ────────────────────────────────────────────────────

	const range = $derived(computeRange(year, month));
	const prevRange = $derived(computePrevRange(year, month));
	const yearAgoRange = $derived(computeYearAgoRange(year, month));

	// ── Data state ───────────────────────────────────────────────────────────────

	let summary: CrashSummary | null = $state(null);
	let prevSummary: CrashSummary | null = $state(null);
	let yearAgoSummary: CrashSummary | null = $state(null);

	interface BarData {
		period: string;
		label: string;
		injuries_fatal: number;
		injuries_incapacitating: number;
	}
	let chartBars: BarData[] = $state([]);

	let crashes: Crash[] = $state([]);
	let totalCrashes = $state(0);
	let currentPage = $state(0);
	let perPage = $state(25);

	let statsLoading = $state(true);
	let chartLoading = $state(true);
	let crashesLoading = $state(true);
	let statsError = $state(false);
	let crashesError = $state(false);

	let mapRef: MapContainer | undefined = $state(undefined);

	// ── Pagination ───────────────────────────────────────────────────────────────

	const totalPages = $derived(Math.ceil(totalCrashes / perPage));
	const rangeStart = $derived(totalCrashes === 0 ? 0 : currentPage * perPage + 1);
	const rangeEnd = $derived(Math.min((currentPage + 1) * perPage, totalCrashes));
	const hasPrev = $derived(currentPage > 0);
	const hasNext = $derived(currentPage < totalPages - 1);
	const pageNumbers = $derived<(number | null)[]>(
		totalPages <= 6
			? Array.from({ length: totalPages }, (_, i) => i)
			: [0, 1, 2, null, totalPages - 3, totalPages - 2, totalPages - 1]
	);

	// ── KPI deltas ───────────────────────────────────────────────────────────────

	const crashesPrevDelta = $derived(summaryDelta(summary, prevSummary, (s) => s.total));
	const fatalPrevDelta = $derived(summaryDelta(summary, prevSummary, (s) => s.fatal_injuries));
	const seriousPrevDelta = $derived(
		summaryDelta(summary, prevSummary, (s) => s.incapacitating_injuries)
	);
	const crashesYoyDelta = $derived(summaryDelta(summary, yearAgoSummary, (s) => s.total));
	const fatalYoyDelta = $derived(summaryDelta(summary, yearAgoSummary, (s) => s.fatal_injuries));
	const seriousYoyDelta = $derived(
		summaryDelta(summary, yearAgoSummary, (s) => s.incapacitating_injuries)
	);

	// ── Chart ────────────────────────────────────────────────────────────────────

	const chartHeight = 80;
	const barWidth = $derived(month != null ? 14 : 24);
	const barGap = $derived(month != null ? 3 : 4);
	const chartMaxVal = $derived(
		chartBars.length > 0
			? Math.max(...chartBars.map((b) => b.injuries_fatal + b.injuries_incapacitating), 1)
			: 1
	);

	function barH(val: number): number {
		return Math.max(2, (val / chartMaxVal) * chartHeight);
	}

	function showBarLabel(bar: BarData): boolean {
		if (month != null) {
			const day = parseInt(bar.period.split('-')[2]);
			return day === 1 || day % 7 === 1;
		}
		return true; // all 12 months
	}

	function formatTooltip(bar: BarData): string {
		return `${bar.period}: ${bar.injuries_fatal} killed, ${bar.injuries_incapacitating} seriously injured`;
	}

	// ── Fetch functions ──────────────────────────────────────────────────────────

	async function fetchStats() {
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
			summary = results[0];
			prevSummary = results[1];
			yearAgoSummary = results[2] ?? null;
		} catch {
			statsError = true;
		} finally {
			statsLoading = false;
		}
	}

	async function fetchPage(page: number) {
		crashesLoading = true;
		crashesError = false;
		try {
			const result: CrashListResult = await getCrashesList({
				since: range.since,
				until: range.until,
				page,
				sort: 'desc'
			});
			crashes = parseCrashes(result.crashes);
			totalCrashes = result.total;
			perPage = result.per_page;
			currentPage = result.page;
		} catch {
			crashesError = true;
		} finally {
			crashesLoading = false;
		}
	}

	async function fetchChart() {
		chartLoading = true;
		try {
			if (month != null) {
				// Daily bars: fetch enough days back to cover the target month
				const now = new Date();
				const firstDay = new Date(year, month - 1, 1);
				const daysBack = Math.ceil((now.getTime() - firstDay.getTime()) / 86400000) + 5;
				const data = await getDateCount('day', Math.max(daysBack, 35));
				const prefix = `${year}-${pad(month)}-`;
				chartBars = Object.entries(data)
					.filter(([p]) => p.startsWith(prefix))
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([p, v]) => ({
						period: p,
						label: parseInt(p.split('-')[2]).toString(),
						injuries_fatal: v.injuries_fatal ?? 0,
						injuries_incapacitating: v.injuries_incapacitating ?? 0
					}));
			} else {
				// Monthly bars: fetch enough months back to cover the target year
				const now = new Date();
				const last = Math.max((now.getFullYear() - year) * 12 + now.getMonth() + 2, 13);
				const data = await getDateCount('month', last);
				chartBars = Object.entries(data)
					.filter(([p]) => p.startsWith(`${year}-`))
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([p, v]) => ({
						period: p,
						label: MONTH_SHORT[parseInt(p.split('-')[1]) - 1] ?? p,
						injuries_fatal: v.injuries_fatal ?? 0,
						injuries_incapacitating: v.injuries_incapacitating ?? 0
					}));
			}
		} finally {
			chartLoading = false;
		}
	}

	function goToPrev() {
		if (hasPrev) fetchPage(currentPage - 1);
	}

	function goToNext() {
		if (hasNext) fetchPage(currentPage + 1);
	}

	function showCrashOnMap(index: number) {
		const item = crashes[index];
		if (item && mapRef) mapRef.fitToCrashes([item]);
	}

	async function loadAll() {
		// Reset state for fresh load
		summary = null;
		prevSummary = null;
		yearAgoSummary = null;
		chartBars = [];
		crashes = [];
		totalCrashes = 0;
		currentPage = 0;

		await Promise.all([fetchStats(), fetchPage(0), fetchChart()]);
		requestAnimationFrame(() => {
			if (mapRef) {
				mapRef.updateNearbyMarkers(crashes);
				if (crashes.length > 0) mapRef.fitToCrashes(crashes);
			}
		});
	}

	$effect(() => {
		// Track year and month so this re-runs on navigation
		year;
		month;
		loadAll();
	});
</script>

<div class="period-detail">
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

			<!-- Primary values -->
			<div class="kpi-grid">
				<div class="kpi-col">
					<div class="kpi-primary">{summary.total.toLocaleString()}</div>
					<div class="kpi-label">Serious Crashes</div>
				</div>
				<div class="kpi-col">
					<div class="kpi-primary kpi-fatal">{summary.fatal_injuries.toLocaleString()}</div>
					<div class="kpi-label">People Killed</div>
				</div>
				<div class="kpi-col">
					<div class="kpi-primary kpi-serious">
						{summary.incapacitating_injuries.toLocaleString()}
					</div>
					<div class="kpi-label">Serious Injuries</div>
				</div>
			</div>

			<!-- vs. previous period -->
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
						<div class="kpi-col">
							<span class="kpi-abs kpi-abs-serious"
								>{prevSummary.incapacitating_injuries.toLocaleString()}</span
							>
							<span
								class="kpi-delta"
								class:up={seriousPrevDelta !== null && seriousPrevDelta > 0}
								class:down={seriousPrevDelta !== null && seriousPrevDelta < 0}
								class:flat={seriousPrevDelta === null || seriousPrevDelta === 0}
								>{formatPct(seriousPrevDelta)}</span
							>
						</div>
					</div>
				</div>
			{/if}

			<!-- vs. year-ago month (month view only) -->
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
						<div class="kpi-col">
							<span class="kpi-abs kpi-abs-serious"
								>{yearAgoSummary.incapacitating_injuries.toLocaleString()}</span
							>
							<span
								class="kpi-delta"
								class:up={seriousYoyDelta !== null && seriousYoyDelta > 0}
								class:down={seriousYoyDelta !== null && seriousYoyDelta < 0}
								class:flat={seriousYoyDelta === null || seriousYoyDelta === 0}
								>{formatPct(seriousYoyDelta)}</span
							>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Bar chart -->
	{#if chartLoading}
		<div class="chart-card chart-loading-card">
			<div class="chart-loading-text">Loading chart...</div>
		</div>
	{:else if chartBars.length > 0}
		<div class="chart-card">
			<div class="chart-header">
				<h3 class="chart-title">
					{month != null ? 'Daily' : 'Monthly'} Crashes — {range.label}
				</h3>
				<div class="chart-legend">
					<span class="legend-item"><span class="legend-swatch legend-fatal"></span>Fatal</span>
					<span class="legend-item"
						><span class="legend-swatch legend-serious"></span>Serious injury</span
					>
				</div>
			</div>
			<div class="chart-scroll">
				<svg
					width={chartBars.length * (barWidth + barGap)}
					height={chartHeight + 22}
					role="img"
					aria-label="{month != null ? 'Daily' : 'Monthly'} crash trend for {range.label}"
				>
					{#each chartBars as bar, i}
						{@const incapH = barH(bar.injuries_incapacitating)}
						{@const fatalH = barH(bar.injuries_fatal)}
						{@const x = i * (barWidth + barGap)}
						<rect {x} y={chartHeight - incapH} width={barWidth} height={incapH} fill="#9333ea">
							<title>{formatTooltip(bar)}</title>
						</rect>
						<rect
							{x}
							y={chartHeight - incapH - fatalH}
							width={barWidth}
							height={fatalH}
							fill="#dc2626"
						>
							<title>{formatTooltip(bar)}</title>
						</rect>
						{#if showBarLabel(bar)}
							<text
								x={x + barWidth / 2}
								y={chartHeight + 14}
								text-anchor="middle"
								font-size="9"
								fill="#9ca3af">{bar.label}</text
							>
						{/if}
					{/each}
				</svg>
			</div>
		</div>
	{/if}

	<!-- Map -->
	<div class="map-card">
		<MapContainer bind:this={mapRef} {crashes} {defaultGeoCenter} />
	</div>

	<!-- Top pagination -->
	{#if totalCrashes > 0}
		<div class="pagination-bar">
			<span class="pagination-text">
				Showing {rangeStart}–{rangeEnd} of {totalCrashes} crashes
			</span>
			<div class="pager-controls">
				<button
					class="pager-button pager-nav"
					disabled={!hasPrev || crashesLoading}
					onclick={goToPrev}>Prev</button
				>
				{#each pageNumbers as pg}
					{#if pg === null}
						<span class="pager-ellipsis">…</span>
					{:else}
						<button
							class="pager-button pager-page"
							class:active-page={pg === currentPage}
							class:inactive-page={pg !== currentPage}
							disabled={crashesLoading}
							onclick={() => fetchPage(pg)}>{pg + 1}</button
						>
					{/if}
				{/each}
				<button
					class="pager-button pager-nav"
					disabled={!hasNext || crashesLoading}
					onclick={goToNext}>Next</button
				>
			</div>
		</div>
	{/if}

	<!-- Crash list -->
	{#if crashesError}
		<div class="empty-state">
			<p class="empty-text">Failed to load crashes.</p>
		</div>
	{:else if crashesLoading}
		<div class="loading-stack">
			{#each Array(5) as _}
				<div class="loading-card">
					<div class="loading-line loading-line-wide"></div>
					<div class="loading-line loading-line-narrow"></div>
				</div>
			{/each}
		</div>
	{:else}
		<p class="crash-heading">
			{#if totalPages > 1}
				Crashes — Page {currentPage + 1} of {totalPages}
			{:else}
				Crashes
			{/if}
		</p>
		{#if crashes.length === 0}
			<div class="empty-state">
				<p class="empty-text">No serious crashes found for this period.</p>
			</div>
		{:else}
			<CrashList {crashes} selectedLocation={null} distanceUnits="feet" {showCrashOnMap} />
		{/if}
	{/if}

	<!-- Bottom pagination -->
	{#if totalPages > 1 && !crashesLoading}
		<div class="pager-footer">
			<button
				class="pager-button pager-nav"
				disabled={!hasPrev || crashesLoading}
				onclick={goToPrev}>Prev</button
			>
			{#each pageNumbers as pg}
				{#if pg === null}
					<span class="pager-ellipsis">…</span>
				{:else}
					<button
						class="pager-button pager-page"
						class:active-page={pg === currentPage}
						class:inactive-page={pg !== currentPage}
						disabled={crashesLoading}
						onclick={() => fetchPage(pg)}>{pg + 1}</button
					>
				{/if}
			{/each}
			<button
				class="pager-button pager-nav"
				disabled={!hasNext || crashesLoading}
				onclick={goToNext}>Next</button
			>
		</div>
	{/if}
</div>

<style>
	.period-detail {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
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
		color: #7c3aed;
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
		color: #7c3aed;
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

	/* ── Bar chart ── */
	.chart-card {
		background: #fff;
		border-radius: 0.75rem;
		border: 1px solid #e5e7eb;
		padding: 1rem;
	}

	.chart-loading-card {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 6rem;
	}

	.chart-loading-text {
		font-size: 0.875rem;
		color: #9ca3af;
	}

	.chart-header {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.chart-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
	}

	.chart-legend {
		display: flex;
		gap: 1rem;
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
		background: #9333ea;
	}

	.chart-scroll {
		overflow-x: auto;
	}

	/* ── Map ── */
	.map-card {
		border-radius: 0.75rem;
		overflow: hidden;
		border: 1px solid #e5e7eb;
		background: #fff;
	}

	/* ── Pagination (shared pattern with LocationDetail) ── */
	.pagination-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 0.75rem;
		background: #fff;
	}

	.pagination-text {
		font-size: 0.875rem;
		color: #4b5563;
	}

	.pager-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.pager-button {
		padding: 0.375rem 0.75rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		border: 1px solid #d1d5db;
		background: #fff;
		transition:
			border-color 120ms ease,
			color 120ms ease,
			background-color 120ms ease;
	}

	.pager-button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.pager-nav:hover:not(:disabled) {
		border-color: #3b82f6;
		color: #1d4ed8;
	}

	.pager-page {
		min-width: 2.25rem;
	}

	.pager-ellipsis {
		padding: 0 0.25rem;
		font-size: 0.875rem;
		color: #9ca3af;
		align-self: center;
	}

	.active-page {
		background-color: #1d4ed8;
		color: white;
		border-color: #1d4ed8;
	}

	.inactive-page {
		border-color: rgb(209 213 219);
	}

	.inactive-page:hover {
		border-color: rgb(59 130 246);
		color: #1d4ed8;
	}

	/* ── Loading skeleton ── */
	.loading-stack {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.loading-card {
		border-radius: 0.75rem;
		border: 1px solid #e5e7eb;
		background: #fff;
		padding: 1rem;
	}

	.loading-line {
		background: #e5e7eb;
		border-radius: 0.375rem;
		animation: pulse 1.2s ease-in-out infinite;
	}

	.loading-line-wide {
		height: 1rem;
		width: 75%;
		margin-bottom: 0.5rem;
	}

	.loading-line-narrow {
		height: 0.75rem;
		width: 50%;
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

	.pager-footer {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin-top: 1.5rem;
	}

	@keyframes pulse {
		0% {
			opacity: 0.8;
		}
		50% {
			opacity: 0.4;
		}
		100% {
			opacity: 0.8;
		}
	}
</style>
