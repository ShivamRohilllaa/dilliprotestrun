import {
  test,
  expect,
  loadGame,
  choosePursuer,
  snapshot,
  advance,
  assertNoOverflow,
  type TestWindow,
} from './fixtures';

test('avatar, location, issue, and pursuer are separate ordered steps with persistent back navigation', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await loadGame(page);
  await page.evaluate(() => (window as TestWindow).__DILLI_TEST__.unlockAll());
  await page.getByTestId('play').click();
  await expect(page.getByTestId('avatar-select')).toBeVisible();
  await expect(page.getByTestId('avatar-select')).not.toContainText(/parody of/i);
  expect((await snapshot(page)).state).toBe('CHARACTER_SELECT');
  await expect(page.getByTestId('location-select')).toHaveCount(0);
  await expect(page.getByTestId('pursuer-select')).toHaveCount(0);
  await expect(page.getByTestId('issue-select')).toHaveCount(0);
  await expect(page.getByTestId('start')).toHaveCount(0);
  await page.getByTestId('character-pappu').click();
  await expect(page.getByTestId('character-pappu')).toHaveAttribute('aria-pressed', 'true');
  expect((await snapshot(page)).state).toBe('CHARACTER_SELECT');
  await page.screenshot({ path: 'docs/screenshots/setup-1-avatar.png', fullPage: true });

  await page.getByTestId('choose-location').click();
  await expect(page.getByTestId('location-select')).toBeVisible();
  expect((await snapshot(page)).state).toBe('LOCATION_SELECT');
  await expect(page.getByTestId('avatar-select')).toHaveCount(0);
  await expect(page.getByTestId('pursuer-select')).toHaveCount(0);
  await expect(page.getByTestId('pursuer-rss')).toHaveCount(0);
  await expect(page.getByTestId('start')).toHaveCount(0);
  await page.getByTestId('location-india').click();
  await expect(page.getByTestId('location-india')).toHaveAttribute('aria-pressed', 'true');
  expect((await snapshot(page)).state).toBe('LOCATION_SELECT');
  await page.screenshot({ path: 'docs/screenshots/setup-2-location.png', fullPage: true });

  await page.getByTestId('choose-issue').click();
  await expect(page.getByTestId('issue-select')).toBeVisible();
  expect((await snapshot(page)).state).toBe('ISSUE_SELECT');
  await expect(page.getByTestId('location-select')).toHaveCount(0);
  await expect(page.getByTestId('pursuer-select')).toHaveCount(0);
  await expect(page.getByTestId('start')).toHaveCount(0);
  await expect(page.getByTestId('issue-vote-chori')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('issue-dharam').click();
  await expect(page.getByTestId('issue-dharam')).toHaveAttribute('aria-pressed', 'true');
  expect((await snapshot(page)).state).toBe('ISSUE_SELECT');
  await page.screenshot({ path: 'docs/screenshots/setup-3-issue.png', fullPage: true });

  await page.getByTestId('choose-pursuer').click();
  await expect(page.getByTestId('pursuer-select')).toBeVisible();
  await expect(page.getByTestId('pursuer-select')).not.toContainText(/parody of/i);
  expect((await snapshot(page)).state).toBe('PURSUER_SELECT');
  await expect(page.getByTestId('location-select')).toHaveCount(0);
  await expect(page.getByTestId('location-jantar')).toHaveCount(0);
  await expect(page.getByTestId('avatar-select')).toHaveCount(0);
  await expect(page.getByTestId('issue-select')).toHaveCount(0);
  await expect(page.getByTestId('start')).toBeVisible();
  await page.getByTestId('pursuer-amit').click();
  await expect(page.getByTestId('pursuer-amit')).toHaveAttribute('aria-pressed', 'true');
  expect((await snapshot(page)).state).toBe('PURSUER_SELECT');
  await page.screenshot({ path: 'docs/screenshots/setup-4-pursuer.png', fullPage: true });

  await page.getByTestId('back-to-issue').click();
  await expect(page.getByTestId('issue-dharam')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('issue-select').getByTestId('back-to-location').click();
  await expect(page.getByTestId('location-india')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('location-select').locator('[data-action="characters"]').click();
  await expect(page.getByTestId('character-pappu')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('choose-location').click();
  await expect(page.getByTestId('location-india')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('choose-issue').click();
  await expect(page.getByTestId('issue-dharam')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('choose-pursuer').click();
  await expect(page.getByTestId('pursuer-amit')).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await expect(page.getByTestId('main-menu')).toBeVisible();
  await page.getByTestId('play').click();
  await expect(page.getByTestId('character-pappu')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('choose-location').click();
  await expect(page.getByTestId('location-india')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('choose-issue').click();
  await expect(page.getByTestId('issue-dharam')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('choose-pursuer').click();
  await expect(page.getByTestId('pursuer-amit')).toHaveAttribute('aria-pressed', 'true');
});

test('mobile setup states the release objective at the intro and the beginning of the run', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loadGame(page);
  await choosePursuer(page);
  await assertNoOverflow(page);
  await page.getByTestId('start').click();
  await expect(page.getByTestId('protest-intro')).toBeVisible();
  await expect(page.getByTestId('start-objective')).toContainText(
    'Win 100 chai to try releasing Udhar Galib & Jaleel Imaan.',
  );
  await expect(page.getByTestId('start-objective')).toContainText(/1,?000/);
  await assertNoOverflow(page);
  await page.screenshot({ path: 'docs/screenshots/start-objective-mobile.png', fullPage: true });
  await page.getByTestId('skip-intro').click();
  await advance(page, 0.4);
  await expect(page.getByTestId('run-objective')).toBeVisible();
  await expect(page.getByTestId('run-objective')).toContainText('WIN 100 CHAI');
  await expect(page.getByTestId('run-objective')).toContainText(
    'Finish 1,000m to try releasing Udhar Galib & Jaleel Imaan.',
  );
  await assertNoOverflow(page);
  await page.screenshot({ path: 'docs/screenshots/run-objective-mobile.png', fullPage: true });
  await advance(page, 7);
  expect((await snapshot(page)).distance).toBeGreaterThan(80);
  await expect(page.getByTestId('run-objective')).not.toBeVisible();
});
