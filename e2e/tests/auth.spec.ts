import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { TEST_USERS } from '../helpers/users';

test('Admin kann sich einloggen und sieht seinen Namen', async ({ page }) => {
  await login(page, 'admin');
  await expect(page.getByText(TEST_USERS.admin.name)).toBeVisible();
});

test('Falsches Passwort zeigt Fehler', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(TEST_USERS.admin.email);
  await page.getByLabel(/passwort/i).fill('WrongPassword');
  await page.getByRole('button', { name: /anmelden|einloggen|login/i }).click();

  // Wir sind noch auf /login (oder eine Fehlermeldung ist sichtbar)
  await expect(page).toHaveURL(/\/login/);
});

test('Member kann sich einloggen', async ({ page }) => {
  await login(page, 'member');
  await expect(page).not.toHaveURL(/\/login/);
});
