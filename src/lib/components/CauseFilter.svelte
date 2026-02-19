<script lang="ts">
	import type { Incident } from '$lib/incident';

	let { incidents, activeCause, onSelectCause } = $props<{
		incidents: Incident[];
		activeCause: string | null;
		onSelectCause: (cause: string | null) => void;
	}>();

	let causeCounts = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const inc of incidents) {
			const cause = inc.primary_cause || 'UNKNOWN';
			counts.set(cause, (counts.get(cause) ?? 0) + 1);
		}
		return [...counts.entries()].sort((a, b) => b[1] - a[1]);
	});

	function fmt(cause: string): string {
		return cause
			.toLowerCase()
			.replace(/\b\w/g, (c) => c.toUpperCase())
			.replace(/Unable To Determine/i, 'Unknown')
			.replace(/Not Applicable/i, 'N/A');
	}
</script>

{#if causeCounts.length > 1}
	<div class="cause-filters">
		<span class="filter-label">Filter by cause:</span>
		<div class="chips">
			<button class="chip" class:active={activeCause === null} onclick={() => onSelectCause(null)}>
				All ({incidents.length})
			</button>
			{#each causeCounts as [cause, count]}
				<button
					class="chip"
					class:active={activeCause === cause}
					onclick={() => onSelectCause(activeCause === cause ? null : cause)}
				>
					{fmt(cause)} ({count})
				</button>
			{/each}
		</div>
	</div>
{/if}

<style lang="postcss">
	@reference "$lib/styles/app.css";

	.cause-filters {
		@apply mb-4;
	}

	.filter-label {
		@apply text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2;
	}

	.chips {
		@apply flex flex-wrap gap-2;
	}

	.chip {
		@apply px-3 py-1 text-xs rounded-full border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 transition-colors cursor-pointer;
	}

	.chip.active {
		@apply bg-blue-600 text-white border-blue-600;
	}
</style>
