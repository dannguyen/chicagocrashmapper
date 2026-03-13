<script lang="ts">
	import { formatPct } from '$lib/transformHelpers';

	let { label, crashes, serious, fatal, crashesDelta, seriousDelta, fatalDelta } = $props<{
		label: string;
		crashes: number;
		serious: number;
		fatal: number;
		crashesDelta: number | null;
		seriousDelta: number | null;
		fatalDelta: number | null;
	}>();
</script>

<div class="kpi-compare">
	<div class="kpi-compare-label">{label}</div>
	<div class="kpi-grid">
		<div class="kpi-col">
			<span class="kpi-abs">{crashes.toLocaleString()}</span>
			<span
				class="kpi-delta"
				class:up={crashesDelta !== null && crashesDelta > 0}
				class:down={crashesDelta !== null && crashesDelta < 0}
				class:flat={crashesDelta === null || crashesDelta === 0}>{formatPct(crashesDelta)}</span
			>
		</div>
		<div class="kpi-col">
			<span class="kpi-abs kpi-abs-serious">{serious.toLocaleString()}</span>
			<span
				class="kpi-delta"
				class:up={seriousDelta !== null && seriousDelta > 0}
				class:down={seriousDelta !== null && seriousDelta < 0}
				class:flat={seriousDelta === null || seriousDelta === 0}>{formatPct(seriousDelta)}</span
			>
		</div>
		<div class="kpi-col">
			<span class="kpi-abs kpi-abs-fatal">{fatal.toLocaleString()}</span>
			<span
				class="kpi-delta"
				class:up={fatalDelta !== null && fatalDelta > 0}
				class:down={fatalDelta !== null && fatalDelta < 0}
				class:flat={fatalDelta === null || fatalDelta === 0}>{formatPct(fatalDelta)}</span
			>
		</div>
	</div>
</div>

<style>
	.kpi-compare {
		margin-top: 0.625rem;
		padding-top: 0.5rem;
		border-top: 1px solid #f3f4f6;
	}

	.kpi-compare-label {
		font-size: 0.6875rem;
		color: #9ca3af;
		margin-bottom: 0.25rem;
	}

	.kpi-grid {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		text-align: center;
	}

	.kpi-col {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.kpi-abs {
		font-size: 1.125rem;
		font-weight: 600;
		color: #111827;
		line-height: 1;
	}

	.kpi-abs-fatal {
		color: #dc2626;
	}

	.kpi-abs-serious {
		color: #f59e0b;
	}

	.kpi-delta {
		font-size: 0.8125rem;
		font-weight: 400;
	}

	.kpi-delta.up {
		color: #b08a8a;
	}

	.kpi-delta.down {
		color: #7a9e7a;
	}

	.kpi-delta.flat {
		color: #b0b0b0;
	}
</style>
