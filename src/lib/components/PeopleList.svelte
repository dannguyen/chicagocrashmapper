<script lang="ts">
	import type { Person } from '$lib/incident';

	let { people, listClass = 'incident-list incident-list--dense' } = $props<{
		people: Person[];
		listClass?: string;
	}>();
</script>

{#if people.length > 0}
	<ul class={listClass}>
		{#each people as po}
			<li class="person">
				<span class="incident-item-label">{po.description}</span>
				{#if po.person_type}
					<span class="incident-item-role">({po.person_type})</span>
				{/if}

				{#if po.isInjured}
					suffered <span class="injury injury-{po.injury_level}">{po.injury}</span>
				{:else if po.isUninjured}
					was <span class="injury injury-uninjured"> uninjured </span>
				{:else}
					suffered <span class="injury injury-unknown"> an unknown/unclear injury </span>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

<style lang="postcss">
	@reference "$lib/styles/app.css";

	.person .injury {
		@apply font-semibold;
	}

	.injury-fatal {
		@apply ml-1 text-red-700;
	}

	.injury-incapacitating {
		@apply ml-1 text-orange-700;
	}
</style>
