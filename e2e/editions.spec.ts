/**
 * Runtime editions on the single build: the picker, the menu switcher, a pass-and-play game on the chosen map,
 * and the LAN waiting room where the host's edition is followed by every joiner.
 * Nothing here depends on the seed: the map is read from the screen (city ids, the tab title, the theme).
 */
import { expect, test, type Page } from '@playwright/test';
import { keepTickets, asName } from './helpers';

const theme = (page: Page) => page.locator('html');
const city = (page: Page, id: string) => page.locator(`[data-city="${id}"]`);

test('picker, menu, switcher, then a pass-and-play game on that map', async ({ page }) => {
  // the first page is the picker: four editions
  await page.goto('/');
  await expect(page.getByTestId('edition-picker')).toBeVisible();
  await expect(page.locator('[data-testid^="pick-"]')).toHaveCount(4);
  await expect(page.getByTestId('pick-singapore')).toBeVisible();

  // picking one goes to the menu, in that edition's name and theme
  await page.getByTestId('pick-europe').click();
  await expect(page).toHaveURL(/\/menu$/);
  await expect(page).toHaveTitle('Ticket to Europa');
  await expect(theme(page)).toHaveAttribute('data-theme', 'rail');
  await expect(page.getByTestId('edition-europe')).toHaveAttribute('aria-checked', 'true');

  // the switcher on the menu changes edition (the page reloads on /menu) and the choice is remembered
  await page.getByTestId('edition-china').click();
  await expect(page).toHaveTitle('Ticket to Beijing');
  await expect(theme(page)).toHaveAttribute('data-theme', 'hsr');
  await expect(page).toHaveURL(/\/menu$/);
  await page.reload();
  await expect(page).toHaveTitle('Ticket to Beijing');

  // a local game plays on the China map (Beijing's own station names, and no European cities)
  await page.getByTestId('play-local').click();
  await page.getByTestId('start-local').click();
  await page.getByTestId('reveal').click();
  await expect(page.getByTestId('ticket-chooser').locator('[data-ticket]')).toHaveCount(4);
  await expect(page.locator('svg').getByText('哈尔滨', { exact: true })).toBeVisible();
  await expect(city(page, 'LON')).toHaveCount(0);
  await keepTickets(page, 2);

  // and back to the picker's other choice: Europe (switch on the setup screen, same page)
  await page.goto('/menu');
  await page.getByTestId('edition-europe').click();
  await expect(page).toHaveTitle('Ticket to Europa');
  await page.getByTestId('play-local').click();
  await page.getByTestId('start-local').click();
  await page.getByTestId('reveal').click();
  await expect(page.getByTestId('ticket-chooser').locator('[data-ticket]')).toHaveCount(4);
  await expect(city(page, 'LON')).toHaveCount(1);

  // Singapore: the fifth edition, with its own theme and map (Marina Bay is the hub)
  await page.goto('/menu');
  await page.getByTestId('edition-singapore').click();
  await expect(page).toHaveTitle('Ticket to Singapore');
  await expect(theme(page)).toHaveAttribute('data-theme', 'merlion');
  await page.getByTestId('play-local').click();
  await page.getByTestId('start-local').click();
  await page.getByTestId('reveal').click();
  await expect(page.getByTestId('ticket-chooser').locator('[data-ticket]')).toHaveCount(4);
  await expect(city(page, 'LON')).toHaveCount(0);
  await expect(city(page, 'BOB')).toHaveCount(1);
});

test('LAN: the host switches the map in the waiting room, the joiner follows, and both boards show that map', async ({ browser, baseURL }) => {
  const ctx = () => browser.newContext({ viewport: { width: 1440, height: 860 } });
  const [hostCtx, guestCtx] = await Promise.all([ctx(), ctx()]);
  const [host, guest] = await Promise.all([hostCtx.newPage(), guestCtx.newPage()]);

  await asName(host, 'Host');
  await host.goto('/menu?edition=usa');
  await host.getByTestId('play-lan').click();
  await expect(host.getByTestId('share-url')).toContainText('/p/');
  const path = new URL(await host.getByTestId('share-url').innerText()).pathname;

  // the joiner arrives on USA (their own default) and sees the switcher locked
  await asName(guest, 'Guest');
  await guest.goto(`${baseURL}${path}`);
  await expect(guest).toHaveTitle('Ticket to Taitoka');
  await expect(guest).toHaveURL(/\/wait\//);
  await expect(guest.getByTestId('edition-switcher')).toHaveAttribute('data-locked', 'true');
  await expect(host.getByTestId('edition-switcher')).not.toHaveAttribute('data-locked', 'true');
  await expect(host.getByTestId('waiting-players')).toContainText('Guest');

  // the host picks Europe: the host reloads into it, and the guest follows on its own
  await host.getByTestId('edition-europe').click();
  await expect(host).toHaveTitle('Ticket to Europa');
  await expect(guest).toHaveTitle('Ticket to Europa', { timeout: 15_000 });
  await expect(theme(guest)).toHaveAttribute('data-theme', 'rail');
  await expect(guest).toHaveURL(/\/wait\//);
  await expect(guest.getByTestId('edition-switcher')).toHaveAttribute('data-locked', 'true');
  await expect(host.getByTestId('waiting-players')).toContainText('Guest');

  // Start: both land in the game, and both boards are the Europe map
  await host.getByTestId('start-lan').click();
  for (const p of [host, guest]) await expect(p).toHaveURL(/\/play\//, { timeout: 15_000 });
  await keepTickets(host, 2);
  await keepTickets(guest, 3);
  for (const p of [host, guest]) {
    await expect(city(p, 'LON')).toHaveCount(1);
    await expect(city(p, 'PAR')).toHaveCount(1);
    await expect(theme(p)).toHaveAttribute('data-theme', 'rail');
  }

  await Promise.all([hostCtx.close(), guestCtx.close()]);
});
