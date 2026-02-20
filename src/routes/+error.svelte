<script>
	import { page } from '$app/state';
	import { base } from '$app/paths';
</script>

<div class="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
	<div class="text-5xl mb-4" aria-hidden="true">
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-14 h-14 text-yellow-400 mx-auto">
			<path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5z" clip-rule="evenodd" />
		</svg>
	</div>

	<p class="text-6xl font-bold text-gray-200 mb-2">{page.status}</p>

	<h1 class="text-xl font-semibold text-gray-900 mb-2">
		{page.status === 404 ? 'Page Not Found' : page.error?.message || 'Something Went Wrong'}
	</h1>

	<p class="text-sm text-gray-500 mb-8">
		{#if page.status === 404}
			The crash record or location you requested doesn't exist.
		{:else}
			An unexpected error occurred. Please try again later.
		{/if}
	</p>

	<a
		href="{base}/"
		class="inline-flex items-center px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 transition-colors"
	>
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 mr-1.5" aria-hidden="true">
			<path fill-rule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10z" clip-rule="evenodd" />
		</svg>
		Back to Home
	</a>
</div>
