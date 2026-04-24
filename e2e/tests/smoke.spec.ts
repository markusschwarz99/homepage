import { test, expect } from '@playwright/test';

test('Homepage lädt', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.+/);  // Irgendeinen Titel
});

test('Login-Seite ist erreichbar', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByLabel(/email/i)).toBeVisible();
});
