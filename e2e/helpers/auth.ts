import { Page, expect } from '@playwright/test';
import { TEST_USERS, TestUserRole } from './users';

export async function login(page: Page, role: TestUserRole = 'admin') {
  const user = TEST_USERS[role];

  await page.goto('/login');
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/passwort/i).fill(user.password);
  await page.getByRole('button', { name: /anmelden|einloggen|login/i }).click();

  // Warten bis wir nicht mehr auf /login sind
  await expect(page).not.toHaveURL(/\/login/);
}
