<script lang="ts">
	let {
		variant = 'bar',
		rangeStart = 0,
		rangeEnd = 0,
		totalItems = 0,
		itemLabel = 'crashes',
		currentPage,
		totalPages,
		hasPrev,
		hasNext,
		pageNumbers,
		onPrev,
		onNext,
		onPage
	} = $props<{
		variant?: 'bar' | 'footer';
		rangeStart?: number;
		rangeEnd?: number;
		totalItems?: number;
		itemLabel?: string;
		currentPage: number;
		totalPages: number;
		hasPrev: boolean;
		hasNext: boolean;
		pageNumbers: Array<number | null>;
		onPrev: () => void;
		onNext: () => void;
		onPage: (page: number) => void;
	}>();
</script>

{#if variant === 'bar'}
	<div class="pagination-bar">
		<span class="pagination-text">
			Showing {rangeStart}–{rangeEnd} of {totalItems}
			{itemLabel}
		</span>
		{#if totalPages > 1}
			<div class="pager-controls">
				<button class="pager-button pager-nav" disabled={!hasPrev} onclick={onPrev}>Prev</button>
				{#each pageNumbers as pg}
					{#if pg === null}
						<span class="pager-ellipsis">…</span>
					{:else}
						<button
							class="pager-button pager-page"
							class:active-page={pg === currentPage}
							class:inactive-page={pg !== currentPage}
							onclick={() => onPage(pg)}
						>
							{pg + 1}
						</button>
					{/if}
				{/each}
				<button class="pager-button pager-nav" disabled={!hasNext} onclick={onNext}>Next</button>
			</div>
		{/if}
	</div>
{:else if totalPages > 1}
	<div class="pager-footer">
		<button class="pager-button pager-nav" disabled={!hasPrev} onclick={onPrev}>Prev</button>
		{#each pageNumbers as pg}
			{#if pg === null}
				<span class="pager-ellipsis">…</span>
			{:else}
				<button
					class="pager-button pager-page"
					class:active-page={pg === currentPage}
					class:inactive-page={pg !== currentPage}
					onclick={() => onPage(pg)}
				>
					{pg + 1}
				</button>
			{/if}
		{/each}
		<button class="pager-button pager-nav" disabled={!hasNext} onclick={onNext}>Next</button>
	</div>
{/if}

<style>
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

	.pager-controls,
	.pager-footer {
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
		border-color: #1d4ed8;
		background: #1d4ed8;
		color: #fff;
	}

	.inactive-page:hover {
		border-color: #93c5fd;
		background: #eff6ff;
		color: #1d4ed8;
	}

	.pager-footer {
		justify-content: center;
		padding-top: 0.5rem;
	}
</style>
