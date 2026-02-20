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
	<main class="main-content">
		<div class="page-container">
			{@render children()}
		</div>
	</main>
	<SiteFooter />
</div>

<style lang="postcss">
	@reference "$lib/styles/app.css";

	.app-shell {
		@apply min-h-screen flex flex-col bg-gray-50 font-sans;
	}

	.app-shell.env-dev {
		@apply outline outline-4 outline-yellow-400 outline-offset-[-4px];
	}

	.main-content {
		@apply flex-1;
	}

	.page-container {
		@apply max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8;
	}
</style>
