<script lang="ts">
	import type { Incident, Person } from '$lib/incident';
	import { currentAgeSimplified, prettifyInteger } from '$lib/transformHelpers';

	let { incident, neighborhood, ward } = $props<{
		incident: Incident | null;
		neighborhood: { id: string; name: string } | null;
		ward: { id: string; name: string } | null;
	}>();

	// ── severity helpers ────────────────────────────────────────────────────────

	function severityLevel(inc: Incident): 'fatal' | 'serious' | 'minor' | 'none' {
		if (inc.isFatal) return 'fatal';
		if (inc.injuries_incapacitating > 0) return 'serious';
		if ((inc.injuries_non_incapacitating ?? 0) > 0) return 'minor';
		return 'none';
	}

	function heroBorderClass(lvl: ReturnType<typeof severityLevel>): string {
		if (lvl === 'fatal') return 'border-l-red-600';
		if (lvl === 'serious') return 'border-l-purple-600';
		if (lvl === 'minor') return 'border-l-amber-500';
		return 'border-l-gray-200';
	}

	function badgeBgClass(lvl: ReturnType<typeof severityLevel>): string {
		if (lvl === 'fatal') return 'bg-red-100 text-red-700';
		if (lvl === 'serious') return 'bg-purple-100 text-purple-700';
		if (lvl === 'minor') return 'bg-amber-100 text-amber-700';
		return 'bg-gray-100 text-gray-600';
	}

	function badgeLabel(lvl: ReturnType<typeof severityLevel>): string {
		if (lvl === 'fatal') return 'Fatal';
		if (lvl === 'serious') return 'Serious';
		if (lvl === 'minor') return 'Minor';
		return 'No injury';
	}

	// ── person helpers ──────────────────────────────────────────────────────────

	function injuryLevel(p: Person): 'fatal' | 'serious' | 'minor' | 'unclear' | 'none' | 'unknown' {
		const lvl = p.injury_level;
		if (lvl === 'fatal') return 'fatal';
		if (lvl === 'incapacitating') return 'serious';
		if (lvl === 'non-incapacitating') return 'minor';
		if (lvl === 'unclear') return 'unclear';
		if (lvl === 'none') return 'none';
		return 'unknown';
	}

	function injuryDotClass(p: Person): string {
		const lvl = injuryLevel(p);
		if (lvl === 'fatal') return 'bg-red-600';
		if (lvl === 'serious') return 'bg-purple-600';
		if (lvl === 'minor') return 'bg-amber-500';
		if (lvl === 'none') return 'bg-green-600';
		return 'bg-gray-400';
	}

	function injuryTextClass(p: Person): string {
		const lvl = injuryLevel(p);
		if (lvl === 'fatal') return 'text-red-600 font-semibold';
		if (lvl === 'serious') return 'text-purple-600 font-semibold';
		if (lvl === 'minor') return 'text-amber-600';
		if (lvl === 'none') return 'text-green-600';
		return 'text-gray-400';
	}

	function outcomeText(p: Person): string | null {
		switch (p.injury_level) {
			case 'fatal':
				return 'Fatal';
			case 'incapacitating':
				return 'Serious';
			case 'non-incapacitating':
				return 'Minor';
			case 'none':
				return 'Uninjured';
			case 'unclear':
				return 'Not evident';
			default:
				return null;
		}
	}

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

	const severity = $derived(incident ? severityLevel(incident) : 'none');

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
</script>

{#if incident}
	<!-- ── Hero card ─────────────────────────────────────────────────────────── -->
	<div class="rounded-xl border-l-4 border border-gray-200 bg-white p-6 mb-6 shadow-sm {heroBorderClass(severity)}">
		<div class="flex items-start justify-between gap-4">
			<div class="flex-1 min-w-0">
				<!-- Severity badge + optional hit-and-run -->
				<div class="flex flex-wrap gap-2 mb-2">
					<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase {badgeBgClass(severity)}">
						{badgeLabel(severity)}
					</span>
					{#if incident.hit_and_run}
						<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-amber-100 text-amber-700">
							Hit & Run
						</span>
					{/if}
				</div>

				<!-- Primary cause -->
				<p class="text-xl font-semibold text-gray-900 mt-2">{incident.primary_cause}</p>

				<!-- Location line -->
				<p class="text-sm text-gray-600 mt-1">
					{address}{#if ward || neighborhood}&ensp;·&ensp;{/if}{#if ward}<a href="/wards/{ward.id}" class="hover:underline text-blue-600">{ward.name}</a>{/if}{#if ward && neighborhood}&ensp;·&ensp;{/if}{#if neighborhood}<a href="/neighborhoods/{neighborhood.id}" class="hover:underline text-blue-600">{neighborhood.name}</a>{/if}
				</p>
			</div>

			<!-- Date / age aligned right -->
			<div class="text-right flex-shrink-0">
				<time datetime={incident.date.toISOString()} class="text-sm text-gray-400 block">{incident.prettyDate}</time>
				<span class="text-sm text-gray-400 italic">{currentAgeSimplified(incident.date)}</span>
			</div>
		</div>
	</div>

	<!-- ── Info grid ─────────────────────────────────────────────────────────── -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
		<!-- Conditions card -->
		<div class="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
			<p class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Conditions</p>

			{#if incident.weather_condition}
				<div class="flex justify-between py-1.5 border-b border-gray-100 text-sm">
					<span class="text-gray-500">Weather</span>
					<span class="text-gray-900 text-right">{incident.weather_condition}</span>
				</div>
			{/if}

			{#if incident.trafficway_type}
				<div class="flex justify-between py-1.5 border-b border-gray-100 text-sm">
					<span class="text-gray-500">Trafficway</span>
					<span class="text-gray-900 text-right">{incident.trafficway_type}</span>
				</div>
			{/if}

			{#if incident.posted_speed_limit}
				<div class="flex justify-between py-1.5 border-b border-gray-100 text-sm">
					<span class="text-gray-500">Speed limit</span>
					<span class="text-gray-900">{incident.posted_speed_limit} mph</span>
				</div>
			{/if}

			<div class="flex justify-between py-1.5 border-b border-gray-100 last:border-0 text-sm">
				<span class="text-gray-500">Crash type</span>
				<span class="text-gray-900 text-right">{incident.category}</span>
			</div>

			{#if showSecondaryCause}
				<div class="flex justify-between py-1.5 last:border-0 text-sm">
					<span class="text-gray-500">Secondary cause</span>
					<span class="text-gray-900 text-right">{incident.secondary_cause}</span>
				</div>
			{/if}
		</div>

		<!-- Location card -->
		<div class="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
			<p class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Location</p>

			<div class="flex justify-between py-1.5 border-b border-gray-100 text-sm">
				<span class="text-gray-500">Address</span>
				<span class="text-gray-900 text-right">{address}</span>
			</div>

			{#if ward}
				<div class="flex justify-between py-1.5 border-b border-gray-100 last:border-0 text-sm">
					<span class="text-gray-500">Ward</span>
					<a href="/wards/{ward.id}" class="text-blue-600 hover:text-blue-800 hover:underline">{ward.name}</a>
				</div>
			{/if}

			{#if neighborhood}
				<div class="flex justify-between py-1.5 last:border-0 text-sm">
					<span class="text-gray-500">Neighborhood</span>
					<a href="/neighborhoods/{neighborhood.id}" class="text-blue-600 hover:text-blue-800 hover:underline">{neighborhood.name}</a>
				</div>
			{/if}

			{#if injuryCategories.length > 0}
				<div class="mt-3 pt-3 border-t border-gray-100">
					<p class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Injuries</p>
					<div class="flex flex-wrap gap-x-4 gap-y-1">
						{#each injuryCategories as cat}
							<div class="flex items-center gap-1.5">
								<span class="w-2 h-2 rounded-full inline-block {cat.color}"></span>
								<span class="text-xs text-gray-600">{cat.count} {cat.label}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- ── People Involved ───────────────────────────────────────────────────── -->
	{#if incident.vehicles.length > 0 || incident.non_passengers.length > 0}
		<section class="mb-6">
			<h2 class="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">People Involved</h2>

			<div class="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 shadow-sm">
				{#each incident.vehicles as vh}
					{#each vh.passengers as p}
						<div class="flex items-center justify-between px-4 py-3 gap-4">
							<!-- Left: role + vehicle info -->
							<div class="flex flex-col min-w-0">
								<div class="flex items-center gap-2 flex-wrap">
									{#if p.person_type}
										<span class="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{p.person_type}</span>
									{/if}
									<span class="text-sm text-gray-800">{p.description}</span>
								</div>
								{#if vh.description}
									<span class="text-xs text-gray-500 mt-0.5">{vh.description}</span>
								{/if}
								<!-- Relevant extra details -->
								<div class="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
									{#if isRelevantDetail(p.safety_equipment)}
										<span class="text-xs text-gray-400 italic">Safety: {p.safety_equipment}</span>
									{/if}
									{#if isRelevantDetail(p.airbag_deployed)}
										<span class="text-xs text-gray-400 italic">Airbag: {p.airbag_deployed}</span>
									{/if}
									{#if isRelevantDetail(p.ejection)}
										<span class="text-xs text-gray-400 italic">Ejection: {p.ejection}</span>
									{/if}
									{#if isRelevantDetail(p.physical_condition)}
										<span class="text-xs text-gray-400 italic">Condition: {p.physical_condition}</span>
									{/if}
									{#if isRelevantDetail(p.driver_action)}
										<span class="text-xs text-gray-400 italic">Action: {p.driver_action}</span>
									{/if}
									{#if isRelevantDetail(p.driver_vision)}
										<span class="text-xs text-gray-400 italic">Visibility: {p.driver_vision}</span>
									{/if}
									{#if isRelevantDetail(p.hospital)}
										<span class="text-xs text-gray-400 italic">Hospital: {p.hospital}</span>
									{/if}
								</div>
							</div>

							<!-- Right: injury indicator -->
							{#if outcomeText(p)}
								<div class="flex items-center gap-1.5 flex-shrink-0">
									<span class="w-2.5 h-2.5 rounded-full inline-block {injuryDotClass(p)}"></span>
									<span class="text-sm {injuryTextClass(p)}">{outcomeText(p)}</span>
								</div>
							{/if}
						</div>
					{/each}
				{/each}

				{#each incident.non_passengers as p}
					<div class="flex items-center justify-between px-4 py-3 gap-4">
						<!-- Left: role + description -->
						<div class="flex flex-col min-w-0">
							<div class="flex items-center gap-2 flex-wrap">
								{#if p.person_type}
									<span class="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{p.person_type}</span>
								{/if}
								<span class="text-sm text-gray-800">{p.description}</span>
							</div>
							<!-- Relevant extra details -->
							<div class="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
								{#if isRelevantDetail(p.safety_equipment)}
									<span class="text-xs text-gray-400 italic">Safety: {p.safety_equipment}</span>
								{/if}
								{#if isRelevantDetail(p.airbag_deployed)}
									<span class="text-xs text-gray-400 italic">Airbag: {p.airbag_deployed}</span>
								{/if}
								{#if isRelevantDetail(p.ejection)}
									<span class="text-xs text-gray-400 italic">Ejection: {p.ejection}</span>
								{/if}
								{#if isRelevantDetail(p.physical_condition)}
									<span class="text-xs text-gray-400 italic">Condition: {p.physical_condition}</span>
								{/if}
								{#if isRelevantDetail(p.driver_action)}
									<span class="text-xs text-gray-400 italic">Action: {p.driver_action}</span>
								{/if}
								{#if isRelevantDetail(p.driver_vision)}
									<span class="text-xs text-gray-400 italic">Visibility: {p.driver_vision}</span>
								{/if}
								{#if isRelevantDetail(p.hospital)}
									<span class="text-xs text-gray-400 italic">Hospital: {p.hospital}</span>
								{/if}
							</div>
						</div>

						<!-- Right: injury indicator -->
						{#if outcomeText(p)}
							<div class="flex items-center gap-1.5 flex-shrink-0">
								<span class="w-2.5 h-2.5 rounded-full inline-block {injuryDotClass(p)}"></span>
								<span class="text-sm {injuryTextClass(p)}">{outcomeText(p)}</span>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</section>
	{/if}
{/if}
