/**
 * The China edition (Ticket to Beijing, HSR theme), played on the single build by choosing it in the URL (`?edition=china`).
 * Nothing here depends on the seed: who goes first, which tickets and which routes come up are all read
 * from the screen. Run with `npm run e2e` (or `npx playwright test e2e/china.spec.ts` after `npm run build`).
 */
import { expect, test, type Page } from '@playwright/test';
import { claimFirstRoute, keepTickets, revealIfCurtain, asName } from './helpers';

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

test('China edition: Ticket to Beijing in the high-speed-rail theme', async ({ page }) => {
  await page.goto('/menu?edition=china');
  await expect(page).toHaveTitle('Ticket to Beijing');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'hsr');
  await expect(page.getByText('开往北京')).toBeVisible();
  await expect(page.getByTestId('play-local')).toBeVisible();
  await expect(page.getByTestId('play-lan')).toBeVisible();
});

test('China pass-and-play: secret tickets, bilingual board, drawing, claiming and handing over', async ({ page }) => {
  await page.goto('/menu?edition=china');
  await page.getByTestId('play-local').click();
  await page.getByTestId('name-0').fill('Ana');
  await page.getByTestId('name-1').fill('Bo');
  await page.getByTestId('start-local').click();

  // Each player picks tickets in secret behind the opaque "please board" curtain
  for (const name of ['Ana', 'Bo']) {
    const curtain = page.getByTestId('curtain');
    await expect(curtain).toContainText(name);
    await expect(curtain).toContainText('上车');
    await expect(curtain).toHaveCSS('opacity', '1');
    await page.getByTestId('reveal').click();
    // tickets are China Railway tickets with real China cities
    const tickets = page.getByTestId('ticket-chooser').locator('[data-ticket]');
    await expect(tickets).toHaveCount(4);
    await keepTickets(page, 2);
  }

  // Whoever was drawn to go first: the board is the China map with Chinese station names
  await revealIfCurtain(page);
  await expect(myTurn(page)).toBeVisible();
  await expect(page.locator('svg').getByText('哈尔滨', { exact: true })).toBeVisible();
  await expect(page.locator('svg').getByText('北京', { exact: true }).first()).toBeVisible();
  const mine = page.getByTestId('my-tickets').locator('[data-ticket]');
  await expect(mine).toHaveCount(2);
  await expect(mine.first()).toHaveAttribute('data-class', /business|second/);

  // Drawing two cards hands the turn over behind the curtain; the next player's chip shows 6 cards for the first
  const first = (await page.getByTestId('status').innerText()).trim();
  await page.getByTestId('draw-deck').click();
  await page.getByTestId('draw-deck').click();
  await revealIfCurtain(page);
  await expect(myTurn(page)).toBeVisible();
  await expect(page.locator('[data-player] [data-cards="6"]')).toHaveCount(1);
  expect(first).toMatch(/Your turn/);

  // Keep playing until someone can afford a route, claim it (the EMU animation runs), and see it in the log
  const route = await playUntilClaim(page);
  await expect(page.getByTestId('log')).toContainText('claimed');
  await expect(page.locator(`[data-route="${route}"]`).first()).toHaveAttribute('data-owner', /\d/);
});

test('China LAN: host and guest stay in sync whoever goes first, and a reload keeps the seat', async ({ browser, baseURL }) => {
  const hostCtx = await browser.newContext({ viewport: { width: 1440, height: 860 } });
  const guestCtx = await browser.newContext({ viewport: { width: 1440, height: 860 } });
  const host = await hostCtx.newPage();
  const guest = await guestCtx.newPage();

  await asName(host, 'Host');
  await host.goto('/menu?edition=china');
  await host.getByTestId('play-lan').click();
  const share = host.getByTestId('share-url');
  await expect(share).toContainText('/p/');
  const joinPath = new URL(await share.innerText()).pathname;

  await asName(guest, 'Guest');
  await guest.goto(`${baseURL}${joinPath}`);
  await expect(guest).toHaveURL(/\/wait\//);
  await expect(host.getByTestId('waiting-players')).toContainText('Guest');
  await host.getByTestId('start-lan').click();

  await expect(host).toHaveURL(/\/play\//, { timeout: 15_000 });
  await expect(guest).toHaveURL(/\/play\//);
  await keepTickets(host, 2);
  await keepTickets(guest, 3);

  // Exactly one of them goes first (drawn at random); the other is told who is playing
  await expect.poll(async () => (await myTurn(host).count()) + (await myTurn(guest).count())).toBe(1);
  const hostFirst = await myTurn(host).count() === 1;
  const [mover, watcher] = hostFirst ? [host, guest] : [guest, host];
  const moverSeat = hostFirst ? '0' : '1';
  await expect(watcher.getByTestId('status')).toHaveText(new RegExp(`${hostFirst ? 'Host' : 'Guest'} is playing`));

  // The mover draws two cards; the watcher sees the card count change and gets the turn
  await mover.getByTestId('draw-deck').click();
  await mover.getByTestId('draw-deck').click();
  await expect(watcher.locator(`[data-player="${moverSeat}"] [data-cards]`)).toHaveAttribute('data-cards', '6');
  await expect(myTurn(watcher)).toBeVisible();

  // The watcher takes a face-up card and a blind one; the mover sees it in the log
  const faceUp = watcher.locator('button[data-market]:not([data-card=locomotive])').first();
  const card = await faceUp.getAttribute('data-card');
  await faceUp.click();
  await watcher.getByTestId('draw-deck').click();
  await expect(mover.getByTestId('log')).toContainText(`took a ${card} card`);
  await expect(myTurn(mover)).toBeVisible();

  // A reload keeps the guest's seat and tickets
  const ticketsBefore = await guest.getByTestId('my-tickets').locator('[data-ticket]').count();
  await guest.reload();
  await expect(guest).toHaveURL(/\/play\//);
  await expect(guest.getByTestId('my-tickets').locator('[data-ticket]')).toHaveCount(ticketsBefore);

  await hostCtx.close();
  await guestCtx.close();
});
