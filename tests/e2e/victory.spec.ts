import { test, expect, loadGame, startRun, snapshot, advance, assertNoOverflow } from './fixtures';
import { ObstacleSpawner } from '../../src/game/ObstacleSpawner';
import { DifficultyManager } from '../../src/game/DifficultyManager';

test('a genuine 1000m run wins once, reveals the ending, and preserves its reward across retry and reload', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await loadGame(page);
  await expect(page.getByTestId('wallet')).toHaveText('0');
  await startRun(page);

  // Follow the generated clear route with real lane input. No distance, victory,
  // collision, or currency injection is used to reach this result.
  const generator = new ObstacleSpawner(20261014);
  const difficulty = new DifficultyManager();
  let rowDistance = 55;
  let expectedCoins = 0;
  let reinforcementTransitions = 0;
  let current = await snapshot(page);
  expect(current).toMatchObject({ reinforcements: false, crowdStyle: null, chaserCount: 0 });
  for (let row = 0; row < 32 && current.state === 'PLAYING'; row += 1) {
    if (rowDistance >= 1000) {
      await advance(page, 1);
      current = await snapshot(page);
      break;
    }
    const pattern = generator.next(rowDistance, 1);
    while (current.lane !== pattern.safeLane) {
      await page.keyboard.press(current.lane < pattern.safeLane ? 'ArrowRight' : 'ArrowLeft');
      current = await snapshot(page);
    }
    const target = Math.min(1000, rowDistance + pattern.coins.at(-1)!.offset + 2);
    for (
      let step = 0;
      step < 100 && current.distance < target && current.state === 'PLAYING';
      step += 1
    ) {
      const previous = current;
      await advance(page, 0.2);
      current = await snapshot(page);
      if (current.coins < 80) {
        expect(current).toMatchObject({ reinforcements: false, crowdStyle: null, chaserCount: 0 });
      } else {
        expect(current).toMatchObject({
          reinforcements: true,
          crowdStyle: 'mixed',
          chaserCount: 54,
        });
        if (!previous.reinforcements) {
          reinforcementTransitions += 1;
          expect(current.pressure).toBeGreaterThan(0.27);
          await page.screenshot({ path: 'docs/screenshots/mixed-reinforcements.png' });
        } else {
          // Clean running recovers pressure; later tokens must never apply the
          // reinforcement penalty again or allocate another chasing squad.
          expect(current.pressure).toBeLessThanOrEqual(previous.pressure + 1e-8);
        }
      }
    }
    // This seed's last complete coin row ends below 995m; the next row starts
    // beyond the finish, so every expected token is genuinely collectable.
    expectedCoins += pattern.coins.length;
    expect(current.distance).toBeGreaterThanOrEqual(target);
    expect(current.pressure).toBeGreaterThanOrEqual(0.2);
    expect(current.pressure).toBeLessThanOrEqual(0.28);
    expect(current.coins).toBe(expectedCoins);
    difficulty.update(rowDistance, 1);
    rowDistance += difficulty.spacing;
  }

  expect(current).toMatchObject({ state: 'VICTORY', distance: 1000, coins: expectedCoins });
  expect(expectedCoins).toBeGreaterThanOrEqual(80);
  expect(reinforcementTransitions).toBe(1);
  expect(current).toMatchObject({ reinforcements: true, crowdStyle: 'mixed', chaserCount: 54 });
  expect(current.speed).toBeGreaterThan(12 + 1000 / 160 + 1.1);
  await expect(page.getByTestId('victory-screen')).toHaveCount(1);
  await expect(page.getByTestId('victory-screen')).toBeVisible();
  await expect(page.getByTestId('game-over')).toHaveCount(0);
  const banked = expectedCoins + 100;
  await expect(page.getByTestId('wallet')).toHaveText(String(banked));
  await expect(page.getByTestId('bail-meme')).toHaveCount(0);
  await assertNoOverflow(page);
  await page.screenshot({ path: 'docs/screenshots/victory-reward.png' });

  // Advancing and normal run keys cannot resume a completed run or bank again.
  await advance(page, 5);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('p');
  expect(await snapshot(page)).toMatchObject({
    state: 'VICTORY',
    distance: 1000,
    coins: expectedCoins,
    score: current.score,
  });
  await expect(page.getByTestId('wallet')).toHaveText(String(banked));

  const reward = page.getByTestId('release-reward');
  await expect(reward).toBeVisible();
  await reward.dblclick();
  await expect(page.getByTestId('bail-meme')).toHaveCount(1);
  await expect(page.getByTestId('bail-meme')).toContainText('Arcade CJI: bail not approved.');
  await page.screenshot({ path: 'docs/screenshots/victory-meme-desktop.png' });
  await expect(page.getByTestId('wallet')).toHaveText(String(banked));
  await advance(page, 2);
  await expect(page.getByTestId('victory-screen')).toHaveCount(1);
  await expect(page.getByTestId('bail-meme')).toHaveCount(1);
  await expect(page.getByTestId('wallet')).toHaveText(String(banked));

  await page.setViewportSize({ width: 390, height: 844 });
  await assertNoOverflow(page);
  await expect(page.getByTestId('bail-meme')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/victory-meme-mobile.png' });
  await page.getByTestId('retry').click();
  await expect(page.getByTestId('protest-intro')).toBeVisible();
  expect(await snapshot(page)).toMatchObject({
    state: 'PROTEST_INTRO',
    distance: 0,
    coins: 0,
    score: 0,
    lane: 1,
    pressure: 0.2,
    reinforcements: false,
    crowdStyle: null,
    chaserCount: 0,
  });
  await expect(page.getByTestId('wallet')).toHaveText(String(banked));
  await expect(page.getByTestId('victory-screen')).toHaveCount(0);
  await expect(page.getByTestId('bail-meme')).toHaveCount(0);
  await page.getByTestId('menu').click();
  await expect(page.getByTestId('main-menu')).toBeVisible();
  await expect(page.getByTestId('wallet')).toHaveText(String(banked));
  await page.reload();
  await expect(page.getByTestId('main-menu')).toBeVisible();
  await expect(page.getByTestId('wallet')).toHaveText(String(banked));
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('dilli-protest-run.save') ?? '{}').totalCoins,
    ),
  ).toBe(banked);
});
