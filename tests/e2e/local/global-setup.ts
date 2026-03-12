import type { FullConfig } from '@playwright/test';

export default async function globalSetup(_config: FullConfig) {
	console.error(
		'[playwright live] These tests expect http://localhost:5173 and http://localhost:8282 to already be running.'
	);
}
