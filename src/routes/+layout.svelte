<script lang="ts">
	import '$lib/styles/app.css';
	import '$lib/vendor/fontawesome.js';
	import { page } from '$app/state';
	import SiteHeader from '$lib/components/layout/SiteHeader.svelte';
	import SiteFooter from '$lib/components/layout/SiteFooter.svelte';
	import SiteNav from '$lib/components/layout/SiteNav.svelte';

	let { children } = $props();

	let isHomepage = $derived(page.url.pathname === '/');
</script>

<div class="app-shell">
	<SiteHeader />
	<main class="flex-1">
		<div class="max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8">
			{@render children()}
		</div>
	</main>
	{#if !isHomepage}
		<div class="bottom-search">
			<div class="bottom-search-inner">
				<SiteNav />
			</div>
		</div>
	{/if}
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

	.bottom-search {
		border-top: 1px solid #e5e7eb;
		background: #fff;
		padding: 1rem 0;
	}

	.bottom-search-inner {
		max-width: 80rem;
		margin: 0 auto;
		padding: 0 1rem;
	}

	@media (min-width: 768px) {
		.bottom-search-inner {
			padding: 0 1.5rem;
		}
	}
</style>
