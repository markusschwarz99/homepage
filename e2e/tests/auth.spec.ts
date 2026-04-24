import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { TEST_USERS } from '../helpers/users';

test('Admin kann sich einloggen und sieht seinen Namen', async ({ page }) => {
  await login(page, 'admin');
  // Name erscheint in Navbar oder auf Home (Begrüßung)
  await expect(page.getByText(TEST_USERS.admin.name).first()).toBeVisible({
    timeout: 10000,
  });
});

test('Falsches Passwort zeigt Fehler', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(TEST_USERS.admin.email);
  await page.locator('input[type="password"]').fill('WrongPassword');
  await page.getByRole('button', { name: /anmelden/i }).click();

  await expect(page.getByText(/login fehlgeschlagen|anmeldedaten/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('Member kann sich einloggen', async ({ page }) => {
  await login(page, 'member');
  await expect(page).not.toHaveURL(/\/login/);
});
