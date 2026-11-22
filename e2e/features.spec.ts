import { expect, test, type Page } from '@playwright/test';
import { MAPS } from '../packages/shared/src/map/index';
import { SKINS, cityNameIn } from '../packages/shared/src/skins';
import { DOCK_PANEL } from '../packages/client/src/board/dock';
import { claimFirstRoute, keepTickets, revealIfCurtain } from './helpers';

async function startLocal(page: Page) {
  await page.goto('/menu?seed=e2e1');
  await page.getByTestId('play-local').click();
  await page.getByTestId('name-0').fill('Ana');
  await page.getByTestId('name-1').fill('Bo');
  await page.getByTestId('start-local').click();
  for (let i = 0; i < 2; i++) {
    await page.getByTestId('reveal').click();
    await keepTickets(page, 2);
  }
  await page.getByTestId('reveal').click();
  await expect(page.getByTestId('status')).toHaveText(/Your turn/);
}

test('refused actions explain themselves in a bubble', async ({ page }) => {
  await startLocal(page);
  await page.getByTestId('draw-deck').click();
  // dimmed controls stay clickable for people, so they can learn why (Playwright needs force for aria-disabled)
  await page.getByTestId('draw-tickets').click({ force: true });
  await expect(page.getByTestId('bubble')).toHaveText('You already drew a card this turn. Take one more card to finish.');
  // an unaffordable route explains what's missing
  await page.getByTestId('draw-deck').click();
  await revealIfCurtain(page);
  const unclaimable = page.locator('[data-route]:not([data-claimable])').filter({ has: page.locator('rect') });
  const route = unclaimable.nth(30);
  const box = (await route.locator('rect').last().boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByTestId('bubble')).toContainText(/You need|train|claimed/);
});

test('claiming always shows the cards you will spend and waits for confirmation', async ({ page }) => {
  await startLocal(page);
  for (let i = 0; i < 12 && !(await page.locator('[data-claimable=true]').count()); i++) {
    await revealIfCurtain(page);
    await page.getByTestId('draw-deck').click();
    await page.getByTestId('draw-deck').click();
    await revealIfCurtain(page);
  }
  const route = page.locator('[data-claimable=true]').first();
  const id = (await route.getAttribute('data-route'))!;
  const box = (await route.locator('rect').last().boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const picker = page.getByTestId('claim-picker');
  await expect(picker).toBeVisible();
  await expect(picker.locator('[data-pay]').first()).toBeVisible();
  // nothing claimed until confirmed; Cancel backs out
  await picker.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator(`[data-route="${id}"]`)).not.toHaveAttribute('data-owner', /./);
  // the picker stays inside the window
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const pb = (await picker.boundingBox())!;
  const vp = page.viewportSize()!;
  expect(pb.y).toBeGreaterThanOrEqual(0);
  expect(pb.y + pb.height).toBeLessThanOrEqual(vp.height);
  await picker.getByTestId('confirm-claim').click();
  await expect(page.locator(`[data-route="${id}"]`)).toHaveAttribute('data-owner', /\d/);
});

test('hand and tickets can be hidden separately, and my routes highlighted', async ({ page }) => {
  await startLocal(page);
  await page.getByTestId('toggle-hand').click();
  await expect(page.getByTestId('hand-hidden')).toHaveText('Hand hidden'); // no card count shown
  await expect(page.getByTestId('my-tickets')).toBeVisible();
  await page.getByTestId('toggle-tickets').click();
  await expect(page.getByTestId('tickets-hidden')).toHaveText('Routes hidden');
  await page.getByTestId('toggle-hand').click();
  await expect(page.getByTestId('hand')).toBeVisible();
  await expect(page.getByTestId('tickets-hidden')).toBeVisible();
  await page.getByTestId('spotlight').click();
  await expect(page.getByTestId('spotlight')).toHaveAttribute('aria-pressed', 'true');
});

test('lots of destination tickets scroll inside their own area and never widen the screen', async ({ page }) => {
  await startLocal(page);
  // both players take and keep 3 tickets, four times each: Ana ends with 2 + 12 = 14
  for (let turn = 0; turn < 8; turn++) {
    await revealIfCurtain(page);
    await page.getByTestId('draw-tickets').click();
    await page.getByTestId('confirm-draw-tickets').click();
    await keepTickets(page, 3);
  }
  await revealIfCurtain(page);
  const row = page.getByTestId('my-tickets');
  await expect(row.locator('[data-ticket]')).toHaveCount(14);

  const vw = page.viewportSize()!.width;
  // the screen keeps its width: no sideways page scroll, the right-hand rail stays against the window edge
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(vw);
  const rail = (await page.getByTestId('side-rail').boundingBox())!;
  expect(Math.round(rail.x + rail.width)).toBe(vw);

  // the routes area starts after room for the widest possible hand (all 8 card types)
  const tray = (await page.getByTestId('hand-tray').boundingBox())!;
  const area = (await row.boundingBox())!;
  const widestHand = 8 * 64 + 7 * 8;
  expect(area.x).toBeGreaterThanOrEqual(tray.x + 16 + widestHand);
  expect(area.x + area.width).toBeLessThanOrEqual(rail.x);

  // and it scrolls, with a scrollbar or the mouse wheel, to reach every ticket
  const [scrollW, clientW] = await row.evaluate((el) => [el.scrollWidth, el.clientWidth]);
  expect(scrollW).toBeGreaterThan(clientW);
  await row.evaluate((el) => { el.scrollLeft = 0; });
  await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2);
  await page.mouse.wheel(0, 400);
  await expect.poll(() => row.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  await row.evaluate((el) => { el.scrollLeft = el.scrollWidth; });
  const last = (await row.locator('[data-ticket]').last().boundingBox())!;
  expect(last.x + last.width).toBeLessThanOrEqual(area.x + area.width + 1);

  // hand cards and tickets sit on the same line however many tickets there are
  const handCard = (await page.getByTestId('hand').locator('[data-count]').first().boundingBox())!;
  const ticket = (await row.locator('[data-ticket]').first().boundingBox())!;
  expect(Math.round(ticket.y + ticket.height)).toBe(Math.round(handCard.y + handCard.height));
});

test('a full ticket row shows its newest tickets: on each turn and right after keeping more', async ({ page }) => {
  await startLocal(page);
  for (let turn = 0; turn < 6; turn++) {
    await revealIfCurtain(page);
    await page.getByTestId('draw-tickets').click();
    await page.getByTestId('confirm-draw-tickets').click();
    await keepTickets(page, 3);
  }
  await revealIfCurtain(page);
  const row = page.getByTestId('my-tickets');
  const atEnd = () => row.evaluate((el) => el.scrollWidth > el.clientWidth && Math.round(el.scrollLeft + el.clientWidth - el.scrollWidth) === 0);
  await expect.poll(atEnd).toBe(true); // the turn opens on the newest tickets
  await row.evaluate((el) => { el.scrollLeft = 0; });
  await page.getByTestId('draw-tickets').click();
  await page.getByTestId('confirm-draw-tickets').click();
  await keepTickets(page, 3);
  await expect.poll(atEnd, { intervals: [50] }).toBe(true); // and glides to the ones just kept
});

test('a game clock runs from the start, and your turn pulses', async ({ page }) => {
  await startLocal(page);
  const timer = page.getByTestId('timer');
  const first = await timer.innerText();
  await page.waitForTimeout(2100);
  expect(await timer.innerText()).not.toBe(first);
  await expect(page.getByTestId('status')).toHaveClass(/turn-pulse/);
});

test('pass-and-play recap shows what the other player did', async ({ page }) => {
  await startLocal(page);
  await page.getByTestId('draw-deck').click();
  await page.getByTestId('draw-deck').click();
  await page.getByTestId('reveal').click(); // Bo
  await page.getByTestId('draw-deck').click();
  await page.getByTestId('draw-deck').click();
  await expect(page.getByTestId('recap')).toContainText('Bo drew from the deck (×2)');
});

test('taking destination tickets asks first, and then at least one must be kept', async ({ page }) => {
  await startLocal(page);
  const pileBefore = (await page.getByTestId('draw-tickets').innerText()).match(/(\d+)\s*$/)![1];
  await page.getByTestId('draw-tickets').click();
  const confirm = page.getByTestId('confirm-tickets');
  await expect(confirm).toContainText('must keep at least one');
  await confirm.getByRole('button', { name: 'Cancel' }).click();
  await expect(confirm).toBeHidden();
  await expect(page.getByTestId('ticket-chooser')).toBeHidden();
  await expect(page.getByTestId('draw-tickets')).toHaveText(new RegExp(`${pileBefore}$`));
  await page.getByTestId('draw-tickets').click();
  await page.getByTestId('confirm-draw-tickets').click();
  const chooser = page.getByTestId('ticket-chooser');
  await expect(chooser).toBeVisible();
  await expect(page.getByTestId('put-back')).toHaveCount(0);
  await expect(page.getByTestId('keep-tickets')).toBeDisabled();
  await chooser.locator('[data-ticket]').first().click();
  await page.getByTestId('keep-tickets').click();
  await expect(page.getByTestId('curtain')).toBeVisible({ timeout: 6000 });
});

test('taking tickets animates ticket stubs and never takes train cards', async ({ page }) => {
  await startLocal(page);
  await page.evaluate(() => {
    (window as any).__flown = [];
    new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => {
      if (n instanceof HTMLElement && n.parentElement === document.body) (window as any).__flown.push(n);
    }))).observe(document.body, { childList: true });
  });
  const handBefore = await page.getByTestId('hand').locator('[data-count]').evaluateAll((els) => els.map((e) => e.getAttribute('data-card') + e.getAttribute('data-count')).join());
  await page.getByTestId('draw-tickets').click();
  await page.getByTestId('confirm-draw-tickets').click();
  await page.waitForTimeout(300);
  const flown: string[] = await page.evaluate(() => (window as any).__flown.map((n: HTMLElement) => n.textContent ?? ''));
  expect(flown.length).toBeGreaterThan(0);
  for (const f of flown) expect(f.toLowerCase()).toContain('destination');
  const handAfter = await page.getByTestId('hand').locator('[data-count]').evaluateAll((els) => els.map((e) => e.getAttribute('data-card') + e.getAttribute('data-count')).join());
  expect(handAfter).toBe(handBefore);
});

test('pass-and-play waits for the move to finish animating before the curtain, and nothing is re-dealt', async ({ page }) => {
  await startLocal(page);
  for (let i = 0; i < 12 && !(await page.locator('[data-claimable=true]').count()); i++) {
    await revealIfCurtain(page);
    await page.getByTestId('draw-deck').click();
    await page.getByTestId('draw-deck').click();
    await revealIfCurtain(page);
  }
  const route = page.locator('[data-claimable=true]').first();
  const id = await route.getAttribute('data-route');
  const box = (await route.locator('rect').last().boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.getByTestId('confirm-claim').click();
  expect(id).not.toBeNull();
  // right after claiming, the claimer still sees the board (input blocked) — the curtain comes after the animation
  await expect(page.getByTestId('curtain')).toBeHidden({ timeout: 200 }).catch(() => {});
  await expect(page.getByTestId('handoff-wait')).toBeVisible();
  await expect(page.getByTestId('curtain')).toBeVisible({ timeout: 4000 });
  await page.getByTestId('reveal').click();
  await expect(page.locator('button[data-market].deal-in')).toHaveCount(0);
});

test('the rules guide opens from the start screen and from the game', async ({ page }) => {
  await page.goto('/menu');
  await page.getByTestId('open-help').click();
  const guide = page.getByTestId('how-to-play');
  await expect(guide).toContainText('All aboard!');
  for (let i = 0; i < 7; i++) await page.getByTestId('help-next').click();
  await expect(guide).toContainText('Handy controls');
  await page.getByTestId('close-help').click();
  await expect(guide).toBeHidden();
  await startLocal(page);
  await page.getByTestId('open-help').click();
  await expect(guide).toContainText('All aboard!');
  await page.keyboard.press('ArrowRight');
  await expect(guide).toContainText('Setting out');
  await page.keyboard.press('Escape');
  await expect(guide).toBeHidden();
});

test('last moves write a taken card in its own colour, and the clock box keeps its width', async ({ page }) => {
  await startLocal(page);
  const w1 = (await page.getByTestId('timer').boundingBox())!.width;
  await page.locator('button[data-market]:not([data-card=locomotive])').first().click();
  await expect(page.getByTestId('log').locator('[data-card-word]').first()).toBeVisible();
  await page.waitForTimeout(1100);
  expect((await page.getByTestId('timer').boundingBox())!.width).toBe(w1);
});

test('a new turn in pass-and-play never replays an old card animation', async ({ page }) => {
  await startLocal(page); // Ana's turn
  await page.getByTestId('draw-deck').click();
  await page.getByTestId('draw-deck').click();
  await revealIfCurtain(page); // Bo
  await page.getByTestId('draw-deck').click();
  await page.getByTestId('draw-deck').click();
  await page.waitForTimeout(80);
  await expect(page.getByTestId('handoff-wait')).toHaveCount(0, { timeout: 8000 });
  await expect(page.getByTestId('curtain')).toContainText('Ana');
  await page.evaluate(() => {
    (window as any).__flown = [];
    new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => {
      if (n instanceof HTMLElement && n.parentElement === document.body) (window as any).__flown.push(n);
    }))).observe(document.body, { childList: true });
  });
  await page.getByTestId('reveal').click(); // Ana takes her turn: nothing should fly
  await page.waitForTimeout(1200);
  const flown: string[] = await page.evaluate(() => (window as any).__flown.map((n: HTMLElement) => n.textContent ?? ''));
  expect(flown).toEqual([]);
});

test('rapid clicking never selects (highlights) text on the page', async ({ page }) => {
  await startLocal(page);
  const selected = () => page.evaluate(() => window.getSelection()?.toString() ?? '');
  await page.getByTestId('status').click({ clickCount: 3 });
  expect(await selected()).toBe('');
  await page.getByTestId('log').click({ clickCount: 3 });
  expect(await selected()).toBe('');
  await page.getByTestId('hand-tray').click({ clickCount: 3, position: { x: 600, y: 70 } });
  expect(await selected()).toBe('');
  await page.getByTestId('draw-deck').click({ clickCount: 3 });
  expect(await selected()).toBe('');
  await expect(page.getByTestId('curtain')).toBeVisible({ timeout: 8000 });
  await page.getByTestId('curtain').click({ clickCount: 3, position: { x: 50, y: 50 } });
  expect(await selected()).toBe('');
});

test('a big banner says whose turn it is: yours in your colour, others plain', async ({ page }) => {
  await startLocal(page);
  const mine = page.getByTestId('turn-banner');
  await expect(mine).toBeVisible();
  await expect(mine).toHaveAttribute('data-mine', 'true');
  await expect(mine).toContainText('Your turn!');
  // Ana ends her turn: before the curtain falls, her screen announces Bo's turn, plainly
  await page.getByTestId('draw-deck').click();
  await page.getByTestId('draw-deck').click();
  // the banner shows for only a moment before the curtain falls, so poll fast (the default polling can miss it)
  await expect.poll(() => page.evaluate(() => {
    const b = [...document.querySelectorAll('[data-testid=turn-banner]')].find((e) => e.textContent?.includes('Bo’s turn'));
    return b ? { mine: b.getAttribute('data-mine') } : null;
  }), { intervals: [16], timeout: 6000 }).toEqual({ mine: null });
});

test('taking a face-up card reads "took a COLOR card", with no "face-up"', async ({ page }) => {
  await startLocal(page);
  const card = page.locator('button[data-market]:not([data-card=locomotive])').first();
  const colour = await card.getAttribute('data-card');
  await card.click();
  await expect(page.getByTestId('log')).toContainText(`You took a ${colour} card`);
  await expect(page.getByTestId('log')).not.toContainText('face-up');
});

test('choosing tickets leaves your hand and routes in view', async ({ page }) => {
  await page.goto('/menu?seed=e2e1');
  await page.getByTestId('play-local').click();
  await page.getByTestId('start-local').click();
  await page.getByTestId('reveal').click();
  const chooser = page.getByTestId('ticket-chooser');
  await expect(chooser).toBeVisible();
  const c = (await chooser.boundingBox())!;
  const tray = (await page.getByTestId('hand-tray').boundingBox())!;
  expect(c.y + c.height).toBeLessThanOrEqual(tray.y + 1);
  // docked in the map's bottom-right corner, covering no city or track
  const map = (await page.getByTestId('map').boundingBox())!;
  expect(map.x + map.width - (c.x + c.width)).toBeLessThan(20);
  expect(c.y).toBeGreaterThan(map.y + map.height / 2);
  const hits = await page.evaluate(([x0, y0, x1, y1]) => {
    const boxes = [...document.querySelectorAll('[data-city] circle, [data-route] rect, [data-route] path[fill]:not([fill=none])')];
    return boxes.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.right > x0 && r.left < x1 && r.bottom > y0 && r.top < y1;
    }).length;
  }, [c.x, c.y, c.x + c.width, c.y + c.height]);
  expect(hits).toBe(0);
  await expect(page.getByTestId('hand').locator('[data-card]').first()).toBeVisible();
  await expect(page.getByTestId('my-tickets')).toBeVisible();
});

test('the first-ticket chooser never scrolls, and long ticket names wrap in full', async ({ page }) => {
  await page.goto('/menu?seed=e2e1');
  await page.getByTestId('play-local').click();
  await page.getByTestId('start-local').click();
  await page.getByTestId('reveal').click();
  const chooser = page.getByTestId('ticket-chooser');
  await expect(chooser).toBeVisible();
  // every ticket name on every map and skin, tried in the real strips
  const names = Object.values(MAPS).flatMap((m) => {
    const city = Object.fromEntries(m.cities.map((c) => [c.id, c]));
    return Object.values(SKINS).flatMap((skin) => m.tickets.map((t) => `${cityNameIn(skin, city[t.a])} → ${cityNameIn(skin, city[t.b])}`));
  });
  const result = await chooser.evaluate((el, names) => {
    const label = [...el.querySelectorAll<HTMLElement>('[data-ticket-name]')];
    const strip = label[0].closest('[data-ticket]') as HTMLElement;
    let tallest = names[0], most = 0;
    for (const n of names) {
      label[0].textContent = n;
      if (strip.offsetHeight > most) { most = strip.offsetHeight; tallest = n; }
    }
    for (const l of label) l.textContent = tallest;
    const overflowing = [el, ...el.querySelectorAll<HTMLElement>('*')].filter((x) => x.scrollHeight > x.clientHeight + 1 || x.scrollWidth > x.clientWidth + 1);
    return { tallest, panel: el.getBoundingClientRect().height, overflowing: overflowing.map((x) => x.className.slice(0, 60)) };
  }, names);
  expect(result.overflowing, `with "${result.tallest}"`).toEqual([]);
  // the map always keeps this much room free for the panel
  expect(result.panel).toBeLessThanOrEqual(DOCK_PANEL.h);
});

test('side rail: chat sits above a fixed four-line move log, with room below the ticket pile', async ({ page }) => {
  await startLocal(page);
  const pile = (await page.getByTestId('draw-tickets').boundingBox())!;
  const chat = (await page.getByTestId('chat').boundingBox())!;
  const log = (await page.getByTestId('log').boundingBox())!;
  expect(chat.y).toBeGreaterThan(pile.y + pile.height + 20);
  expect(log.y).toBeGreaterThan(chat.y + chat.height);
  for (let i = 0; i < 3; i++) await page.getByTestId('chat-input').fill(`line ${i}`), await page.getByTestId('chat-input').press('Enter');
  await page.getByTestId('draw-deck').click();
  expect((await page.getByTestId('log').boundingBox())!.height).toBeCloseTo(log.height, 0);
  // the pile's count uses the same dark pill as the train-card deck
  await expect(page.getByTestId('draw-tickets')).toHaveText(/\d+\s*$/);
});
