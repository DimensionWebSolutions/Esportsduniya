import { test, expect } from '@playwright/test';

test.describe('Esportsduniya smoke', () => {
  test('homepage loads with title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Esportsduniya/i);
  });

  test('arena route loads with rivalry boards', async ({ page }) => {
    await page.goto('/arena');
    await expect(page.getByRole('heading', { name: /prediction arena/i })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: /rivalry boards/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /MI vs CSK/i })).toBeVisible();
  });

  test('standings route loads', async ({ page }) => {
    await page.goto('/standings');
    await expect(page.getByRole('heading', { name: /standings/i })).toBeVisible();
  });

  test('daily quiz route loads', async ({ page }) => {
    await page.goto('/quiz');
    await expect(page.getByRole('heading', { name: /daily sports quiz/i })).toBeVisible();
    await expect(page).toHaveTitle(/quiz/i);
  });

  test('history timeline loads with dated moments', async ({ page }) => {
    await page.goto('/timemachine');
    await expect(page.getByRole('heading', { name: /sports history/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /1983 world cup final/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^cricket$/i })).toBeVisible();
  });

  test('world cup hub explains the format', async ({ page }) => {
    await page.goto('/fifa');
    await expect(page.getByRole('heading', { name: /world cup hub/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /48-team world cup/i })).toBeVisible();
  });

  // Both hub routes previously crashed on load due to missing imports.
  test('IPL hub renders fixtures and FAQ', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/cricket/ipl-2026');
    await expect(page.getByRole('heading', { name: /IPL 2026/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /points tables work/i })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('Premier League hub renders fixtures and FAQ', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/football/premier-league');
    await expect(page.getByRole('heading', { name: /premier league/i }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /expected goals/i })).toBeVisible();
    expect(errors).toEqual([]);
  });
});
