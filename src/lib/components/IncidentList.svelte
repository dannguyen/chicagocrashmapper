<script lang="ts">
	import { Incident } from '$lib/incident';
	import type { Location } from '$lib/location';
	import { prettifyInteger } from '$lib/transformHelpers';

	let { incidents, selectedLocation, distanceUnits, showIncidentOnMap } = $props<{
		incidents: Incident[];
		selectedLocation: Location | null;
		distanceUnits: string;
		showIncidentOnMap: (index: number) => void;
	}>();

	function severityBorderColor(item: Incident): string {
		if (item.injuries_fatal > 0) return 'border-l-red-600';
		if (item.injuries_incapacitating > 0) return 'border-l-purple-600';
		if (
			(item.injuries_non_incapacitating ?? 0) > 0 ||
			(item.injuries_reported_not_evident ?? 0) > 0
		) {
			return 'border-l-amber-500';
		}
		return 'border-l-gray-300';
	}

	function severityBadgeBg(item: Incident): string {
		if (item.injuries_fatal > 0) return 'bg-red-600';
		if (item.injuries_incapacitating > 0) return 'bg-purple-600';
		if (
			(item.injuries_non_incapacitating ?? 0) > 0 ||
			(item.injuries_reported_not_evident ?? 0) > 0
		) {
			return 'bg-amber-500';
		}
		return 'bg-gray-400';
	}

	function severityLabel(item: Incident): string {
		if (item.injuries_fatal > 0) return 'FATAL';
		if (item.injuries_incapacitating > 0) return 'SERIOUS';
		if (
			(item.injuries_non_incapacitating ?? 0) > 0 ||
			(item.injuries_reported_not_evident ?? 0) > 0
		) {
			return 'MINOR';
		}
		return '';
	}

	function severityLabelColor(item: Incident): string {
		if (item.injuries_fatal > 0) return 'text-red-600';
		if (item.injuries_incapacitating > 0) return 'text-purple-600';
		if (
			(item.injuries_non_incapacitating ?? 0) > 0 ||
			(item.injuries_reported_not_evident ?? 0) > 0
		) {
			return 'text-amber-600';
		}
		return 'text-gray-400';
	}

	function fmtCause(cause: string): string {
		return cause
			.toLowerCase()
			.replace(/\b\w/g, (c) => c.toUpperCase())
			.replace(/Unable To Determine/i, 'Unknown')
			.replace(/Not Applicable/i, 'N/A');
	}

	function secondaryInfo(item: Incident, selectedLoc: Location | null, units: string): string {
		const parts: string[] = [];
		const totalInjured =
			(item.injuries_fatal ?? 0) +
			(item.injuries_incapacitating ?? 0) +
			(item.injuries_non_incapacitating ?? 0);
		if (totalInjured > 0) parts.push(`${totalInjured} injured`);
		if (item.weather_condition && item.weather_condition !== 'CLEAR') {
			parts.push(
				item.weather_condition
					.toLowerCase()
					.replace(/\b\w/g, (c) => c.toUpperCase())
			);
		}
		if (item.trafficway_type && item.trafficway_type !== 'NOT DIVIDED') {
			parts.push(
				item.trafficway_type
					.toLowerCase()
					.replace(/\b\w/g, (c) => c.toUpperCase())
			);
		}
		return parts.join(' · ');
	}

</script>

{#if incidents.length > 0}
	<section class="grid grid-cols-1 gap-2">
		{#each incidents as item, index}
			<div
				class="relative rounded-xl border border-gray-200 bg-white hover:shadow-md transition-shadow cursor-pointer border-l-4 {severityBorderColor(item)}"
			>
				<a href="/incidents/{item.crash_record_id}" class="block p-3 no-underline text-inherit hover:no-underline">
					<!-- Top row: badge + severity label + distance + date -->
					<div class="flex items-center gap-2 mb-1.5">
						<button
							type="button"
							class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 {severityBadgeBg(item)}"
							onclick={(e) => { e.stopPropagation(); showIncidentOnMap(index); }}
							aria-label="Show incident {index + 1} on map"
						>
							{index + 1}
						</button>

						{#if severityLabel(item)}
							<span class="text-xs font-bold tracking-wide {severityLabelColor(item)}">
								{severityLabel(item)}
							</span>
							<span class="text-gray-300 text-xs" aria-hidden="true">·</span>
						{/if}

						{#if selectedLocation?.isPoint && item.distance != null}
							<span class="text-xs text-gray-500">
								{prettifyInteger(item.distance)} {distanceUnits} away
							</span>
							<span class="text-gray-300 text-xs" aria-hidden="true">·</span>
						{/if}

						<span class="ml-auto text-xs text-gray-400 flex-shrink-0">{item.prettyDate}</span>
					</div>

					<!-- Cause -->
					<p class="text-sm font-semibold text-gray-900 leading-snug mb-1">
						{fmtCause(item.primary_cause)}
					</p>

					<!-- Secondary info -->
					{#if secondaryInfo(item, selectedLocation, distanceUnits)}
						<p class="text-xs text-gray-500">{secondaryInfo(item, selectedLocation, distanceUnits)}</p>
					{/if}
				</a>
			</div>
		{/each}
	</section>
{/if}
