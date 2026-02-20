<script lang="ts">
	import { Incident } from '$lib/incident';
	import IncidentDetail from '$lib/components/IncidentDetail.svelte';
	import type { Location } from '$lib/location';

	let { incidents, selectedLocation, distanceUnits, showIncidentOnMap } = $props<{
		incidents: Incident[];
		selectedLocation: Location | null;
		distanceUnits: string;
		showIncidentOnMap: (index: number) => void;
	}>();
</script>

{#if incidents.length > 0}
	<section class="incidents-list">
		{#each incidents as item, index}
			<div class="incident-record">
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="marker-icon" onclick={() => showIncidentOnMap(index)}>{index + 1}</div>
				<a href="/incidents/{item.crash_record_id}" class="incident-link">
					<IncidentDetail incident={item} {selectedLocation} {distanceUnits} />
					<span class="view-details">View details →</span>
				</a>
			</div>
		{/each}
	</section>
{/if}

<style lang="postcss">
	@reference "$lib/styles/app.css";

	.incidents-list {
		@apply grid grid-cols-1 gap-2 sm:grid-cols-2;
	}

	.incident-record {
		@apply relative border border-gray-200 rounded-lg p-3 transition-colors flex gap-2 items-start;
	}

	.marker-icon {
		@apply flex-shrink-0 flex items-center justify-center w-5 h-5 bg-purple-700 text-white text-xs font-bold rounded-full mt-0.5 cursor-pointer hover:bg-purple-900 transition-colors;
	}

	.incident-link {
		@apply flex-1 min-w-0 no-underline text-inherit hover:no-underline;
	}

	.view-details {
		@apply text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block;
	}

	.incident-record:hover {
		@apply bg-gray-50 border-gray-300;
	}
</style>
