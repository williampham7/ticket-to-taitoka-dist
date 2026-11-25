import { expect, test, type Browser, type Page } from '@playwright/test';
import { asName } from './helpers';

/** No animations, no coach marks or intro, and computer players answer at once. */
async function fast(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('kg.fx', JSON.stringify('off'));
    localStorage.setItem('kg.coach', JSON.stringify('done'));
    localStorage.setItem('kg.intro', JSON.stringify('seen'));
    localStorage.setItem('kg.botMs', JSON.stringify('30'));
  });
}
async function newPlayer(browser: Browser, name: string) {
  const page = await (await browser.newContext()).newPage();
  await fast(page);
  await asName(page, name);
  return page;
}

/**
 * One human action if it is this page's turn: press "Suggest a push" and push the glowing banner; then walk to the
 * target if a goal square glows, else Stay. Returns 'done' once the result page shows.
 */
async function act(page: Page): Promise<'done' | 'acted' | 'idle'> {
  if (await page.getByTestId('kg-result').isVisible()) return 'done';
  if (await page.getByTestId('kg-open-book').isVisible()) { await page.getByTestId('kg-open-book').click(); return 'acted'; }
  const game = page.getByTestId('kg-game');
  if (!(await game.isVisible())) return 'idle';
  if ((await game.getAttribute('data-busy')) === '1') return 'idle';
  const suggest = page.getByTestId('kg-suggest');
  if (await suggest.isVisible() && await suggest.isEnabled()) {
    // the turn can pass between the check and the click (bots, other windows): treat that as idle
    if (!(await suggest.click({ timeout: 2000 }).then(() => true, () => false))) return 'idle';
    const aimed = page.locator('.kg-banner.kg-aimed');
    if (await aimed.count()) { if (!(await aimed.click({ timeout: 2000 }).then(() => true, () => false))) return 'idle'; return 'acted'; }
  }
  const stay = page.getByTestId('kg-stay');
  if (await stay.isVisible() && await stay.isEnabled()) {
    const goal = page.locator('.kg-cell.kg-reach[data-goal]');
    const ok = await (await goal.count() ? goal.first() : stay).click({ timeout: 2000 }).then(() => true, () => false);
    return ok ? 'acted' : 'idle';
  }
  return 'idle';
}
/** Plays every page's turns until all of them show the result page. */
async function playToEnd(pages: Page[], max = 1500) {
  for (let i = 0; i < max; i++) {
    const r = await Promise.all(pages.map(act));
    if (r.every((x) => x === 'done')) return;
    if (r.every((x) => x !== 'acted')) await pages[0].waitForTimeout(60);
  }
  throw new Error('the game did not finish');
}
async function targetOf(page: Page) { return page.locator('[data-testid=kg-target] .kg-face-front .kg-card').first().getAttribute('data-t'); }

test.describe('Runeshift', () => {
  test.setTimeout(180_000);
  test.beforeEach(async ({ page }) => { await fast(page); await asName(page, 'Ana'); });

  test('the picker opens the storybook menu; How to play turns its five pages', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('kingdom-card').click();
    await expect(page).toHaveURL(/\/kingdom$/);
    await expect(page.getByTestId('kg-menu-page')).toBeVisible();
    await page.getByTestId('kg-howto').click();
    for (let k = 0; k < 4; k++) await page.getByTestId('kg-howto-next').click();
    await expect(page.getByRole('button', { name: "Let's play!" })).toBeVisible();
    await page.getByRole('button', { name: "Let's play!" }).click();
    await expect(page.getByTestId('kg-howto-book')).toBeHidden();
  });

  test('pass and play: the book names each hero, a turn pushes and walks, then the book closes again', async ({ page }) => {
    await page.goto('/kingdom');
    await page.getByTestId('kg-pass').click();
    await page.getByTestId('kg-begin').click();
    await expect(page.getByTestId('kg-curtain')).toBeVisible();
    const first = await page.locator('.kg-cover h2').textContent();
    await page.getByTestId('kg-open-book').click();
    const before = await page.getByTestId('kg-game').getAttribute('data-current');
    await page.getByTestId('kg-suggest').click();
    await page.locator('.kg-banner.kg-aimed').click();
    await expect(page.getByTestId('kg-game')).toHaveAttribute('data-step', 'move');
    await page.getByTestId('kg-stay').click();
    await expect(page.getByTestId('kg-curtain')).toBeVisible();
    expect(await page.locator('.kg-cover h2').textContent()).not.toBe(first);
    await page.getByTestId('kg-open-book').click();
    await expect(page.getByTestId('kg-game')).not.toHaveAttribute('data-current', before!);
  });

  test('vs computer: a Short game plays to "The End"', async ({ page }) => {
    await page.goto('/kingdom/bot');
    await page.getByTestId('kg-length-short').click();
    await page.getByTestId('kg-begin').click();
    await expect(page.getByTestId('kg-game')).toBeVisible();
    await playToEnd([page]);
    await expect(page.getByTestId('kg-result')).toContainText('The End');
  });

  test('online: hero picks and room options reach everyone; a spectator sees no target; reconnect keeps my seat', async ({ page, browser }) => {
    await page.goto('/kingdom');
    await page.getByTestId('kg-host').click();
    await expect(page.getByTestId('kg-room')).toBeVisible();
    const room = page.url().split('/').pop()!;
    const ben = await newPlayer(browser, 'Ben');
    await ben.goto(`/kingdom/join/${room}`);
    await expect(ben.getByTestId('kg-room')).toBeVisible();
    await ben.getByTestId('kg-hero-pick-2').click();
    await ben.getByTestId('kg-young').click();
    await expect(ben.getByTestId('kg-young')).toBeChecked();
    await page.getByTestId('kg-length-short').click();
    await expect(ben.getByTestId('kg-length-short')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('kg-seat-1')).toContainText('Sorceress');
    await expect(page.getByTestId('kg-seat-1').locator('.kg-star')).toBeVisible();
    await page.getByTestId('kg-start').click();
    await expect(page.getByTestId('kg-game')).toBeVisible();
    await expect(ben.getByTestId('kg-game')).toBeVisible();
    await expect(ben.locator('[data-testid=kg-player-1] .kg-star')).toBeVisible();
    const game = page.url().split('/').pop()!;

    const watcher = await newPlayer(browser, 'Cleo');
    await watcher.goto(`/kingdom/watch/${game}`);
    await expect(watcher.getByTestId('kg-game')).toBeVisible();
    await expect(watcher.locator('[data-testid=kg-target] .kg-face-front .kg-card')).toHaveCount(0);

    // a few turns, then Ben reloads mid-game and keeps his seat, board and cards
    for (let i = 0; i < 12; i++) { await act(page); await act(ben); await page.waitForTimeout(40); }
    const cards = await ben.locator('[data-testid=kg-target] .kg-face-front .kg-card').evaluateAll((els) => els.map((e) => e.getAttribute('data-t') ?? e.textContent));
    await ben.reload();
    await expect(ben.getByTestId('kg-game')).toBeVisible();
    await expect.poll(async () => ben.locator('[data-testid=kg-target] .kg-face-front .kg-card').evaluateAll((els) => els.map((e) => e.getAttribute('data-t') ?? e.textContent))).toEqual(cards);
  });

  test('Gate D: host, two joiners and an Easy bot play a Short game to the end, then rematch together', async ({ page, browser }) => {
    await page.goto('/kingdom/host');
    await expect(page.getByTestId('kg-room')).toBeVisible();
    const room = page.url().split('/').pop()!;
    const ben = await newPlayer(browser, 'Ben');
    const cleo = await newPlayer(browser, 'Cleo');
    for (const p of [ben, cleo]) { await p.goto(`/kingdom/join/${room}`); await expect(p.getByTestId('kg-room')).toBeVisible(); }
    await page.getByTestId('kg-addbot-easy').first().click();
    await expect(page.getByTestId('kg-seat-3')).toContainText('Page');
    await page.getByTestId('kg-length-short').click();
    await page.getByTestId('kg-start').click();
    const all = [page, ben, cleo];
    for (const p of all) await expect(p.getByTestId('kg-game')).toBeVisible();
    // each window shows exactly its own single target card, and the three are different treasures
    const ts = await Promise.all(all.map(targetOf));
    expect(new Set(ts).size).toBe(3);
    // mid-game reconnect
    for (let i = 0; i < 10; i++) await Promise.all(all.map(act));
    await cleo.reload();
    await expect(cleo.getByTestId('kg-game')).toBeVisible();
    await playToEnd(all);
    // every window saw the same story: the narrated log ends the same way
    const ends = await Promise.all(all.map((p) => p.getByTestId('kg-log').locator('li').first().textContent()));
    expect(new Set(ends).size).toBe(1);
    await page.getByTestId('kg-again').click();
    for (const p of all) await expect(p.getByTestId('kg-room')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('kg-seat-3')).toContainText('Page');
  });
});
