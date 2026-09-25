import { test, expect, type Browser, type Page } from '@playwright/test';

/**
 * Impostor Online-Modus: jeder Spieler hat einen eigenen Browser-Kontext
 * (eigenes localStorage = eigenes Gerät). Sync läuft über 2s-Polling,
 * daher großzügige Timeouts bei Zustandswechseln auf den anderen Geräten.
 */

const SYNC = { timeout: 10_000 };

async function newPlayer(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext();
  return ctx.newPage();
}

async function joinByLink(page: Page, code: string, name: string) {
  await page.goto(`/impostor/online/${code}`);
  await page.getByTestId('join-name').fill(name);
  await page.getByTestId('join-button').click();
  await expect(page.getByTestId('player-list')).toContainText(name);
}

/** Karte halten und zurückgeben, ob dieser Spieler der Impostor ist. */
async function peekRole(page: Page): Promise<boolean> {
  const card = page.getByTestId('reveal-card');
  await expect(card).toBeVisible(SYNC);
  await card.dispatchEvent('pointerdown');
  await expect(card).toHaveAttribute('data-revealing', 'true');
  const isImpostor = await page.getByTestId('impostor-label').isVisible();
  if (!isImpostor) await expect(page.getByTestId('player-word')).toBeVisible();
  await card.dispatchEvent('pointerup');
  await expect(card).toHaveAttribute('data-revealing', 'false');
  return isImpostor;
}

test.describe('Impostor online (mehrere Geräte)', () => {
  test('Link vom lokalen Spiel führt zum Online-Modus', async ({ page }) => {
    await page.goto('/impostor');
    await page.getByTestId('online-link').click();
    await expect(page.getByRole('heading', { name: 'Impostor online' })).toBeVisible();
  });

  test('Unbekannter Raum zeigt Fehler beim Beitreten', async ({ page }) => {
    await page.goto('/impostor/online/ZZZZ');
    await page.getByTestId('join-name').fill('Niemand');
    await page.getByTestId('join-button').click();
    await expect(page.getByTestId('join-error')).toContainText(/nicht gefunden/i);
  });

  test('Vollständige Runde: Lobby → Rollen → Abstimmung → Ergebnis', async ({ browser }) => {
    const host = await newPlayer(browser);
    await host.goto('/impostor/online');
    await host.getByTestId('create-name').fill('Alice');
    await host.getByTestId('create-button').click();

    const code = (await host.getByTestId('room-code').textContent())?.trim() ?? '';
    expect(code).toMatch(/^[A-Z]{4}$/);

    // Mit 1 Spieler kann nicht gestartet werden
    await expect(host.getByTestId('start-button')).toBeDisabled();

    const bob = await newPlayer(browser);
    const carol = await newPlayer(browser);
    await joinByLink(bob, code, 'Bob');
    await joinByLink(carol, code, 'Carol');
    await expect(bob.getByTestId('waiting-for-host')).toBeVisible();

    // Host sieht alle drei per Polling
    await expect(host.getByTestId('player-list')).toContainText('Carol', SYNC);
    await host.getByTestId('start-button').click();

    // ---------- Rollen: genau ein Impostor ----------
    const players = { Alice: host, Bob: bob, Carol: carol };
    const roles: Record<string, boolean> = {};
    for (const [name, page] of Object.entries(players)) {
      roles[name] = await peekRole(page);
    }
    const impostors = Object.keys(roles).filter((n) => roles[n]);
    expect(impostors).toHaveLength(1);
    const impostorName = impostors[0];

    // Reload behält die Identität (Token in localStorage)
    await bob.reload();
    await expect(bob.getByTestId('reveal-card')).toBeVisible(SYNC);

    // ---------- Abstimmung: alle gegen den Impostor ----------
    await host.getByTestId('start-voting').click();
    for (const [name, page] of Object.entries(players)) {
      const target = name === impostorName
        ? Object.keys(players).find((n) => n !== name)!
        : impostorName;
      const btn = page.getByRole('button', { name: target, exact: true });
      await expect(btn).toBeVisible(SYNC);
      await btn.click();
    }

    // ---------- Ergebnis auf allen Geräten ----------
    for (const page of Object.values(players)) {
      await expect(page.getByTestId('result-impostor')).toHaveText(impostorName, SYNC);
      await expect(page.getByTestId('result-caught')).toHaveText('Impostor erwischt!');
      await expect(page.getByTestId('result-word')).not.toBeEmpty();
    }

    // ---------- Zurück in die Lobby ----------
    await host.getByTestId('back-to-lobby').click();
    await expect(carol.getByTestId('waiting-for-host')).toBeVisible(SYNC);
  });
});
