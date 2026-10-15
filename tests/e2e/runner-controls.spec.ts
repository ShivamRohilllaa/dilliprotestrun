import {
  test,
  expect,
  loadGame,
  startRun,
  snapshot,
  advance,
  settleView,
  assertNoOverflow,
  swipe,
  type TestWindow,
} from './fixtures';
import { ObstacleSpawner } from '../../src/game/ObstacleSpawner';
import { DifficultyManager } from '../../src/game/DifficultyManager';

test('keyboard lanes, jump, slide, pause and resume change real simulation state', async ({
  page,
}) => {
  await loadGame(page);
  await startRun(page);
  await page.keyboard.press('ArrowLeft');
  await advance(page, 0.25);
  expect((await snapshot(page)).lane).toBe(0);
  expect((await snapshot(page)).x).toBeLessThan(-2.4);
  await page.keyboard.press('ArrowLeft');
  expect((await snapshot(page)).lane).toBe(0);
  await page.keyboard.press('d');
  await advance(page, 0.25);
  expect((await snapshot(page)).lane).toBe(1);
  await page.keyboard.press('Space');
  await advance(page, 0.2);
  expect((await snapshot(page)).y).toBeGreaterThan(1);
  await page.keyboard.press('ArrowUp');
  await advance(page, 0.2);
  expect((await snapshot(page)).y).toBeLessThanOrEqual(2.01);
  await advance(page, 0.5);
  expect((await snapshot(page)).y).toBe(0);
  await page.keyboard.press('ArrowDown');
  expect((await snapshot(page)).sliding).toBe(true);
  await page.keyboard.press('p');
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  const paused = await snapshot(page);
  await advance(page, 2);
  expect(await snapshot(page)).toMatchObject({
    state: 'PAUSED',
    distance: paused.distance,
    sliding: true,
  });
  await page.getByTestId('resume').click();
  await advance(page, 0.85);
  expect((await snapshot(page)).sliding).toBe(false);
  expect((await snapshot(page)).distance).toBeGreaterThan(paused.distance);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  expect((await snapshot(page)).state).toBe('PLAYING');
});

test('game over settles once and retry resets the run without reloading', async ({ page }) => {
  await loadGame(page);
  await startRun(page);
  await advance(page, 2);
  const before = await snapshot(page);
  await page.evaluate(() => {
    const hooks = (window as TestWindow).__DILLI_TEST__;
    hooks.crash();
    hooks.crash();
  });
  await expect(page.getByTestId('game-over')).toHaveCount(1);
  expect((await snapshot(page)).state).toBe('GAME_OVER');
  const saved = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('dilli-protest-run.save') ?? '{}') as { bestScore: number },
  );
  expect(saved.bestScore).toBe(before.score);
  await page.getByTestId('retry').click();
  await expect(page.getByTestId('protest-intro')).toBeVisible();
  expect(await snapshot(page)).toMatchObject({
    state: 'PROTEST_INTRO',
    lane: 1,
    y: 0,
    sliding: false,
    distance: 0,
    coins: 0,
    score: 0,
  });
  await page.getByTestId('skip-intro').click();
  await advance(page, 0.4);
  await page.keyboard.press('ArrowRight');
  expect((await snapshot(page)).lane).toBe(2);
  expect((await snapshot(page)).distance).toBeLessThan(4);
});

test('normal track hazards eventually catch an idle runner without forced collisions', async ({
  page,
}) => {
  await loadGame(page);
  await startRun(page);
  let current = await snapshot(page);
  for (let second = 0; second < 180 && current.state === 'PLAYING'; second += 1) {
    await advance(page, 1);
    current = await snapshot(page);
  }
  expect(current.state).toBe('GAME_OVER');
  expect(current.distance).toBeGreaterThan(55);
  await advance(page, 1);
  await expect(page.getByTestId('game-over')).toBeVisible();
});

test('the seeded clear route collects tokens exactly once and banks genuine run earnings', async ({
  page,
}) => {
  await loadGame(page);
  await startRun(page);
  const generator = new ObstacleSpawner(20261014);
  const difficulty = new DifficultyManager();
  let rowDistance = 55;
  let expectedCoins = 0;
  for (let row = 0; row < 20; row += 1) {
    const pattern = generator.next(rowDistance, 1);
    let current = await snapshot(page);
    while (current.lane !== pattern.safeLane) {
      await page.keyboard.press(current.lane < pattern.safeLane ? 'ArrowRight' : 'ArrowLeft');
      current = await snapshot(page);
    }
    const target = rowDistance + pattern.coins.at(-1)!.offset + 2;
    while (current.distance < target && current.state === 'PLAYING') {
      await advance(page, 0.2);
      current = await snapshot(page);
    }
    expectedCoins += pattern.coins.length;
    expect(current.state).toBe('PLAYING');
    expect(current.reinforcements).toBe(expectedCoins >= 80);
    if (expectedCoins < 80) expect(current.pressure).toBeCloseTo(0.2, 5);
    else {
      expect(current.pressure).toBeGreaterThanOrEqual(0.2);
      expect(current.pressure).toBeLessThanOrEqual(0.28);
      expect(current).toMatchObject({ crowdStyle: 'mixed', chaserCount: 54 });
    }
    expect(current.coins).toBe(expectedCoins);
    difficulty.update(rowDistance, 1);
    rowDistance += difficulty.spacing;
  }
  const earned = await snapshot(page);
  expect(earned.distance).toBeGreaterThan(800);
  expect(earned.coins).toBeGreaterThanOrEqual(60);
  await page.evaluate(() => (window as TestWindow).__DILLI_TEST__.crash());
  await expect(page.getByTestId('wallet')).toHaveText(String(earned.coins));
  await page.reload();
  await expect(page.getByTestId('wallet')).toHaveText(String(earned.coins));
});

test('representative gameplay screenshot contains the runner and populated track', async ({
  page,
}) => {
  await loadGame(page);
  await startRun(page);
  await advance(page, 2);
  await settleView(page);
  expect((await snapshot(page)).objects).toBeGreaterThan(0);
  await page.screenshot({ path: 'docs/screenshots/gameplay.png', fullPage: true });
});

test.describe('mobile touch controls', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });

  test('menus stay within the viewport and touch swipes control the runner', async ({ page }) => {
    await loadGame(page);
    await assertNoOverflow(page);
    await page.screenshot({ path: 'docs/screenshots/mobile-menu.png', fullPage: true });
    await page.getByTestId('play').click();
    await assertNoOverflow(page);
    await page.getByTestId('choose-location').click();
    await assertNoOverflow(page);
    await page.getByTestId('choose-issue').click();
    await assertNoOverflow(page);
    await page.getByTestId('choose-pursuer').click();
    await assertNoOverflow(page);
    await page.getByTestId('start').click();
    await assertNoOverflow(page);
    await page.getByTestId('skip-intro').click();
    await advance(page, 0.4);
    await swipe(page, { x: 200, y: 450 }, { x: 115, y: 450 });
    await advance(page, 0.2);
    expect((await snapshot(page)).lane).toBe(0);
    await swipe(page, { x: 160, y: 450 }, { x: 245, y: 450 });
    expect((await snapshot(page)).lane).toBe(1);
    await swipe(page, { x: 200, y: 500 }, { x: 200, y: 400 });
    await advance(page, 0.2);
    expect((await snapshot(page)).y).toBeGreaterThan(1);
    await advance(page, 0.7);
    await swipe(page, { x: 200, y: 400 }, { x: 200, y: 500 });
    expect((await snapshot(page)).sliding).toBe(true);
    await advance(page, 0.85);
    await page.getByRole('button', { name: 'Move right', exact: true }).click();
    expect((await snapshot(page)).lane).toBe(2);
    await page.getByTestId('pause').click();
    await expect(page.getByTestId('pause-menu')).toBeVisible();
    await assertNoOverflow(page);
    await page.getByTestId('resume').click();
    await settleView(page);
    await assertNoOverflow(page);
    await page.screenshot({ path: 'docs/screenshots/mobile-gameplay.png', fullPage: true });
  });

  test('a swipe beginning on an interactive UI control does not move the runner', async ({
    page,
  }) => {
    await loadGame(page);
    await startRun(page);
    const control = await page.getByTestId('pause').boundingBox();
    if (!control) throw new Error('Pause button is not visible');
    await swipe(
      page,
      { x: control.x + control.width / 2, y: control.y + control.height / 2 },
      { x: control.x - 90, y: control.y + control.height / 2 },
    );
    expect((await snapshot(page)).lane).toBe(1);
    expect((await snapshot(page)).state).toBe('PLAYING');
  });
});
