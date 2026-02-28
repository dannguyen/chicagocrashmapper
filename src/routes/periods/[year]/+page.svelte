<script lang="ts">
	import { base } from '$app/paths';
	import { SITE_NAME } from '$lib/constants';
	import PeriodDetail from '$lib/components/PeriodDetail.svelte';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	let currentYear = new Date().getFullYear();
	let isYtd = $derived(data.year === currentYear);
	let headline = $derived(`${data.year} Serious Crashes${isYtd ? ' YTD' : ''}`);
	let hasNext = $derived(data.year < currentYear);
</script>

<svelte:head>
	<title>{headline} — {SITE_NAME}</title>
</svelte:head>

<div class="period-header">
	<nav class="breadcrumb">
		<a href={`${base}/periods`} class="crumb-link">Crashes</a>
		<span class="crumb-sep">/</span>
		<h1 class="crumb-heading">{headline}</h1>
	</nav>
	<div class="period-nav">
		<a href={`${base}/periods/${data.year - 1}`} class="period-arrow" aria-label="Previous year">
			&larr; {data.year - 1}</a
		>
		{#if hasNext}
			<a href={`${base}/periods/${data.year + 1}`} class="period-arrow" aria-label="Next year">
				{data.year + 1} &rarr;</a
			>
		{/if}
	</div>
</div>

<PeriodDetail year={data.year} />

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
