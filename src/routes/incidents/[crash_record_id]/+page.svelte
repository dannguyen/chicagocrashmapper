<script lang="ts">
	import { onMount } from 'svelte';
	import { Mapper } from '$lib/mapping';
	import { currentAgeSimplified } from '$lib/transformHelpers';
	import type { Incident, Person, Vehicle } from '$lib/incident';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
	const incident: Incident = $derived(data.incident);
	const neighborhood = $derived(data.neighborhood);
	const ward = $derived(data.ward);

	let mapEl: HTMLDivElement | undefined = $state(undefined);
	const MapperInstance = new Mapper();

	function outcomeText(p: Person): string | null {
		switch (p.injury_level) {
			case 'fatal':
				return 'was killed';
			case 'incapacitating':
				return 'was seriously injured';
			case 'non-incapacitating':
				return 'suffered minor injury';
			case 'none':
				return 'was uninjured';
			case 'unclear':
				return 'reported non-evident injuries';
			default:
				return null;
		}
	}

	function injuryClass(p: Person): string {
		const lvl = p.injury_level;
		if (lvl === 'fatal') return 'text-red-600 font-semibold';
		if (lvl === 'incapacitating') return 'text-purple-500 font-semibold';
		return 'text-gray-500';
	}

	function isRelevantDetail(val: string | null | undefined): boolean {
		if (!val) return false;
		const skip = [
			'NONE',
			'NOT APPLICABLE',
			'USAGE UNKNOWN',
			'UNKNOWN',
			'DEPLOYMENT UNKNOWN',
			'NOT EJECTED',
			'NOT DEPLOYED',
			'CLEAR',
			'NO OBSTRUCTION',
			'NORMAL',
			'APPEARED NORMAL',
			'HAD NOT BEEN DRINKING',
			'STRAIGHT AHEAD',
			'DROVE STRAIGHT'
		];
		return !skip.includes(val.toUpperCase().trim());
	}

	const address = $derived(
		[incident.street_no, incident.street_direction, incident.street_name]
			.filter((x) => x != null && x !== '')
			.join(' ') || 'Unknown location'
	);

	const injuryCategories = $derived(
		[
			{ label: 'Fatal', count: incident.injuries_fatal, color: 'bg-red-600' },
			{
				label: 'Serious (incapacitating)',
				count: incident.injuries_incapacitating,
				color: 'bg-purple-600'
			},
			{
				label: 'Minor (non-incapacitating)',
				count: incident.injuries_non_incapacitating,
				color: 'bg-orange-500'
			},
			{
				label: 'Reported, not evident',
				count: incident.injuries_reported_not_evident,
				color: 'bg-yellow-500'
			},
			{ label: 'Uninjured', count: incident.injuries_no_indication, color: 'bg-green-500' },
			{ label: 'Unknown', count: incident.injuries_unknown, color: 'bg-gray-400' }
		].filter((c) => c.count != null && c.count > 0)
	);

	const showSecondaryCause = $derived(
		incident.secondary_cause !== 'UNKNOWN' &&
			incident.secondary_cause !== 'NOT APPLICABLE' &&
			incident.secondary_cause !== 'UNABLE TO DETERMINE' &&
			incident.secondary_cause !== incident.primary_cause
	);

	const showCrashType = $derived(
		incident.category !== incident.category // first_crash_type already stored as category
	);

	onMount(() => {
		let destroyed = false;
		(async () => {
			if (!mapEl) return;
			const mapId = 'incident-map';
			mapEl.id = mapId;
			await MapperInstance.init(mapId, [incident.latitude, incident.longitude], 16);
			if (destroyed || !MapperInstance.map || !MapperInstance.L) return;

			const markerColor = incident.isFatal ? '#dc2626' : '#7c3aed';
			MapperInstance.L.circleMarker([incident.latitude, incident.longitude], {
				radius: 10,
				color: markerColor,
				fillColor: markerColor,
				fillOpacity: 0.8,
				weight: 2
			}).addTo(MapperInstance.map);

			MapperInstance.map.invalidateSize();
		})();

		return () => {
			destroyed = true;
			MapperInstance.destroy();
		};
	});
</script>

<div class="incident-page">
	<!-- Breadcrumb -->
	<nav class="breadcrumb">
		<a href="/">← All incidents</a>
	</nav>

	<!-- Hero -->
	<header class="hero">
		<div class="badges">
			{#if incident.isFatal}
				<span class="badge badge-fatal">FATAL</span>
			{/if}
			{#if incident.injuries_incapacitating > 0}
				<span class="badge badge-serious">SERIOUSLY INJURED</span>
			{/if}
			{#if incident.hit_and_run}
				<span class="badge badge-hitrun">HIT & RUN</span>
			{/if}
		</div>
		<h1 class="hero-title">{incident.title}</h1>
		<p class="hero-date">
			<time datetime={incident.date.toISOString()}>{incident.prettyDate}</time>
			<span class="age">({currentAgeSimplified(incident.date)})</span>
		</p>
	</header>

	<!-- Map -->
	<div class="map-wrapper">
		<div bind:this={mapEl} class="incident-map"></div>
	</div>

	<!-- Two-column details -->
	<div class="detail-grid">
		<!-- Crash details -->
		<div class="card">
			<h2 class="card-title">Crash details</h2>
			<dl class="detail-list">
				<div class="detail-row">
					<dt>Primary cause</dt>
					<dd>{incident.primary_cause}</dd>
				</div>
				{#if showSecondaryCause}
					<div class="detail-row">
						<dt>Secondary cause</dt>
						<dd>{incident.secondary_cause}</dd>
					</div>
				{/if}
				<div class="detail-row">
					<dt>Crash type</dt>
					<dd>{incident.category}</dd>
				</div>
				{#if incident.trafficway_type}
					<div class="detail-row">
						<dt>Trafficway</dt>
						<dd>{incident.trafficway_type}</dd>
					</div>
				{/if}
				{#if incident.weather_condition}
					<div class="detail-row">
						<dt>Weather</dt>
						<dd>{incident.weather_condition}</dd>
					</div>
				{/if}
				{#if incident.posted_speed_limit}
					<div class="detail-row">
						<dt>Speed limit</dt>
						<dd>{incident.posted_speed_limit} mph</dd>
					</div>
				{/if}
			</dl>
		</div>

		<!-- Location -->
		<div class="card">
			<h2 class="card-title">Location</h2>
			<dl class="detail-list">
				<div class="detail-row">
					<dt>Address</dt>
					<dd>{address}</dd>
				</div>
				{#if neighborhood}
					<div class="detail-row">
						<dt>Neighborhood</dt>
						<dd>
							<a href="/neighborhoods/{neighborhood.id}" class="detail-link">{neighborhood.name}</a>
						</dd>
					</div>
				{/if}
				{#if ward}
					<div class="detail-row">
						<dt>Ward</dt>
						<dd><a href="/wards/{ward.id}" class="detail-link">{ward.name}</a></dd>
					</div>
				{/if}
			</dl>
		</div>
	</div>

	<!-- Injuries -->
	{#if injuryCategories.length > 0}
		<section class="card">
			<h2 class="card-title">Injuries</h2>
			<div class="injury-grid">
				{#each injuryCategories as cat}
					<div class="injury-stat">
						<span class="injury-count {cat.color}">{cat.count}</span>
						<span class="injury-label">{cat.label}</span>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- People & vehicles -->
	{#if incident.vehicles.length > 0 || incident.non_passengers.length > 0}
		<section class="card">
			<h2 class="card-title">People & vehicles</h2>

			{#each incident.vehicles as vh, vi}
				<div class="vehicle-block">
					<div class="vehicle-header">
						<span class="vehicle-name">{vh.description || 'Unknown vehicle'}</span>
						{#if vh.reportableType}
							<span class="vehicle-tag">{vh.reportableType}</span>
						{/if}
						{#if isRelevantDetail(vh.travel_direction)}
							<span class="vehicle-tag">↑ {vh.travel_direction}</span>
						{/if}
						{#if isRelevantDetail(vh.maneuver)}
							<span class="vehicle-tag">{vh.maneuver}</span>
						{/if}
					</div>
					{#each vh.passengers as p}
						<div class="person-row">
							<span class="person-desc">{p.description}</span>
							{#if p.person_type}
								<span class="person-role">{p.person_type}</span>
							{/if}
							{#if outcomeText(p)}
								<span class={injuryClass(p)}>{outcomeText(p)}</span>
							{/if}
							{#if isRelevantDetail(p.safety_equipment)}
								<span class="person-extra">Safety: {p.safety_equipment}</span>
							{/if}
							{#if isRelevantDetail(p.airbag_deployed)}
								<span class="person-extra">Airbag: {p.airbag_deployed}</span>
							{/if}
							{#if isRelevantDetail(p.ejection)}
								<span class="person-extra">Ejection: {p.ejection}</span>
							{/if}
							{#if isRelevantDetail(p.physical_condition)}
								<span class="person-extra">Condition: {p.physical_condition}</span>
							{/if}
							{#if isRelevantDetail(p.driver_action)}
								<span class="person-extra">Action: {p.driver_action}</span>
							{/if}
							{#if isRelevantDetail(p.driver_vision)}
								<span class="person-extra">Visibility: {p.driver_vision}</span>
							{/if}
							{#if isRelevantDetail(p.hospital)}
								<span class="person-extra">Hospital: {p.hospital}</span>
							{/if}
						</div>
					{/each}
				</div>
			{/each}

			{#if incident.non_passengers.length > 0}
				<div class="vehicle-block">
					<div class="vehicle-header">
						<span class="vehicle-name">Non-motorists</span>
					</div>
					{#each incident.non_passengers as p}
						<div class="person-row">
							<span class="person-desc">{p.description}</span>
							{#if p.person_type}
								<span class="person-role">{p.person_type}</span>
							{/if}
							{#if outcomeText(p)}
								<span class={injuryClass(p)}>{outcomeText(p)}</span>
							{/if}
							{#if isRelevantDetail(p.safety_equipment)}
								<span class="person-extra">Safety: {p.safety_equipment}</span>
							{/if}
							{#if isRelevantDetail(p.airbag_deployed)}
								<span class="person-extra">Airbag: {p.airbag_deployed}</span>
							{/if}
							{#if isRelevantDetail(p.ejection)}
								<span class="person-extra">Ejection: {p.ejection}</span>
							{/if}
							{#if isRelevantDetail(p.physical_condition)}
								<span class="person-extra">Condition: {p.physical_condition}</span>
							{/if}
							{#if isRelevantDetail(p.driver_action)}
								<span class="person-extra">Action: {p.driver_action}</span>
							{/if}
							{#if isRelevantDetail(p.driver_vision)}
								<span class="person-extra">Visibility: {p.driver_vision}</span>
							{/if}
							{#if isRelevantDetail(p.hospital)}
								<span class="person-extra">Hospital: {p.hospital}</span>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</section>
	{/if}

	<!-- Footer -->
	<p class="record-id">Crash record: {incident.crash_record_id}</p>
</div>

<style lang="postcss">
	@reference "$lib/styles/app.css";

	.incident-page {
		@apply flex flex-col gap-6;
	}

	.breadcrumb {
		@apply text-sm;
	}

	.breadcrumb a {
		@apply text-blue-600 hover:text-blue-800 transition-colors;
	}

	.hero {
		@apply flex flex-col gap-2;
	}

	.badges {
		@apply flex flex-wrap gap-2;
	}

	.badge {
		@apply inline-block px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide rounded-full text-white;
	}

	.badge-fatal {
		@apply bg-red-600;
	}

	.badge-serious {
		@apply bg-purple-600;
	}

	.badge-hitrun {
		@apply bg-amber-600;
	}

	.hero-title {
		@apply text-2xl font-bold text-gray-900 leading-tight;
	}

	.hero-date {
		@apply text-sm text-gray-500;
	}

	.age {
		@apply italic;
	}

	.map-wrapper {
		@apply w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm;
	}

	.incident-map {
		@apply w-full;
		height: 350px;
	}

	.detail-grid {
		@apply grid grid-cols-1 md:grid-cols-2 gap-4;
	}

	.card {
		@apply bg-white rounded-xl shadow-sm border border-gray-200 p-5;
	}

	.card-title {
		@apply text-base font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-100;
	}

	.detail-list {
		@apply space-y-2;
	}

	.detail-row {
		@apply flex justify-between gap-4 text-sm;
	}

	.detail-row dt {
		@apply text-gray-500 flex-shrink-0;
	}

	.detail-row dd {
		@apply text-gray-900 text-right;
	}

	.detail-link {
		@apply text-blue-600 hover:text-blue-800 underline;
	}

	.injury-grid {
		@apply grid grid-cols-2 sm:grid-cols-3 gap-3;
	}

	.injury-stat {
		@apply flex flex-col items-center gap-1 p-3 rounded-lg bg-gray-50;
	}

	.injury-count {
		@apply text-2xl font-bold text-white w-10 h-10 rounded-full flex items-center justify-center;
	}

	.injury-label {
		@apply text-xs text-gray-600 text-center;
	}

	.vehicle-block {
		@apply mb-4 last:mb-0;
	}

	.vehicle-header {
		@apply flex items-center gap-2 mb-2;
	}

	.vehicle-name {
		@apply font-medium text-sm text-gray-800;
	}

	.vehicle-tag {
		@apply text-xs text-gray-400 uppercase tracking-wide bg-gray-100 px-1.5 py-0.5 rounded;
	}

	.person-row {
		@apply flex flex-wrap gap-x-2 gap-y-0.5 items-baseline text-sm ml-4 py-0.5;
	}

	.person-desc {
		@apply font-medium text-gray-800;
	}

	.person-role {
		@apply text-xs text-gray-400;
	}

	.person-extra {
		@apply text-xs text-gray-400 italic;
	}

	.record-id {
		@apply text-xs text-gray-400 text-center pt-4;
	}
</style>
