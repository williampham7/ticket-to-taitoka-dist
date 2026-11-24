import { expect, test, type Browser, type Page } from '@playwright/test';
import { asName } from './helpers';

/** Animations off and short server pauses (egw.e2e); the rules and key bindings start from the defaults. */
async function fast(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('egw.e2e', '1');
    if (!sessionStorage.getItem('egw.kept')) {
      localStorage.removeItem('egw.keys');
      localStorage.removeItem('egw.local');
      sessionStorage.setItem('egw.kept', '1');
    }
  });
}

const pile = async (page: Page): Promise<number[]> => {
  const raw = (await page.getByTestId('egw-pile').getAttribute('data-cards')) ?? '';
  return raw ? raw.split(',').map(Number) : [];
};
const count = async (page: Page, seat: string) => Number(await page.getByTestId(`egw-seat-${seat}`).getAttribute('data-count'));
const rank = (c: number) => c % 13;
const doubleOrSandwich = (p: number[]) => {
  const n = p.length;
  return (n >= 2 && rank(p[n - 1]) === rank(p[n - 2])) || (n >= 3 && rank(p[n - 1]) === rank(p[n - 3]));
};

/** Pass and play: flip for whoever's turn it is (by the status line), one card per call. */
async function flipLocal(page: Page) {
  const status = (await page.getByTestId('egw-status').textContent()) ?? '';
  if (/Player 1 (to flip|has)/.test(status)) await page.keyboard.press('KeyQ');
  else if (/Player 2 (to flip|has)/.test(status)) await page.keyboard.press('BracketRight');
  await page.waitForTimeout(430);
}

async function startLocal(page: Page, seed = 'e2e1') {
  await page.goto(`/egyptian/local?seed=${seed}`);
  await expect(page.getByTestId('egw-game')).toHaveAttribute('data-stage', 'play', { timeout: 10_000 });
}

test.beforeEach(async ({ page }) => { await fast(page); });

test('the picker card opens the Egyptian War menu', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('egyptian-card').click();
  await expect(page).toHaveURL(/\/egyptian$/);
  await expect(page.getByTestId('egw-menu')).toBeVisible();
  await page.getByText('See the whole deck').click();
  await expect(page.getByTestId('egw-gallery-card')).toHaveCount(53);
});

test('pass and play by keyboard: a false slap burns a card, a valid slap wins the pile', async ({ page }) => {
  await startLocal(page);
  await expect(page.getByTestId('egw-legend')).toContainText('Double');
  // a slap on the empty pile is false: Player 1 burns a card and is locked out
  expect(await count(page, '0')).toBe(26);
  await page.keyboard.press('KeyW');
  await expect(page.getByTestId('egw-seat-0')).toHaveAttribute('data-count', '25');
  await expect(page.getByTestId('egw-lock-0')).toBeVisible();
  await page.waitForTimeout(1100);
  // flip with Q and ] until a Double or Sandwich shows, then slap with W
  let won = false;
  for (let i = 0; i < 300 && !won; i++) {
    const p = await pile(page);
    const playing = (await page.getByTestId('egw-game').getAttribute('data-stage')) === 'play' && !(await page.getByTestId('egw-reveal').isVisible());
    if (playing && doubleOrSandwich(p)) {
      const before = await count(page, '0');
      await page.keyboard.press('KeyW');
      await expect(page.getByTestId('egw-ribbon')).toContainText(/Double|Sandwich/);
      await expect.poll(() => count(page, '0')).toBeGreaterThan(before);
      won = true;
    } else await flipLocal(page);
  }
  expect(won).toBe(true);
});

test('the rule checklist changes what a slap means', async ({ page }) => {
  await page.goto('/egyptian');
  await page.getByTestId('egw-mode-local').click();
  await page.getByTestId('egw-rule-slapjack').check();
  await page.getByTestId('egw-rule-double').uncheck();
  await page.getByTestId('egw-rule-sandwich').uncheck();
  await expect(page.getByTestId('egw-rule-slapjack')).toBeDisabled(); // the last rule stays on
  await page.getByTestId('egw-local-start').click();
  await expect(page.getByTestId('egw-game')).toHaveAttribute('data-stage', 'play', { timeout: 10_000 });
  const legend = page.getByTestId('egw-legend');
  await expect(legend).toContainText('Slapjack');
  await expect(legend).not.toContainText('Double');
  let jack = false;
  for (let i = 0; i < 300 && !jack; i++) {
    const p = await pile(page);
    const playing = !(await page.getByTestId('egw-reveal').isVisible());
    if (playing && p.length && rank(p[p.length - 1]) === 10) {
      await page.keyboard.press('KeyW');
      await expect(page.getByTestId('egw-ribbon')).toContainText('Slapjack');
      jack = true;
    } else if (playing && doubleOrSandwich(p) && rank(p[p.length - 1]) !== 10) {
      // a Double is not a slap under these rules
      const before = await count(page, '0');
      await page.keyboard.press('KeyW');
      await expect.poll(() => count(page, '0')).toBe(before - 1);
      await page.waitForTimeout(1050);
    } else await flipLocal(page);
  }
  expect(jack).toBe(true);
});

test('keys can be rebound', async ({ page }) => {
  await page.goto('/egyptian');
  await page.getByTestId('egw-settings').click();
  await page.getByTestId('egw-bind-p1Slap').click();
  await page.keyboard.press('KeyE');
  await expect(page.getByTestId('egw-bind-p1Slap')).toHaveText('E');
  await page.getByTestId('egw-bind-p2Slap').click();
  await page.keyboard.press('KeyE');
  await expect(page.getByTestId('egw-bind-p2Slap')).toHaveAttribute('data-conflict', 'true');
  await page.getByTestId('egw-bind-p2Slap').click();
  await page.keyboard.press('BracketLeft');
  await expect(page.getByTestId('egw-bind-p2Slap')).not.toHaveAttribute('data-conflict');
  await page.getByTestId('egw-settings-close').click();
  await startLocal(page);
  await expect(page.getByTestId('egw-slap-0')).toContainText('E');
  await page.keyboard.press('KeyW');
  await page.waitForTimeout(300);
  expect(await count(page, '0')).toBe(26);
  await page.keyboard.press('KeyE');
  await expect(page.getByTestId('egw-seat-0')).toHaveAttribute('data-count', '25');
});

async function player(browser: Browser, name: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await asName(page, name);
  await fast(page);
  return page;
}

test('three players online through the waiting room, and a spectator', async ({ browser }) => {
  test.setTimeout(90_000);
  const [ana, bo, cy] = [await player(browser, 'Ana'), await player(browser, 'Bo'), await player(browser, 'Cy')];
  await ana.goto('/egyptian');
  await ana.getByTestId('egw-host').click();
  await ana.waitForURL(/\/egyptian\/wait\//);
  const room = ana.url().split('/').pop()!;
  for (const p of [bo, cy]) {
    await p.goto(`/egyptian/join/${room}`);
    await p.waitForURL(/\/egyptian\/wait\//);
  }
  await expect(ana.getByTestId('egw-start')).toContainText('3 players');
  // the host's rules show live on the other screens
  await ana.getByTestId('egw-rule-lucky7').check();
  await expect(bo.getByTestId('egw-rule-lucky7')).toBeChecked();
  await expect(bo.getByTestId('egw-rule-lucky7')).toBeDisabled();
  await cy.getByTestId('egw-color-3').click();
  await ana.getByTestId('egw-start').click();
  for (const p of [ana, bo, cy]) await p.waitForURL(/\/egyptian\/play\//, { timeout: 15_000 });
  const game = ana.url().split('/').pop()!;
  for (const p of [ana, bo, cy]) await expect(p.getByTestId('egw-game')).toHaveAttribute('data-stage', 'play', { timeout: 15_000 });
  await expect(ana.getByTestId('egw-legend')).toContainText('Lucky Seven');

  const watcher = await player(browser, 'Wes');
  await watcher.goto(`/egyptian/watch/${game}`);
  await expect(watcher.getByTestId('egw-table')).toBeVisible();
  await expect(watcher.getByTestId('egw-flip-0')).toHaveCount(0);
  await expect(watcher.getByTestId('egw-slap-0')).toHaveCount(0);

  // each player flips with F on their turn; every screen shows the same pile
  const byName: Record<string, Page> = { Ana: ana, Bo: bo, Cy: cy };
  for (let i = 0; i < 6; i++) {
    const status = (await ana.getByTestId('egw-status').textContent()) ?? '';
    const who = Object.keys(byName).find((n) => status.startsWith(`${n} to flip`) || status.includes(`: ${n} has`));
    if (who) await byName[who].keyboard.press('KeyF');
    await ana.waitForTimeout(500);
  }
  const shown = await pile(ana);
  for (const p of [bo, cy, watcher]) await expect.poll(() => pile(p)).toEqual(shown);
  // a slap with Space reaches everyone
  const seq = await ana.getByTestId('egw-game').getAttribute('data-round');
  await bo.keyboard.press('Space');
  await expect(ana.getByTestId('egw-announce')).toContainText(/Bo slaps/);
  expect(seq).toBeTruthy();
});
