import { expect, test, type Browser, type Page } from '@playwright/test';
import { asName } from './helpers';

const dots = (p: Page) => p.getByTestId('party-button');

/** Host and guest in one party: the guest opened the host's invite link from the Party panel. */
async function party(browser: Browser) {
  const ctx = () => browser.newContext({ viewport: { width: 1440, height: 860 } });
  const [hc, gc] = await Promise.all([ctx(), ctx()]);
  const [host, guest] = await Promise.all([hc.newPage(), gc.newPage()]);
  await asName(host, 'Host');
  await asName(guest, 'Guest');
  await host.goto('/');
  await dots(host).click();
  await expect(host.getByTestId('party-url')).toContainText('/p/');
  const invite = new URL(await host.getByTestId('party-url').innerText()).pathname;
  await host.keyboard.press('Escape');
  await guest.goto(invite);
  for (const p of [host, guest]) await expect(dots(p)).toHaveAttribute('data-party-count', '2');
  return { host, guest, close: () => Promise.all([hc.close(), gc.close()]) };
}

test.describe('first visit', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test('asks for a name, then shows a party of one', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('name-prompt')).toBeVisible();
    await page.getByTestId('first-name').fill('Zed');
    await page.getByTestId('first-name-go').click();
    await expect(page.getByTestId('name-prompt')).toHaveCount(0);
    await expect(dots(page)).toHaveAttribute('data-party-count', '1');
    await dots(page).click();
    await expect(page.getByTestId('party-members')).toContainText('Zed');
  });
});

test('the party follows the host through maps and the waiting room, keeps the room (bot too) across maps, and resets on the main menu', async ({ browser }) => {
  test.setTimeout(120_000);
  const { host, guest, close } = await party(browser);

  // the host picks China: the guest follows to the China menu, with no buttons of their own
  await host.getByTestId('pick-china').click();
  await expect(host).toHaveTitle('Ticket to Beijing');
  await expect(guest).toHaveTitle('Ticket to Beijing', { timeout: 15_000 });
  await expect(guest).toHaveURL(/\/menu/);
  await expect(guest.getByTestId('party-waiting')).toBeVisible();

  // the host opens the waiting room: the guest is seated without being asked for a name
  await host.getByTestId('play-lan').click();
  await expect(host).toHaveURL(/\/wait\//);
  const room = new URL(host.url()).pathname;
  await expect(guest).toHaveURL(room);
  await expect(host.getByTestId('waiting-players')).toContainText('Guest');
  await expect(host.getByTestId('share-url')).toContainText('/p/');
  await host.getByTestId('bot-level-easy').click();
  await host.getByTestId('add-bot').click();
  await expect(host.getByTestId('waiting-players').locator('[data-bot]')).toHaveCount(1);

  // renaming in the waiting room shows on the seat and in the party
  await guest.getByTestId('my-name').fill('Gus');
  await guest.getByTestId('my-name').press('Enter');
  await expect(host.getByTestId('waiting-players')).toContainText('Gus');

  // back to the map menu, switch to Europe, and the same room (bot and all) comes back, now on Europe
  await host.getByTestId('back-to-main').waitFor();
  await host.goto('/menu');
  await host.getByTestId('edition-europe').click();
  await expect(host).toHaveTitle('Ticket to Europa');
  await host.getByTestId('play-lan').click();
  await expect(host).toHaveURL(room);
  await expect(host.getByTestId('waiting-players').locator('[data-bot]')).toHaveCount(1);
  await expect(guest).toHaveTitle('Ticket to Europa', { timeout: 15_000 });
  await expect(guest).toHaveURL(room);

  // the main menu forgets the room: the next waiting room is a new one, without the bot
  await host.getByTestId('back-to-main').click();
  await expect(guest).toHaveURL(/\/$/);
  await host.getByTestId('pick-europe').click();
  await host.getByTestId('play-lan').click();
  await expect(host).toHaveURL(/\/wait\//);
  expect(new URL(host.url()).pathname).not.toBe(room);
  await expect(host.getByTestId('waiting-players').locator('[data-bot]')).toHaveCount(0);

  // the host removes the guest: the guest gets a party of their own and goes to the main menu
  await dots(host).click();
  await host.locator('[data-testid^=kick-]').click();
  await expect(dots(host)).toHaveAttribute('data-party-count', '1');
  await expect(dots(guest)).toHaveAttribute('data-party-count', '1');
  await expect(guest).toHaveURL(/\/$/);
  await expect(guest.getByTestId('party-notice')).toBeVisible();

  await close();
});
