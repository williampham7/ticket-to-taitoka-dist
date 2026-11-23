import { expect, test } from '@playwright/test';
import { keepTickets } from './helpers';

test('LAN: host and guest in two browsers stay in sync, and a reload keeps the seat', async ({ browser, baseURL }) => {
  const hostCtx = await browser.newContext({ viewport: { width: 1440, height: 860 } });
  const guestCtx = await browser.newContext({ viewport: { width: 1440, height: 860 } });
  const host = await hostCtx.newPage();
  const guest = await guestCtx.newPage();

  await host.goto('/menu');
  await host.getByTestId('play-lan').click();
  await host.getByTestId('my-name').fill('Host');
  await host.getByTestId('host-game').click();

  const share = host.getByTestId('share-url');
  await expect(share).toContainText('/join/');
  const shareUrl = await share.innerText();
  // The share link points at this computer's Wi-Fi address; open the same path on localhost.
  const path = new URL(shareUrl).pathname;

  await guest.goto(`${baseURL}${path}`);
  await guest.getByTestId('my-name').fill('Guest');
  await guest.getByTestId('join-game').click();

  // Everyone gathers in the waiting room; only the host can start
  await expect(guest).toHaveURL(/\/wait\//);
  await expect(guest.getByTestId('waiting-for-host')).toBeVisible();
  await expect(host.getByTestId('waiting-players')).toContainText('Guest');
  await host.getByTestId('start-lan').click();

  // Both land in the game once the host starts
  await expect(host).toHaveURL(/\/play\//, { timeout: 15_000 });
  await expect(guest).toHaveURL(/\/play\//);
  await keepTickets(host, 2);
  await keepTickets(guest, 3);

  await expect(host.getByTestId('status')).toHaveText(/Your turn/);
  await expect(guest.getByTestId('status')).toHaveText(/Host is playing/);
  await expect(guest.locator('[data-player="0"]')).toContainText('Host');

  // Host draws two cards; the guest sees the host's card count change
  await host.getByTestId('draw-deck').click();
  await host.getByTestId('draw-deck').click();
  await expect(guest.locator('[data-player="0"] [data-cards]')).toHaveAttribute('data-cards', '6');
  await expect(guest.getByTestId('status')).toHaveText(/Your turn/);

  // Guest takes a face-up card (not a locomotive) then a blind card; the host sees it in the log
  const faceUp = guest.locator('button[data-market]:not([data-card=locomotive])').first();
  const card = await faceUp.getAttribute('data-card');
  await faceUp.click();
  await guest.getByTestId('draw-deck').click();
  await expect(host.getByTestId('log')).toContainText(`Guest took a ${card} card`);
  await expect(host.getByTestId('status')).toHaveText(/Your turn/);

  // Secrets: the host never receives the guest's cards, only counts
  await expect(host.locator('[data-player="1"] [data-cards]')).toHaveAttribute('data-cards', '6');

  // guest reload keeps seat
  const ticketsBefore = await guest.getByTestId('my-tickets').locator('[data-ticket]').count();
  await guest.reload();
  await expect(guest).toHaveURL(/\/play\//);
  await expect(guest.getByTestId('status')).toHaveText(/Host is playing/);
  await expect(guest.getByTestId('my-tickets').locator('[data-ticket]')).toHaveCount(ticketsBefore);

  await hostCtx.close();
  await guestCtx.close();
});

test('LAN: a saved seat for a game that no longer exists explains what happened', async ({ page }) => {
  await page.goto('/menu');
  await page.evaluate(() => localStorage.setItem('boboland.seat.gone123', JSON.stringify({ matchID: 'gone123', playerID: '1', credentials: 'x', name: 'Guest' })));
  await page.goto('/play/gone123');
  await expect(page.getByText(/could not be found/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back to start' })).toBeVisible();
});

test('LAN chat: messages and emotes reach the other player, with a reaction over the sender', async ({ browser, baseURL }) => {
  const hostCtx = await browser.newContext({ viewport: { width: 1440, height: 860 } });
  const guestCtx = await browser.newContext({ viewport: { width: 1440, height: 860 } });
  const host = await hostCtx.newPage();
  const guest = await guestCtx.newPage();

  await host.goto('/menu');
  await host.getByTestId('play-lan').click();
  await host.getByTestId('my-name').fill('Host');
  await host.getByTestId('host-game').click();
  const share = host.getByTestId('share-url');
  await expect(share).toContainText('/join/');
  await guest.goto(`${baseURL}${new URL(await share.innerText()).pathname}`);
  await guest.getByTestId('my-name').fill('Guest');
  await guest.getByTestId('join-game').click();
  await expect(guest).toHaveURL(/\/wait\//);
  await host.getByTestId('start-lan').click();
  await expect(host).toHaveURL(/\/play\//, { timeout: 15_000 });
  await expect(guest).toHaveURL(/\/play\//);

  // chat works even while tickets are being chosen
  await host.getByTestId('chat-input').fill('Hello from the host');
  await host.getByTestId('chat-input').press('Enter');
  await expect(guest.getByTestId('chat-log')).toContainText('Host: Hello from the host');
  await expect(host.getByTestId('chat-log')).toContainText('You: Hello from the host');
  await expect(host.getByTestId('chat-input')).toHaveValue('');

  // an emote from the panel, and a quick phrase
  await guest.getByTestId('chat-emotes').click();
  await expect(guest.getByTestId('emote-panel')).toBeVisible();
  await guest.locator('[data-emote=party]').click();
  await expect(guest.getByTestId('emote-panel')).toBeHidden();
  await expect(host.getByTestId('chat-log').locator('[data-chat-line=emote]')).toContainText('Guest');
  await expect(host.getByTestId('chat-log')).toContainText('🎉');
  await expect(host.getByTestId('reaction').filter({ hasText: '🎉' })).toBeVisible();

  await guest.getByTestId('chat-emotes').click();
  await guest.locator('[data-quick="Good game!"]').click();
  await expect(host.getByTestId('chat-log')).toContainText('Guest: Good game!');

  await hostCtx.close();
  await guestCtx.close();
});

test('LAN waiting room: no player count up front, colours chosen before the start, and the game sized to who joined', async ({ browser, baseURL }) => {
  const ctx = () => browser.newContext({ viewport: { width: 1440, height: 860 } });
  const [hostCtx, aCtx, bCtx] = await Promise.all([ctx(), ctx(), ctx()]);
  const [host, a, b] = await Promise.all([hostCtx.newPage(), aCtx.newPage(), bCtx.newPage()]);

  await host.goto('/menu');
  await host.getByTestId('play-lan').click();
  await expect(host.locator('[data-count]')).toHaveCount(0); // no player-count picker any more
  await host.getByTestId('my-name').fill('Host');
  await host.getByTestId('host-game').click();
  await expect(host.getByTestId('start-lan')).toBeDisabled(); // nobody else yet
  const path = new URL(await host.getByTestId('share-url').innerText()).pathname;
  await expect(host.getByTestId('waiting-players').locator('li')).toHaveCount(5); // host + 4 open seats

  for (const [page, name] of [[a, 'Ana'], [b, 'Bo']] as const) {
    await page.goto(`${baseURL}${path}`);
    await page.getByTestId('my-name').fill(name);
    await page.getByTestId('join-game').click();
    await expect(page).toHaveURL(/\/wait\//);
  }

  // Bo picks pink; the colour the host has is not available to Bo
  await expect(b.getByTestId('my-color').getByRole('radio', { name: 'Lime' })).toBeDisabled();
  await b.getByTestId('my-color').getByRole('radio', { name: 'Pink' }).click();
  await expect(host.locator('[data-testid=waiting-players] [data-seat="2"]')).toHaveAttribute('data-color', '2');

  await expect(host.getByTestId('start-lan')).toHaveText(/3 players/);
  await host.getByTestId('start-lan').click();
  for (const p of [host, a, b]) await expect(p).toHaveURL(/\/play\//, { timeout: 15_000 });

  // three players, in seat order, Bo in pink
  await expect(host.locator('header [data-player]')).toHaveCount(3);
  await expect(host.locator('header [data-player="2"]')).toContainText('Bo');
  await expect(host.locator('header [data-player="2"] span').first()).toHaveCSS('background-color', 'rgb(255, 111, 181)');

  await Promise.all([hostCtx.close(), aCtx.close(), bCtx.close()]);
});

test('LAN new game: when the host opens a new waiting room, everyone moves there in their seat and colour', async ({ browser, baseURL }) => {
  const ctx = () => browser.newContext({ viewport: { width: 1440, height: 860 } });
  const [hostCtx, guestCtx] = await Promise.all([ctx(), ctx()]);
  const [host, guest] = await Promise.all([hostCtx.newPage(), guestCtx.newPage()]);

  await host.goto('/menu');
  await host.getByTestId('play-lan').click();
  await host.getByTestId('my-name').fill('Host');
  await host.getByTestId('host-game').click();
  const path = new URL(await host.getByTestId('share-url').innerText()).pathname;
  await guest.goto(`${baseURL}${path}`);
  await guest.getByTestId('my-name').fill('Guest');
  await guest.getByTestId('join-game').click();
  await guest.getByTestId('my-color').getByRole('radio', { name: 'Pink' }).click();
  await expect(host.locator('[data-testid=waiting-players] [data-seat="1"]')).toHaveAttribute('data-color', '2');
  await host.getByTestId('start-lan').click();
  for (const p of [host, guest]) await expect(p).toHaveURL(/\/play\//, { timeout: 15_000 });

  // What the host's New game button does: open the next waiting room from the game (the host's game seat)
  const gameID = new URL(host.url()).pathname.split('/').pop()!;
  await host.evaluate(async (id) => {
    const seat = JSON.parse(localStorage.getItem(`boboland.seat.${id}`)!);
    const r = await fetch(`/games/boboland/${id}/playAgain`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerID: seat.playerID, credentials: seat.credentials, numPlayers: 5 }),
    });
    if (!r.ok) throw new Error(`playAgain ${r.status}`);
  }, gameID);

  // both screens move into the new waiting room on their own: host still the host, guest still pink
  for (const p of [host, guest]) await expect(p).toHaveURL(/\/wait\//, { timeout: 15_000 });
  expect(new URL(guest.url()).pathname).toBe(new URL(host.url()).pathname);
  await expect(host.getByRole('heading', { name: 'Waiting Room' })).toBeVisible();
  await expect(host.getByTestId('start-lan')).toBeVisible();
  await expect(guest.getByTestId('waiting-for-host')).toBeVisible();
  await expect(host.locator('[data-testid=waiting-players] [data-seat="1"]')).toContainText('Guest');
  await expect(host.locator('[data-testid=waiting-players] [data-seat="1"]')).toHaveAttribute('data-color', '2');

  await Promise.all([hostCtx.close(), guestCtx.close()]);
});

test('LAN leave: asks first, and a guest leaving takes the whole table back to the waiting room', async ({ browser, baseURL }) => {
  const ctx = () => browser.newContext({ viewport: { width: 1440, height: 860 } });
  const [hostCtx, guestCtx] = await Promise.all([ctx(), ctx()]);
  const [host, guest] = await Promise.all([hostCtx.newPage(), guestCtx.newPage()]);

  await host.goto('/menu');
  await host.getByTestId('play-lan').click();
  await host.getByTestId('my-name').fill('Host');
  await host.getByTestId('host-game').click();
  const path = new URL(await host.getByTestId('share-url').innerText()).pathname;
  await guest.goto(`${baseURL}${path}`);
  await guest.getByTestId('my-name').fill('Guest');
  await guest.getByTestId('join-game').click();
  await expect(host.locator('[data-testid=waiting-players] [data-seat="1"]')).toContainText('Guest');
  await host.getByTestId('start-lan').click();
  for (const p of [host, guest]) await expect(p).toHaveURL(/\/play\//, { timeout: 15_000 });

  // Stay keeps the game going
  await guest.getByTestId('leave-game').click();
  await expect(guest.getByTestId('confirm-leave')).toBeVisible();
  await guest.getByTestId('stay-in-game').click();
  await expect(guest.getByTestId('confirm-leave')).toHaveCount(0);
  await expect(guest).toHaveURL(/\/play\//);

  // Leave moves everybody, host included, into the next waiting room
  await guest.getByTestId('leave-game').click();
  await guest.getByTestId('confirm-leave-yes').click();
  for (const p of [host, guest]) await expect(p).toHaveURL(/\/wait\//, { timeout: 15_000 });
  await expect(host.getByTestId('start-lan')).toBeVisible();
  await expect(host.locator('[data-testid=waiting-players] [data-seat="1"]')).toContainText('Guest');

  await Promise.all([hostCtx.close(), guestCtx.close()]);
});
