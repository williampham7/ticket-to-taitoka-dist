import { expect, test, type Page } from '@playwright/test';
import { asName } from './helpers';

/** (id -> visible text) of every piece of one side, as this page's DOM shows it. */
async function pieceTexts(page: Page, owner: string) {
  return page.locator(`[data-testid="fl-piece"][data-owner="${owner}"]`).evaluateAll((els) =>
    els.map((e) => ({ id: e.getAttribute('data-id')!, text: (e as HTMLElement).innerText.trim(), revealed: e.getAttribute('data-revealed') === 'true', hasRankAttr: e.hasAttribute('data-rank') })));
}

test('two windows play Frontline and never see each other\'s hidden ranks', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();

  await asName(a, 'Ann');
  await a.goto('/frontline');
  await a.getByTestId('fl-host').click();
  await expect(a).toHaveURL(/\/frontline\/play\/[^/]+$/);
  const matchID = new URL(a.url()).pathname.split('/').pop()!;
  await expect(a.getByTestId('fl-invite')).toBeVisible();
  await expect(a.getByTestId('fl-copy-link')).toBeVisible();
  await expect(a.getByTestId('fl-start')).toBeDisabled();
  await expect(a.getByTestId('fl-piece')).toHaveCount(0);

  await asName(b, 'Ben');
  await b.goto(`/frontline/join/${matchID}`);
  await expect(b).toHaveURL(new RegExp(`/frontline/play/${matchID}$`));
  await expect(a.getByTestId('fl-invite')).toHaveCount(0);
  // only the host starts; the board stays empty until then
  await expect(b.getByTestId('fl-start')).toHaveCount(0);
  await expect(b.getByTestId('fl-briefing-wait')).toBeVisible();
  await a.getByTestId('fl-timer-60').click();
  await expect(b.getByTestId('fl-timer-60')).toHaveAttribute('aria-checked', 'true');
  await a.getByTestId('fl-start').click();
  await expect(b.getByTestId('fl-deploy')).toBeVisible();

  // deploying: the confirm button shows only for a complete army, and nobody sees the other side
  await expect(a.getByTestId('fl-ready')).toHaveCount(0);
  await a.getByTestId('fl-randomize').click();
  await expect(a.locator('[data-testid="fl-piece"]')).toHaveCount(40);
  await a.getByTestId('fl-ready').click();
  await expect(b.locator('[data-testid="fl-piece"]')).toHaveCount(0);
  await b.getByTestId('fl-preset-fortress').click();
  await expect(b.locator('[data-testid="fl-piece"]')).toHaveCount(40);
  await expect(b.locator('[data-testid="fl-piece"][data-owner="0"]')).toHaveCount(0);
  await expect(a.locator('[data-testid="fl-piece"][data-owner="1"]')).toHaveCount(0);
  await b.getByTestId('fl-ready').click();
  await expect(a.getByTestId('fl-banner')).toContainText(/turn/);
  await expect(b.getByTestId('fl-banner')).toContainText(/turn/);

  const mover = (await a.getByTestId('fl-banner').innerText()).startsWith('Your turn') ? a : b;
  const owner = mover === a ? '0' : '1';
  // tap each own piece until one has a highlighted destination, then move there
  const own = mover.locator(`[data-testid="fl-piece"][data-owner="${owner}"]`);
  const n = await own.count();
  let moved = false;
  for (let i = 0; i < n && !moved; i++) {
    await own.nth(i).click();
    const legal = mover.locator('[data-legal="true"]');
    if (await legal.count()) { await legal.first().click(); moved = true; }
  }
  expect(moved).toBe(true);
  await expect(mover.getByTestId('fl-banner')).toContainText("Opponent's turn");
  // wait until the move has reached the other window too
  await expect((mover === a ? b : a).getByTestId('fl-banner')).toContainText('Your turn');

  // hidden information: each page shows the other side as a blank crest only (unless revealed), and has no rank attributes
  for (const [viewer, foe] of [[a, '1'], [b, '0']] as const) {
    const enemy = await pieceTexts(viewer, foe);
    // a first-move scout can run across the middle and attack, so one piece may already be gone
    expect(enemy.length).toBeGreaterThanOrEqual(39);
    for (const p of enemy) {
      expect(p.hasRankAttr).toBe(false);
      if (!p.revealed) expect(p.text).toBe('');
    }
    const mine = await pieceTexts(viewer, foe === '1' ? '0' : '1');
    expect(mine.every((p) => p.text !== '')).toBe(true);
  }
  // the other window's own ranks are absent from this page's markup for the same ids
  const aMine = await pieceTexts(a, '0');
  const bView = await pieceTexts(b, '0');
  for (const p of aMine) {
    const seen = bView.find((x) => x.id === p.id);
    if (seen && !seen.revealed) expect(seen.text).toBe('');
  }
  const bMine = await pieceTexts(b, '1');
  const aView = await pieceTexts(a, '1');
  for (const p of bMine) {
    const seen = aView.find((x) => x.id === p.id);
    if (seen && !seen.revealed) expect(seen.text).toBe('');
  }
  await ctxA.close();
  await ctxB.close();
});

test('pass and play hides each setup behind a curtain', async ({ page }) => {
  await page.goto('/frontline/local?seed=e2e1');
  // the settings are on the game screen, over an empty board
  await expect(page.getByTestId('fl-board-clear')).toBeVisible();
  await expect(page.getByTestId('fl-piece')).toHaveCount(0);
  await page.getByTestId('fl-name-0').fill('Ann');
  await page.getByTestId('fl-start').click();
  await expect(page.getByTestId('fl-curtain')).toContainText('Ann');
  await expect(page.getByTestId('fl-piece')).toHaveCount(0);
  await page.getByTestId('fl-reveal').click();
  await expect(page.getByTestId('fl-piece')).toHaveCount(0);
  await page.getByTestId('fl-randomize').click();
  await page.getByTestId('fl-ready').click();
  await expect(page.getByTestId('fl-curtain')).toBeVisible();
  await expect(page.getByTestId('fl-piece')).toHaveCount(0);
  await page.getByTestId('fl-reveal').click();
  await expect(page.locator('[data-testid="fl-piece"][data-owner="0"]')).toHaveCount(0);
  await page.getByTestId('fl-preset-blitz').click();
  await page.getByTestId('fl-ready').click();
  // the curtain falls again only if the other player moves first (the same player stays on screen otherwise)
  if (await page.getByTestId('fl-curtain').isVisible()) await page.getByTestId('fl-reveal').click();
  await expect(page.getByTestId('fl-banner')).toContainText('Your turn');
  const own = page.locator('[data-testid="fl-piece"]').filter({ hasNot: page.locator('[data-hidden]') });
  for (let i = 0, n = await own.count(); i < n; i++) {
    await own.nth(i).click();
    const legal = page.locator('[data-legal="true"]');
    if (await legal.count()) { await legal.first().click(); break; }
  }
  await expect(page.getByTestId('fl-curtain')).toBeVisible();
  await expect(page.getByTestId('fl-piece')).toHaveCount(0);
});

/** Tap own pieces until one has a highlighted destination, then move there. */
async function makeAMove(page: Page) {
  const own = page.locator('[data-testid="fl-piece"]').filter({ hasNot: page.locator('[data-hidden]') });
  for (let i = 0, n = await own.count(); i < n; i++) {
    await own.nth(i).click();
    const legal = page.locator('[data-legal="true"]');
    if (await legal.count()) { await legal.first().click(); return; }
  }
  throw new Error('no legal move found');
}

/** Two windows, both seated and both ready (the game is in the play phase). */
async function lanGame(browser: import('@playwright/test').Browser) {
  const ctxs = [await browser.newContext(), await browser.newContext()];
  const [a, b] = [await ctxs[0].newPage(), await ctxs[1].newPage()];
  await asName(a, 'Ann');
  await a.goto('/frontline');
  await a.getByTestId('fl-host').click();
  await expect(a).toHaveURL(/\/frontline\/play\/[^/]+$/);
  const matchID = new URL(a.url()).pathname.split('/').pop()!;
  await asName(b, 'Ben');
  await b.goto(`/frontline/join/${matchID}`);
  await expect(b).toHaveURL(new RegExp(`/frontline/play/${matchID}$`));
  await expect(a.getByTestId('fl-spectator-link')).toBeVisible();
  await a.getByTestId('fl-start').click();
  for (const p of [a, b]) { await p.getByTestId('fl-randomize').click(); await p.getByTestId('fl-ready').click(); }
  await expect(a.getByTestId('fl-banner')).toContainText(/turn/);
  await expect(b.getByTestId('fl-banner')).toContainText(/turn/);
  return { a, b, matchID, close: () => Promise.all(ctxs.map((c) => c.close())) };
}

test('LAN leave: an in-page confirmation, then the leaver resigns and goes back to the menu', async ({ browser }) => {
  const { a, b, close } = await lanGame(browser);
  let browserDialog = false;
  a.on('dialog', (d) => { browserDialog = true; void d.dismiss(); });
  await a.getByTestId('fl-resign').click();
  await expect(a.getByTestId('confirm-leave')).toBeVisible();
  await a.getByTestId('stay-in-game').click();
  await expect(a.getByTestId('confirm-leave')).toHaveCount(0);
  await expect(a.getByTestId('fl-banner')).toContainText(/turn/);
  await a.getByTestId('fl-resign').click();
  await a.getByTestId('confirm-leave-yes').click();
  await expect(a.getByTestId('frontline-menu')).toBeVisible();
  await expect(b.getByTestId('fl-banner')).toContainText('You win');
  await expect(b.getByTestId('fl-banner')).toContainText('left the battle');
  await expect(b.getByTestId('fl-rematch')).toBeVisible();
  expect(browserDialog).toBe(false);
  await close();
});

test('LAN reconnect keeps hidden ranks hidden and the game going; a spectator sees no ranks', async ({ browser }) => {
  const { a, b, matchID, close } = await lanGame(browser);

  // spectator: 80 pieces, none with a rank
  const ctxS = await browser.newContext();
  const s = await ctxS.newPage();
  await s.goto(`/frontline/watch/${matchID}`);
  await expect(s.locator('[data-testid="fl-piece"]')).toHaveCount(80);
  const spec = await s.locator('[data-testid="fl-piece"]').evaluateAll((els) => els.map((e) => (e as HTMLElement).innerText.trim()));
  expect(spec.every((t) => t === '')).toBe(true);
  await expect(s.getByTestId('fl-cell-50')).toBeVisible();
  await expect(s.getByTestId('fl-deploy')).toHaveCount(0);
  await expect(s.getByTestId('fl-left-mine-10')).toHaveText('1/1');

  // window B reloads mid-game
  await b.reload();
  await expect(b.getByTestId('fl-banner')).toContainText(/turn/);
  await expect(b.locator('[data-testid="fl-piece"][data-owner="1"]')).toHaveCount(40);
  for (const [viewer, foe] of [[b, '0']] as const) {
    const enemy = await pieceTexts(viewer, foe);
    expect(enemy).toHaveLength(40);
    for (const p of enemy) { expect(p.hasRankAttr).toBe(false); expect(p.text).toBe(''); }
  }
  // a move still works after the reload
  const mover = (await a.getByTestId('fl-banner').innerText()).startsWith('Your turn') ? a : b;
  const other = mover === a ? b : a;
  await makeAMove(mover);
  await expect(other.getByTestId('fl-banner')).toContainText('Your turn');
  await expect(s.getByTestId('fl-banner')).toContainText(/'s turn/);
  await ctxS.close();
  await close();
});

test('vs computer: the bot readies itself and answers moves', async ({ page }) => {
  await page.goto('/frontline/bot');
  await page.getByTestId('fl-start').click();
  // place by hand: the command post is picked first, tap an empty square of my zone
  await page.locator('[data-zone="true"]').first().click();
  await expect(page.getByTestId('fl-placed')).toHaveText('1/40');
  await expect(page.getByTestId('fl-tray-F')).toContainText('×0');
  await expect(page.getByTestId('fl-ready')).toHaveCount(0);
  // a tap on a placed piece sends it back to the tray
  await page.locator('[data-zone="true"]').first().click();
  await expect(page.getByTestId('fl-placed')).toHaveText('0/40');
  await expect(page.getByTestId('fl-tray-F')).toContainText('×1');
  await page.getByTestId('fl-fill').click();
  await expect(page.getByTestId('fl-placed')).toHaveText('40/40');
  // hold and drag one piece onto another: they swap
  const zone = page.locator('[data-zone="true"]');
  const [ca, cb] = [zone.nth(0), zone.nth(15)];
  const [ta, tb] = [(await ca.textContent()) ?? "", (await cb.textContent()) ?? ""];
  const [ba, bb] = [(await ca.boundingBox())!, (await cb.boundingBox())!];
  await page.mouse.move(ba.x + ba.width / 2, ba.y + ba.height / 2);
  await page.mouse.down();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(ca).toHaveText(tb);
  await expect(cb).toHaveText(ta);
  await expect(page.getByTestId('fl-placed')).toHaveText('40/40');
  await page.getByTestId('fl-ready').click();
  await expect(page.getByTestId('fl-banner')).toContainText('Your turn', { timeout: 15_000 });
  await makeAMove(page);
  await expect(page.getByTestId('fl-banner')).toContainText("Opponent's turn");
  await expect(page.getByTestId('fl-banner')).toContainText('Your turn', { timeout: 15_000 });
  await expect(page.getByTestId('fl-fallen')).toBeVisible();
});

test('the Frontline menu opens and closes the instructions briefing', async ({ page }) => {
  await page.goto('/frontline');
  await page.getByTestId('fl-rules').click();
  await expect(page.getByTestId('fl-rules-modal')).toContainText('Order of battle');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('fl-rules-modal')).toBeHidden();
  await page.getByTestId('back-to-main').click();
  await expect(page.getByTestId('frontline-card')).toBeVisible();
});
