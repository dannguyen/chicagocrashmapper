<script lang="ts">
	import '$lib/styles/app.css';
	import SiteHeader from '$lib/components/layout/SiteHeader.svelte';
	import SiteFooter from '$lib/components/layout/SiteFooter.svelte';
	import SiteNav from '$lib/components/layout/SiteNav.svelte';

	let { children } = $props();
</script>

<div class="app-shell">
	<SiteHeader />
	<div class="top-search">
		<div class="top-search-inner">
			<SiteNav />
		</div>
	</div>
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

	.top-search {
		border-bottom: 1px solid #e5e7eb;
		background: #fff;
		padding: 0.5rem 0;
	}

	.top-search-inner {
		max-width: 80rem;
		margin: 0 auto;
		padding: 0 1rem;
	}

	@media (min-width: 768px) {
		.top-search-inner {
			padding: 0 1.5rem;
		}
	}
</style>
