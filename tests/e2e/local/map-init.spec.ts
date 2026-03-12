import { test, expect } from '@playwright/test';

test('location page initializes map layers on first visit', async ({ page }) => {
	await page.goto('/neighborhoods');

	const firstLocationLink = page.locator('table tbody tr a').first();
	await expect(firstLocationLink).toBeVisible();
	await firstLocationLink.click();

	await page.waitForURL(/\/neighborhoods\/.+/);
	await expect(page.locator('#map[data-map-ready="true"]')).toBeVisible();
	await expect(page.locator('#map[data-active-location-kind="shape"]')).toBeVisible();
	await expect(page.locator('#map canvas.maplibregl-canvas')).toBeVisible();
});

test('deep link initializes database and map', async ({ page, context }) => {
	await page.goto('/neighborhoods');
	const firstLocationLink = page.locator('table tbody tr a').first();
	const href = await firstLocationLink.getAttribute('href');
	expect(href).toBeTruthy();

	const newPage = await context.newPage();
	await newPage.goto(href as string);

	await expect(newPage.locator('#map[data-map-ready="true"]')).toBeVisible();
	await expect(newPage.getByText(/Database not initialized/i)).toHaveCount(0);
});
