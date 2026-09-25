import { test, expect, type Browser, type Page } from '@playwright/test';

/**
 * Codewort Online-Modus: jeder Spieler hat einen eigenen Browser-Kontext
 * (eigenes localStorage = eigenes Gerät). Sync läuft über 2s-Polling,
 * daher großzügige Timeouts bei Zustandswechseln auf den anderen Geräten.
 * Das Basispaket kommt aus der Seed-Migration.
 */

const SYNC = { timeout: 10_000 };

async function newPlayer(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext();
  return ctx.newPage();
}

async function joinByLink(page: Page, code: string, name: string) {
  await page.goto(`/codewort/online/${code}`);
  await page.getByTestId('join-name').fill(name);
  await page.getByTestId('join-button').click();
  await expect(page.getByTestId('player-list')).toContainText(name);
}

async function readRoles(page: Page): Promise<string[]> {
  const roles: string[] = [];
  for (let i = 0; i < 25; i++) {
    roles.push((await page.getByTestId(`card-${i}`).getAttribute('data-role')) ?? '');
  }
  return roles;
}

test.describe('Codewort online (mehrere Geräte)', () => {
  test('Link vom lokalen Spiel führt zum Online-Modus', async ({ page }) => {
    await page.goto('/codewort');
    await page.getByTestId('online-link').click();
    await expect(page.getByRole('heading', { name: 'Codewort online' })).toBeVisible();
  });

  test('Vollständige Partie: Lobby → Teams → Hinweis → Aufdecken → Ende', async ({ browser }) => {
    const alice = await newPlayer(browser);
    await alice.goto('/codewort/online');
    await alice.getByTestId('create-name').fill('Alice');
    await alice.getByTestId('create-button').click();

    const code = (await alice.getByTestId('room-code').textContent())?.trim() ?? '';
    expect(code).toMatch(/^[A-Z]{4}$/);

    const bob = await newPlayer(browser);
    const carol = await newPlayer(browser);
    const dave = await newPlayer(browser);
    await joinByLink(bob, code, 'Bob');
    await joinByLink(carol, code, 'Carol');
    await joinByLink(dave, code, 'Dave');

    // ---------- Teams: Alice/Carol Chefs, Bob/Dave Ermittler ----------
    await alice.getByTestId('join-A-chef').click();
    await bob.getByTestId('join-A-operative').click();
    await carol.getByTestId('join-B-chef').click();
    await dave.getByTestId('join-B-operative').click();

    await expect(alice.getByTestId('team-B')).toContainText('Dave', SYNC);
    await alice.getByTestId('start-button').click();

    const players = [alice, bob, carol, dave];
    for (const page of players) {
      await expect(page.getByTestId('board-grid')).toBeVisible(SYNC);
    }

    // ---------- Geheimhaltung: nur Chefs sehen den Schlüssel ----------
    for (const page of [bob, dave]) {
      expect((await readRoles(page)).every((r) => r === '')).toBe(true);
    }
    const key = await readRoles(alice);
    expect(key.filter((r) => r === 'assassin')).toHaveLength(1);

    // ---------- Wer ist am Zug? ----------
    const aliceActive = await alice.getByTestId('clue-word-input').isVisible();
    const [chef, operative, otherOperative] = aliceActive
      ? [alice, bob, dave]
      : [carol, dave, bob];
    const ownRole = aliceActive ? 'teamA' : 'teamB';
    const loserName = aliceActive ? 'Team Blau' : 'Team Gelb';
    const winnerName = aliceActive ? 'Team Gelb' : 'Team Blau';

    await chef.getByTestId('clue-word-input').fill('Test');
    await chef.getByTestId('clue-count-input').fill('2');
    await chef.getByTestId('give-clue').click();

    // Gegner-Ermittler sieht den Hinweis, darf aber nichts antippen
    await expect(otherOperative.getByTestId('clue-word')).toHaveText('TEST', SYNC);
    await expect(otherOperative.getByTestId('card-0')).toBeDisabled();

    // ---------- Eigener Agent: weiter raten ----------
    await expect(operative.getByTestId('clue-word')).toHaveText('TEST', SYNC);
    const own = key.indexOf(ownRole);
    await operative.getByTestId(`card-${own}`).click();
    await operative.getByTestId('confirm-reveal').click();
    await expect(operative.getByTestId('last-reveal')).toContainText('weiter raten');
    await expect(operative.getByTestId('guesses-remaining')).toHaveText('Noch 2 Versuche');
    await expect(otherOperative.getByTestId(`card-${own}`)).toHaveAttribute('data-role', ownRole, SYNC);

    // ---------- Attentäter: Partie verloren ----------
    await operative.getByTestId(`card-${key.indexOf('assassin')}`).click();
    await operative.getByTestId('confirm-reveal').click();

    for (const page of players) {
      await expect(page.getByTestId('winner')).toHaveText(winnerName, SYNC);
      await expect(page.getByTestId('last-reveal')).toContainText(`${loserName} verliert`);
    }
    // Nach Spielende sehen auch Ermittler den vollständigen Schlüssel
    expect((await readRoles(bob)).every((r) => r !== '')).toBe(true);

    // ---------- Revanche & zurück in die Lobby ----------
    await alice.getByTestId('rematch').click();
    await expect(dave.getByTestId('winner')).toBeHidden(SYNC);
    await expect(alice.getByTestId('room-code')).toContainText(code);
    await alice.getByTestId('back-to-lobby').click();
    await expect(carol.getByTestId('waiting-for-host')).toBeVisible(SYNC);
  });
});
