import {
  test,
  expect,
  loadGame,
  choosePursuer,
  snapshot,
  advance,
  assertNoOverflow,
  settleView,
  type TestWindow,
} from './fixtures';

test('only the four requested free runners appear and remain selectable after reload', async ({
  page,
}) => {
  await loadGame(page);
  await page.getByTestId('characters').click();
  await expect(page.getByTestId('avatar-select').locator('[data-action="character"]')).toHaveCount(
    4,
  );
  await expect(page.getByTestId('avatar-select')).not.toContainText('THE ORIGINAL LOCAL LEGENDS');
  const portraits = page.getByTestId('avatar-select').locator('.parody-portrait img');
  await expect(portraits).toHaveCount(4);
  await expect
    .poll(() =>
      portraits.evaluateAll((images) =>
        images.every((element) => {
          const image = element as HTMLImageElement;
          return image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
        }),
      ),
    )
    .toBe(true);
  const portraitSources = await portraits.evaluateAll((images) =>
    images.map((element) => (element as HTMLImageElement).currentSrc),
  );
  expect(new Set(portraitSources).size).toBe(4);
  for (const source of portraitSources) {
    expect(new URL(source).origin).toBe(new URL(page.url()).origin);
    expect(new URL(source).pathname).toMatch(/\/avatars\/[^/]+-v3\.webp$/);
  }
  for (const id of ['runner', 'chai', 'metro', 'meme', 'udhar', 'jaleel'])
    await expect(page.getByTestId(`character-${id}`)).toHaveCount(0);
  for (const id of ['abhiteep', 'german', 'pappu', 'khujliwaal']) {
    await page.getByTestId(`character-${id}`).click();
    await expect(page.getByTestId(`character-${id}`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('wallet')).toHaveText('0');
  }
  await assertNoOverflow(page);
  await page.screenshot({ path: 'docs/screenshots/parody-roster-desktop.png', fullPage: true });
  await page.reload();
  await page.getByTestId('characters').click();
  await expect(page.getByTestId('character-khujliwaal')).toHaveAttribute('aria-pressed', 'true');
  for (const id of ['runner', 'chai', 'metro', 'meme', 'udhar', 'jaleel'])
    await expect(page.getByTestId(`character-${id}`)).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await assertNoOverflow(page);
  await page.screenshot({ path: 'docs/screenshots/parody-roster-mobile.png', fullPage: true });
  await page.getByTestId('choose-location').click();
  await expect(page.getByTestId('location-select')).toBeVisible();
  await page.getByTestId('choose-issue').click();
  await page.getByTestId('choose-pursuer').click();
  await expect(page.getByTestId('pursuer-mobi')).toBeVisible();
});

test('crowd difficulty persists, animates, pauses and resets cleanly', async ({ page }) => {
  test.setTimeout(90_000);
  await loadGame(page);
  await choosePursuer(page);
  await page.getByTestId('pursuer-rss').click();
  await expect(page.getByTestId('pursuer-rss')).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: 'docs/screenshots/pursuer-selection.png', fullPage: true });
  await page.reload();
  await page.waitForFunction(() => Boolean((window as TestWindow).__DILLI_TEST__));
  await page.evaluate(() => (window as TestWindow).__DILLI_TEST__.manual(true));
  await choosePursuer(page);
  await expect(page.getByTestId('pursuer-rss')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('start').click();
  expect((await snapshot(page)).crowdCount).toBe(80);
  await page.getByTestId('skip-intro').click();
  await advance(page, 0.4);
  await advance(page, 0.5);
  const running = await snapshot(page);
  expect(running).toMatchObject({ state: 'PLAYING', pursuer: 'rss', chaserCount: 36 });
  expect(running.speed).toBeGreaterThan(16);
  expect(running.pressure).toBeGreaterThan(0.38);
  await expect(page.getByTestId('active-pursuer')).toContainText('SHAKHA SQUAD');
  await settleView(page);
  await page.screenshot({ path: 'docs/screenshots/rss-crowd-chase.png' });
  await page.getByTestId('pause').click();
  await advance(page, 10);
  expect((await snapshot(page)).distance).toBe(running.distance);
  await page.getByTestId('resume').click();
  await page.evaluate(() => (window as TestWindow).__DILLI_TEST__.crash());
  await page.getByTestId('retry').click();
  expect((await snapshot(page)).pressure).toBe(0.38);
  expect((await snapshot(page)).chaserCount).toBe(36);
  await page.getByTestId('menu').click();
  expect((await snapshot(page)).chaserCount).toBe(0);
  await choosePursuer(page);
  await page.getByTestId('pursuer-mobi').click();
  await page.getByTestId('start').click();
  expect((await snapshot(page)).chaserCount).toBe(0);
  expect((await snapshot(page)).pressure).toBe(0.2);
});

test('Bajrang and Baba modes render on mobile with the selected chase rules', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await loadGame(page);
  await choosePursuer(page);
  await page.getByTestId('pursuer-bajrang').click();
  await assertNoOverflow(page);
  await page.getByTestId('start').click();
  await page.getByTestId('skip-intro').click();
  await advance(page, 0.8);
  expect(await snapshot(page)).toMatchObject({
    state: 'PLAYING',
    pursuer: 'bajrang',
    chaserCount: 36,
  });
  await settleView(page);
  await assertNoOverflow(page);
  await page.screenshot({ path: 'docs/screenshots/bajrang-crowd-mobile.png' });
  await page.getByTestId('pause').click();
  await page.getByRole('button', { name: 'End run & main menu' }).click();
  await choosePursuer(page);
  await page.getByTestId('pursuer-baba').click();
  await page.getByTestId('start').click();
  expect(await snapshot(page)).toMatchObject({ pressure: 0.3, chaserCount: 0 });
});
