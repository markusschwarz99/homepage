import { Page, expect } from '@playwright/test';
import { TEST_USERS, TestUserRole } from './users';

export async function login(page: Page, role: TestUserRole = 'admin') {
  const user = TEST_USERS[role];

  await page.goto('/login');
  await page.locator('input[type="email"]').fill(user.email);
  await page.locator('input[type="password"]').fill(user.password);
  await page.getByRole('button', { name: /anmelden/i }).click();

  await expect(page).not.toHaveURL(/\/login/);
}
