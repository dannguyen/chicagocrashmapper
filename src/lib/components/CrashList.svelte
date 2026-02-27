<script lang="ts">
	import { base } from '$app/paths';
	import { Crash } from '$lib/crash';
	import type { Location } from '$lib/location';
	import { prettifyInteger } from '$lib/transformHelpers';
	import { fmtCause, peopleSummary, contextInfo } from '$lib/crashFormat';
	import {
		crashSeverity,
		severityBorderClass,
		severityPinClass,
		severityLabel,
		severityLabelClass
	} from '$lib/severity';

	let { crashes, selectedLocation, distanceUnits, showCrashOnMap } = $props<{
		crashes: Crash[];
		selectedLocation: Location | null;
		distanceUnits: string;
		showCrashOnMap: (index: number) => void;
	}>();
</script>

{#if crashes.length > 0}
	<section class="crash-list-grid">
		{#each crashes as item, index}
			{@const severity = crashSeverity(item)}
			{@const people = peopleSummary(item)}
			{@const context = contextInfo(item)}
			<div class="crash-card {severityBorderClass(severity)}">
				<a href={`${base}/crashes/${item.crash_record_id}`} class="crash-link">
					<!-- Top row: pin + severity label + distance + date -->
					<div class="crash-row">
						<button
							type="button"
							class="crash-pin {severityPinClass(severity)}"
							onclick={(e) => {
								e.stopPropagation();
								showCrashOnMap(index);
							}}
							aria-label="Show crash {index + 1} on map"
						>
							{index + 1}
						</button>

						{#if severity !== 'none'}
							<span class="crash-severity {severityLabelClass(severity)}">
								{severityLabel(severity).toUpperCase()}
							</span>
							<span class="crash-divider" aria-hidden="true">·</span>
						{/if}

						{#if selectedLocation?.isPoint && item.distance != null}
							<span class="crash-distance">
								{prettifyInteger(item.distance)}
								{distanceUnits} away
							</span>
							<span class="crash-divider" aria-hidden="true">·</span>
						{/if}

						<span class="crash-date">{item.prettyDate} · {item.prettyTime}</span>
					</div>

					<!-- Street address -->
					{#if item.street_address.trim()}
						<p class="crash-street">{item.street_address}</p>
					{/if}

					<!-- Cause -->
					<p class="crash-cause">
						{fmtCause(item.main_cause)}
					</p>

					<!-- People involved -->
					{#if people}
						<p class="crash-people">{people}</p>
					{/if}

					<!-- Context: weather / trafficway -->
					{#if context}
						<p class="crash-secondary">{context}</p>
					{/if}
				</a>
			</div>
		{/each}
	</section>
{/if}

<style>
	.crash-list-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.5rem;
	}

	.crash-card {
		position: relative;
		border-radius: 0.75rem;
		border: 1px solid #e5e7eb;
		background: #fff;
		cursor: pointer;
		border-left-width: 4px;
		transition: box-shadow 150ms ease;
	}

	.crash-card:hover {
		box-shadow: 0 4px 8px -2px rgb(15 23 42 / 0.1);
	}

	.crash-link {
		display: block;
		padding: 0.75rem;
		text-decoration: none;
		color: inherit;
	}

	.crash-link:hover {
		text-decoration: none;
	}

	.crash-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.375rem;
	}

	.crash-pin {
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

	.crash-severity {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.08em;
	}

	.crash-divider {
		color: #d1d5db;
		font-size: 0.75rem;
	}

	.crash-distance {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.crash-date {
		margin-left: auto;
		font-size: 0.75rem;
		color: #9ca3af;
		flex-shrink: 0;
	}

	.crash-street {
		font-size: 0.6875rem;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #9ca3af;
		margin-bottom: 0.125rem;
	}

	.crash-cause {
		font-size: 0.875rem;
		font-weight: 600;
		color: #111827;
		line-height: 1.375;
		margin-bottom: 0.25rem;
	}

	.crash-people {
		font-size: 0.75rem;
		color: #374151;
		margin-bottom: 0.125rem;
	}

	.crash-secondary {
		font-size: 0.75rem;
		color: #9ca3af;
	}
</style>
