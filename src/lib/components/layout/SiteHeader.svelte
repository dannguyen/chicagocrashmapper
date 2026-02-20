<script lang="ts">
	import { base } from '$app/paths';
	import SiteNav from '$lib/components/layout/SiteNav.svelte';

	let mobileMenuOpen = $state(false);

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}
</script>

<header class="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
	<div class="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
		<!-- Wordmark -->
		<a href="{base}/" class="flex items-center gap-2 text-gray-900 no-underline shrink-0">
			<svg class="w-5 h-5 text-blue-700 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<path
					d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
					fill="currentColor"
				/>
			</svg>
			<span class="font-bold text-lg leading-none">Chicago Crash Map</span>
		</a>

		<!-- Desktop nav links -->
		<nav class="hidden md:flex items-center gap-6" aria-label="Site navigation">
			<a href="{base}/neighborhoods" class="text-sm font-medium text-gray-600 hover:text-blue-700 transition-colors no-underline">Neighborhoods</a>
			<a href="{base}/wards" class="text-sm font-medium text-gray-600 hover:text-blue-700 transition-colors no-underline">Wards</a>
			<a href="{base}/intersections" class="text-sm font-medium text-gray-600 hover:text-blue-700 transition-colors no-underline">Intersections</a>
		</nav>

		<!-- Mobile hamburger -->
		<button
			class="md:hidden flex items-center justify-center w-11 h-11 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors p-2.5 -mr-2"
			onclick={toggleMobileMenu}
			aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
			aria-expanded={mobileMenuOpen}
		>
			{#if mobileMenuOpen}
				<!-- X icon -->
				<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			{:else}
				<!-- Hamburger icon -->
				<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			{/if}
		</button>
	</div>

	<!-- Search bar — always visible below the wordmark row -->
	<div class="border-t border-gray-100 bg-gray-50/80">
		<div class="max-w-7xl mx-auto px-4 md:px-6 py-2 min-w-0">
			<SiteNav />
		</div>
	</div>

	<!-- Mobile nav drawer -->
	{#if mobileMenuOpen}
		<nav class="md:hidden flex flex-col border-t border-gray-200 bg-white" aria-label="Mobile site navigation">
			<a href="{base}/neighborhoods" class="px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-700 transition-colors no-underline border-b border-gray-100 last:border-b-0 min-h-[44px] flex items-center" onclick={() => (mobileMenuOpen = false)}>Neighborhoods</a>
			<a href="{base}/wards" class="px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-700 transition-colors no-underline border-b border-gray-100 last:border-b-0 min-h-[44px] flex items-center" onclick={() => (mobileMenuOpen = false)}>Wards</a>
			<a href="{base}/intersections" class="px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-700 transition-colors no-underline border-b border-gray-100 last:border-b-0 min-h-[44px] flex items-center" onclick={() => (mobileMenuOpen = false)}>Intersections</a>
		</nav>
	{/if}
</header>
