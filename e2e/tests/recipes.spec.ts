import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';
import { cleanupRecipes } from '../helpers/cleanup';

// Schnellerer Timeout — wenn Selektoren nicht in 10s erscheinen, finden wir sie auch in 30s nicht
test.use({ actionTimeout: 10_000 });

test.beforeEach(async () => {
  await cleanupRecipes();
});

/**
 * Hilfsfunktion: Rezept-Formular ausfüllen.
 * Nutzt jetzt getByLabel — funktioniert weil RecipeForm.tsx
 * htmlFor/id auf Titel, Anzahl und Einheit hat.
 */
async function fillRecipeForm(page: import('@playwright/test').Page, options: {
  titel: string;
  anzahl?: number;
  ingredients?: { menge?: string; einheit?: string; name: string }[];
  steps?: string[];
}) {
  await page.getByLabel('Titel').fill(options.titel);

  if (options.anzahl !== undefined) {
    await page.getByLabel('Anzahl').fill(String(options.anzahl));
  }

  const ingredients = options.ingredients ?? [{ name: 'x' }];
  for (let i = 0; i < ingredients.length; i++) {
    const ing = ingredients[i];
    if (i > 0) {
      await page.getByRole('button', { name: '+ Zutat hinzufügen' }).click();
    }
    if (ing.menge !== undefined) {
      await page.getByPlaceholder('Menge').nth(i).fill(ing.menge);
    }
    if (ing.einheit !== undefined) {
      await page.getByPlaceholder('Einheit').nth(i).fill(ing.einheit);
    }
    await page.getByPlaceholder('Zutat').nth(i).fill(ing.name);
  }

  const steps = options.steps ?? ['y'];
  for (let i = 0; i < steps.length; i++) {
    if (i > 0) {
      await page.getByRole('button', { name: '+ Schritt hinzufügen' }).click();
    }
    await page.getByPlaceholder('Schritt beschreiben...').nth(i).fill(steps[i]);
  }
}

// ---------- Liste ----------

test.describe('Rezept-Liste', () => {
  test('Member sieht leere Liste, wenn keine Rezepte vorhanden', async ({ page }) => {
    await login(page, 'member');
    await page.goto('/rezepte');
    await expect(page.getByText(/noch keine rezepte/i)).toBeVisible();
  });

  test('Guest hat keinen Zugriff auf Rezepte', async ({ page }) => {
    await login(page, 'guest');
    await page.goto('/rezepte');
    await expect(page.getByText(/noch keine rezepte/i)).not.toBeVisible();
  });
});

// ---------- Erstellen ----------

test.describe('Rezept erstellen', () => {
  test('Member erstellt Rezept und landet auf Detail-Seite', async ({ page }) => {
    const titel = `Pasta Carbonara ${Date.now()}`;

    await login(page, 'member');
    await page.goto('/rezepte/neu');

    await fillRecipeForm(page, {
      titel,
      anzahl: 2,
      ingredients: [
        { menge: '200', einheit: 'g', name: 'Spaghetti' },
        { menge: '100', einheit: 'g', name: 'Speck' },
      ],
      steps: ['Wasser kochen', 'Pasta hineingeben'],
    });

    await page.getByRole('button', { name: /rezept speichern/i }).click();

    await expect(page.getByRole('heading', { name: titel, level: 1 })).toBeVisible();
    await expect(page.getByText('Spaghetti')).toBeVisible();
    await expect(page.getByText('Speck')).toBeVisible();
    await expect(page.getByText('Wasser kochen')).toBeVisible();
    await expect(page.getByText('Pasta hineingeben')).toBeVisible();
  });

  test('Erstelltes Rezept erscheint in der Liste', async ({ page }) => {
    const titel = `Suchbares Rezept ${Date.now()}`;

    await login(page, 'member');
    await page.goto('/rezepte/neu');
    await fillRecipeForm(page, {
      titel,
      ingredients: [{ name: 'Salz' }],
      steps: ['Salzen'],
    });
    await page.getByRole('button', { name: /rezept speichern/i }).click();

    await expect(page.getByRole('heading', { name: titel, level: 1 })).toBeVisible();
    await page.goto('/rezepte');

    await expect(page.getByRole('heading', { name: titel, level: 2 })).toBeVisible();
  });

  test('Rezept ohne Titel wird nicht erstellt', async ({ page }) => {
    await login(page, 'member');
    await page.goto('/rezepte/neu');

    // Nur Zutat füllen, Titel leer lassen
    await page.getByPlaceholder('Zutat').first().fill('Mehl');
    await page.getByRole('button', { name: /rezept speichern/i }).click();

    // HTML5-Validation greift — wir bleiben auf der "Neu"-Seite
    await expect(page).toHaveURL(/\/rezepte\/neu$/);
  });
});

// ---------- Detail ----------

test.describe('Rezept-Detail', () => {
  test('Detail-Seite zeigt Titel, Zutaten und Schritte', async ({ page }) => {
    const titel = `Detail-Test ${Date.now()}`;

    await login(page, 'member');
    await page.goto('/rezepte/neu');
    await fillRecipeForm(page, {
      titel,
      anzahl: 4,
      ingredients: [{ menge: '500', einheit: 'g', name: 'Mehl' }],
      steps: ['Mehl abwiegen'],
    });
    await page.getByRole('button', { name: /rezept speichern/i }).click();

    await expect(page.getByRole('heading', { name: titel, level: 1 })).toBeVisible();
    await expect(page.getByText('500')).toBeVisible();
    await expect(page.getByText('Mehl abwiegen')).toBeVisible();
    await expect(page.getByText('Portionen:')).toBeVisible();
  });
});

// ---------- Bearbeiten ----------

test.describe('Rezept bearbeiten', () => {
  test('Autor kann eigenes Rezept bearbeiten', async ({ page }) => {
    const titelOriginal = `Original ${Date.now()}`;
    const titelNeu = `Bearbeitet ${Date.now()}`;

    await login(page, 'member');
    await page.goto('/rezepte/neu');
    await fillRecipeForm(page, {
      titel: titelOriginal,
      ingredients: [{ name: 'Wasser' }],
      steps: ['Wasser holen'],
    });
    await page.getByRole('button', { name: /rezept speichern/i }).click();

    await expect(page.getByRole('heading', { name: titelOriginal, level: 1 })).toBeVisible();
    await page.getByRole('button', { name: /bearbeiten/i }).click();

    const titelInput = page.getByLabel('Titel');
    await titelInput.clear();
    await titelInput.fill(titelNeu);

    await page.getByRole('button', { name: /änderungen speichern/i }).click();

    await expect(page.getByRole('heading', { name: titelNeu, level: 1 })).toBeVisible();
  });

  test('Fremder Member sieht keinen Bearbeiten-Button für nicht-eigenes Rezept', async ({ page, browser }) => {
    const titel = `Member-Rezept ${Date.now()}`;

    await login(page, 'member');
    await page.goto('/rezepte/neu');
    await fillRecipeForm(page, { titel });
    await page.getByRole('button', { name: /rezept speichern/i }).click();
    await expect(page.getByRole('heading', { name: titel, level: 1 })).toBeVisible();
    const detailUrl = page.url();

    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    await login(otherPage, 'household');
    await otherPage.goto(detailUrl);
    await expect(otherPage.getByRole('heading', { name: titel, level: 1 })).toBeVisible();
    await expect(otherPage.getByRole('button', { name: /bearbeiten/i })).not.toBeVisible();
    await otherContext.close();
  });
});

// ---------- Löschen ----------

test.describe('Rezept löschen', () => {
  test('Admin kann Rezept löschen', async ({ page }) => {
    const titel = `Löschbares Rezept ${Date.now()}`;

    await login(page, 'admin');
    await page.goto('/rezepte/neu');
    await fillRecipeForm(page, { titel });
    await page.getByRole('button', { name: /rezept speichern/i }).click();
    await expect(page.getByRole('heading', { name: titel, level: 1 })).toBeVisible();

    await page.getByRole('button', { name: /^löschen$/i }).click();
    await page.getByRole('button', { name: /^löschen$/i }).last().click();

    await expect(page).toHaveURL(/\/rezepte$/);
    await expect(page.getByRole('heading', { name: titel, level: 2 })).not.toBeVisible();
  });

  test('Member sieht keinen Löschen-Button (nur Admin)', async ({ page }) => {
    const titel = `Nicht-Löschbar ${Date.now()}`;

    await login(page, 'member');
    await page.goto('/rezepte/neu');
    await fillRecipeForm(page, { titel });
    await page.getByRole('button', { name: /rezept speichern/i }).click();
    await expect(page.getByRole('heading', { name: titel, level: 1 })).toBeVisible();

    await expect(page.getByRole('button', { name: /bearbeiten/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^löschen$/i })).not.toBeVisible();
  });
});
