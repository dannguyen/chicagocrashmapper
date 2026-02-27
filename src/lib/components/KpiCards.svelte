<script lang="ts">
	import { onMount } from 'svelte';
	import { getDateCount } from '$lib/api/client';
	import type { DateCountPeriod } from '$lib/db/types';
	import { toDateStr, addDays, pctChange, formatPct } from '$lib/transformHelpers';

	interface WindowTotals {
		crashes: number;
		fatal: number;
		incap: number;
	}

	let loading = $state(true);
	let error = $state(false);

	let cur = $state<WindowTotals>({ crashes: 0, fatal: 0, incap: 0 });
	let prev = $state<WindowTotals>({ crashes: 0, fatal: 0, incap: 0 });
	let yoy = $state<WindowTotals>({ crashes: 0, fatal: 0, incap: 0 });
	let curStart = $state(new Date());
	let curEnd = $state(new Date());

	function sumWindow(
		periods: Record<string, DateCountPeriod>,
		start: Date,
		end: Date
	): WindowTotals {
		let crashes = 0;
		let fatal = 0;
		let incap = 0;
		const d = new Date(start);
		while (d <= end) {
			const p = periods[toDateStr(d)];
			if (p) {
				crashes += p.crash_count ?? 0;
				fatal += p.injuries_fatal ?? 0;
				incap += p.injuries_incapacitating ?? 0;
			}
			d.setDate(d.getDate() + 1);
		}
		return { crashes, fatal, incap };
	}

	function formatShortDate(d: Date): string {
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	onMount(async () => {
		try {
			const periods = await getDateCount('day', 395);

			const today = new Date();
			today.setHours(0, 0, 0, 0);

			curStart = addDays(today, -29);
			curEnd = today;
			cur = sumWindow(periods, curStart, curEnd);

			const prevStart = addDays(today, -59);
			const prevEnd = addDays(today, -30);
			prev = sumWindow(periods, prevStart, prevEnd);

			const yoyStart = addDays(today, -394);
			const yoyEnd = addDays(today, -365);
			yoy = sumWindow(periods, yoyStart, yoyEnd);
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
			Last 30 days <span class="kpi-date-range"
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
				<div class="kpi-primary kpi-fatal">{cur.fatal.toLocaleString()}</div>
				<div class="kpi-label">People Killed</div>
			</div>
			<div class="kpi-col">
				<div class="kpi-primary kpi-serious">{cur.incap.toLocaleString()}</div>
				<div class="kpi-label">Serious Injuries</div>
			</div>
		</div>

		<!-- Row 2: previous 30d -->
		<div class="kpi-compare">
			<div class="kpi-compare-label">Previous 30-day period</div>
			<div class="kpi-grid">
				<div class="kpi-col">
					<span class="kpi-abs">{prev.crashes.toLocaleString()}</span>
					<span
						class="kpi-delta"
						class:up={crashesPop !== null && crashesPop > 0}
						class:down={crashesPop !== null && crashesPop < 0}
						class:flat={crashesPop === null || crashesPop === 0}>{formatPct(crashesPop)}</span
					>
				</div>
				<div class="kpi-col">
					<span class="kpi-abs kpi-abs-fatal">{prev.fatal.toLocaleString()}</span>
					<span
						class="kpi-delta"
						class:up={killedPop !== null && killedPop > 0}
						class:down={killedPop !== null && killedPop < 0}
						class:flat={killedPop === null || killedPop === 0}>{formatPct(killedPop)}</span
					>
				</div>
				<div class="kpi-col">
					<span class="kpi-abs kpi-abs-serious">{prev.incap.toLocaleString()}</span>
					<span
						class="kpi-delta"
						class:up={injuredPop !== null && injuredPop > 0}
						class:down={injuredPop !== null && injuredPop < 0}
						class:flat={injuredPop === null || injuredPop === 0}>{formatPct(injuredPop)}</span
					>
				</div>
			</div>
		</div>

		<!-- Row 3: last year -->
		<div class="kpi-compare">
			<div class="kpi-compare-label">Same period last year</div>
			<div class="kpi-grid">
				<div class="kpi-col">
					<span class="kpi-abs">{yoy.crashes.toLocaleString()}</span>
					<span
						class="kpi-delta"
						class:up={crashesYoy !== null && crashesYoy > 0}
						class:down={crashesYoy !== null && crashesYoy < 0}
						class:flat={crashesYoy === null || crashesYoy === 0}>{formatPct(crashesYoy)}</span
					>
				</div>
				<div class="kpi-col">
					<span class="kpi-abs kpi-abs-fatal">{yoy.fatal.toLocaleString()}</span>
					<span
						class="kpi-delta"
						class:up={killedYoy !== null && killedYoy > 0}
						class:down={killedYoy !== null && killedYoy < 0}
						class:flat={killedYoy === null || killedYoy === 0}>{formatPct(killedYoy)}</span
					>
				</div>
				<div class="kpi-col">
					<span class="kpi-abs kpi-abs-serious">{yoy.incap.toLocaleString()}</span>
					<span
						class="kpi-delta"
						class:up={injuredYoy !== null && injuredYoy > 0}
						class:down={injuredYoy !== null && injuredYoy < 0}
						class:flat={injuredYoy === null || injuredYoy === 0}>{formatPct(injuredYoy)}</span
					>
				</div>
			</div>
		</div>
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
		font-weight: 400;
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
</style>
