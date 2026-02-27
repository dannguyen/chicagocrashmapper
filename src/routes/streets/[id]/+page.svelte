<script lang="ts">
	import LocationDetail from '$lib/components/LocationDetail.svelte';
	import { SITE_NAME } from '$lib/constants';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
	const location = $derived(data.location);
</script>

<svelte:head>
	<title>{location?.name ?? 'Street'} — {SITE_NAME}</title>
</svelte:head>

<div class="mb-6">
	<nav class="text-sm text-gray-500 mb-2">
		<span class="capitalize text-gray-600">streets</span>
		<span class="mx-1.5 text-gray-400">/</span>
		<span class="text-gray-700">{location.name}</span>
	</nav>

	<div class="flex items-center gap-3 flex-wrap">
		<h1 class="text-2xl font-bold text-gray-900">{location.name}</h1>
		<span class="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-600">
			Street
		</span>
	</div>
</div>

<LocationDetail {location} />
