<script lang="ts">
	import Dashboard from '$lib/components/Dashboard.svelte';
	import { SITE_NAME } from '$lib/constants';
</script>

<svelte:head>
	<title>{SITE_NAME}</title>
</svelte:head>

<Dashboard />
