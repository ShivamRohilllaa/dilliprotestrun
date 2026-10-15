import {
  test,
  expect,
  loadGame,
  chooseLocation,
  snapshot,
  startRun,
  advance,
  settleView,
  type TestWindow,
} from './fixtures';

test('main menu renders an actual WebGL scene and opens avatar then location selection', async ({
  page,
}) => {
  await loadGame(page);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('DILLI');
  await expect(page.locator('#scene canvas')).toBeVisible();
  const scene = await snapshot(page);
  expect(scene.geometryCount).toBeGreaterThan(0);
  expect(scene.drawCalls).toBeGreaterThan(0);
  await settleView(page);
  await page.screenshot({ path: 'docs/screenshots/menu.png', fullPage: true });
  await chooseLocation(page);
  await expect(page.getByTestId('location-jantar')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('location-india')).toContainText('80');
  await expect(page.getByTestId('location-ramlila')).toContainText('160');
});

for (const [id, name] of [
  ['jantar', 'JANTAR MANTAR'],
  ['india', 'INDIA GATE'],
  ['ramlila', 'RAMLILA MAIDAN'],
]) {
  test(`${name} selection creates a playable environment`, async ({ page }) => {
    await loadGame(page);
    await page.evaluate(() => (window as TestWindow).__DILLI_TEST__.unlockAll());
    await chooseLocation(page);
    await page.getByTestId(`location-${id}`).click();
    await expect(page.getByTestId(`location-${id}`)).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('choose-issue').click();
    await page.getByTestId('choose-pursuer').click();
    await page.getByTestId('start').click();
    await expect(page.getByTestId('protest-intro')).toContainText(name);
    await page.getByTestId('skip-intro').click();
    await advance(page, 1);
    expect((await snapshot(page)).state).toBe('PLAYING');
    expect((await snapshot(page)).geometryCount).toBeGreaterThan(0);
    await expect(page.getByTestId('game-hud')).toBeVisible();
  });
}

test('core gameplay remains available offline after the application loads', async ({
  page,
  context,
}) => {
  await loadGame(page);
  await context.setOffline(true);
  await startRun(page);
  await page.keyboard.press('ArrowLeft');
  await advance(page, 2);
  const state = await snapshot(page);
  expect(state.state).toBe('PLAYING');
  expect(state.lane).toBe(0);
  expect(state.distance).toBeGreaterThan(20);
  await page.getByTestId('pause').click();
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  await page.getByTestId('resume').click();
  await advance(page, 1);
  expect((await snapshot(page)).distance).toBeGreaterThan(state.distance);
});
