import { test, expect } from '@playwright/test';

const currentYear = new Date().getFullYear();

test.describe('homepage live narrative header', () => {
	test(`prints the current year [${currentYear}] in the narrative text`, async ({ page }) => {
		await page.goto('/');

		await expect(page.getByText(new RegExp(`So far in\\s+${currentYear}`))).toBeVisible();
	});
});

test.describe('homepage live: yearly tally table', () => {
	test(`shows the current year [${currentYear}] in the first row of the yearly table`, async ({
		page
	}) => {
		await page.goto('/');
		const firstYearCell = page.locator('table.year-table tbody tr').first().locator('td.col-year');
		await expect(firstYearCell).toHaveText(String(currentYear));
	});

	test('shows 2018 in the year column of the yearly table', async ({ page }) => {
		await page.goto('/');

		await expect(page.locator('table.year-table tbody td.col-year')).toContainText(['2018']);
	});
});
