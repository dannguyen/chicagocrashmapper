<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { SITE_TITLE, MAX_CRASH_RESULTS_PER_PAGE } from '$lib/constants';
	import { getCrashesList } from '$lib/api/client';
	import { Crash, parseCrashes } from '$lib/models/crash';
	import type { Person } from '$lib/models/person';
	import PaginationControls from '$lib/components/PaginationControls.svelte';
	import {
		fatalityPeople,
		fatalityRoleLabel,
		fmtCause,
		type FatalityPersonType
	} from '$lib/models/crashFormat';
	import { crashSeverity, severityLabel } from '$lib/severity';

	interface FatalCrashItem {
		crash: Crash;
		killedPeople: Person[];
	}

	let crashes: Crash[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let page = $state(0);
	let totalCrashes = $state(0);
	const perPage = MAX_CRASH_RESULTS_PER_PAGE;

	let typeFilter: FatalityPersonType = $state('all');

	let filteredItems = $derived.by<FatalCrashItem[]>(() =>
		crashes
			.map((crash) => ({
				crash,
				killedPeople: fatalityPeople(crash, typeFilter)
			}))
			.filter((item) => item.killedPeople.length > 0)
	);

	let typeCounts = $derived.by(() => ({
		all: crashes.length,
		pedestrian: crashes.filter((crash) => fatalityPeople(crash, 'pedestrian').length > 0).length,
		cyclist: crashes.filter((crash) => fatalityPeople(crash, 'cyclist').length > 0).length,
		driver: crashes.filter((crash) => fatalityPeople(crash, 'driver').length > 0).length,
		passenger: crashes.filter((crash) => fatalityPeople(crash, 'passenger').length > 0).length
	}));

	function shortDate(date: Date): string {
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	async function loadPage(nextPage: number, scroll = false) {
		loading = true;
		error = null;
		try {
			const result = await getCrashesList({
				perPage,
				page: nextPage,
				sort: 'desc',
				fatalOnly: true
			});
			totalCrashes = result.total;
			crashes = parseCrashes(result.crashes);
			page = nextPage;
			if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
		} catch {
			error = 'Failed to load fatal crash data.';
			crashes = [];
		} finally {
			loading = false;
		}
	}

	const totalPages = $derived(Math.ceil(totalCrashes / perPage));
	const hasNext = $derived(page + 1 < totalPages);
	const hasPrev = $derived(page > 0);
	const showingFrom = $derived(totalCrashes === 0 ? 0 : page * perPage + 1);
	const showingTo = $derived(Math.min((page + 1) * perPage, totalCrashes));
	const pageNumbers = $derived<(number | null)[]>(
		totalPages <= 6
			? Array.from({ length: totalPages }, (_, i) => i)
			: [0, 1, 2, null, totalPages - 3, totalPages - 2, totalPages - 1]
	);

	function goToPrev() {
		if (hasPrev) {
			loadPage(page - 1, true);
		}
	}

	function goToNext() {
		if (hasNext) {
			loadPage(page + 1, true);
		}
	}

	function goToPage(nextPage: number) {
		loadPage(nextPage, true);
	}

	onMount(() => loadPage(0));
</script>

<svelte:head>
	<title>Fatalities — {SITE_TITLE}</title>
</svelte:head>

<div class="page-header">
	<h1 class="page-title">Fatalities</h1>
	<p class="page-subtitle">
		Fatal crashes in Chicago, most recent first{#if !loading && totalCrashes > 0}
			· {totalCrashes.toLocaleString()} fatal crashes
		{/if}
	</p>
</div>

{#if loading}
	<div class="card">
		{#each Array(8) as _}
			<div class="skeleton-row">
				<div class="skeleton-line skeleton-wide"></div>
				<div class="skeleton-line skeleton-medium"></div>
				<div class="skeleton-line skeleton-narrow"></div>
			</div>
		{/each}
	</div>
{:else if error}
	<div class="error-card">
		<p class="error-text">{error}</p>
	</div>
{:else}
	<div class="filter-bar">
		{#each [['all', 'All'], ['pedestrian', 'Pedestrians'], ['cyclist', 'Cyclists'], ['driver', 'Drivers'], ['passenger', 'Passengers']] as [value, label]}
			<button
				class="filter-pill"
				class:filter-active={typeFilter === value}
				onclick={() => (typeFilter = value as FatalityPersonType)}
			>
				{label}
				<span class="pill-count">{typeCounts[value as FatalityPersonType]}</span>
			</button>
		{/each}
	</div>

	{#if totalCrashes > 0}
		<PaginationControls
			rangeStart={showingFrom}
			rangeEnd={showingTo}
			totalItems={totalCrashes}
			itemLabel="fatal crashes"
			currentPage={page}
			{totalPages}
			{hasPrev}
			{hasNext}
			{pageNumbers}
			onPrev={goToPrev}
			onNext={goToNext}
			onPage={goToPage}
		/>
	{/if}

	{#if filteredItems.length === 0}
		<p class="empty-text">No fatal crashes match this filter.</p>
	{:else}
		<div class="crash-list">
			{#each filteredItems as item}
				{@const severity = crashSeverity(item.crash)}
				<div class="crash-row">
					<a href="{base}/crashes/{item.crash.crash_record_id}" class="crash-link">
						<span
							class="sev-dot"
							class:sev-fatal={severity === 'fatal'}
							class:sev-serious={severity === 'serious'}
							class:sev-minor={severity === 'minor'}
							class:sev-none={severity === 'none'}
							title={severityLabel(severity)}
						></span>

						<span class="row-body">
							<span class="row-main">
								<span class="crash-cause">{fmtCause(item.crash.main_cause)}</span>
								<span class="crash-people"
									>{item.crash.injuries_fatal}
									{item.crash.injuries_fatal === 1 ? 'person killed' : 'people killed'}</span
								>
							</span>

							{#if item.killedPeople.length === 1}
								<span class="fatality-line">
									<span class="role-badge role-{item.killedPeople[0].person_type.toLowerCase()}"
										>{fatalityRoleLabel(item.killedPeople[0])}</span
									>
									<span class="person-desc">{item.killedPeople[0].description}</span>
								</span>
							{:else}
								<ul class="fatality-subitems">
									{#each item.killedPeople as person (person.person_id)}
										<li class="fatality-subitem">
											<span class="role-badge role-{person.person_type.toLowerCase()}"
												>{fatalityRoleLabel(person)}</span
											>
											<span class="person-desc">{person.description}</span>
										</li>
									{/each}
								</ul>
							{/if}

							<span class="row-meta">
								<span class="crash-date">{shortDate(item.crash.date)}</span>
								<span class="meta-sep">·</span>
								<span class="crash-time">{item.crash.prettyTime}</span>
								{#if item.crash.address.trim()}
									<span class="meta-sep">·</span>
									<span class="crash-addr">{item.crash.address}</span>
								{/if}
							</span>
						</span>

						<span class="detail-link" aria-hidden="true">→</span>
					</a>
				</div>
			{/each}
		</div>
	{/if}

	{#if totalPages > 1}
		<PaginationControls
			variant="footer"
			currentPage={page}
			{totalPages}
			{hasPrev}
			{hasNext}
			{pageNumbers}
			onPrev={goToPrev}
			onNext={goToNext}
			onPage={goToPage}
		/>
	{/if}
{/if}

<style>
	.page-header {
		margin-bottom: 1.5rem;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: #111827;
	}

	.page-subtitle {
		margin-top: 0.25rem;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.filter-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.filter-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: #4b5563;
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 9999px;
		cursor: pointer;
		transition:
			color 120ms ease,
			border-color 120ms ease,
			background-color 120ms ease;
	}

	.filter-pill:hover {
		border-color: #9ca3af;
	}

	.filter-active {
		color: #fff;
		background: #1d4ed8;
		border-color: #1d4ed8;
	}

	.pill-count {
		font-size: 0.6875rem;
		font-weight: 600;
		opacity: 0.7;
	}

	.card,
	.crash-list {
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 0.75rem;
		overflow: hidden;
	}

	.skeleton-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #f3f4f6;
	}

	.skeleton-line {
		height: 1rem;
		border-radius: 0.375rem;
		background: #e5e7eb;
		animation: pulse 1.2s ease-in-out infinite;
	}

	.skeleton-wide {
		width: 10rem;
	}

	.skeleton-medium {
		width: 6rem;
	}

	.skeleton-narrow {
		width: 4rem;
		margin-left: auto;
	}

	.crash-row {
		display: flex;
		align-items: stretch;
		border-bottom: 1px solid #f3f4f6;
	}

	.crash-row:last-child {
		border-bottom: none;
	}

	.crash-link {
		display: flex;
		align-items: flex-start;
		gap: 0.625rem;
		flex: 1;
		padding: 0.625rem 0.75rem;
		text-decoration: none;
		color: inherit;
		transition: background-color 100ms ease;
	}

	.crash-link:hover,
	.crash-link:focus-visible {
		background-color: #fef2f2;
		outline: none;
	}

	.sev-dot {
		flex-shrink: 0;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #d1d5db;
		margin-top: 0.3rem;
	}

	.sev-fatal {
		background: var(--color-fatal);
	}

	.sev-serious {
		background: var(--color-serious);
	}

	.sev-minor {
		background: var(--color-minor);
	}

	.sev-none {
		background: var(--color-none);
	}

	.row-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.row-main {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.25rem 0.5rem;
	}

	.crash-cause {
		font-size: 0.8125rem;
		font-weight: 600;
		color: #111827;
	}

	.crash-people {
		font-size: 0.75rem;
		color: #991b1b;
		font-weight: 600;
	}

	.fatality-line,
	.fatality-subitem {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.fatality-subitems {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.role-badge {
		flex-shrink: 0;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 0.2rem 0.5rem;
		border-radius: 0.25rem;
		margin-top: 0.1rem;
		white-space: nowrap;
	}

	.role-pedestrian {
		background: #fef3c7;
		color: #92400e;
	}

	.role-bicycle {
		background: #d1fae5;
		color: #065f46;
	}

	.role-driver {
		background: #dbeafe;
		color: #1e40af;
	}

	.role-passenger {
		background: #e0e7ff;
		color: #3730a3;
	}

	.person-desc {
		font-size: 0.875rem;
		font-weight: 600;
		color: #111827;
	}

	.row-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.125rem 0.375rem;
		font-size: 0.6875rem;
		color: #9ca3af;
	}

	.crash-date {
		color: #6b7280;
	}

	.crash-addr {
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.meta-sep {
		color: #d1d5db;
	}

	.detail-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: #dc2626;
		font-weight: 600;
		font-size: 0.875rem;
		padding-top: 0.125rem;
	}

	.error-card {
		border-radius: 0.75rem;
		border: 1px solid #fecaca;
		background: #fef2f2;
		padding: 0.75rem 1rem;
	}

	.error-text,
	.empty-text {
		font-size: 0.875rem;
		color: #6b7280;
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
