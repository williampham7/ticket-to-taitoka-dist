import { expect, test, type Page } from '@playwright/test';
import { asName } from './helpers';

/** No animations, and computer generals answer at once. */
async function fast(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('warfront.fx', JSON.stringify('off'));
    localStorage.setItem('warfront.botMs', JSON.stringify('25'));
  });
}

/** Sets up the muster sheet: seat kinds in order (the first seat is always this human). */
async function muster(page: Page, kinds: string[]) {
  await page.goto('/warfront');
  await page.getByTestId('wf-plan').click();
  const rows = page.locator('[data-testid^="wf-muster-"]');
  while ((await rows.count()) < kinds.length) await page.getByTestId('wf-add-seat').click();
  while ((await rows.count()) > kinds.length) await rows.last().getByRole('button', { name: 'Remove' }).click();
  for (let i = 0; i < kinds.length; i++) await rows.nth(i).getByRole('combobox').selectOption(kinds[i]);
  await page.getByTestId('wf-launch').click();
}

/** A passive general: places armies, deploys everything on one territory, ends the turn. Returns once the war is over. */
async function playPassively(page: Page, max = 400) {
  for (let i = 0; i < max; i++) {
    if (await page.getByTestId('wf-result').isVisible()) return;
    if (await page.getByTestId('wf-open-case').isVisible()) { await page.getByTestId('wf-open-case').click(); continue; }
    if (await page.getByTestId('wf-autoplace').isVisible()) { await page.getByTestId('wf-autoplace').click(); continue; }
    if (await page.getByTestId('wf-movein').isVisible()) { await page.getByTestId('wf-movein').click(); continue; }
    const neutral = page.locator('.wf-terr.wf-valid-friendly');
    if (await page.getByTestId('wf-trade').isVisible() && await page.getByTestId('wf-trade').isDisabled()) {
      await page.getByRole('button', { name: 'Best set' }).click();
      await page.getByTestId('wf-trade').click();
      continue;
    }
    if (await page.getByTestId('wf-deploy').isVisible()) {
      const t = await page.locator('.wf-terr.wf-valid').first().getAttribute('data-t');
      await page.locator(`[data-unit="${t}"] use`).click();
      await page.getByTestId('wf-allhere').click();
      await page.getByTestId('wf-deploy').click();
      continue;
    }
    if (await page.getByTestId('wf-endturn').isVisible()) { await page.getByTestId('wf-endturn').click(); continue; }
    if (await page.locator('.wf-phases-setup').isVisible() && await neutral.count()) {
      const t = await neutral.first().getAttribute('data-t');
      await page.locator(`[data-unit="${t}"] use`).click();
      continue;
    }
    await page.waitForTimeout(150);
  }
}

test.beforeEach(async ({ page }) => { await fast(page); await asName(page, 'Ana'); });

test('the picker opens Warfront; the desk menu and Field Manual work', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('warfront-card').click();
  await expect(page).toHaveURL(/\/warfront$/);
  await expect(page.getByTestId('wf-menu')).toBeVisible();
  await page.getByTestId('wf-manual').click();
  await page.getByRole('tab', { name: 'Battle' }).click();
  await expect(page.getByText('Ties go to the defender.')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByTestId('wf-online')).toBeVisible();
});

test('vs Computer: a full two-general war with the neutral army ends in a debrief', async ({ page }) => {
  test.setTimeout(150_000);
  await muster(page, ['human', 'hard']);
  await expect(page).toHaveURL(/\/warfront\/bot/);
  await expect(page.locator('.wf-placecard')).toHaveCount(2);
  // attack once by hand on the first turn: aim, roll
  await playUntil(page, async () => page.getByTestId('wf-deploy').isVisible());
  const t = await page.locator('.wf-terr.wf-valid').first().getAttribute('data-t');
  await page.locator(`[data-unit="${t}"] use`).click();
  await page.getByTestId('wf-allhere').click();
  await page.getByTestId('wf-deploy').click();
  await page.locator(`[data-unit="${t}"] use`).click();
  const target = page.locator('.wf-terr.wf-valid-attack').first();
  if (await target.count()) {
    const to = await target.getAttribute('data-t');
    await page.locator(`[data-unit="${to}"] use`).click();
    await page.getByTestId('wf-roll').click();
    await expect(page.locator('.wf-tape li').first()).toContainText(/strikes|march/);
  }
  await playPassively(page);
  await expect(page.getByTestId('wf-result')).toBeVisible();
  await expect(page.locator('.wf-headline')).toContainText('GENERAL');
});

async function playUntil(page: Page, done: () => Promise<boolean>) {
  for (let i = 0; i < 200 && !(await done()); i++) {
    if (await page.getByTestId('wf-autoplace').isVisible()) await page.getByTestId('wf-autoplace').click();
    else if (await page.locator('.wf-phases-setup').isVisible() && await page.locator('.wf-terr.wf-valid-friendly').count()) {
      const t = await page.locator('.wf-terr.wf-valid-friendly').first().getAttribute('data-t');
      await page.locator(`[data-unit="${t}"] use`).click();
    } else await page.waitForTimeout(100);
  }
}

test('pass and play: the map case names each general before their turn', async ({ page }) => {
  await muster(page, ['human', 'human', 'easy']);
  await expect(page).toHaveURL(/\/warfront\/local/);
  // each human gets the map case before their turn; both names come up during deployment
  const seen = new Set<string>();
  for (let i = 0; i < 6 && seen.size < 2; i++) {
    await expect(page.getByTestId('wf-open-case')).toBeVisible({ timeout: 10_000 });
    seen.add((await page.locator('.wf-case-body h2').textContent()) ?? '');
    await page.getByTestId('wf-open-case').click();
    await page.getByTestId('wf-autoplace').click();
  }
  expect([...seen].sort()).toEqual(['General Ana', 'General Colonel']);
});

test('online: host and joiner fill a war room with a computer general and start the war', async ({ browser }) => {
  const host = await browser.newPage();
  const join = await browser.newPage();
  for (const [p, n] of [[host, 'Host'], [join, 'Joiner']] as const) { await fast(p); await asName(p, n); }
  await host.goto('/warfront');
  await host.getByTestId('wf-online').click();
  await expect(host).toHaveURL(/\/warfront\/wait\//);
  await expect(host.getByTestId('wf-room-url')).toContainText(/\/warfront\/join\/\w+/);
  const id = host.url().split('/').pop()!;
  await join.goto(`/warfront/join/${id}`);
  await expect(join).toHaveURL(/\/warfront\/wait\//);
  await expect(host.getByTestId('wf-seat-1')).toContainText('Joiner');
  await host.getByTestId('wf-addbot-easy').first().click();
  await expect(host.getByTestId('wf-seat-2')).toContainText('Computer · Cadet');
  await host.getByTestId('wf-start').click();
  await expect(host).toHaveURL(/\/warfront\/play\//);
  await expect(join).toHaveURL(/\/warfront\/play\//);
  await expect(host.locator('.wf-placecard')).toHaveCount(3);
  await expect(join.locator('.wf-placecard')).toHaveCount(3);
  // whoever is first gets orders; everyone sees the same turn
  await expect(host.locator('.wf-placecard.wf-on')).toHaveCount(1);
  const current = (await host.locator('.wf-placecard.wf-on .wf-pc-name').innerText()).replace(' (you)', '');
  await expect(join.locator('.wf-placecard.wf-on .wf-pc-name')).toContainText(current);
});
