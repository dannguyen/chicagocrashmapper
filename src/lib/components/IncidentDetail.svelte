<script lang="ts">
	import { Incident } from '$lib/incident';
	import { type Location } from '$lib/location';
	import PeopleList from '$lib/components/PeopleList.svelte';
	import { currentAgeSimplified, prettifyInteger } from '$lib/transformHelpers';

	let { incident, selectedLocation, distanceUnits } = $props<{
		incident: Incident | null;
		selectedLocation: Location | null;
		distanceUnits: string;
	}>();
</script>

{#if incident}
	<article class="incident-detail">
		<header class="incident-header">
			<div class="incident-date">
				<time datetime={incident.date.toISOString()}>
					{incident.prettyDate}
				</time>
				<em>({currentAgeSimplified(incident.date)})</em>
			</div>
			<h3 class="incident-title">{incident.title}</h3>
		</header>

		<dl class="incident-meta">
			<div class="incident-meta-row">
				<dt>Type</dt>
				<dd>{incident.category}</dd>
			</div>
			<div class="incident-meta-row">
				<dt>Cause</dt>
				<dd>{incident.primary_cause}</dd>
			</div>
			{#if incident.weather_condition && incident.weather_condition !== 'CLEAR'}
				<div class="incident-meta-row">
					<dt>Weather</dt>
					<dd>{incident.weather_condition.toLowerCase()}</dd>
				</div>
			{/if}
			{#if incident.trafficway_type}
				<div class="incident-meta-row">
					<dt>Road type</dt>
					<dd>{incident.trafficway_type.toLowerCase()}</dd>
				</div>
			{/if}
			{#if selectedLocation?.isPoint}
				<div class="incident-meta-row">
					<dt>Distance</dt>
					<dd>
						{prettifyInteger(incident.distance as number)}
						{distanceUnits} away
					</dd>
				</div>
			{/if}
		</dl>

		{#if incident.non_passengers.length > 0}
			<section class="incident-people">
				<h4 class="section-title">People involved</h4>
				<PeopleList people={incident.non_passengers} />
			</section>
		{/if}

		{#if incident.vehicles.length > 0}
			<section class="incident-vehicles-section">
				<h4 class="section-title">Vehicles involved</h4>
				<ul class="incident-vehicles incident-list incident-list--spaced">
					{#each incident.vehicles as vh}
						<li class="vehicle">
							<span class="incident-item-label">{vh.description}</span>
							{#if vh.passengers.length > 0}
								<PeopleList people={vh.passengers} listClass="incident-sublist" />
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</article>
{/if}

<style lang="postcss">
	@reference "$lib/styles/app.css";

	.incident-detail {
		@apply w-full text-gray-900;
	}

	.incident-date {
		@apply text-sm text-gray-600 flex flex-wrap gap-2;
	}

	.incident-title {
		@apply text-lg font-semibold text-gray-900;
	}

	.incident-meta {
		@apply mt-2 mb-3 text-sm text-gray-700;
	}

	.incident-meta-row {
		@apply flex flex-wrap gap-2;
	}

	.incident-meta-row dt {
		@apply font-semibold text-gray-800;
	}

	.incident-meta-row dd {
		@apply m-0;
	}

	.section-title {
		@apply text-sm font-semibold text-gray-800 mt-3 mb-1;
	}

	.incident-vehicles .vehicle {
		@apply text-sm;
	}
</style>
