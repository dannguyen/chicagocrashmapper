<script lang="ts">
	import { base } from '$app/paths';
	import type { NearbyCrash } from '$lib/api/client';

	let { nearbyCrashes } = $props<{ nearbyCrashes: NearbyCrash[] }>();

	const sortedCrashes = $derived(
		[...nearbyCrashes].sort(
			(a: NearbyCrash, b: NearbyCrash) =>
				new Date(b.crash_date).getTime() - new Date(a.crash_date).getTime()
		)
	);
</script>

{#if sortedCrashes.length > 0}
	<div class="info-card">
		<p class="info-title">Nearby Crashes</p>
		{#each sortedCrashes as nc}
			{@const feetAway = Math.round(nc.distance_miles * 5280)}
			{@const ncDate = new Date(nc.crash_date)}
			{@const ncAddress = [nc.street_no, nc.street_direction, nc.street_name]
				.filter(Boolean)
				.join(' ')}
			<a href={`${base}/crashes/${nc.crash_record_id}`} class="nearby-row">
				<div class="nearby-main">
					<span class="nearby-address">{ncAddress || 'Unknown location'}</span>
					<span class="nearby-meta">
						{ncDate.toLocaleDateString('en-US', {
							month: 'short',
							day: 'numeric',
							year: 'numeric'
						})}
						&ensp;·&ensp;{feetAway} ft away
					</span>
				</div>
				<div class="nearby-severity">
					{#if nc.injuries_fatal > 0}
						<span class="nearby-badge nearby-fatal">{nc.injuries_fatal} fatal</span>
					{:else if nc.injuries_incapacitating > 0}
						<span class="nearby-badge nearby-serious">{nc.injuries_incapacitating} serious</span>
					{:else if nc.injuries_total > 0}
						<span class="nearby-badge nearby-minor">{nc.injuries_total} injured</span>
					{/if}
				</div>
			</a>
		{/each}
	</div>
{/if}

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

	.nearby-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.5rem 0;
		text-decoration: none;
		color: inherit;
	}

	.nearby-row:hover {
		background: #f9fafb;
	}

	.nearby-row + .nearby-row {
		border-top: 1px solid #f3f4f6;
	}

	.nearby-main {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.nearby-address {
		font-size: 0.875rem;
		color: #1f2937;
		font-weight: 500;
		overflow-wrap: anywhere;
	}

	.nearby-meta {
		font-size: 0.75rem;
		color: #9ca3af;
	}

	.nearby-severity {
		flex-shrink: 0;
	}

	.nearby-badge {
		font-size: 0.675rem;
		font-weight: 600;
		text-transform: uppercase;
		padding: 0.125rem 0.5rem;
		border-radius: 9999px;
	}

	.nearby-fatal {
		background: #fef2f2;
		color: #dc2626;
	}

	.nearby-serious {
		background: #fffbeb;
		color: #f59e0b;
	}

	.nearby-minor {
		background: #f0fdf4;
		color: #16a34a;
	}
</style>
