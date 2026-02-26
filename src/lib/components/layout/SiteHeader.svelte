<script lang="ts">
	import { base } from '$app/paths';
	import SiteNav from '$lib/components/layout/SiteNav.svelte';
	import { SITE_NAME } from '$lib/constants';

	let mobileMenuOpen = $state(false);

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}
</script>

<header class="site-header">
	<div class="header-row">
		<!-- Wordmark -->
		<a href="{base}/" class="header-brand">
			<svg class="brand-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<path
					d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
					fill="currentColor"
				/>
			</svg>
			<span class="brand-title">{SITE_NAME}</span>
		</a>

		<!-- Desktop nav links -->
		<nav class="desktop-nav" aria-label="Site navigation">
			<a href="{base}/neighborhoods" class="nav-link">Neighborhoods</a>
			<a href="{base}/wards" class="nav-link">Wards</a>
			<a href="{base}/intersections" class="nav-link">Intersections</a>
		</nav>

		<!-- Mobile hamburger -->
		<button
			class="mobile-toggle"
			onclick={toggleMobileMenu}
			aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
			aria-expanded={mobileMenuOpen}
		>
			{#if mobileMenuOpen}
				<!-- X icon -->
				<svg
					class="toggle-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			{:else}
				<!-- Hamburger icon -->
				<svg
					class="toggle-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			{/if}
		</button>
	</div>

	<!-- Search bar — always visible below the wordmark row -->
	<div class="search-bar">
		<div class="search-inner">
			<SiteNav />
		</div>
	</div>

	<!-- Mobile nav drawer -->
	{#if mobileMenuOpen}
		<nav class="mobile-nav" aria-label="Mobile site navigation">
			<a href="{base}/neighborhoods" class="mobile-link" onclick={() => (mobileMenuOpen = false)}
				>Neighborhoods</a
			>
			<a href="{base}/wards" class="mobile-link" onclick={() => (mobileMenuOpen = false)}>Wards</a>
			<a href="{base}/intersections" class="mobile-link" onclick={() => (mobileMenuOpen = false)}
				>Intersections</a
			>
		</nav>
	{/if}
</header>

<style>
	.site-header {
		position: sticky;
		top: 0;
		z-index: 50;
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(8px);
		border-bottom: 1px solid #e5e7eb;
	}

	.header-row {
		max-width: 80rem;
		margin: 0 auto;
		padding: 0 1rem;
		height: 3.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	@media (min-width: 768px) {
		.header-row {
			padding: 0 1.5rem;
		}
	}

	.header-brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #111827;
		text-decoration: none;
		flex-shrink: 0;
	}

	.brand-icon {
		width: 1.25rem;
		height: 1.25rem;
		color: #1d4ed8;
		flex-shrink: 0;
	}

	.brand-title {
		font-size: 1.125rem;
		font-weight: 700;
		line-height: 1;
	}

	.desktop-nav {
		display: none;
		align-items: center;
		gap: 1.5rem;
	}

	@media (min-width: 768px) {
		.desktop-nav {
			display: flex;
		}
	}

	.nav-link {
		font-size: 0.875rem;
		font-weight: 500;
		color: #4b5563;
		text-decoration: none;
		transition: color 120ms ease;
	}

	.nav-link:hover {
		color: #1d4ed8;
	}

	.mobile-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.75rem;
		height: 2.75rem;
		border-radius: 0.5rem;
		color: #4b5563;
		background: transparent;
		border: none;
		padding: 0.625rem;
		margin-right: -0.5rem;
		transition:
			color 120ms ease,
			background-color 120ms ease;
	}

	.mobile-toggle:hover {
		color: #111827;
		background: #f3f4f6;
	}

	@media (min-width: 768px) {
		.mobile-toggle {
			display: none;
		}
	}

	.toggle-icon {
		width: 1.25rem;
		height: 1.25rem;
	}

	.search-bar {
		border-top: 1px solid #f3f4f6;
		background: rgba(249, 250, 251, 0.8);
	}

	.search-inner {
		max-width: 80rem;
		margin: 0 auto;
		padding: 0.5rem 1rem;
		min-width: 0;
	}

	@media (min-width: 768px) {
		.search-inner {
			padding: 0.5rem 1.5rem;
		}
	}

	.mobile-nav {
		display: flex;
		flex-direction: column;
		border-top: 1px solid #e5e7eb;
		background: #fff;
	}

	@media (min-width: 768px) {
		.mobile-nav {
			display: none;
		}
	}

	.mobile-link {
		padding: 0.75rem 1rem;
		font-size: 1rem;
		font-weight: 500;
		color: #374151;
		text-decoration: none;
		border-bottom: 1px solid #f3f4f6;
		min-height: 44px;
		display: flex;
		align-items: center;
		transition:
			color 120ms ease,
			background-color 120ms ease;
	}

	.mobile-link:last-child {
		border-bottom: 0;
	}

	.mobile-link:hover {
		background: #f9fafb;
		color: #1d4ed8;
	}
</style>
