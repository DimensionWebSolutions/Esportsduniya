import { test, expect } from '@playwright/test';

test.describe('Esportsduniya smoke', () => {
  test('homepage loads with title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Esportsduniya/i);
  });

  test('arena route loads', async ({ page }) => {
    await page.goto('/arena');
    await expect(page.getByRole('heading', { name: /prediction arena/i })).toBeVisible();
  });

  test('standings route loads', async ({ page }) => {
    await page.goto('/standings');
    await expect(page.getByRole('heading', { name: /standings/i })).toBeVisible();
  });
});
