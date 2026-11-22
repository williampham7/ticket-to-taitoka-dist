/**
 * The Europe edition (Ticket to Europa, rail theme), played on the single build by choosing it in the URL (`?edition=europe`).
 * Nothing here depends on the seed: who goes first, which tickets and which routes come up are all read
 * from the screen. Run with `npm run e2e` (or `npx playwright test e2e/europe.spec.ts` after `npm run build`).
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

test('Europe edition: Ticket to Europa loads and pass-and-play starts', async ({ page }) => {
  await page.goto('/menu?edition=europe');
  await expect(page).toHaveTitle('Ticket to Europa');
  await expect(page.getByTestId('play-lan')).toBeVisible();
  await page.getByTestId('play-local').click();
  await page.getByTestId('name-0').fill('Ana');
  await page.getByTestId('name-1').fill('Bo');
  await page.getByTestId('start-local').click();
  for (const _ of ['Ana', 'Bo']) {
    await revealIfCurtain(page);
    await expect(page.getByTestId('ticket-chooser').locator('[data-ticket]')).toHaveCount(4);
    await keepTickets(page, 2);
  }
  await revealIfCurtain(page);
  await expect(myTurn(page)).toBeVisible();
  await playUntilClaim(page);
  await expect(page.getByTestId('log')).toContainText('claimed');
});
