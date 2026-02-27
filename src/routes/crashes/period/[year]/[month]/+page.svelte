<script lang="ts">
	import { base } from '$app/paths';
	import { SITE_NAME } from '$lib/constants';
	import PeriodDetail from '$lib/components/PeriodDetail.svelte';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	const MONTH_NAMES = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	];

	const MONTH_SHORT = [
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

	const monthName = $derived(MONTH_NAMES[data.month - 1]);

	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth() + 1;

	const prev = $derived(
		data.month === 1
			? { year: data.year - 1, month: 12 }
			: { year: data.year, month: data.month - 1 }
	);
	const next = $derived(
		data.month === 12
			? { year: data.year + 1, month: 1 }
			: { year: data.year, month: data.month + 1 }
	);

	const hasNext = $derived(
		next.year < currentYear || (next.year === currentYear && next.month <= currentMonth)
	);

	function monthUrl(y: number, m: number): string {
		return `${base}/crashes/period/${y}/${m}`;
	}

	const prevLabel = $derived(`${MONTH_SHORT[prev.month - 1]} ${prev.year}`);
	const nextLabel = $derived(`${MONTH_SHORT[next.month - 1]} ${next.year}`);
</script>

<svelte:head>
	<title>{monthName} {data.year} Serious Crashes — {SITE_NAME}</title>
</svelte:head>

<div class="period-header">
	<nav class="breadcrumb">
		<a href={`${base}/crashes`} class="crumb-link">Crashes</a>
		<span class="crumb-sep">/</span>
		<a href={`${base}/crashes/period/${data.year}`} class="crumb-link">{data.year}</a>
		<span class="crumb-sep">/</span>
		<h1 class="crumb-heading">{monthName} Serious Crashes</h1>
	</nav>
	<div class="period-nav">
		<a href={monthUrl(prev.year, prev.month)} class="period-arrow" aria-label="Previous month"
			>&larr; {prevLabel}</a
		>
		{#if hasNext}
			<a href={monthUrl(next.year, next.month)} class="period-arrow" aria-label="Next month"
				>{nextLabel} &rarr;</a
			>
		{/if}
	</div>
</div>

<PeriodDetail year={data.year} month={data.month} />

<style>
	.period-header {
		margin-bottom: 1.5rem;
	}

	.breadcrumb {
		display: flex;
		align-items: baseline;
		font-size: 0.875rem;
		color: #6b7280;
		white-space: nowrap;
	}

	.crumb-link {
		color: #2563eb;
		text-decoration: none;
	}

	.crumb-link:hover {
		color: #1d4ed8;
		text-decoration: underline;
	}

	.crumb-sep {
		margin: 0 0.25rem;
		color: #9ca3af;
	}

	.crumb-heading {
		font-size: 1.125rem;
		font-weight: 700;
		color: #111827;
		display: inline;
	}

	.period-nav {
		display: flex;
		justify-content: space-between;
		margin-top: 0.375rem;
	}

	.period-arrow {
		font-size: 0.8125rem;
		font-weight: 500;
		color: #2563eb;
		text-decoration: none;
		white-space: nowrap;
	}

	.period-arrow:hover {
		color: #1d4ed8;
		text-decoration: underline;
	}
</style>
