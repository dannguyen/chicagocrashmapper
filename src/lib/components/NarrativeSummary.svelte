<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';

	import { getDateCount } from '$lib/api/client';
	import type { DateCountPeriod } from '$lib/db/types';
	import { toDateStr, addDays, pctChange, formatPct } from '$lib/transformHelpers';

	interface WindowSums {
		days: number;
		crashes: number;
		fatal: number;
		incap: number;
	}

	interface WindowTotals extends WindowSums {
		ytd: boolean;
		year: number;
	}

	let loading = $state(true);
	let error = $state(false);

	let cur = $state<WindowTotals>({ days: 0, ytd: false, year: 0, crashes: 0, fatal: 0, incap: 0 });

	function sumWindow(periods: Record<string, DateCountPeriod>, start: Date, end: Date): WindowSums {
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
		const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
		return { days, crashes, fatal, incap };
	}

	interface InjuryPart {
		count: number;
		verb: string;
		cls: string;
	}

	let injuryParts = $derived.by(() => {
		const parts: InjuryPart[] = [];
		if (cur.fatal > 0) parts.push({ count: cur.fatal, verb: 'killed', cls: 'kpi-fatal' });
		if (cur.incap > 0) parts.push({ count: cur.incap, verb: 'incapacitated', cls: 'kpi-incap' });
		return parts;
	});

	onMount(async () => {
		try {
			const periods = await getDateCount('day', 395);

			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const jan1 = new Date(today.getFullYear(), 0, 1);
			const daysYtd = Math.round((today.getTime() - jan1.getTime()) / (1000 * 60 * 60 * 24)) + 1;

			const useYtd = daysYtd >= 31;
			const curStart = useYtd ? jan1 : addDays(today, -29);
			const totals = sumWindow(periods, curStart, today);
			cur = { ...totals, ytd: useYtd, year: today.getFullYear() };
		} catch {
			error = true;
		} finally {
			loading = false;
		}
	});
</script>

{#if loading}
	<div class="loading">Loading...</div>
{:else if error}
	<div class="error">
		Oops error {error}
	</div>
{:else}
	<p>
		{#if cur.ytd}So far in <a class="link" href="{base}/periods/{cur.year}">{cur.year}</a>
		{:else}In the past {cur.days} days
		{/if}, there have been <span class="kpi">{cur.crashes}</span> serious
		{#if cur.fatal < 1 && cur.incap < 1}
			crashes
		{:else}
			crashes, which have
			{#if cur.fatal > 0 && cur.incap > 0}
				killed <span class="kpi kpi-fatal">{cur.fatal}</span> people and incapacitated
				<span class="kpi kpi-incap">{cur.incap}</span>
			{:else if cur.fatal > 0}
				killed <span class="kpi kpi-fatal">{cur.fatal}</span> people
			{:else if cur.incap > 0}
				incapacitated <span class="kpi kpi-incap">{cur.incap}</span> people
			{/if}
		{/if}
	</p>
{/if}

<style>
	.link {
		color: blue;
		font-weight: 800;
	}
	.kpi {
		font-weight: 800;
	}

	.kpi-fatal {
		color: #dc2626;
	}

	.kpi-incap {
		color: #d97706;
	}
</style>
