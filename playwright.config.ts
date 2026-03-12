import { defineConfig } from '@playwright/test';

const profile = process.env.PLAYWRIGHT_PROFILE;

export default defineConfig({
	testDir: './tests/e2e',
	timeout: 30000,
	expect: {
		timeout: 15000
	},
	...(profile === 'local'
		? {}
		: {
				webServer: {
					command: 'npm run dev -- --host 127.0.0.1 --port 4173',
					url: 'http://127.0.0.1:4173',
					reuseExistingServer: !process.env.CI,
					timeout: 120 * 1000
				}
			}),
	...(profile === 'local' ? { globalSetup: './tests/e2e/local/global-setup.ts' } : {}),
	projects: [
		{
			name: 'api',
			testMatch: ['api/**/*.spec.ts'],
			use: {
				baseURL: 'http://127.0.0.1:4173',
				headless: true
			}
		},
		{
			name: 'local',
			testMatch: ['local/**/*.spec.ts'],
			use: {
				baseURL: 'http://localhost:5173',
				headless: true
			}
		}
	]
});
