<script lang="ts">
	import LocationDetail from '$lib/components/LocationDetail.svelte';
	import { base } from '$app/paths';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
	const location = $derived(data.location);

	type BadgeStyle = { label: string; classes: string };

	function categoryBadge(category: string): BadgeStyle {
		switch (category) {
			case 'neighborhood':
				return { label: 'Neighborhood', classes: 'bg-blue-100 text-blue-700' };
			case 'ward':
				return { label: 'Ward', classes: 'bg-orange-100 text-orange-700' };
			case 'intersection':
				return { label: 'Intersection', classes: 'bg-gray-100 text-gray-600' };
			default:
				return { label: category, classes: 'bg-gray-100 text-gray-600' };
		}
	}
</script>

<svelte:head>
	<title>{location?.name ?? 'Location'} — Chicago Crash Map</title>
</svelte:head>

<div class="mb-6">
	<nav class="text-sm text-gray-500 mb-2">
		<a
			href="{base}/{location.pluralCategory}"
			class="text-blue-600 hover:text-blue-800 capitalize"
		>
			{location.pluralCategory}
		</a>
		<span class="mx-1.5 text-gray-400">/</span>
		<span class="text-gray-700">{location.name}</span>
	</nav>

	<div class="flex items-center gap-3 flex-wrap">
		<h1 class="text-2xl font-bold text-gray-900">{location.name}</h1>
		<span
			class="text-xs px-2.5 py-1 rounded-full font-medium {categoryBadge(location.category).classes}"
		>
			{categoryBadge(location.category).label}
		</span>
	</div>
</div>

<LocationDetail {location} />
