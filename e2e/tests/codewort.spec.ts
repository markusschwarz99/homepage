import { test, expect, type Page } from '@playwright/test';

/**
 * Codewort-Spiel (öffentlich, ohne Login). Das Basispaket wird per
 * Seed-Migration angelegt, ist also auf der frischen Test-DB verfügbar.
 */

/** Übergabe-Screen durch Halten bestätigen (INV-12: kein Ein-Klick). */
async function holdHandoff(page: Page) {
  const btn = page.getByTestId('handoff-confirm');
  await expect(btn).toBeVisible();
  const box = await btn.boundingBox();
  if (!box) throw new Error('Übergabe-Button nicht gefunden');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(900); // HOLD_MS = 650 → sicher darüber
  await page.mouse.up();
}

async function readRoles(page: Page): Promise<string[]> {
  const roles: string[] = [];
  for (let i = 0; i < 25; i++) {
    roles.push((await page.getByTestId(`card-${i}`).getAttribute('data-role')) ?? '');
  }
  return roles;
}

async function giveClueAndGoToTable(page: Page, word: string) {
  await page.getByTestId('clue-word-input').fill(word);
  await page.getByTestId('clue-count-input').fill('1');
  await page.getByTestId('give-clue').click();
  await holdHandoff(page);
  await expect(page.getByTestId('table-grid')).toBeVisible();
}

test.describe('Codewort-Spiel', () => {
  test('Setup ist ohne Login erreichbar und listet ein spielbares Paket', async ({ page }) => {
    await page.goto('/codewort');
    await expect(page.getByRole('heading', { name: 'Codewort' })).toBeVisible();
    await expect(page.getByTestId('start-game')).toBeEnabled();
  });

  test('Vollständige Partie: Setup → beide Teams → Attentäter → Endscreen', async ({ page }) => {
    await page.goto('/codewort');

    await page.getByTestId('team-a-name').fill('Rot');
    await page.getByTestId('team-b-name').fill('Blau');
    await page.getByTestId('start-game').click();

    // AC-14: Ein einfacher Klick überspringt den Übergabe-Screen nicht.
    await expect(page.getByTestId('handoff-screen')).toBeVisible();
    await page.getByTestId('handoff-confirm').click();
    await expect(page.getByTestId('handoff-screen')).toBeVisible();

    // Halten → Chef-Sicht (Team 1)
    await holdHandoff(page);
    await expect(page.getByTestId('spymaster-grid')).toBeVisible();

    const roles = await readRoles(page);
    const team1 = await page.getByTestId('spymaster-title').getAttribute('data-team');
    const ownRole = team1 === 'A' ? 'teamA' : 'teamB';

    // Team 1 gibt Hinweis und geht an den Tisch.
    await giveClueAndGoToTable(page, 'hinweis');

    // AC-11: unaufgedeckte Karte trägt keinerlei Rollen-Info im DOM.
    const firstCard = page.getByTestId('card-0');
    await expect(firstCard).toHaveAttribute('data-revealed', 'false');
    expect(await firstCard.getAttribute('data-role')).toBeNull();

    // AC-15: einzelner Tipp deckt nicht auf — erst die Bestätigung.
    const ownIdx = roles.indexOf(ownRole);
    await page.getByTestId(`card-${ownIdx}`).click();
    await expect(page.getByTestId('confirm-bar')).toBeVisible();
    await expect(page.getByTestId(`card-${ownIdx}`)).toHaveAttribute('data-revealed', 'false');
    await page.getByTestId('confirm-reveal').click();
    await expect(page.getByTestId(`card-${ownIdx}`)).toHaveAttribute('data-revealed', 'true');
    await expect(page.getByTestId(`card-${ownIdx}`)).toHaveAttribute('data-role', ownRole);

    // Eigener Agent → Zug läuft weiter; Team 1 beendet freiwillig.
    await page.getByTestId('end-turn').click();

    // Übergabe an Team 2.
    await expect(page.getByTestId('handoff-screen')).toBeVisible();
    await holdHandoff(page);
    await expect(page.getByTestId('spymaster-grid')).toBeVisible();
    const team2 = await page.getByTestId('spymaster-title').getAttribute('data-team');
    expect(team2).not.toBe(team1);

    // Team 2 deckt den Attentäter auf → Partie endet.
    await giveClueAndGoToTable(page, 'zweiter');
    const assassinIdx = roles.indexOf('assassin');
    await page.getByTestId(`card-${assassinIdx}`).click();
    await page.getByTestId('confirm-reveal').click();

    // Konsequenz-Ansage (§8.4), Partie beendet.
    await expect(page.getByTestId('turn-result')).toBeVisible();
    await expect(page.getByTestId('turn-result')).toHaveAttribute('data-ended', 'true');
    await page.getByTestId('turn-result-continue').click();

    // Endscreen: Sieger ist Team 1 (das den Attentäter NICHT aufdeckte).
    await expect(page.getByTestId('winner')).toHaveText(team1 === 'A' ? 'Rot' : 'Blau');
    await expect(page.getByTestId('win-reason')).toContainText(/Attentäter/i);
    await expect(page.getByTestId('end-grid')).toBeVisible();
  });

  test('Undo nimmt einen zugbeendenden Fehltipp zurück (§15.1)', async ({ page }) => {
    await page.goto('/codewort');
    await page.getByTestId('start-game').click();
    await holdHandoff(page); // → Chef-Sicht
    await expect(page.getByTestId('spymaster-grid')).toBeVisible();

    const roles = await readRoles(page);
    await giveClueAndGoToTable(page, 'hinweis');

    // Neutrale Karte aufdecken → Zug endet, Konsequenz-Ansage mit Undo.
    const neutralIdx = roles.indexOf('neutral');
    await page.getByTestId(`card-${neutralIdx}`).click();
    await page.getByTestId('confirm-reveal').click();
    await expect(page.getByTestId('turn-result')).toBeVisible();

    // Zurücknehmen → zurück in die Tisch-Sicht, Karte wieder verdeckt.
    await page.getByTestId('turn-result-undo').click();
    await expect(page.getByTestId('table-grid')).toBeVisible();
    await expect(page.getByTestId(`card-${neutralIdx}`)).toHaveAttribute('data-revealed', 'false');
    expect(await page.getByTestId(`card-${neutralIdx}`).getAttribute('data-role')).toBeNull();
  });
});
