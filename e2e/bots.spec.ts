import { expect, test } from '@playwright/test';
import { keepTickets } from './helpers';

// Needs the server started with TTB_BOT_DELAY=50 so bot turns are quick.
test('LAN: host fills seats with bots, starts, and the bots take their turns', async ({ page }) => {
  await page.goto('/menu');
  await page.getByTestId('play-lan').click();
  await page.getByTestId('my-name').fill('Host');
  await page.getByTestId('host-game').click();
  const seats = page.getByTestId('waiting-players').locator('[data-seat]');
  await expect(seats).toHaveCount(1);

  const add = async (level: 'easy' | 'medium' | 'hard') => {
    await page.getByTestId(`bot-level-${level}`).click();
    await page.getByTestId('add-bot').click();
  };
  await add('easy');
  await expect(seats).toHaveCount(2);
  await add('hard');
  await expect(seats).toHaveCount(3);
  await expect(page.locator('[data-seat][data-bot="easy"]')).toHaveCount(1);
  await expect(page.locator('[data-seat][data-bot="hard"]')).toHaveCount(1);

  // remove the easy bot and put it back
  await page.locator('[data-seat][data-bot="easy"] [data-testid^="remove-bot-"]').click();
  await expect(seats).toHaveCount(2);
  await add('easy');
  await expect(seats).toHaveCount(3);
  await expect(page.getByTestId('start-lan')).toBeEnabled();

  await page.getByTestId('start-lan').click();
  await expect(page).toHaveURL(/\/play\//, { timeout: 15_000 });
  await keepTickets(page, 2);

  // bot markers show in the player list, and bots move: after the host draws, the turn comes back after them
  await expect(page.locator('[data-player][data-bot], [data-player] [data-bot]')).toHaveCount(2);
  await expect(page.getByTestId('status')).toHaveText(/Your turn/, { timeout: 30_000 });
  await page.getByTestId('draw-deck').click();
  await page.getByTestId('draw-deck').click();
  await expect(page.getByTestId('status')).not.toHaveText(/Your turn/);
  await expect(page.getByTestId('status')).toHaveText(/Your turn/, { timeout: 30_000 });
  await expect(page.getByTestId('log')).toContainText(/Rookie Bot|Stationmaster Bot|Bot/);
});
