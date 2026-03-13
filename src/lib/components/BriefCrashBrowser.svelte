<script lang="ts">
	import { MAX_CRASH_RESULTS_PER_PAGE } from '$lib/constants';
	import type { BriefCrash } from '$lib/models/briefCrash';
	import { paginationState } from '$lib/pagination';
	import BriefCrashList from '$lib/components/BriefCrashList.svelte';
	import CrashListSkeleton from '$lib/components/CrashListSkeleton.svelte';
	import PaginationControls from '$lib/components/PaginationControls.svelte';

	let {
		crashes,
		loading = false,
		error = false,
		emptyMessage = 'No crashes found.',
		filteredEmptyMessage = 'No crashes match the current filters.',
		errorMessage = 'Failed to load crashes.',
		showCrashOnMap,
		onFilteredCrashesChange = () => {}
	} = $props<{
		crashes: BriefCrash[];
		loading?: boolean;
		error?: boolean;
		emptyMessage?: string;
		filteredEmptyMessage?: string;
		errorMessage?: string;
		showCrashOnMap: (crashId: string) => void;
		onFilteredCrashesChange?: (crashes: BriefCrash[]) => void;
	}>();

	let currentPage = $state(0);
	let fatalOnly = $state(false);
	let hitAndRunOnly = $state(false);
	let multipleCasualtiesOnly = $state(false);
	const perPage = MAX_CRASH_RESULTS_PER_PAGE;

	const filteredCrashes = $derived(
		crashes.filter(
			(crash: BriefCrash) =>
				(!fatalOnly || crash.isFatal) &&
				(!hitAndRunOnly || crash.isHitAndRun) &&
				(!multipleCasualtiesOnly || crash.hasMultipleCasualties)
		)
	);
	const totalCrashes = $derived(filteredCrashes.length);
	const pagedCrashes = $derived(
		filteredCrashes.slice(currentPage * perPage, (currentPage + 1) * perPage)
	);
	const fatalCount = $derived(crashes.filter((crash: BriefCrash) => crash.isFatal).length);
	const hitAndRunCount = $derived(crashes.filter((crash: BriefCrash) => crash.isHitAndRun).length);
	const multipleCasualtiesCount = $derived(
		crashes.filter((crash: BriefCrash) => crash.hasMultipleCasualties).length
	);
	const hasActiveFilters = $derived(fatalOnly || hitAndRunOnly || multipleCasualtiesOnly);

	const pg = paginationState(
		() => totalCrashes,
		() => currentPage,
		perPage
	);

	function goToPrev() {
		if (pg.hasPrev) {
			currentPage -= 1;
		}
	}

	function goToNext() {
		if (pg.hasNext) {
			currentPage += 1;
		}
	}

	function goToPage(page: number) {
		currentPage = page;
	}

	function resetPage() {
		currentPage = 0;
	}

	$effect(() => {
		crashes;
		currentPage = 0;
	});

	$effect(() => {
		onFilteredCrashesChange(filteredCrashes);
	});

	$effect(() => {
		if (currentPage > 0 && currentPage >= pg.totalPages) {
			currentPage = Math.max(pg.totalPages - 1, 0);
		}
	});
</script>

<div class="filter-bar">
	<label class="filter-option">
		<input type="checkbox" bind:checked={fatalOnly} onchange={resetPage} />
		<span>Fatalities ({fatalCount.toLocaleString()})</span>
	</label>
	<label class="filter-option">
		<input type="checkbox" bind:checked={hitAndRunOnly} onchange={resetPage} />
		<span>Hit-and-Run ({hitAndRunCount.toLocaleString()})</span>
	</label>
	<label class="filter-option">
		<input type="checkbox" bind:checked={multipleCasualtiesOnly} onchange={resetPage} />
		<span>Multiple Casualties ({multipleCasualtiesCount.toLocaleString()})</span>
	</label>
</div>

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

{#if error}
	<div class="empty-state">
		<p class="empty-text">{errorMessage}</p>
	</div>
{:else if loading}
	<CrashListSkeleton />
{:else if pagedCrashes.length === 0}
	<div class="empty-state">
		<p class="empty-text">
			{hasActiveFilters ? filteredEmptyMessage : emptyMessage}
		</p>
	</div>
{:else}
	<BriefCrashList {showCrashOnMap} crashes={pagedCrashes} />
{/if}

{#if pg.totalPages > 1 && !loading}
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

<style>
	.filter-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 1rem;
		align-items: center;
		padding: 0.875rem 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 0.75rem;
		background: #fff;
	}

	.filter-option {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
		cursor: pointer;
	}

	.filter-option input {
		width: 1rem;
		height: 1rem;
		accent-color: #2563eb;
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
