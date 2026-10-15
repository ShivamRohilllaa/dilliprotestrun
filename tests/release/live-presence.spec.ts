import { test, expect } from '@playwright/test';

test('a real run updates the shared count and pause/close remove the player', async ({
  browser,
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await page.goto('./');
  const badge = page.locator('[data-live-presence]');
  await expect(badge).toContainText('playing now');
  await expect(badge.locator('strong')).toHaveText('0');
  const playerContext = await browser.newContext();
  try {
    const player = await playerContext.newPage();
    await player.goto('./?graphics=low');
    await player.getByTestId('play').click();
    await player.getByTestId('choose-location').click();
    await player.getByTestId('choose-issue').click();
    await player.getByTestId('choose-pursuer').click();
    await player.getByTestId('start').click();
    await player.getByTestId('skip-intro').click();
    await expect(player.getByTestId('game-hud')).toBeVisible();
    const count = async () => (await (await request.get('/api/presence')).json()).count;
    await expect.poll(count).toBe(1);
    // Refresh the viewer as it would when returning to the tab.
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await expect(badge.locator('strong')).toHaveText('1');

    await player.keyboard.press('p');
    await expect(player.getByTestId('pause-menu')).toBeVisible();
    await expect.poll(count).toBe(0);
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await expect(badge.locator('strong')).toHaveText('0');

    await player.getByTestId('resume').click();
    await expect.poll(count).toBe(1);
    await player.goto('about:blank');
    await expect.poll(count).toBe(0);
  } finally {
    await playerContext.close();
  }
});

test('an unavailable backend is not displayed as zero players', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/presence', (route) => route.fulfill({ status: 503, body: '{}' }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  const badge = page.locator('[data-live-presence]');
  await expect(badge).toContainText('live count unavailable');
  await expect(badge.locator('strong')).toHaveText('—');
  await expect(page.getByTestId('play')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByTestId('play').click();
  await expect(page.getByTestId('avatar-select')).toBeVisible();
  expect(errors).toEqual([]);
});
