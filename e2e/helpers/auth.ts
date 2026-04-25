import { Page, expect } from '@playwright/test';
import { TEST_USERS, TestUserRole } from './users';

export async function login(page: Page, role: TestUserRole = 'admin') {
  const user = TEST_USERS[role];

  await page.goto('/login');

  // Auf das Email-Feld warten — bestätigt dass die React-App geladen ist
  const emailInput = page.locator('input[type="email"]');
  await emailInput.waitFor({ state: 'visible' });
  await emailInput.fill(user.email);
  await page.locator('input[type="password"]').fill(user.password);

  // Klick + Navigation in einem Promise.all — wartet bis URL wirklich gewechselt hat
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 10_000 }),
    page.getByRole('button', { name: /anmelden/i }).click(),
  ]);

  // KRITISCH: warten bis useAuth() den User geladen hat. User-Name in Navbar
  // erscheint erst, wenn /me erfolgreich geantwortet hat. Sonst rennen Tests
  // in NotFound, weil geschützte Routen (RecipeNew etc.) bei loading=false +
  // user=null sofort 404 zeigen.
  await expect(page.getByText(user.name).first()).toBeVisible({ timeout: 10_000 });
}
