<script lang="ts">
	import { base } from '$app/paths';
	import { fmtCause } from '$lib/models/crashFormat';
	import type { BriefCrash } from '$lib/models/briefCrash';
	import { severityLabel, type SeverityLevel } from '$lib/severity';
	import { SEVERITY_COLORS } from '$lib/constants';

	let { crashes, showCrashOnMap } = $props<{
		crashes: BriefCrash[];
		showCrashOnMap: (crashId: string) => void;
	}>();

	function shortDate(value: string): string {
		return new Date(value).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function shortTime(value: string): string {
		return new Date(value).toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function crashSeverity(item: BriefCrash): SeverityLevel {
		if (item.isFatal) return 'fatal';
		if (item.injuries_incapacitating > 0) return 'serious';
		if (item.injuries_total > 0) return 'minor';
		return 'none';
	}

	function injurySummary(item: BriefCrash): string {
		if (item.injuries_fatal > 0) {
			return `${item.injuries_fatal} killed`;
		}
		if (item.injuries_incapacitating > 0) {
			return `${item.injuries_incapacitating} seriously injured`;
		}
		if (item.injuries_total > 0) {
			return `${item.injuries_total} injured`;
		}
		return '';
	}
</script>

{#if crashes.length > 0}
	<div class="crash-list">
		{#each crashes as item}
			{@const severity = crashSeverity(item)}
			{@const injuryText = injurySummary(item)}
			<div class="crash-row">
				<button
					type="button"
					class="crash-map-button"
					onclick={() => showCrashOnMap(item.crash_record_id)}
					aria-label="Show crash on map"
				>
					<span
						class="sev-dot"
						style={`background:${SEVERITY_COLORS[severity]}`}
						title={severityLabel(severity)}
					></span>

					<span class="row-body">
						<span class="row-main">
							<span class="crash-cause">{fmtCause(item.cause_prim || 'UNKNOWN CAUSE')}</span>
							{#if injuryText}
								<span class="crash-people">{injuryText}</span>
							{/if}
							<span class="crash-type">{item.crash_type}</span>
							{#if item.isHitAndRun}
								<span class="hitrun-badge">Hit & Run</span>
							{/if}
						</span>
						<span class="row-meta">
							<span class="crash-date">{shortDate(item.crash_date)}</span>
							<span class="meta-sep">·</span>
							<span class="crash-time">{shortTime(item.crash_date)}</span>
							{#if item.address}
								<span class="meta-sep">·</span>
								<span class="crash-addr">{item.address}</span>
							{/if}
						</span>
					</span>
				</button>

				<a
					href={`${base}/crashes/${item.crash_record_id}`}
					class="detail-link"
					aria-label="View crash details">→</a
				>
			</div>
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
		align-items: stretch;
		gap: 0;
		border-bottom: 1px solid #f3f4f6;
	}

	.crash-row:last-child {
		border-bottom: none;
	}

	.crash-map-button {
		display: flex;
		align-items: flex-start;
		gap: 0.625rem;
		flex: 1;
		padding: 0.5rem 0.75rem;
		border: none;
		background: none;
		cursor: pointer;
		text-align: left;
		font: inherit;
		color: inherit;
		transition: background-color 100ms ease;
	}

	.crash-map-button:hover,
	.crash-map-button:focus-visible {
		background-color: #f0f4ff;
		outline: none;
	}

	.sev-dot {
		flex-shrink: 0;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		margin-top: 0.3rem;
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

	.crash-type {
		font-size: 0.6875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #6b7280;
	}

	.hitrun-badge {
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		padding: 0.125rem 0.4rem;
		border-radius: 9999px;
		background: #fef3c7;
		color: #b45309;
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
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: #2563eb;
		text-decoration: none;
		font-weight: 600;
		font-size: 0.875rem;
		padding: 0.5rem 0.75rem;
		border-left: 1px solid #f3f4f6;
	}

	.detail-link:hover,
	.detail-link:focus-visible {
		background-color: #eff6ff;
		text-decoration: underline;
		outline: none;
	}
</style>
