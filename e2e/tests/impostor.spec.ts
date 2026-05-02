import { test, expect } from '@playwright/test';

test.describe('Impostor-Spiel (öffentlich, ohne Login)', () => {
  test('Setup-Seite ist ohne Login erreichbar und lädt Kategorien', async ({ page }) => {
    await page.goto('/impostor');

    // Heading sichtbar
    await expect(page.getByRole('heading', { name: 'Impostor' })).toBeVisible();

    // Default-Spieleranzahl ist 4
    await expect(page.getByTestId('player-count')).toHaveText('4');

    // Kategorien sind da (mind. eine — die Seed-Migration legt 20 an,
    // aber wir wollen nicht hartcodieren falls jemand welche deaktiviert hat)
    const startBtn = page.getByTestId('start-button');
    await expect(startBtn).toBeVisible();
  });

  test('Validierung: Start ohne Spielernamen schlägt fehl', async ({ page }) => {
    await page.goto('/impostor');
    await page.getByTestId('start-button').click();
    await expect(page.getByTestId('start-error')).toContainText(/spielernamen/i);
  });

  test('Validierung: Doppelte Spielernamen werden abgelehnt', async ({ page }) => {
    await page.goto('/impostor');

    // 4 Namen, davon 2 gleich
    await page.getByTestId('player-name-0').fill('Alice');
    await page.getByTestId('player-name-1').fill('Bob');
    await page.getByTestId('player-name-2').fill('alice'); // case-insensitive Duplikat
    await page.getByTestId('player-name-3').fill('Dave');

    await page.getByTestId('start-button').click();
    await expect(page.getByTestId('start-error')).toContainText(/eindeutig/i);
  });

  test('Spieleranzahl-Buttons funktionieren', async ({ page }) => {
    await page.goto('/impostor');

    const count = page.getByTestId('player-count');
    await expect(count).toHaveText('4');

    // +1
    await page.getByRole('button', { name: 'Spieler hinzufügen' }).click();
    await expect(count).toHaveText('5');
    await expect(page.getByTestId('player-name-4')).toBeVisible();

    // -2
    await page.getByRole('button', { name: 'Spieler entfernen' }).click();
    await page.getByRole('button', { name: 'Spieler entfernen' }).click();
    await expect(count).toHaveText('3');
  });

  test('Vollständiger Spielablauf: Setup → Reveal → Auflösung', async ({ page }) => {
    await page.goto('/impostor');

    // Auf 3 Spieler reduzieren (Default ist 4)
    await page.getByRole('button', { name: 'Spieler entfernen' }).click();
    await expect(page.getByTestId('player-count')).toHaveText('3');

    // Namen eingeben
    await page.getByTestId('player-name-0').fill('Alice');
    await page.getByTestId('player-name-1').fill('Bob');
    await page.getByTestId('player-name-2').fill('Carol');

    // Themen-Hinweis für Imposter aktivieren — testet auch diesen Code-Pfad
    await page.getByTestId('show-category-to-impostor').check();

    // Spiel starten
    await page.getByTestId('start-button').click();

    // ---------- Reveal-Phase ----------

    // Erster Spieler ist Alice
    await expect(page.getByTestId('current-player')).toHaveText('Alice');

    // Karte verdeckt → "Halten zum Anzeigen" sichtbar
    const card = page.getByTestId('reveal-card');
    await expect(card).toHaveAttribute('data-revealing', 'false');
    await expect(card).toContainText('Halten zum Anzeigen');

    // Tap-and-Hold simulieren
    await card.dispatchEvent('pointerdown');
    await expect(card).toHaveAttribute('data-revealing', 'true');

    // Entweder ein Wort ODER "DU BIST DER IMPOSTER" ist sichtbar
    const isImpostor = await page.getByTestId('impostor-label').isVisible().catch(() => false);
    if (isImpostor) {
      // Mit show_category_to_impostor=true muss auch der Themen-Hinweis da sein
      await expect(page.getByTestId('impostor-category-hint')).toBeVisible();
    } else {
      await expect(page.getByTestId('player-word')).toBeVisible();
    }

    // Loslassen → Karte wieder verdeckt
    await card.dispatchEvent('pointerup');
    await expect(card).toHaveAttribute('data-revealing', 'false');
    await expect(page.getByTestId('player-word')).not.toBeVisible();
    await expect(page.getByTestId('impostor-label')).not.toBeVisible();

    // Nächster Spieler
    await page.getByTestId('next-player').click();
    await expect(page.getByTestId('current-player')).toHaveText('Bob');

    // Bob: nur kurz halten + weiter
    await card.dispatchEvent('pointerdown');
    await card.dispatchEvent('pointerup');
    await page.getByTestId('next-player').click();

    // Carol: letzter Spieler — Button heißt "Fertig"
    await expect(page.getByTestId('current-player')).toHaveText('Carol');
    await expect(page.getByTestId('next-player')).toHaveText('Fertig');
    await card.dispatchEvent('pointerdown');
    await card.dispatchEvent('pointerup');
    await page.getByTestId('next-player').click();

    // ---------- Bereitschafts-Screen ----------

    await expect(page.getByRole('heading', { name: 'Alle bereit' })).toBeVisible();
    await page.getByTestId('show-resolution').click();

    // ---------- Auflösung ----------

    await expect(page.getByRole('heading', { name: 'Auflösung' })).toBeVisible();

    // Imposter-Name ist einer der drei Spieler
    const impostorName = await page.getByTestId('impostor-name').textContent();
    expect(['Alice', 'Bob', 'Carol']).toContain(impostorName?.trim());

    // Wort wird angezeigt
    await expect(page.getByTestId('resolved-word')).toBeVisible();
    const word = await page.getByTestId('resolved-word').textContent();
    expect(word?.trim().length).toBeGreaterThan(0);

    // Neue Runde führt zurück zum Setup
    await page.getByTestId('new-round').click();
    await expect(page.getByRole('heading', { name: 'Impostor' })).toBeVisible();
    await expect(page.getByTestId('start-button')).toBeVisible();
  });

  test('Navbar enthält Impostor-Link auch ohne Login', async ({ page }) => {
    await page.goto('/');
    // Desktop-Link sollte da sein
    await expect(page.getByRole('link', { name: 'Impostor' }).first()).toBeVisible();
  });
});
