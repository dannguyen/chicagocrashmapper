<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { SITE_NAME } from '$lib/constants';
	import { getCrashesList } from '$lib/api/client';
	import { Crash, parseCrashes } from '$lib/models/crash';
	import type { Person } from '$lib/models/person';

	interface FatalityRow {
		person: Person;
		crash: Crash;
	}

	let rows: FatalityRow[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let page = $state(0);
	let totalCrashes = $state(0);
	const perPage = 200;

	type PersonTypeFilter = 'all' | 'pedestrian' | 'cyclist' | 'driver' | 'passenger';
	let typeFilter: PersonTypeFilter = $state('all');

	let filtered = $derived(
		typeFilter === 'all'
			? rows
			: rows.filter((r) => {
					const pt = r.person.person_type.toUpperCase();
					if (typeFilter === 'pedestrian') return pt === 'PEDESTRIAN';
					if (typeFilter === 'cyclist') return pt === 'BICYCLE';
					if (typeFilter === 'driver') return pt === 'DRIVER';
					if (typeFilter === 'passenger') return pt === 'PASSENGER';
					return true;
				})
	);

	// Counts per type for the filter pills
	let typeCounts = $derived({
		all: rows.length,
		pedestrian: rows.filter((r) => r.person.person_type === 'PEDESTRIAN').length,
		cyclist: rows.filter((r) => r.person.person_type === 'BICYCLE').length,
		driver: rows.filter((r) => r.person.person_type === 'DRIVER').length,
		passenger: rows.filter((r) => r.person.person_type === 'PASSENGER').length
	});

	function roleLabel(person: Person): string {
		switch (person.person_type) {
			case 'PEDESTRIAN':
				return 'Pedestrian';
			case 'BICYCLE':
				return 'Cyclist';
			case 'DRIVER':
				return 'Driver';
			case 'PASSENGER':
				return 'Passenger';
			default:
				return person.person_type;
		}
	}

	function shortDate(date: Date): string {
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	async function loadPage(p: number, scroll = false) {
		loading = true;
		error = null;
		try {
			const result = await getCrashesList({
				perPage,
				page: p,
				sort: 'desc',
				fatalOnly: true
			});
			totalCrashes = result.total;
			const crashes = parseCrashes(result.crashes);

			const fatalities: FatalityRow[] = [];
			for (const crash of crashes) {
				for (const person of crash.people) {
					if (person.isKilled) {
						fatalities.push({ person, crash });
					}
				}
			}
			rows = fatalities;
			page = p;
			if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
		} catch {
			error = 'Failed to load fatality data.';
		} finally {
			loading = false;
		}
	}

	const totalPages = $derived(Math.ceil(totalCrashes / perPage));
	const hasNext = $derived(page + 1 < totalPages);
	const hasPrev = $derived(page > 0);
	const showingFrom = $derived(page * perPage + 1);
	const showingTo = $derived(Math.min((page + 1) * perPage, totalCrashes));

	onMount(() => loadPage(0));
</script>

<svelte:head>
	<title>Fatalities — {SITE_NAME}</title>
</svelte:head>

<div class="page-header">
	<h1 class="page-title">Fatalities</h1>
	<p class="page-subtitle">
		People killed in Chicago traffic crashes, most recent first{#if !loading && totalCrashes > 0}
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
	<!-- Filter pills -->
	<div class="filter-bar">
		{#each [['all', 'All'], ['pedestrian', 'Pedestrians'], ['cyclist', 'Cyclists'], ['driver', 'Drivers'], ['passenger', 'Passengers']] as [value, label]}
			<button
				class="filter-pill"
				class:filter-active={typeFilter === value}
				onclick={() => (typeFilter = value as PersonTypeFilter)}
			>
				{label}
				<span class="pill-count">{typeCounts[value as PersonTypeFilter]}</span>
			</button>
		{/each}
	</div>

	{#if filtered.length === 0}
		<p class="empty-text">No fatalities match this filter.</p>
	{:else}
		<div class="card fatality-list">
			{#each filtered as { person, crash }}
				<a href="{base}/crashes/{crash.crash_record_id}" class="fatality-row">
					<span class="role-badge role-{person.person_type.toLowerCase()}">{roleLabel(person)}</span
					>

					<span class="row-body">
						<span class="person-desc">{person.description}</span>
						<span class="row-meta">
							<span class="crash-date">{shortDate(crash.date)}</span>
							<span class="meta-sep">·</span>
							<span class="crash-time">{crash.prettyTime}</span>
							{#if crash.street_address.trim()}
								<span class="meta-sep">·</span>
								<span class="crash-addr">{crash.street_address}</span>
							{/if}
						</span>
						{#if crash.hasKnownCause}
							<span class="crash-cause">{crash.primary_cause}</span>
						{/if}
					</span>

					<span class="detail-arrow">→</span>
				</a>
			{/each}
		</div>
	{/if}

	<!-- Pagination -->
	{#if totalPages > 1}
		<div class="pagination">
			<button class="page-btn" disabled={!hasPrev} onclick={() => loadPage(page - 1, true)}>
				← Previous
			</button>
			<span class="page-info">
				{showingFrom}–{showingTo} of {totalCrashes.toLocaleString()} crashes
			</span>
			<button class="page-btn" disabled={!hasNext} onclick={() => loadPage(page + 1, true)}>
				Next →
			</button>
		</div>
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

	/* ── Filter pills ── */
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

	/* ── Card / List ── */
	.card {
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 0.75rem;
		overflow: hidden;
	}

	.fatality-list {
		/* inherits .card */
	}

	.fatality-row {
		display: flex;
		align-items: flex-start;
		gap: 0.625rem;
		padding: 0.625rem 0.75rem;
		border-bottom: 1px solid #f3f4f6;
		text-decoration: none;
		color: inherit;
		transition: background-color 100ms ease;
	}

	.fatality-row:last-child {
		border-bottom: none;
	}

	.fatality-row:hover {
		background-color: #fef2f2;
	}

	/* ── Role badge ── */
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

	/* ── Row body ── */
	.row-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
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

	.crash-cause {
		font-size: 0.6875rem;
		color: #9ca3af;
	}

	.detail-arrow {
		flex-shrink: 0;
		color: #dc2626;
		font-weight: 600;
		font-size: 0.875rem;
		padding: 0.25rem;
		align-self: center;
	}

	/* ── Pagination ── */
	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		margin-top: 1rem;
	}

	.page-btn {
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: #2563eb;
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		cursor: pointer;
		transition:
			background-color 120ms ease,
			border-color 120ms ease;
	}

	.page-btn:hover:not(:disabled) {
		background: #eff6ff;
		border-color: #93c5fd;
	}

	.page-btn:disabled {
		color: #d1d5db;
		cursor: default;
	}

	.page-info {
		font-size: 0.8125rem;
		color: #6b7280;
	}

	/* ── Skeleton ── */
	.skeleton-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		border-bottom: 1px solid #f3f4f6;
	}

	.skeleton-line {
		height: 1rem;
		border-radius: 0.375rem;
		background: #e5e7eb;
		animation: pulse 1.2s ease-in-out infinite;
	}

	.skeleton-wide {
		width: 5rem;
	}

	.skeleton-medium {
		width: 10rem;
	}

	.skeleton-narrow {
		width: 6rem;
	}

	/* ── Error / Empty ── */
	.error-card {
		border-radius: 0.75rem;
		border: 1px solid #fecaca;
		background: #fef2f2;
		padding: 0.75rem 1rem;
	}

	.error-text {
		font-size: 0.875rem;
		color: #b91c1c;
	}

	.empty-text {
		padding: 2rem 0;
		text-align: center;
		font-size: 0.875rem;
		color: #6b7280;
	}

	@keyframes pulse {
		0% {
			opacity: 0.85;
		}
		50% {
			opacity: 0.4;
		}
		100% {
			opacity: 0.85;
		}
	}
</style>
