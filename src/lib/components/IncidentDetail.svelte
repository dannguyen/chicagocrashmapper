<script lang="ts">
	import type { Incident, Person, Vehicle } from '$lib/incident';
	import { currentAgeSimplified, prettifyInteger } from '$lib/transformHelpers';
	import {
		incidentSeverity,
		severityBorderClass,
		severityBadgeClass,
		severityLabel,
		personInjuryLevel,
		injuryDotClass,
		injuryTextClass,
		injuryLabel
	} from '$lib/severity';

	let { incident, neighborhood, ward } = $props<{
		incident: Incident | null;
		neighborhood: { id: string; name: string } | null;
		ward: { id: string; name: string } | null;
	}>();

	// ── filter helper ───────────────────────────────────────────────────────────

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

	// ── derived values ──────────────────────────────────────────────────────────

	const severity = $derived(incident ? incidentSeverity(incident) : 'none');

	const address = $derived(
		incident
			? [incident.street_no, incident.street_direction, incident.street_name]
					.filter((x) => x != null && x !== '')
					.join(' ') || 'Unknown location'
			: 'Unknown location'
	);

	const showSecondaryCause = $derived(
		incident
			? incident.secondary_cause !== 'UNKNOWN' &&
					incident.secondary_cause !== 'NOT APPLICABLE' &&
					incident.secondary_cause !== 'UNABLE TO DETERMINE' &&
					incident.secondary_cause !== incident.primary_cause
			: false
	);

	const injuryCategories = $derived(
		incident
			? [
					{ label: 'Fatal', count: incident.injuries_fatal, color: 'bg-red-600' },
					{
						label: 'Serious',
						count: incident.injuries_incapacitating,
						color: 'bg-purple-600'
					},
					{
						label: 'Minor',
						count: incident.injuries_non_incapacitating,
						color: 'bg-amber-500'
					},
					{
						label: 'Reported, not evident',
						count: incident.injuries_reported_not_evident,
						color: 'bg-yellow-500'
					},
					{ label: 'Uninjured', count: incident.injuries_no_indication, color: 'bg-green-600' },
					{ label: 'Unknown', count: incident.injuries_unknown, color: 'bg-gray-400' }
				].filter((c) => c.count != null && c.count > 0)
			: []
	);

	// ── people count ────────────────────────────────────────────────────────────

	const peopleCount = $derived(
		incident
			? incident.vehicles.reduce((sum: number, vh: Vehicle) => sum + vh.passengers.length, 0) +
					incident.non_passengers.length
			: 0
	);

	// ── condition display helper ─────────────────────────────────────────────────

	function conditionValue(val: string | null | undefined): string {
		if (val == null || val.trim() === '' || val.toUpperCase().trim() === 'UNKNOWN') return '—';
		return val;
	}
</script>

{#if incident}
	<!-- ── Hero card ─────────────────────────────────────────────────────────── -->
	<div class="hero-card {severityBorderClass(severity)}">
		<div class="hero-header">
			<div class="hero-main">
				<!-- Severity badge + optional hit-and-run -->
				<div class="hero-badges">
					<span class="severity-badge {severityBadgeClass(severity)}">
						{severityLabel(severity)}
					</span>
					{#if incident.hit_and_run}
						<span class="hitrun-badge">Hit & Run</span>
					{/if}
				</div>

				<!-- Primary cause -->
				<p class="hero-cause">{incident.main_cause}</p>

				<!-- Location line -->
				<p class="hero-location">
					{address}{#if ward || neighborhood}&ensp;·&ensp;{/if}{#if ward}<a
							href="/wards/{ward.id}"
							class="hero-link">{ward.name}</a
						>{/if}{#if ward && neighborhood}&ensp;·&ensp;{/if}{#if neighborhood}<a
							href="/neighborhoods/{neighborhood.id}"
							class="hero-link">{neighborhood.name}</a
						>{/if}
				</p>
			</div>

			<!-- Date / age aligned right -->
			<div class="hero-meta">
				<time datetime={incident.date.toISOString()} class="hero-date">{incident.prettyDate}</time>
				<span class="hero-age">{currentAgeSimplified(incident.date)}</span>
			</div>
		</div>
	</div>

	<!-- ── Info grid ─────────────────────────────────────────────────────────── -->
	<div class="info-grid">
		<!-- Conditions card -->
		<div class="info-card">
			<p class="info-title">Conditions</p>

			<div class="info-row">
				<span class="info-label">Weather</span>
				<span class="info-value info-value-right">{conditionValue(incident.weather_condition)}</span
				>
			</div>

			<div class="info-row">
				<span class="info-label">Trafficway</span>
				<span class="info-value info-value-right">{conditionValue(incident.trafficway_type)}</span>
			</div>

			{#if incident.posted_speed_limit}
				<div class="info-row">
					<span class="info-label">Speed limit</span>
					<span class="info-value">{incident.posted_speed_limit} mph</span>
				</div>
			{/if}

			<div class="info-row {showSecondaryCause ? '' : 'info-row-last'}">
				<span class="info-label">Crash type</span>
				<span class="info-value info-value-right">{conditionValue(incident.category)}</span>
			</div>

			{#if showSecondaryCause}
				<div class="info-row info-row-last">
					<span class="info-label">Secondary cause</span>
					<span class="info-value info-value-right">{incident.secondary_cause}</span>
				</div>
			{/if}
		</div>

		<!-- Location card -->
		<div class="info-card">
			<p class="info-title">Location</p>

			<div class="info-row {!ward && !neighborhood ? 'info-row-last' : ''}">
				<span class="info-label-regular">Address</span>
				<span class="location-address">{address}</span>
			</div>

			{#if ward}
				<div class="info-row {neighborhood ? '' : 'info-row-last'}">
					<span class="info-label-regular">Ward</span>
					<a href="/wards/{ward.id}" class="info-link">{ward.name}</a>
				</div>
			{/if}

			{#if neighborhood}
				<div class="info-row info-row-last">
					<span class="info-label-regular">Neighborhood</span>
					<a href="/neighborhoods/{neighborhood.id}" class="info-link">{neighborhood.name}</a>
				</div>
			{/if}

			{#if injuryCategories.length > 0}
				<div class="injury-block">
					<p class="info-title info-title-tight">Injuries</p>
					<div class="injury-list">
						{#each injuryCategories as cat}
							<div class="injury-item">
								<span class="injury-dot {cat.color}"></span>
								<span class="injury-text">{cat.count} {cat.label}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- ── People Involved ───────────────────────────────────────────────────── -->
	<section class="people-section">
		<h2 class="people-title">People Involved</h2>

		{#if peopleCount > 0}
			<p class="people-count">{peopleCount} {peopleCount === 1 ? 'person' : 'people'} involved</p>
		{/if}

		<div class="people-card">
			{#if peopleCount === 0}
				<p class="people-empty">No people records available</p>
			{/if}

			{#each incident.vehicles as vh}
				{#each vh.passengers as p}
					{@const pLevel = personInjuryLevel(p)}
					{@const pLabel = injuryLabel(pLevel)}
					{@const vehicleDesc = [vh.vehicle_year, vh.make, vh.model]
						.filter((x) => x != null && x !== '')
						.join(' ')}
					<div class="person-row">
						<!-- Left: role + vehicle info -->
						<div class="person-main">
							<div class="person-header">
								{#if p.person_type}
									<span class="person-tag">{p.person_type}</span>
								{/if}
								<span class="person-name">{p.description}</span>
							</div>
							{#if vehicleDesc}
								<span class="person-vehicle">{vehicleDesc}</span>
							{/if}
							<!-- Relevant extra details -->
							<div class="person-details">
								{#if isRelevantDetail(p.safety_equipment)}
									<span class="person-detail">Safety: {p.safety_equipment}</span>
								{/if}
								{#if isRelevantDetail(p.airbag_deployed)}
									<span class="person-detail">Airbag: {p.airbag_deployed}</span>
								{/if}
								{#if isRelevantDetail(p.ejection)}
									<span class="person-detail">Ejection: {p.ejection}</span>
								{/if}
								{#if isRelevantDetail(p.physical_condition)}
									<span class="person-detail">Condition: {p.physical_condition}</span>
								{/if}
								{#if isRelevantDetail(p.driver_action)}
									<span class="person-detail">Action: {p.driver_action}</span>
								{/if}
								{#if isRelevantDetail(p.driver_vision)}
									<span class="person-detail">Visibility: {p.driver_vision}</span>
								{/if}
								{#if isRelevantDetail(p.hospital)}
									<span class="person-detail">Hospital: {p.hospital}</span>
								{/if}
							</div>
						</div>

						<!-- Right: injury indicator -->
						{#if pLabel}
							<div class="person-injury">
								<span class="person-dot {injuryDotClass(pLevel)}"></span>
								<span class="person-injury-label {injuryTextClass(pLevel)}">{pLabel}</span>
							</div>
						{/if}
					</div>
				{/each}
			{/each}

			{#each incident.non_passengers as p}
				{@const pLevel = personInjuryLevel(p)}
				{@const pLabel = injuryLabel(pLevel)}
				<div class="person-row">
					<!-- Left: role + description -->
					<div class="person-main">
						<div class="person-header">
							{#if p.person_type}
								<span class="person-tag">{p.person_type}</span>
							{/if}
							<span class="person-name">{p.description}</span>
						</div>
						<!-- Relevant extra details -->
						<div class="person-details">
							{#if isRelevantDetail(p.safety_equipment)}
								<span class="person-detail">Safety: {p.safety_equipment}</span>
							{/if}
							{#if isRelevantDetail(p.airbag_deployed)}
								<span class="person-detail">Airbag: {p.airbag_deployed}</span>
							{/if}
							{#if isRelevantDetail(p.ejection)}
								<span class="person-detail">Ejection: {p.ejection}</span>
							{/if}
							{#if isRelevantDetail(p.physical_condition)}
								<span class="person-detail">Condition: {p.physical_condition}</span>
							{/if}
							{#if isRelevantDetail(p.driver_action)}
								<span class="person-detail">Action: {p.driver_action}</span>
							{/if}
							{#if isRelevantDetail(p.driver_vision)}
								<span class="person-detail">Visibility: {p.driver_vision}</span>
							{/if}
							{#if isRelevantDetail(p.hospital)}
								<span class="person-detail">Hospital: {p.hospital}</span>
							{/if}
						</div>
					</div>

					<!-- Right: injury indicator -->
					{#if pLabel}
						<div class="person-injury">
							<span class="person-dot {injuryDotClass(pLevel)}"></span>
							<span class="person-injury-label {injuryTextClass(pLevel)}">{pLabel}</span>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</section>
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
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
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
		font-size: 1.25rem;
		font-weight: 600;
		color: #111827;
		word-break: break-word;
	}

	.hero-location {
		margin-top: 0.25rem;
		font-size: 0.875rem;
		color: #4b5563;
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
		text-align: right;
		flex-shrink: 0;
	}

	.hero-date {
		display: block;
		font-size: 0.875rem;
		color: #9ca3af;
	}

	.hero-age {
		font-size: 0.875rem;
		color: #9ca3af;
		font-style: italic;
	}

	.info-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	@media (min-width: 640px) {
		.info-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

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

	.info-title-tight {
		margin-bottom: 0.5rem;
	}

	.info-row {
		display: flex;
		justify-content: space-between;
		padding: 0.375rem 0;
		border-bottom: 1px solid #f3f4f6;
		font-size: 0.875rem;
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

	.info-label-regular {
		color: #6b7280;
	}

	.info-value {
		font-weight: 500;
		color: #1f2937;
	}

	.info-value-right {
		text-align: right;
		word-break: break-word;
	}

	.location-address {
		color: #111827;
		text-align: right;
		word-break: break-word;
		margin-left: 0.5rem;
	}

	.info-link {
		color: #2563eb;
		text-decoration: none;
	}

	.info-link:hover {
		color: #1e40af;
		text-decoration: underline;
	}

	.injury-block {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid #f3f4f6;
	}

	.injury-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1rem;
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

	.people-section {
		margin-bottom: 1.5rem;
	}

	.people-title {
		font-size: 0.875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #6b7280;
		margin-bottom: 0.75rem;
	}

	.people-count {
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
		margin-bottom: 0.5rem;
	}

	.people-card {
		background: #fff;
		border-radius: 0.75rem;
		border: 1px solid #e5e7eb;
		box-shadow: 0 1px 2px 0 rgb(15 23 42 / 0.05);
		overflow: hidden;
	}

	.people-empty {
		font-size: 0.875rem;
		color: #9ca3af;
		text-align: center;
		padding: 1rem 0;
	}

	.person-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.25rem 1rem;
		padding: 0.75rem 1rem;
	}

	.person-row + .person-row {
		border-top: 1px solid #f3f4f6;
	}

	.person-main {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.person-header {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.person-tag {
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.125rem 0.5rem;
		border-radius: 9999px;
		background: #f3f4f6;
		color: #374151;
	}

	.person-name {
		font-size: 0.875rem;
		color: #1f2937;
	}

	.person-vehicle {
		font-size: 0.75rem;
		color: #6b7280;
		margin-top: 0.125rem;
	}

	.person-details {
		display: flex;
		flex-wrap: wrap;
		gap: 0.125rem 0.75rem;
		margin-top: 0.25rem;
	}

	.person-detail {
		font-size: 0.75rem;
		color: #9ca3af;
		font-style: italic;
	}

	.person-injury {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-shrink: 0;
	}

	.person-dot {
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 9999px;
		display: inline-block;
	}

	.person-injury-label {
		font-size: 0.875rem;
	}
</style>
