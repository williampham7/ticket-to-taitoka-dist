/**
 * The Singapore edition (Ticket to Singapore, merlion theme), played on the single build by choosing it in the URL
 * (`?edition=singapore`). Nothing here depends on the seed: who goes first, which tickets and which routes come up
 * are all read from the screen. Run with `npm run e2e` (or `npx playwright test e2e/singapore.spec.ts` after `npm run build`).
 */
import { expect, test, type Page } from '@playwright/test';
import { claimFirstRoute, keepTickets, revealIfCurtain } from './helpers';

const myTurn = (page: Page) => page.getByTestId('status').filter({ hasText: /Your turn/ });

/** Plays turns (claiming whenever a route is affordable, else drawing two blind cards) until one route is claimed. */
async function playUntilClaim(page: Page, maxTurns = 24): Promise<string> {
  for (let turn = 0; turn < maxTurns; turn++) {
    await revealIfCurtain(page);
    await expect(myTurn(page)).toBeVisible();
    if (await page.locator('[data-claimable=true]').count()) return claimFirstRoute(page);
    await page.getByTestId('draw-deck').click();
    await expect(page.getByTestId('status')).toHaveText(/one more card/);
    await page.getByTestId('draw-deck').click();
  }
  throw new Error(`no route became claimable in ${maxTurns} turns`);
}

test('Singapore edition: Ticket to Singapore loads in the merlion theme and the picker offers it', async ({ page }) => {
  await page.goto('/menu?edition=singapore');
  await expect(page).toHaveTitle('Ticket to Singapore');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'merlion');
  await expect(page.getByTestId('edition-singapore')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('play-local')).toBeVisible();
  await expect(page.getByTestId('play-lan')).toBeVisible();
  // the board behind the menu is the island: Marina Bay is the hub, Merlion-theme geography is drawn
  await expect(page.locator('[data-city="BOB"]')).toHaveCount(1);
  await expect(page.locator('[data-geo="sg"]')).toHaveCount(1);
});

test('Singapore pass-and-play: tickets, the island board, drawing, claiming and handing over', async ({ page }) => {
  await page.goto('/menu?edition=singapore');
  await page.getByTestId('play-local').click();
  await page.getByTestId('name-0').fill('Ana');
  await page.getByTestId('name-1').fill('Bo');
  await page.getByTestId('start-local').click();
  for (const name of ['Ana', 'Bo']) {
    await expect(page.getByTestId('curtain')).toContainText(name);
    await page.getByTestId('reveal').click();
    const tickets = page.getByTestId('ticket-chooser').locator('[data-ticket]');
    await expect(tickets).toHaveCount(4);
    // travel-pass tickets with real Singapore places
    await expect(tickets.first()).toContainText('→');
    await keepTickets(page, 2);
  }
  await revealIfCurtain(page);
  await expect(myTurn(page)).toBeVisible();
  await expect(page.locator('svg').getByText('MARINA BAY', { exact: true })).toBeVisible();
  await expect(page.locator('svg').getByText('Chinatown', { exact: true }).first()).toBeVisible();
  await expect(page.getByTestId('my-tickets').locator('[data-ticket]')).toHaveCount(2);
  // the hand shows Singapore train cards
  await expect(page.getByTestId('hand').locator('[data-mrt-card]').first()).toBeVisible();

  const route = await playUntilClaim(page);
  await expect(page.getByTestId('log')).toContainText('claimed');
  await expect(page.locator(`[data-route="${route}"]`).first()).toHaveAttribute('data-owner', /\d/);
});

test('Singapore edition: the docked chooser covers none of the island and the network is in view', async ({ page }) => {
  await page.goto('/menu?edition=singapore');
  await page.getByTestId('play-local').click();
  await page.getByTestId('start-local').click();
  await revealIfCurtain(page).catch(() => {});
  const chooser = page.getByTestId('ticket-chooser');
  await expect(chooser).toBeVisible();
  await page.waitForTimeout(600);
  const map = (await page.getByTestId('map').boundingBox())!;
  const c = (await chooser.boundingBox())!;
  const r = await page.evaluate(([x0, y0, x1, y1]) => {
    const pieces = [...document.querySelectorAll('[data-testid=map] svg [data-city] > *, [data-testid=map] svg [data-route] rect, [data-testid=map] svg [data-route] path[fill]:not([fill=none])')]
      .map((el) => el.getBoundingClientRect()).filter((b) => b.width > 0);
    return {
      hits: pieces.filter((b) => b.right > x0 && b.left < x1 && b.bottom > y0 && b.top < y1).length,
      left: Math.min(...pieces.map((b) => b.left)), right: Math.max(...pieces.map((b) => b.right)),
      top: Math.min(...pieces.map((b) => b.top)), bottom: Math.max(...pieces.map((b) => b.bottom)),
    };
  }, [c.x, c.y, c.x + c.width, c.y + c.height]);
  expect(r.hits).toBe(0);
  expect(r.left).toBeGreaterThanOrEqual(map.x - 1);
  expect(r.top).toBeGreaterThanOrEqual(map.y - 1);
  expect(r.right).toBeLessThanOrEqual(map.x + map.width + 1);
  expect(r.bottom).toBeLessThanOrEqual(map.y + map.height + 1);
});
