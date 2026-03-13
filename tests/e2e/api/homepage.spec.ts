import { test, expect } from '@playwright/test';
import { SITE_TITLE, SITE_SUBTITLE } from '$lib/constants';

async function stubHomepageApi(page: import('@playwright/test').Page) {
	await page.route('**/api/**', async (route) => {
		const url = new URL(route.request().url());
		if (!url.pathname.startsWith('/api/')) {
			await route.continue();
			return;
		}

		const responseBody = (() => {
			switch (url.pathname) {
				case '/api/crashes/brief':
					return { response: { total: 0, crashes: [] } };
				case '/api/crashes/date-count':
				case '/api/crashes/ytd-comparison':
					return { response: { unit: 'day', last: 0, periods: {} } };
				default:
					return { response: {} };
			}
		})();

		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(responseBody)
		});
	});
}

test.describe('homepage smoke test', () => {
	test('shows the site name in the title and primary heading', async ({ page }) => {
		await stubHomepageApi(page);

		await page.goto('/');

		await expect(page).toHaveTitle(`${SITE_TITLE} | ${SITE_SUBTITLE}`);
		await expect(page.locator('h1#site-title')).toHaveText('Chicago Crash Mapper', {
			timeout: 4000
		});
	});
});
