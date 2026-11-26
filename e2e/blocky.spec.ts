import { expect, test, type Browser, type Page } from '@playwright/test';
import { asName } from './helpers';

/** No animations, no coach marks, and computer players answer at once. */
async function fast(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('bly.fx', JSON.stringify('off'));
    localStorage.setItem('bly.coach', JSON.stringify('done'));
    localStorage.setItem('bly.botMs', JSON.stringify('30'));
  });
}
async function newPlayer(browser: Browser, name: string) {
  const page = await (await browser.newContext()).newPage();
  await fast(page);
  await asName(page, name);
  return page;
}
const ok = (p: Promise<unknown>) => p.then(() => true, () => false);

/**
 * One human turn if it is this page's turn: Suggest, then the tick. The turn can pass between a check and a click
 * (bots, other windows), so a failed click just means 'idle'.
 */
async function act(page: Page): Promise<'done' | 'acted' | 'idle'> {
  if (await page.getByTestId('bly-result').isVisible()) return 'done';
  const curtain = page.getByTestId('bly-open');
  if (await curtain.isVisible()) { await ok(curtain.click({ timeout: 2000 })); return 'acted'; }
  const status = page.getByTestId('bly-status');
  if (!(await status.isVisible())) return 'idle';
  const text = (await status.textContent({ timeout: 2000 }).catch(() => '')) ?? '';
  if (/grounded/i.test(text) || !text.includes('Your turn')) return 'idle';
  const suggest = page.getByTestId('bly-suggest');
  if (!(await suggest.isVisible()) || !(await suggest.isEnabled({ timeout: 2000 }).catch(() => false))) return 'idle';
  if (!(await ok(suggest.click({ timeout: 2000 })))) return 'idle';
  return (await ok(page.getByTestId('bly-confirm').click({ timeout: 2000 }))) ? 'acted' : 'idle';
}
async function playToEnd(pages: Page[], max = 3000) {
  for (let i = 0; i < max; i++) {
    const r = await Promise.all(pages.map(act));
    if (r.every((x) => x === 'done')) return;
    if (r.every((x) => x !== 'acted')) await pages[0].waitForTimeout(60);
  }
  throw new Error('the game did not finish');
}
/** Plays until every page has made `n` moves. */
async function playTurns(pages: Page[], n: number, max = 1500) {
  const made = pages.map(() => 0);
  for (let i = 0; i < max && made.some((m) => m < n); i++) {
    const r = await Promise.all(pages.map((p, k) => (made[k] < n ? act(p) : Promise.resolve('idle' as const))));
    r.forEach((x, k) => { if (x === 'acted') made[k]++; });
    if (r.every((x) => x !== 'acted')) await pages[0].waitForTimeout(60);
  }
  expect(made.every((m) => m >= n)).toBe(true);
}
async function placedTotal(page: Page) {
  const t = await page.locator('.bly-placed').allTextContents();
  return t.reduce((s, x) => s + (Number(x) || 0), 0);
}

test.describe('Blocky', () => {
  test.setTimeout(180_000);
  test.beforeEach(async ({ page }) => { await fast(page); await asName(page, 'Ana'); });

  test('the picker opens the Blocky menu', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('blocky-card').click();
    await expect(page).toHaveURL(/\/blocky$/);
    await expect(page.getByTestId('bly-menu')).toBeVisible();
    for (const t of ['host', 'join', 'bot', 'local']) await expect(page.getByTestId(`bly-menu-${t}`)).toBeVisible();
  });

  test('pass and play: an illegal first drop shows its reason and sends nothing; then a legal turn', async ({ page }) => {
    await page.goto('/blocky/local');
    await page.getByTestId('bly-setup-start').click();
    await page.getByTestId('bly-open').click();
    await expect(page.getByTestId('bly-curtain')).toBeHidden();
    await expect(page.getByTestId('bly-board-duo')).toBeVisible();
    await expect(page.getByTestId('bly-status')).toContainText('Your turn');
    const piece = page.getByTestId('bly-piece-I5');
    await expect(piece).toBeVisible();
    const pb = (await piece.boundingBox())!;
    const cb = (await page.locator('rect[data-cell="6,6"]').boundingBox())!;
    await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
    await page.mouse.down();
    await page.mouse.move(pb.x + pb.width / 2 + 20, pb.y + pb.height / 2 + 20, { steps: 4 });
    await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2, { steps: 10 });
    await page.mouse.up();
    await expect(page.getByTestId('bly-reason')).toContainText(/start/i);
    expect(await placedTotal(page)).toBe(0);
    await expect(page.getByTestId('bly-status')).toContainText('Your turn');
    // a legal turn goes through and the curtain hands over to the other player
    const before = await page.getByTestId('bly-turn').getAttribute('data-actor');
    await page.getByTestId('bly-suggest').click();
    await page.getByTestId('bly-confirm').click();
    await expect(page.getByTestId('bly-open')).toBeVisible();
    await page.getByTestId('bly-open').click();
    await expect(page.getByTestId('bly-curtain')).toBeHidden();
    await expect(page.getByTestId('bly-turn')).not.toHaveAttribute('data-actor', before!);
    expect(await placedTotal(page)).toBeGreaterThan(0);
  });

  test('vs computer on Duo: played to the result, scores match the banners', async ({ page }) => {
    await page.goto('/blocky/bot');
    await page.getByTestId('bly-board-pick-duo').click();
    await page.getByTestId('bly-seat-1-kind').selectOption('easy');
    await page.getByTestId('bly-setup-start').click();
    await expect(page.getByTestId('bly-board-duo')).toBeVisible();
    await playToEnd([page]);
    await expect(page.getByTestId('bly-result')).toBeVisible();
    const banners = (await page.locator('[data-testid^=bly-banner-]').evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-score'))))).sort((a, b) => a - b);
    const result = (await page.locator('[data-testid=bly-result] [data-score]').evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-score'))))).sort((a, b) => a - b);
    expect(banners.length).toBe(2);
    expect(result).toEqual(banners);
  });

  test('online: board and hints reach the joiner live; 3 turns each; a spectator sees them; reload keeps the seat', async ({ page, browser }) => {
    await page.goto('/blocky/host');
    await expect(page.getByTestId('bly-room')).toBeVisible();
    const url = (await page.getByTestId('bly-invite-url').textContent())!.trim();
    const ben = await newPlayer(browser, 'Ben');
    await ben.goto(new URL(url, page.url()).toString());
    await expect(ben.getByTestId('bly-room')).toBeVisible();
    await expect(page.getByTestId('bly-seat-1')).toContainText('Ben');
    // settings: Classic and Hints off, then back on (Suggest needs them)
    await page.getByTestId('bly-board-pick-classic').click();
    await expect(ben.getByTestId('bly-board-pick-classic')).toHaveAttribute('aria-checked', 'true');
    await page.getByTestId('bly-hints').click();
    await expect(page.getByTestId('bly-hints')).not.toBeChecked();
    await expect(ben.getByTestId('bly-hints')).not.toBeChecked();
    await page.getByTestId('bly-hints').click();
    await expect(page.getByTestId('bly-hints')).toBeChecked();
    await expect(ben.getByTestId('bly-hints')).toBeChecked();
    for (const p of [page, ben]) await expect(p.getByTestId('bly-board-pick-classic')).toHaveAttribute('aria-checked', 'true');
    await page.getByTestId('bly-start').click();
    for (const p of [page, ben]) await expect(p.getByTestId('bly-board-classic')).toBeVisible();
    const game = page.url().split('/').pop()!;

    const watcher = await newPlayer(browser, 'Cleo');
    await watcher.goto(`/blocky/watch/${game}`);
    await expect(watcher.getByTestId('bly-board-classic')).toBeVisible();

    await playTurns([page, ben], 3);
    await expect.poll(() => placedTotal(watcher)).toBeGreaterThan(0);
    await expect.poll(() => placedTotal(watcher)).toBe(await placedTotal(page));

    // reconnect: Ben reloads mid-game, keeps his seat, and the game goes on
    const placed = await placedTotal(ben);
    await ben.reload();
    await expect(ben.getByTestId('bly-board-classic')).toBeVisible();
    await expect(ben.getByTestId('bly-status')).toBeVisible();
    await expect.poll(() => placedTotal(ben)).toBe(placed);
    await playTurns([page, ben], 2);
    expect(await placedTotal(ben)).toBeGreaterThan(placed);
  });
});
