<script lang="ts">
	import type { Incident, Person } from '$lib/incident';
	import { type Location } from '$lib/location';
	import { currentAgeSimplified, prettifyInteger } from '$lib/transformHelpers';

	let { incident, selectedLocation, distanceUnits } = $props<{
		incident: Incident | null;
		selectedLocation: Location | null;
		distanceUnits: string;
	}>();

	function injuryClass(p: Person): string {
		const lvl = p.injury_level;
		if (lvl === 'fatal') return 'text-red-600 font-semibold';
		if (lvl === 'incapacitating') return 'text-purple-500 font-semibold';
		return 'text-gray-500';
	}

	function outcomeText(p: Person): string | null {
		if (p.isKilled) return 'was killed';
		if (p.injury_level === 'incapacitating') return 'was seriously injured';
		return null;
	}
</script>

{#if incident}
	<article class="incident-detail" incident-id={incident.crash_record_id}>
		<!-- Date + age -->
		<div class="incident-date">
			<time datetime={incident.date.toISOString()}>{incident.prettyDate}</time>
			<span class="age">({currentAgeSimplified(incident.date)})</span>
		</div>

		<!-- Title -->
		<h3 class="incident-title">{incident.title}</h3>

		<!-- Meta: cause · type · distance -->
		<div class="incident-meta">
			<span>{incident.primary_cause}</span>
			{#if incident.category}
				<span class="sep">·</span><span>{incident.category}</span>
			{/if}
			{#if selectedLocation?.isPoint && incident.distance != null}
				<span class="sep">·</span>
				<span>{prettifyInteger(incident.distance as number)} {distanceUnits} away</span>
			{/if}
			{#if incident.weather_condition && incident.weather_condition !== 'CLEAR'}
				<span class="sep">·</span><span>{incident.weather_condition.toLowerCase()}</span>
			{/if}
		</div>

		<!-- People (non-passengers) -->
		{#if incident.non_passengers.length > 0}
			<ul class="people-list">
				{#each incident.non_passengers as p}
					<li>
						{#if p.person_type}<span class="person-role">{p.person_type}:</span>{/if}
						<span class="person-desc">{p.description}</span>
						{#if outcomeText(p)}
							<span class={injuryClass(p)}>{outcomeText(p)}</span>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}

		<!-- Vehicles -->
		{#if incident.vehicles.length > 0}
			<ul class="vehicle-list">
				{#each incident.vehicles as vh}
					<li>
						<span class="vehicle-desc">{vh.description || 'Unknown vehicle'}</span>
						{#each vh.passengers as p}
							<span class="passenger">
								{#if p.person_type}<span class="person-role">{p.person_type}:</span>{/if}
								{p.description}
								{#if outcomeText(p)}
									<span class={injuryClass(p)}>{outcomeText(p)}</span>
								{/if}
							</span>
						{/each}
					</li>
				{/each}
			</ul>
		{/if}
	</article>
{/if}

<style lang="postcss">
	@reference "$lib/styles/app.css";

	.incident-detail {
		@apply flex-1 min-w-0 text-sm;
	}

	.incident-date {
		@apply text-xs text-gray-400 flex gap-1.5 flex-wrap;
	}

	.age {
		@apply italic;
	}

	.incident-title {
		@apply font-semibold text-gray-900 leading-snug mb-1;
	}

	.incident-meta {
		@apply text-xs text-gray-500 flex flex-wrap gap-x-1 mb-1;
	}

	.sep {
		@apply text-gray-300;
	}

	.people-list,
	.vehicle-list {
		@apply text-xs text-gray-600 space-y-0.5 mt-1;
	}

	.people-list li,
	.vehicle-list li {
		@apply flex flex-wrap gap-x-1 items-baseline;
	}

	.person-desc,
	.vehicle-desc {
		@apply font-medium text-gray-800;
	}

	.person-role {
		@apply text-gray-400;
	}

	.passenger {
		@apply flex flex-wrap gap-x-1 items-baseline ml-2 before:content-['·'] before:text-gray-300;
	}
</style>
