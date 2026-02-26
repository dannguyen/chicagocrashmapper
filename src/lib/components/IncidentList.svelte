<script lang="ts">
	import { Incident } from '$lib/incident';
	import type { Location } from '$lib/location';
	import { prettifyInteger } from '$lib/transformHelpers';
	import { fmtCause, peopleSummary, contextInfo } from '$lib/incidentFormat';
	import {
		incidentSeverity,
		severityBorderClass,
		severityPinClass,
		severityLabel,
		severityLabelClass
	} from '$lib/severity';

	let { incidents, selectedLocation, distanceUnits, showIncidentOnMap } = $props<{
		incidents: Incident[];
		selectedLocation: Location | null;
		distanceUnits: string;
		showIncidentOnMap: (index: number) => void;
	}>();
</script>

{#if incidents.length > 0}
	<section class="incident-list-grid">
		{#each incidents as item, index}
			{@const severity = incidentSeverity(item)}
			{@const people = peopleSummary(item)}
			{@const context = contextInfo(item)}
			<div class="incident-card {severityBorderClass(severity)}">
				<a href="/incidents/{item.crash_record_id}" class="incident-link">
					<!-- Top row: pin + severity label + distance + date -->
					<div class="incident-row">
						<button
							type="button"
							class="incident-pin {severityPinClass(severity)}"
							onclick={(e) => {
								e.stopPropagation();
								showIncidentOnMap(index);
							}}
							aria-label="Show incident {index + 1} on map"
						>
							{index + 1}
						</button>

						{#if severity !== 'none'}
							<span class="incident-severity {severityLabelClass(severity)}">
								{severityLabel(severity).toUpperCase()}
							</span>
							<span class="incident-divider" aria-hidden="true">·</span>
						{/if}

						{#if selectedLocation?.isPoint && item.distance != null}
							<span class="incident-distance">
								{prettifyInteger(item.distance)}
								{distanceUnits} away
							</span>
							<span class="incident-divider" aria-hidden="true">·</span>
						{/if}

						<span class="incident-date">{item.prettyDate}</span>
					</div>

					<!-- Street address -->
					{#if item.street_address.trim()}
						<p class="incident-street">{item.street_address}</p>
					{/if}

					<!-- Cause -->
					<p class="incident-cause">
						{fmtCause(item.main_cause)}
					</p>

					<!-- People involved -->
					{#if people}
						<p class="incident-people">{people}</p>
					{/if}

					<!-- Context: weather / trafficway -->
					{#if context}
						<p class="incident-secondary">{context}</p>
					{/if}
				</a>
			</div>
		{/each}
	</section>
{/if}

<style>
	.incident-list-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.5rem;
	}

	.incident-card {
		position: relative;
		border-radius: 0.75rem;
		border: 1px solid #e5e7eb;
		background: #fff;
		cursor: pointer;
		border-left-width: 4px;
		transition: box-shadow 150ms ease;
	}

	.incident-card:hover {
		box-shadow: 0 4px 8px -2px rgb(15 23 42 / 0.1);
	}

	.incident-link {
		display: block;
		padding: 0.75rem;
		text-decoration: none;
		color: inherit;
	}

	.incident-link:hover {
		text-decoration: none;
	}

	.incident-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.375rem;
	}

	.incident-pin {
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 9999px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 700;
		color: #fff;
		flex-shrink: 0;
	}

	.incident-severity {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.08em;
	}

	.incident-divider {
		color: #d1d5db;
		font-size: 0.75rem;
	}

	.incident-distance {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.incident-date {
		margin-left: auto;
		font-size: 0.75rem;
		color: #9ca3af;
		flex-shrink: 0;
	}

	.incident-street {
		font-size: 0.6875rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #9ca3af;
		margin-bottom: 0.125rem;
	}

	.incident-cause {
		font-size: 0.875rem;
		font-weight: 600;
		color: #111827;
		line-height: 1.375;
		margin-bottom: 0.25rem;
	}

	.incident-people {
		font-size: 0.75rem;
		color: #374151;
		margin-bottom: 0.125rem;
	}

	.incident-secondary {
		font-size: 0.75rem;
		color: #9ca3af;
	}
</style>
