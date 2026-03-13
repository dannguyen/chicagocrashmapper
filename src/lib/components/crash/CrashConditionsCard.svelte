<script lang="ts">
	import type { Crash } from '$lib/models/crash';

	let { crash } = $props<{ crash: Crash }>();

	function conditionValue(val: string | null | undefined): string {
		if (val == null || val.trim() === '' || val.toUpperCase().trim() === 'UNKNOWN') return '—';
		return val;
	}

	const showSecondaryCause = $derived(
		crash.secondary_cause !== 'UNKNOWN' &&
			crash.secondary_cause !== 'NOT APPLICABLE' &&
			crash.secondary_cause !== 'UNABLE TO DETERMINE' &&
			crash.secondary_cause !== crash.primary_cause
	);
</script>

<div class="info-card info-card-conditions">
	<p class="info-title">Conditions</p>

	<div class="info-row">
		<span class="info-label">Weather</span>
		<span class="info-value info-value-right">{conditionValue(crash.weather_condition)}</span>
	</div>

	<div class="info-row">
		<span class="info-label">Trafficway</span>
		<span class="info-value info-value-right">{conditionValue(crash.trafficway_type)}</span>
	</div>

	{#if crash.posted_speed_limit}
		<div class="info-row">
			<span class="info-label">Speed limit</span>
			<span class="info-value">{crash.posted_speed_limit} mph</span>
		</div>
	{/if}

	<div class="info-row {showSecondaryCause ? '' : 'info-row-last'}">
		<span class="info-label">Crash type</span>
		<span class="info-value info-value-right">{conditionValue(crash.category)}</span>
	</div>

	{#if showSecondaryCause}
		<div class="info-row info-row-last">
			<span class="info-label">Secondary cause</span>
			<span class="info-value info-value-right">{crash.secondary_cause}</span>
		</div>
	{/if}
</div>

<style>
	.info-card {
		background: #fff;
		border-radius: 0.75rem;
		border: 1px solid #e5e7eb;
		padding: 1rem;
		box-shadow: 0 1px 2px 0 rgb(15 23 42 / 0.05);
	}

	.info-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #6b7280;
		margin-bottom: 0.75rem;
	}

	.info-row {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.25rem;
		padding: 0.375rem 0;
		border-bottom: 1px solid #f3f4f6;
		font-size: 0.875rem;
	}

	@media (min-width: 640px) {
		.info-row {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
			gap: 1rem;
		}
	}

	.info-row-last {
		border-bottom: 0;
	}

	.info-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #6b7280;
		align-self: center;
	}

	.info-value {
		font-weight: 500;
		color: #1f2937;
		overflow-wrap: anywhere;
	}

	.info-value-right {
		text-align: left;
		word-break: break-word;
	}

	@media (min-width: 640px) {
		.info-value-right {
			text-align: right;
		}
	}
</style>
