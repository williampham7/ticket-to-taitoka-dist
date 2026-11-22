import { expect, type Page } from '@playwright/test';

export async function keepTickets(page: Page, n: number) {
  const chooser = page.getByTestId('ticket-chooser');
  await expect(chooser).toBeVisible();
  const tickets = chooser.locator('[data-ticket]');
  for (let i = 0; i < n; i++) await tickets.nth(i).click();
  await page.getByTestId('keep-tickets').click();
  await expect(chooser).toBeHidden();
}

export async function revealIfCurtain(page: Page) {
  // pass-and-play hands over only after the last move's animations: wait for that to settle first
  await page.waitForTimeout(80);
  await expect(page.getByTestId('handoff-wait')).toHaveCount(0, { timeout: 6000 });
  const curtain = page.getByTestId('curtain');
  if (await curtain.isVisible()) await page.getByTestId('reveal').click();
  await expect(curtain).toBeHidden();
}

export async function handTotal(page: Page): Promise<number> {
  const counts = await page.getByTestId('hand').locator('[data-count]').evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-count'))));
  return counts.reduce((s, n) => s + n, 0);
}

/** Click the first claimable route, choosing the first payment option if a picker appears. Returns the route id. */
export async function claimFirstRoute(page: Page): Promise<string> {
  const route = page.locator('[data-claimable=true]').first();
  const id = (await route.getAttribute('data-route'))!;
  // cars are <rect>s on straight routes and bent <path>s on curved ones; the last one drawn is a car
  const box = (await route.locator('rect, path').last().boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const picker = page.getByTestId('claim-picker');
  await expect(picker).toBeVisible();
  await picker.getByTestId('confirm-claim').click();
  await expect(picker).toBeHidden();
  return id;
}
