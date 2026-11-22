import { expect, test } from '@playwright/test';

test('music has its own toggle, separate from sound effects, and the choice is remembered', async ({ page }) => {
  await page.goto('/menu');
  const music = page.getByRole('button', { name: /music/i });
  await expect(music).toHaveAttribute('aria-pressed', 'true');
  await music.click();
  await expect(music).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await expect(page.getByRole('button', { name: /music/i })).toHaveAttribute('aria-pressed', 'false');

  // also available in the game's top bar, next to the volume slider and its mute button
  await page.getByTestId('play-local').click();
  await page.getByTestId('start-local').click();
  await page.getByTestId('reveal').click();
  const top = page.locator('header');
  await expect(top.getByRole('button', { name: /music/i })).toHaveAttribute('aria-pressed', 'false');
  await top.getByTestId('volume-button').click();
  await expect(top.getByTestId('mute')).toBeVisible();
  await expect(top.getByRole('button', { name: /sound effects/i })).toHaveCount(0);
});

test('one volume slider sets music and effects together, is shown in the game, and is remembered', async ({ page }) => {
  await page.goto('/menu');
  await expect(page.getByTestId('volume')).toHaveCount(0);
  await page.getByTestId('volume-button').click();
  const volume = page.getByTestId('volume');
  await expect(volume).toHaveValue('100');
  await volume.fill('35');
  await expect(volume).toHaveValue('35');
  await page.reload();
  await page.getByTestId('volume-button').click();
  await expect(page.getByTestId('volume')).toHaveValue('35');

  await page.getByTestId('play-local').click();
  await page.getByTestId('start-local').click();
  await page.getByTestId('reveal').click();
  await page.locator('header').getByTestId('volume-button').click();
  await expect(page.locator('header').getByTestId('volume')).toHaveValue('35');
});

test('the speaker icon mutes everything, and moving the slider unmutes', async ({ page }) => {
  await page.goto('/menu');
  await page.getByTestId('volume-button').click();
  const mute = page.getByTestId('mute');
  await expect(mute).toHaveAttribute('aria-pressed', 'false');
  await mute.click();
  await expect(mute).toHaveAttribute('aria-pressed', 'true');
  await expect(mute).toHaveAccessibleName('Unmute');
  await page.reload();
  await page.getByTestId('volume-button').click();
  await expect(page.getByTestId('mute')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('volume').fill('60');
  await expect(page.getByTestId('mute')).toHaveAttribute('aria-pressed', 'false');
});

test('player 1 is not pink by default, and pass-and-play has chat too', async ({ page }) => {
  await page.goto('/menu');
  await page.getByTestId('play-local').click();
  await expect(page.getByRole('radiogroup', { name: 'Player 1 colour' }).getByRole('radio', { checked: true })).not.toHaveAccessibleName('Pink');
  await page.getByTestId('start-local').click();
  await page.getByTestId('reveal').click();
  await page.getByTestId('chat-input').fill('my turn first');
  await page.getByTestId('chat-input').press('Enter');
  await expect(page.getByTestId('chat-log')).toContainText('You: my turn first');
  await page.getByTestId('chat-emotes').click();
  await page.locator('[data-emote=train]').click();
  await expect(page.getByTestId('chat-log')).toContainText('🚂');
});
