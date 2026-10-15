import {
  test,
  expect,
  loadGame,
  choosePursuer,
  advance,
  assertNoOverflow,
  type TestWindow,
} from './fixtures';

for (const [pursuer, message] of [
  ['mobi', 'Now you have to drink a chai with Mobi ji.'],
  ['amit', 'Now you’re a “terrorist”!'],
  ['baba', 'Now your house is gone. Better leave Earth!'],
] as const) {
  test(`${pursuer} shows its own fictional catch ending and can retry`, async ({ page }) => {
    if (pursuer === 'baba') await page.setViewportSize({ width: 390, height: 844 });
    await loadGame(page);
    await choosePursuer(page);
    await page.getByTestId(`pursuer-${pursuer}`).click();
    await page.getByTestId('start').click();
    await page.getByTestId('skip-intro').click();
    await advance(page, 0.8);
    await page.evaluate(() => (window as TestWindow).__DILLI_TEST__.crash());
    await expect(page.getByTestId('catch-message')).toHaveText(message);
    await expect(page.getByTestId('game-over')).toContainText('FICTIONAL ARCADE ENDING');
    await assertNoOverflow(page);
    await page.screenshot({ path: `docs/screenshots/ending-${pursuer}.png` });
    await page.getByTestId('retry').click();
    await expect(page.getByTestId('protest-intro')).toBeVisible();
    await expect(page.getByTestId('game-over')).toHaveCount(0);
  });
}
