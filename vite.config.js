import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],

	test: {
		include: ['tests/**/*.{test,spec}.{js,ts}'],
		exclude: ['tests/e2e/**']
	}
});
