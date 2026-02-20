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
	<div class="cause-filter">
		<span class="cause-label">Filter by cause</span>
		<div class="cause-chips">
			<!-- "All" chip -->
			<button
				class="chip"
				class:chip-active={activeCause === null}
				class:chip-inactive={activeCause !== null}
				onclick={() => onSelectCause(null)}
			>
				All ({incidents.length})
			</button>

			{#each causeCounts as [cause, count]}
				<button
					class="chip"
					class:chip-active={activeCause === cause}
					class:chip-inactive={activeCause !== cause}
					onclick={() => onSelectCause(activeCause === cause ? null : cause)}
				>
					{fmt(cause)} ({count})
				</button>
			{/each}

			<!-- Clear button (only shown when a cause is active) -->
			{#if activeCause !== null}
				<button
					class="chip chip-clear"
					onclick={() => onSelectCause(null)}
					aria-label="Clear cause filter"
				>
					&times; Clear
				</button>
			{/if}
		</div>
	</div>
{/if}

<style>
	.cause-filter {
		margin-bottom: 0.75rem;
	}

	.cause-label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #6b7280;
	}

	.cause-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.chip {
		font-size: 0.875rem;
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		border: 1px solid #d1d5db;
		background: #fff;
		color: #4b5563;
		cursor: pointer;
		transition: border-color 120ms ease, color 120ms ease, background-color 120ms ease;
	}

	.chip-inactive:hover {
		border-color: #3b82f6;
		color: #1d4ed8;
	}

	.chip-active {
		background: #1d4ed8;
		color: #fff;
		border-color: #1d4ed8;
	}

	.chip-clear {
		border-color: transparent;
		color: #9ca3af;
	}

	.chip-clear:hover {
		color: #dc2626;
	}
</style>
