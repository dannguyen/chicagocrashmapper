import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e/local',
	globalSetup: './tests/e2e/local/global-setup.ts',
	timeout: 30000,
	expect: {
		timeout: 15000
	},
	use: {
		baseURL: 'http://localhost:5173',
		headless: true
	}
});
