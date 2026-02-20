<script lang="ts">
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
			<span class="footer-name">Chicago Crash Map</span>
		</div>
		<div class="footer-meta">
			<span>Data from the <a href="https://data.cityofchicago.org/" target="_blank" rel="noopener noreferrer" class="footer-link">Chicago Data Portal</a></span>
			<span class="footer-sep" aria-hidden="true">&middot;</span>
			<span>&copy; {year}</span>
		</div>
	</div>
</footer>

<style lang="postcss">
	@reference "$lib/styles/app.css";

	.site-footer {
		@apply mt-auto border-t border-gray-200 bg-gray-50 py-8;
	}

	.footer-inner {
		@apply max-w-7xl mx-auto px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-3;
	}

	.footer-brand {
		@apply flex items-center gap-1.5 text-gray-500;
	}

	.footer-icon {
		@apply w-4 h-4 text-blue-700 shrink-0;
	}

	.footer-name {
		@apply text-sm font-medium text-gray-600;
	}

	.footer-meta {
		@apply flex items-center gap-2 text-sm text-gray-500;
	}

	.footer-sep {
		@apply text-gray-300;
	}

	.footer-link {
		@apply text-gray-500 underline underline-offset-2 hover:text-blue-700 transition-colors;
	}
</style>
