<script lang="ts">
	import '$lib/styles/app.css';
	import '$lib/vendor/fontawesome.js';
	import { dev } from '$app/environment';
	import SiteHeader from '$lib/components/layout/SiteHeader.svelte';
	import SiteFooter from '$lib/components/layout/SiteFooter.svelte';

	let { children } = $props();

	let envClass = dev ? 'env-dev' : 'env-prod';
</script>

<div class="app-shell {envClass}">
	<SiteHeader />
	<main class="flex-1">
		<div class="max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8">
			{@render children()}
		</div>
	</main>
	<SiteFooter />
</div>

<style>
	.app-shell {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background-color: rgb(249 250 251); /* gray-50 */
		font-family:
			'Inter',
			system-ui,
			-apple-system,
			sans-serif;
	}

	.app-shell.env-dev {
		outline: 4px solid rgb(250 204 21); /* yellow-400 */
		outline-offset: -4px;
	}
</style>
