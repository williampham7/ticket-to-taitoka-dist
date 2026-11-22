import { expect, test } from '@playwright/test';
import { claimFirstRoute, handTotal, keepTickets, revealIfCurtain } from './helpers';

test('pass-and-play: setup, secret ticket choice, drawing, claiming and handing over', async ({ page }) => {
  await page.goto('/menu?seed=e2e1');
  await page.getByTestId('play-local').click();
  await page.getByTestId('name-0').fill('Ana');
  await page.getByTestId('name-1').fill('Bo');
  await page.getByTestId('start-local').click();

  // Player 1 chooses tickets behind the curtain
  await expect(page.getByTestId('curtain')).toContainText('Ana');
  await page.getByTestId('reveal').click();
  await keepTickets(page, 2);

  // Curtain comes down for player 2's secret choice
  await expect(page.getByTestId('curtain')).toContainText('Bo');
  await page.getByTestId('reveal').click();
  await keepTickets(page, 3);

  // Main phase: Ana goes first
  await expect(page.getByTestId('curtain')).toContainText('Ana');
  await page.getByTestId('reveal').click();
  await expect(page.getByTestId('status')).toHaveText(/Your turn/);
  await expect(page.getByTestId('my-tickets').locator('[data-ticket]')).toHaveCount(2);
  expect(await handTotal(page)).toBe(4);

  await page.getByTestId('draw-deck').click();
  await expect(page.getByTestId('status')).toHaveText(/one more card/);
  await page.getByTestId('draw-deck').click();

  // Turn passes to Bo behind the curtain
  await expect(page.getByTestId('curtain')).toContainText('Bo');
  await page.getByTestId('reveal').click();
  await expect(page.locator('[data-player="0"] [data-cards]')).toHaveAttribute('data-cards', '6');
  await expect(page.getByTestId('my-tickets').locator('[data-ticket]')).toHaveCount(3); // Bo kept all three

  // Keep playing until someone can claim a route, then claim it
  let claimed: string | null = null;
  for (let turn = 0; turn < 16 && !claimed; turn++) {
    await revealIfCurtain(page);
    if (await page.locator('[data-claimable=true]').count()) {
      const before = await handTotal(page);
      claimed = await claimFirstRoute(page);
      await expect(page.locator(`[data-route="${claimed}"]`)).toHaveAttribute('data-owner', /\d/);
      await revealIfCurtain(page);
      expect(before).toBeGreaterThan(0);
    } else {
      await page.getByTestId('draw-deck').click();
      await page.getByTestId('draw-deck').click();
    }
  }
  expect(claimed).not.toBeNull();
  await expect(page.locator('[data-score]')).toHaveCount(0); // no live score during play
  await expect(page.getByTestId('log')).toContainText('claimed');
});

test('face-up locomotive rules and the 3-locomotive guard are visible to players', async ({ page }) => {
  await page.goto('/menu?seed=e2e1');
  await page.getByTestId('play-local').click();
  await page.getByTestId('start-local').click();
  for (let i = 0; i < 2; i++) {
    await page.getByTestId('reveal').click();
    await keepTickets(page, 2);
  }
  await page.getByTestId('reveal').click();
  // Never more than two locomotives face-up
  const locos = await page.locator('[data-market][data-card=locomotive]').count();
  expect(locos).toBeLessThan(3);
  // After a first draw, face-up locomotives are disabled
  await page.getByTestId('draw-deck').click();
  const faceUpLocos = page.locator('button[data-market][data-card=locomotive]');
  for (let i = 0; i < (await faceUpLocos.count()); i++) await expect(faceUpLocos.nth(i)).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByTestId('draw-tickets')).toHaveAttribute('aria-disabled', 'true');
});

test('the privacy curtain is fully opaque', async ({ page }) => {
  await page.goto('/menu');
  await page.getByTestId('play-local').click();
  await page.getByTestId('start-local').click();
  const bg = await page.getByTestId('curtain').evaluate((e) => getComputedStyle(e).backgroundColor);
  const alpha = /rgba?\(([^)]+)\)/.exec(bg)![1].split(',').map(Number)[3];
  expect(alpha === undefined || alpha === 1).toBe(true);
});
