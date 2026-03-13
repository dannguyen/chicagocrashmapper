<script lang="ts">
	import type { Crash } from '$lib/models/crash';
	import type { Vehicle } from '$lib/models/vehicle';
	import { personInjuryLevel, injuryLabel } from '$lib/severity';

	let { crash } = $props<{ crash: Crash }>();

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

	const peopleCount = $derived(
		crash.vehicles.reduce((sum: number, vh: Vehicle) => sum + vh.passengers.length, 0) +
			crash.non_passengers.length
	);
</script>

<div class="info-card people-card">
	<p class="info-title">People Involved</p>

	{#if peopleCount > 0}
		<p class="people-count">{peopleCount} {peopleCount === 1 ? 'person' : 'people'} involved</p>
	{/if}

	{#if peopleCount === 0}
		<p class="people-empty">No people records available</p>
	{/if}

	{#each crash.vehicles as vh}
		{#each vh.passengers as p}
			{@const pLevel = personInjuryLevel(p)}
			{@const pLabel = injuryLabel(pLevel)}
			{@const vehicleDesc = [vh.vehicle_year, vh.make, vh.model]
				.filter((x) => x != null && x !== '')
				.join(' ')}
			<div class="person-row">
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

				{#if pLabel}
					<div class="person-injury">
						<span class="person-dot" data-injury={pLevel}></span>
						<span class="person-injury-label" data-injury={pLevel}>{pLabel}</span>
					</div>
				{/if}
			</div>
		{/each}
	{/each}

	{#each crash.non_passengers as p}
		{@const pLevel = personInjuryLevel(p)}
		{@const pLabel = injuryLabel(pLevel)}
		<div class="person-row">
			<div class="person-main">
				<div class="person-header">
					{#if p.person_type}
						<span class="person-tag">{p.person_type}</span>
					{/if}
					<span class="person-name">{p.description}</span>
				</div>
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

			{#if pLabel}
				<div class="person-injury">
					<span class="person-dot" data-injury={pLevel}></span>
					<span class="person-injury-label" data-injury={pLevel}>{pLabel}</span>
				</div>
			{/if}
		</div>
	{/each}
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

	.people-count {
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
		margin-bottom: 0.5rem;
	}

	.people-card {
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
		flex-direction: column;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.75rem 0;
	}

	@media (min-width: 640px) {
		.person-row {
			flex-direction: row;
			align-items: center;
			flex-wrap: wrap;
			gap: 0.25rem 1rem;
			padding: 0.75rem 1rem;
		}
	}

	.person-row + .person-row {
		border-top: 1px solid #f3f4f6;
	}

	.person-main {
		display: flex;
		flex-direction: column;
		min-width: 0;
		width: 100%;
	}

	@media (min-width: 640px) {
		.person-main {
			width: auto;
		}
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
		overflow-wrap: anywhere;
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
		align-self: flex-start;
	}

	@media (min-width: 640px) {
		.person-injury {
			align-self: center;
		}
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
