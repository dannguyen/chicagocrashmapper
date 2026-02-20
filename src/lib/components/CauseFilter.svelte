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
	<div class="mb-3">
		<span class="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Filter by cause</span>
		<div class="flex flex-wrap gap-2">
			<!-- "All" chip -->
			<button
				class="text-sm px-3 py-1 rounded-full border transition-colors cursor-pointer {activeCause === null
					? 'bg-blue-700 text-white border-blue-700'
					: 'border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-700 bg-white'}"
				onclick={() => onSelectCause(null)}
			>
				All ({incidents.length})
			</button>

			{#each causeCounts as [cause, count]}
				<button
					class="text-sm px-3 py-1 rounded-full border transition-colors cursor-pointer {activeCause === cause
						? 'bg-blue-700 text-white border-blue-700'
						: 'border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-700 bg-white'}"
					onclick={() => onSelectCause(activeCause === cause ? null : cause)}
				>
					{fmt(cause)} ({count})
				</button>
			{/each}

			<!-- Clear button (only shown when a cause is active) -->
			{#if activeCause !== null}
				<button
					class="text-sm px-3 py-1 rounded-full border border-transparent text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
					onclick={() => onSelectCause(null)}
					aria-label="Clear cause filter"
				>
					&times; Clear
				</button>
			{/if}
		</div>
	</div>
{/if}
