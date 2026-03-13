<script lang="ts">
	import { base } from '$app/paths';
	import type { Crash } from '$lib/models/crash';
	import { currentAgeSimplified } from '$lib/transformHelpers';
	import { crashSeverity, severityLabel } from '$lib/severity';
	import type { NearbyCrash } from '$lib/api/client';
	import CrashPeopleCard from '$lib/components/crash/CrashPeopleCard.svelte';
	import CrashConditionsCard from '$lib/components/crash/CrashConditionsCard.svelte';
	import CrashNearbyCrashesCard from '$lib/components/crash/CrashNearbyCrashesCard.svelte';

	let { crash, neighborhood, ward, intersections, nearby_crashes } = $props<{
		crash: Crash | null;
		neighborhood: { id: string; name: string } | null;
		ward: { id: string; name: string } | null;
		intersections: { id: string; name: string }[];
		nearby_crashes: NearbyCrash[];
	}>();

	const severity = $derived(crash ? crashSeverity(crash) : 'none');

	const address = $derived(
		crash
			? [crash.street_no, crash.street_direction, crash.street_name]
					.filter((x) => x != null && x !== '')
					.join(' ') || 'Unknown location'
			: 'Unknown location'
	);

	const injuryCategories = $derived(
		crash
			? [
					{ label: 'Fatal', count: crash.injuries_fatal, color: 'bg-red-600' },
					{
						label: 'Serious',
						count: crash.injuries_incapacitating,
						color: 'bg-amber-600'
					},
					{
						label: 'Minor',
						count: crash.injuries_non_incapacitating,
						color: 'bg-amber-500'
					},
					{
						label: 'Reported, not evident',
						count: crash.injuries_reported_not_evident,
						color: 'bg-yellow-500'
					},
					{ label: 'Uninjured', count: crash.injuries_no_indication, color: 'bg-green-600' },
					{ label: 'Unknown', count: crash.injuries_unknown, color: 'bg-gray-400' }
				].filter((c) => c.count > 0)
			: []
	);
</script>

{#if crash}
	<div class="hero-card" data-severity={severity}>
		<div class="hero-header">
			<div class="hero-main">
				<div class="hero-badges">
					<span class="severity-badge" data-severity={severity}>{severityLabel(severity)}</span>
					{#if crash.hit_and_run}
						<span class="hitrun-badge">Hit & Run</span>
					{/if}
				</div>

				<p class="hero-cause">{crash.main_cause}</p>

				<p class="hero-location">
					{address}{#each intersections as ix}&ensp;·&ensp;<a
							href={`${base}/intersections/${ix.id}`}
							class="hero-link">{ix.name}</a
						>{/each}{#if ward}&ensp;·&ensp;<a href={`${base}/wards/${ward.id}`} class="hero-link"
							>{ward.name}</a
						>{/if}{#if neighborhood}&ensp;·&ensp;<a
							href={`${base}/neighborhoods/${neighborhood.id}`}
							class="hero-link">{neighborhood.name}</a
						>{/if}
				</p>
			</div>

			<div class="hero-meta">
				<time datetime={crash.date.toISOString()} class="hero-date"
					>{crash.prettyDate} at {crash.prettyTime}</time
				>
				<span class="hero-age">{currentAgeSimplified(crash.date)}</span>
			</div>
		</div>

		{#if injuryCategories.length > 0}
			<div class="hero-injuries">
				{#each injuryCategories as cat}
					<div class="injury-item">
						<span class="injury-dot {cat.color}"></span>
						<span class="injury-text">{cat.count} {cat.label}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div class="info-grid">
		<CrashPeopleCard {crash} />
		<CrashConditionsCard {crash} />
	</div>

	<CrashNearbyCrashesCard nearbyCrashes={nearby_crashes} />
{/if}

<style>
	.hero-card {
		border-radius: 0.75rem;
		border: 1px solid #e5e7eb;
		background: #fff;
		padding: 1rem;
		margin-bottom: 1.5rem;
		box-shadow: 0 1px 2px 0 rgb(15 23 42 / 0.05);
		border-left-width: 4px;
	}

	@media (min-width: 640px) {
		.hero-card {
			padding: 1.5rem;
		}
	}

	.hero-header {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 0.75rem;
	}

	@media (min-width: 640px) {
		.hero-header {
			flex-direction: row;
			align-items: flex-start;
			justify-content: space-between;
			gap: 1rem;
		}
	}

	.hero-main {
		flex: 1;
		min-width: 0;
	}

	.hero-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.severity-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.25rem 0.625rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
	}

	.hitrun-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.25rem 0.625rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		background: #fef3c7;
		color: #b45309;
	}

	.hero-cause {
		margin-top: 0.5rem;
		font-size: 1.125rem;
		font-weight: 600;
		color: #111827;
		line-height: 1.3;
		overflow-wrap: anywhere;
		word-break: break-word;
	}

	@media (min-width: 640px) {
		.hero-cause {
			font-size: 1.25rem;
		}
	}

	.hero-location {
		margin-top: 0.25rem;
		font-size: 0.875rem;
		color: #4b5563;
		line-height: 1.5;
		overflow-wrap: anywhere;
		word-break: break-word;
	}

	.hero-link {
		color: #2563eb;
		text-decoration: none;
	}

	.hero-link:hover {
		text-decoration: underline;
	}

	.hero-meta {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		text-align: left;
		flex-shrink: 0;
	}

	@media (min-width: 640px) {
		.hero-meta {
			text-align: right;
			align-items: flex-end;
		}
	}

	.hero-date {
		display: block;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.hero-age {
		font-size: 0.875rem;
		color: #6b7280;
		font-style: italic;
	}

	.hero-injuries {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1rem;
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid #f3f4f6;
	}

	.injury-item {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.injury-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 9999px;
		display: inline-block;
	}

	.injury-text {
		font-size: 0.75rem;
		color: #4b5563;
	}

	.info-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	@media (min-width: 640px) {
		.info-grid {
			grid-template-columns: 1fr 1fr;
			align-items: start;
		}
	}
</style>
