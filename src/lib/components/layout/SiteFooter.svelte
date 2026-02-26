<script lang="ts">
	import { SITE_NAME } from '$lib/constants';
	const year = new Date().getFullYear();
</script>

<footer class="site-footer">
	<div class="footer-inner">
		<div class="footer-brand">
			<svg class="footer-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<path
					d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
					fill="currentColor"
				/>
			</svg>
			<span class="footer-title">{SITE_NAME}</span>
		</div>
		<div class="footer-meta">
			<span
				>Data from the <a
					href="https://data.cityofchicago.org/Transportation/Traffic-Crashes-Crashes/85ca-t3if/about_data"
					target="_blank"
					rel="noopener"
					class="footer-link">Chicago Data Portal: Traffic Crashes</a
				></span
			>
			<span class="footer-divider" aria-hidden="true">&middot;</span>
			<span>&copy; {year}</span>
		</div>
	</div>
</footer>

<style>
	.site-footer {
		margin-top: auto;
		border-top: 1px solid #e5e7eb;
		background: #f9fafb;
		padding: 2rem 0;
	}

	.footer-inner {
		max-width: 80rem;
		margin: 0 auto;
		padding: 0 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	@media (min-width: 640px) {
		.footer-inner {
			flex-direction: row;
			padding: 0 1.5rem;
		}
	}

	.footer-brand {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		color: #6b7280;
	}

	.footer-icon {
		width: 1rem;
		height: 1rem;
		color: #1d4ed8;
		flex-shrink: 0;
	}

	.footer-title {
		font-size: 0.875rem;
		font-weight: 500;
		color: #4b5563;
	}

	.footer-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.footer-link {
		color: inherit;
		text-decoration: underline;
		text-underline-offset: 2px;
		transition: color 120ms ease;
	}

	.footer-link:hover {
		color: #1d4ed8;
	}

	.footer-divider {
		color: #d1d5db;
	}
</style>
