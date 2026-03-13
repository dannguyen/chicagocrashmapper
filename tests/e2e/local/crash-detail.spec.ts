import { expect, test } from '@playwright/test';

const CRASH_ID =
	'9fdde50fa1994886407e0a080b850ee59473904170450c2e547103eead31de55e10eaa2a8ca2a54e43268127a57ff153d29a60da51161afeae0483e1aa031a88';

test.describe('crash detail live route', () => {
	test('shows the expected address for the known crash record', async ({ page }) => {
		await page.goto(`/crashes/${CRASH_ID}`);

		await expect(page.locator('.hero-location')).toContainText('4000 W FOSTER AVE');
	});
});
