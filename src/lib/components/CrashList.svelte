<script lang="ts">
	import { base } from '$app/paths';
	import { Crash } from '$lib/crash';
	import type { Location } from '$lib/location';
	import { fmtCause, peopleSummary } from '$lib/crashFormat';
	import { crashSeverity, severityLabel } from '$lib/severity';

	let { crashes, selectedLocation, distanceUnits, showCrashOnMap } = $props<{
		crashes: Crash[];
		selectedLocation: Location | null;
		distanceUnits: string;
		showCrashOnMap: (crashId: string) => void;
	}>();

	function shortDate(date: Date): string {
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

{#if crashes.length > 0}
	<div class="crash-list">
		{#each crashes as item}
			{@const severity = crashSeverity(item)}
			{@const people = peopleSummary(item)}
			<button type="button" class="crash-row" onclick={() => showCrashOnMap(item.crash_record_id)}>
				<span
					class="sev-dot"
					class:sev-fatal={severity === 'fatal'}
					class:sev-serious={severity === 'serious'}
					class:sev-minor={severity === 'minor'}
					class:sev-none={severity === 'none'}
					title={severityLabel(severity)}
				></span>

				<span class="row-body">
					<span class="row-main">
						<span class="crash-cause">{fmtCause(item.main_cause)}</span>
						{#if people}
							<span class="crash-people">{people}</span>
						{/if}
					</span>
					<span class="row-meta">
						<span class="crash-date">{shortDate(item.date)}</span>
						<span class="meta-sep">·</span>
						<span class="crash-time">{item.prettyTime}</span>
						{#if item.street_address.trim()}
							<span class="meta-sep">·</span>
							<span class="crash-addr">{item.street_address}</span>
						{/if}
					</span>
				</span>

				<a
					href={`${base}/crashes/${item.crash_record_id}`}
					class="detail-link"
					onclick={(e) => e.stopPropagation()}
					aria-label="View crash details">→</a
				>
			</button>
		{/each}
	</div>
{/if}

<style>
	.crash-list {
		border: 1px solid #e5e7eb;
		border-radius: 0.75rem;
		background: #fff;
		overflow: hidden;
	}

	.crash-row {
		display: flex;
		align-items: flex-start;
		gap: 0.625rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: none;
		border-bottom: 1px solid #f3f4f6;
		background: none;
		cursor: pointer;
		text-align: left;
		font: inherit;
		color: inherit;
		transition: background-color 100ms ease;
	}

	.crash-row:last-child {
		border-bottom: none;
	}

	.crash-row:hover {
		background-color: #f0f4ff;
	}

	.sev-dot {
		flex-shrink: 0;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #d1d5db;
		margin-top: 0.3rem;
	}

	.sev-fatal {
		background: #dc2626;
	}

	.sev-serious {
		background: #6d28d9;
	}

	.sev-minor {
		background: #6d28d9;
	}

	.sev-none {
		background: #6d28d9;
	}

	.row-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.row-main {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.25rem 0.5rem;
	}

	.crash-cause {
		font-size: 0.8125rem;
		font-weight: 600;
		color: #111827;
	}

	.crash-people {
		font-size: 0.75rem;
		color: #374151;
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

	.detail-link {
		flex-shrink: 0;
		color: #2563eb;
		text-decoration: none;
		font-weight: 600;
		font-size: 0.875rem;
		padding: 0.25rem;
		align-self: center;
	}

	.detail-link:hover {
		text-decoration: underline;
	}
</style>
