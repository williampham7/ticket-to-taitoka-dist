import { expect, test, type Page } from '@playwright/test';
import { asName } from './helpers';

const COLS = 'ABCDEFGHIJ';
const SQUARES = Array.from({ length: 100 }, (_, i) => `${COLS[i % 10]}${Math.floor(i / 10) + 1}`);

/** Results land instantly and the computer answers at once. */
async function fast(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('fleet.fx', 'off');
    localStorage.setItem('fleet.botMs', '30');
  });
}

async function deployRandom(page: Page) {
  await page.getByTestId('fleet-redeploy').click();
  await page.getByTestId('fleet-ready').click();
}

const target = (page: Page) => page.locator('[data-testid="fleet-target"]');
const ended = (page: Page) => page.getByTestId('fleet-result').isVisible();

/** Wait until it is this page's turn (the target grid is live) or the game is over. */
async function myTurnOrEnd(page: Page) {
  await expect(page.locator('[data-testid="fleet-target"].live, [data-testid="fleet-result"]').first()).toBeVisible({ timeout: 20_000 });
}

/** The next square of the sweep that is still open on the target grid. */
async function nextOpen(page: Page, from: number): Promise<number> {
  for (let i = from; i < 100; i++) {
    const cls = (await page.getByTestId(`fleet-target-${SQUARES[i]}`).getAttribute('class')) ?? '';
    if (!/has-(miss|hit|sunk|unknown)/.test(cls)) return i;
  }
  return 100;
}

/** Sweep the enemy grid square by square (Classic / Super Weapons) until the game ends. */
async function sweep(page: Page, beforeShot?: (turn: number) => Promise<boolean>) {
  let i = 0;
  for (let turn = 0; turn < 120; turn++) {
    await myTurnOrEnd(page);
    if (await ended(page)) return;
    if (beforeShot && (await beforeShot(turn))) continue;
    i = await nextOpen(page, i);
    await page.getByTestId(`fleet-target-${SQUARES[i]}`).click();
  }
}

test.describe('Fleet', () => {
  test('the picker card opens the Fleet menu with its three steps', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('fleet-card').click();
    await expect(page).toHaveURL(/\/fleet$/);
    await expect(page.getByTestId('fleet-menu')).toBeVisible();
    await page.getByTestId('fleet-play-bot').click();
    await page.getByTestId('fleet-mode-super').click();
    await expect(page.getByTestId('fleet-all-unlocked')).toBeVisible();
    await expect(page.getByTestId('fleet-level-hard')).toBeVisible();
    // switching options never moves the start button: rows that do not apply stay, disabled
    const at = async () => (await page.getByTestId('fleet-start').boundingBox())!.y;
    const y0 = await at();
    await page.getByTestId('fleet-play-online').click();
    await expect(page.getByTestId('fleet-level-hard').locator('input')).toBeDisabled();
    await page.getByTestId('fleet-mode-classic').click();
    await expect(page.getByTestId('fleet-all-unlocked').locator('input')).toBeDisabled();
    expect(await at()).toBe(y0);
    await expect(page.getByTestId('fleet-start')).toHaveText('Create game');
  });

  test('vs Computer, Classic: place, sweep the enemy grid, reach the result', async ({ page }) => {
    test.setTimeout(150_000);
    await fast(page);
    await page.goto('/fleet');
    await page.getByTestId('fleet-play-bot').click();
    await page.getByTestId('fleet-mode-classic').click();
    await page.getByTestId('fleet-level-easy').click();
    await page.getByTestId('fleet-start').click();
    await expect(page).toHaveURL(/\/fleet\/bot\?mode=classic/);
    await expect(page.getByTestId('fleet-ready')).toBeDisabled();
    await deployRandom(page);
    await expect(page.getByTestId('fleet-battle')).toBeVisible();
    // the enemy fleet is never drawn on the target grid before it sinks
    await expect(target(page).locator('[data-ship]')).toHaveCount(0);
    await sweep(page);
    await expect(page.getByTestId('fleet-result-title')).toHaveText(/Victory|Defeat/);
    await expect(page.getByTestId('fleet-reveal-them').locator('[data-ship]')).not.toHaveCount(0);
    await expect(page.getByTestId('fleet-rematch')).toBeVisible();
  });

  test('vs Computer, Salvo: mark one square per ship afloat and fire', async ({ page }) => {
    test.setTimeout(150_000);
    await fast(page);
    await page.goto('/fleet/bot?mode=salvo&bestOf=1&level=easy');
    await deployRandom(page);
    let i = 0;
    for (let turn = 0; turn < 60; turn++) {
      await myTurnOrEnd(page);
      if (await ended(page)) break;
      const need = Number((await page.getByTestId('fleet-salvo-count').innerText()).split('/')[1].split(' ')[0]);
      for (let k = 0; k < need; k++) {
        i = await nextOpen(page, i);
        await page.getByTestId(`fleet-target-${SQUARES[i]}`).click();
        i++;
      }
      await expect(page.getByTestId('fleet-salvo-count')).toHaveText(`${need}/${need} marked`);
      await page.getByTestId('fleet-fire-salvo').click();
    }
    await expect(page.getByTestId('fleet-result')).toBeVisible();
  });

  test('vs Computer, Super Weapons: pick a loadout, fire a charged weapon, finish the game', async ({ page }) => {
    test.setTimeout(150_000);
    await fast(page);
    await page.goto('/fleet/bot?mode=super&bestOf=1&level=easy&all=1');
    await expect(page.getByTestId('fleet-loadout-ok')).toBeDisabled();
    for (const w of ['airStrike', 'thunderhead', 'shield']) await page.getByTestId(`fleet-weapon-${w}`).click();
    await page.getByTestId('fleet-loadout-ok').click();
    await deployRandom(page);
    let fired = false;
    await sweep(page, async () => {
      if (fired || !(await page.getByTestId('fleet-arm-airStrike').isEnabled())) return false;
      await page.getByTestId('fleet-arm-airStrike').click();
      await page.getByTestId('fleet-turn').click();
      const cell = page.getByTestId('fleet-target-E5');
      await cell.click();
      // the first tap of an area weapon may only aim (touch); fire if the turn is still ours
      if (await target(page).evaluate((el) => el.classList.contains('live'))) await cell.click();
      fired = true;
      return true;
    });
    expect(fired).toBe(true);
    await expect(page.getByTestId('fleet-result')).toBeVisible();
  });

  test('pass and play: a curtain between players, and the defender sees what landed', async ({ page }) => {
    await fast(page);
    await page.goto('/fleet/local?mode=classic&bestOf=1');
    await deployRandom(page);
    await expect(page.getByTestId('fleet-curtain')).toContainText('Player 2');
    await expect(page.getByTestId('fleet-own')).toHaveCount(0);
    await page.getByTestId('fleet-curtain-go').click();
    await deployRandom(page);
    // the opener is random: if Player 1 opens, the curtain falls again for them
    await expect(page.locator('[data-testid="fleet-curtain"], [data-testid="fleet-battle"]').first()).toBeVisible();
    if (await page.getByTestId('fleet-curtain').isVisible()) await page.getByTestId('fleet-curtain-go').click();
    for (let k = 0; k < 4; k++) {
      await myTurnOrEnd(page);
      await page.getByTestId(`fleet-target-${SQUARES[k * 11]}`).click();
      await expect(page.getByTestId('fleet-curtain')).toBeVisible();
      await expect(page.getByTestId('fleet-battle')).toHaveCount(0);
      await page.getByTestId('fleet-curtain-go').click();
      // the player now on screen sees the shot that just landed on their own fleet
      await expect(page.getByTestId('fleet-home').locator('[class*="has-"]')).toHaveCount(Math.floor(k / 2) + 1);
    }
  });

  test('two windows play online; neither sees the other fleet; a spectator sees none; resigning ends it', async ({ browser }) => {
    test.setTimeout(120_000);
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const a = await ctxA.newPage();
    const b = await ctxB.newPage();
    for (const p of [a, b]) await p.addInitScript(() => localStorage.setItem('fleet.fx', 'off'));
    await asName(a, 'Ann');
    await a.goto('/fleet');
    await a.getByTestId('fleet-play-online').click();
    await a.getByTestId('fleet-mode-classic').click();
    await a.getByTestId('fleet-start').click();
    await expect(a).toHaveURL(/\/fleet\/play\/[^/?]+$/);
    const matchID = new URL(a.url()).pathname.split('/').pop()!;
    await expect(a.getByTestId('fleet-invite')).toBeVisible();

    await asName(b, 'Ben');
    await b.goto(`/fleet/join/${matchID}`);
    await expect(b).toHaveURL(new RegExp(`/fleet/play/${matchID}$`));
    await expect(a.getByTestId('fleet-invite')).toHaveCount(0);
    await deployRandom(a);
    await expect(a.getByTestId('fleet-waiting')).toContainText('Ben');
    await deployRandom(b);
    await expect(a.getByTestId('fleet-battle')).toBeVisible();
    await expect(b.getByTestId('fleet-battle')).toBeVisible();

    const spectator = await (await browser.newContext()).newPage();
    await spectator.addInitScript(() => localStorage.setItem('fleet.fx', 'off'));
    await spectator.goto(`/fleet/watch/${matchID}`);
    await expect(spectator.getByTestId('fleet-battle')).toBeVisible();

    const starter = (await a.getByTestId('fleet-banner').innerText()).startsWith('Your turn') ? a : b;
    const other = starter === a ? b : a;
    for (let k = 0; k < 6; k++) {
      const mover = k % 2 ? other : starter;
      await myTurnOrEnd(mover);
      await mover.getByTestId(`fleet-target-${SQUARES[k * 7]}`).click();
      for (const p of [a, b, spectator]) await expect(p.getByTestId('fleet-target').locator('[data-ship]')).toHaveCount(0);
      await expect(spectator.getByTestId('fleet-home').locator('[data-ship]')).toHaveCount(0);
    }
    // each player's own grid shows their own ships only
    await expect(a.getByTestId('fleet-home').locator('[data-ship]')).toHaveCount(5);
    await expect(b.getByTestId('fleet-home').locator('[data-ship]')).toHaveCount(5);

    await b.getByTestId('fleet-exit').click();
    await b.getByTestId('fleet-leave-yes').click();
    await expect(b).toHaveURL(/\/fleet$/);
    await expect(a.getByTestId('fleet-result-title')).toHaveText('Victory');
    await expect(a.getByTestId('fleet-reveal-them').locator('[data-ship]')).toHaveCount(5);
    await expect(spectator.getByTestId('fleet-result')).toBeVisible();
    await ctxA.close();
    await ctxB.close();
  });
});
