import { expect, test, type Page } from '@playwright/test';

/*
 * The Spotter army, pass and play. Both sides deploy the Watchtower preset, so each has a Spotter on the
 * front row of an outer lane: seat 0 at (7,1) facing column 1, seat 1 at (2,8) facing column 8.
 * Each Spotter walks up its lane until it stands next to the enemy front row (an enemy Spotter, by the
 * preset), then spots it: the first spot calls the wrong rank on purpose, the second the right one.
 */
const PATH: Record<string, number[]> = { 0: [71, 61, 51, 41, 31], 1: [28, 38, 48, 58, 68] };
const TARGET: Record<string, number> = { 0: 21, 1: 78 };

const cell = (page: Page, pos: number) => page.getByTestId(`fl-cell-${pos}`);

/** The seat on screen: the owner of the pieces that show a rank. */
async function seatOnScreen(page: Page): Promise<string> {
  return (await page.locator('[data-testid="fl-piece"]').filter({ hasNot: page.locator('[data-hidden]') }).first().getAttribute('data-owner'))!;
}

async function reveal(page: Page) {
  await expect(page.getByTestId('fl-curtain').or(page.getByTestId('fl-screen'))).toBeVisible();
  // wait out the mover's hold: either the curtain comes down or it is this seat's turn again
  await expect(page.getByTestId('fl-curtain').or(page.getByTestId('fl-banner').filter({ hasText: 'Your turn' }))).toBeVisible({ timeout: 15_000 });
  if (await page.getByTestId('fl-curtain').isVisible()) await page.getByTestId('fl-reveal').click();
  await expect(page.getByTestId('fl-banner')).toContainText('Your turn');
}

test('Spotter army: the host switches armies, both deploy 30, Spotters spot (a miss, then a hit)', async ({ page }) => {
  await page.goto('/frontline/local?seed=e2e1');
  await expect(page.getByTestId('fl-army-classic')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('fl-army-spotter').click();
  await expect(page.getByTestId('fl-army-spotter')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('fl-army-blurb')).toContainText('30 pieces');
  await expect(page.getByTestId('fl-briefing')).toContainText('30 pieces on their own three rows');
  await page.getByTestId('fl-start').click();

  for (const seat of ['0', '1']) {
    await page.getByTestId('fl-reveal').click();
    await expect(page.getByTestId('fl-placed')).toHaveText('0/30');
    await expect(page.getByTestId('fl-tray-P')).toContainText('Spotter');
    await expect(page.getByTestId('fl-tray-P')).toContainText('×2');
    await page.getByTestId('fl-preset-watch').click();
    await expect(page.locator(`[data-testid="fl-piece"][data-owner="${seat}"]`)).toHaveCount(30);
    await expect(page.getByTestId('fl-placed')).toHaveText('30/30');
    if (seat === '0') {
      // the Spotter army's own numbering: the Spotter is 1, the Operative S
      await expect(cell(page, 71).locator('.flt-rank')).toHaveText('1');
      await expect(page.getByTestId('fl-board').locator('.flt-rank', { hasText: /^S$/ })).toHaveCount(1);
    }
    await page.getByTestId('fl-ready').click();
  }

  const at: Record<string, number> = { 0: 0, 1: 0 };
  let spots = 0;
  for (let turn = 0; turn < 14 && spots < 2; turn++) {
    await reveal(page);
    const me = await seatOnScreen(page);
    const step = at[me];
    const from = PATH[me][step];
    await expect(cell(page, from).getByTestId('fl-piece')).toBeVisible();
    await cell(page, from).click();
    if (step < PATH[me].length - 1) {
      await cell(page, PATH[me][step + 1]).click();
      at[me]++;
      continue;
    }
    // next to the enemy: spot it
    await expect(cell(page, TARGET[me])).toHaveAttribute('data-spot', 'true');
    await page.screenshot({ path: 'test-results/spotter-aim.png' });
    await cell(page, TARGET[me]).click();
    const picker = page.getByTestId('fl-spot-picker');
    await expect(picker).toBeVisible();
    await expect(picker.getByTestId('fl-guess-P')).toBeEnabled();
    await expect(picker.getByTestId('fl-spot-attack')).toBeVisible(); // it could also attack the piece
    await page.screenshot({ path: 'test-results/spotter-picker.png' });
    if (spots === 0) {
      await picker.getByTestId('fl-guess-10').click();
      await expect(page.getByTestId('fl-spot-fx')).toBeVisible();
      await page.waitForTimeout(1300);
      await page.screenshot({ path: 'test-results/spotter-miss.png' });
      // the call was wrong: the target is still there and still hidden for the spotter
      await expect(cell(page, TARGET[me]).locator('[data-hidden]')).toBeVisible();
      await expect(page.getByTestId('fl-last-spot')).toContainText('Negative', { timeout: 5000 });
      await expect(cell(page, TARGET[me]).getByTestId('fl-ruled-out')).toHaveText('✕1');
      await expect(page.getByTestId('fl-last-spot')).toContainText('Marshal (10): wrong');
    } else {
      await picker.getByTestId('fl-guess-P').click();
      await expect(page.getByTestId('fl-spot-fx')).toBeVisible();
      await expect(page.getByTestId('fl-last-spot')).toContainText('Confirmed', { timeout: 5000 });
      await expect(cell(page, TARGET[me]).getByTestId('fl-piece')).toHaveCount(0);
      await expect(page.getByTestId('fl-last-spot')).toContainText('Spotter (1): correct');
      await page.screenshot({ path: 'test-results/spotter-hit.png' });
    }
    spots++;
  }
  expect(spots).toBe(2);
});

test('the briefing explains the Spotter army', async ({ page }) => {
  await page.goto('/frontline');
  await page.getByTestId('fl-rules').click();
  await page.getByTestId('fl-rules-tab-spotter').click();
  await expect(page.getByTestId('fl-rules-modal')).toContainText('30 units');
  await expect(page.getByTestId('fl-rules-modal')).toContainText('Spotter');
  await page.getByTestId('fl-rules-close').click();
  await expect(page.getByTestId('fl-rules-modal')).toHaveCount(0);
});
