<script lang="ts">
	import { onMount } from 'svelte';
	import { getDateCount, getYearToDateComparison } from '$lib/api/client';
	import type { DateCountPeriod } from '$lib/models/types';
	import { addDays, pctChange, sumWindow } from '$lib/transformHelpers';
	import KpiCompareRow from '$lib/components/KpiCompareRow.svelte';

	interface WindowTotals {
		crashes: number;
		fatal: number;
		incap: number;
	}

	let loading = $state(true);
	let error = $state(false);

	let useYtd = $state(false);
	let cur = $state<WindowTotals>({ crashes: 0, fatal: 0, incap: 0 });
	let prev = $state<WindowTotals>({ crashes: 0, fatal: 0, incap: 0 });
	let yoy = $state<WindowTotals>({ crashes: 0, fatal: 0, incap: 0 });
	let curStart = $state(new Date());
	let curEnd = $state(new Date());
	let lastYear = $state(0);

	function formatShortDate(d: Date): string {
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function periodToTotals(p: DateCountPeriod | undefined): WindowTotals {
		if (!p) return { crashes: 0, fatal: 0, incap: 0 };
		return {
			crashes: p.crash_count ?? 0,
			fatal: p.injuries_fatal ?? 0,
			incap: p.injuries_incapacitating ?? 0
		};
	}

	onMount(async () => {
		try {
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const jan1 = new Date(today.getFullYear(), 0, 1);
			const daysYtd = Math.round((today.getTime() - jan1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
			useYtd = daysYtd >= 31;

			if (useYtd) {
				// YTD mode: server computes year-to-date totals for this year and last year
				const ytdPeriods = await getYearToDateComparison(today);
				const yearStr = String(today.getFullYear());
				const prevYearStr = String(today.getFullYear() - 1);

				curStart = jan1;
				curEnd = today;
				cur = periodToTotals(ytdPeriods[yearStr]);
				yoy = periodToTotals(ytdPeriods[prevYearStr]);
				lastYear = today.getFullYear() - 1;
			} else {
				// 30-day mode: previous 30d + same period last year
				const periods = await getDateCount('day', 395);

				curStart = addDays(today, -29);
				curEnd = today;
				cur = sumWindow(periods, curStart, curEnd);

				const prevStart = addDays(today, -59);
				const prevEnd = addDays(today, -30);
				prev = sumWindow(periods, prevStart, prevEnd);

				const yoyStart = addDays(today, -394);
				const yoyEnd = addDays(today, -365);
				yoy = sumWindow(periods, yoyStart, yoyEnd);
			}
		} catch {
			error = true;
		} finally {
			loading = false;
		}
	});

	let crashesPop = $derived(pctChange(cur.crashes, prev.crashes));
	let killedPop = $derived(pctChange(cur.fatal, prev.fatal));
	let injuredPop = $derived(pctChange(cur.incap, prev.incap));

	let crashesYoy = $derived(pctChange(cur.crashes, yoy.crashes));
	let killedYoy = $derived(pctChange(cur.fatal, yoy.fatal));
	let injuredYoy = $derived(pctChange(cur.incap, yoy.incap));
</script>

{#if loading}
	<div class="kpi-loading">Loading stats...</div>
{:else if error}
	<!-- silently omit on error -->
{:else}
	<div class="kpi-card">
		<h3 class="kpi-heading">
			{#if useYtd}{curEnd.getFullYear()} Year to Date{:else}Last 30 days{/if}
			<span class="kpi-date-range"
				>({formatShortDate(curStart)} &ndash; {formatShortDate(curEnd)})</span
			>
		</h3>

		<!-- Row 1: primary values -->
		<div class="kpi-grid">
			<div class="kpi-col">
				<div class="kpi-primary">{cur.crashes.toLocaleString()}</div>
				<div class="kpi-label">Serious Crashes</div>
			</div>
			<div class="kpi-col">
				<div class="kpi-primary kpi-serious">{cur.incap.toLocaleString()}</div>
				<div class="kpi-label">Serious Injuries</div>
			</div>
			<div class="kpi-col">
				<div class="kpi-primary kpi-fatal">{cur.fatal.toLocaleString()}</div>
				<div class="kpi-label">People Killed</div>
			</div>
		</div>

		<!-- Row 2: previous 30d (only in 30-day mode) -->
		{#if !useYtd}
			<KpiCompareRow
				label="Previous 30-day period"
				crashes={prev.crashes}
				serious={prev.incap}
				fatal={prev.fatal}
				crashesDelta={crashesPop}
				seriousDelta={injuredPop}
				fatalDelta={killedPop}
			/>
		{/if}

		<!-- Row 3: last year -->
		<KpiCompareRow
			label={useYtd ? `Same period in ${lastYear}` : 'Same period last year'}
			crashes={yoy.crashes}
			serious={yoy.incap}
			fatal={yoy.fatal}
			crashesDelta={crashesYoy}
			seriousDelta={injuredYoy}
			fatalDelta={killedYoy}
		/>
	</div>
{/if}

<style>
	.kpi-loading {
		font-size: 0.875rem;
		color: #9ca3af;
		padding: 0.5rem 0;
	}

	.kpi-card {
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 0.75rem;
		padding: 1rem;
	}

	.kpi-heading {
		font-size: 0.8125rem;
		font-weight: 600;
		color: #374151;
		margin-bottom: 0.75rem;
	}

	.kpi-date-range {
		font-weight: 400;
		color: #9ca3af;
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
</style>
