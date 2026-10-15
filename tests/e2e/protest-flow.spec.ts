import {
  test,
  expect,
  loadGame,
  choosePursuer,
  chooseLocation,
  snapshot,
  advance,
  type TestWindow,
} from './fixtures';

test('a fictional slogan starts one crowd reaction and transitions to the runner', async ({
  page,
}) => {
  await loadGame(page);
  await choosePursuer(page);
  await page.getByTestId('start').click();
  await expect(page.getByTestId('slogan')).toContainText('वोट चोरी बंद करो!');
  await page.getByTestId('slogan').evaluate((button: HTMLElement) => {
    for (let index = 0; index < 5; index += 1) button.click();
  });
  await expect(page.getByTestId('chase-transition')).toBeVisible();
  expect((await snapshot(page)).state).toBe('CHASE_TRANSITION');
  await advance(page, 1);
  expect((await snapshot(page)).state).toBe('CHASE_TRANSITION');
  await advance(page, 2.3);
  expect((await snapshot(page)).state).toBe('PLAYING');
  await expect(page.getByTestId('game-hud')).toHaveCount(1);
  await expect(page.getByTestId('chase-transition')).toHaveCount(0);
  expect((await snapshot(page)).distance).toBeLessThan(6);
});

test('the accessible skip control shortens the introduction', async ({ page }) => {
  await loadGame(page);
  await choosePursuer(page);
  await page.getByTestId('start').click();
  await page.getByTestId('skip-intro').focus();
  await page.keyboard.press('Enter');
  await advance(page, 0.4);
  expect((await snapshot(page)).state).toBe('PLAYING');
  await expect(page.getByTestId('game-hud')).toBeVisible();
  await page.evaluate(() => (window as TestWindow).__DILLI_TEST__.crash());
  await expect(page.getByTestId('game-over')).toBeVisible();
});

test('the chosen issue supplies the runner chant after the introduction', async ({ page }) => {
  await loadGame(page);
  await chooseLocation(page);
  await page.getByTestId('choose-issue').click();
  await page.getByTestId('issue-gyaanu').click();
  await page.getByTestId('choose-pursuer').click();
  await page.getByTestId('start').click();
  await expect(page.getByTestId('slogan')).toContainText('ज्ञानू जी, इस्तीफ़ा दो!');
  await page.getByTestId('skip-intro').click();
  await advance(page, 0.4);
  const chant = page.getByTestId('runner-chant');
  // Hold the first chant window while the renderer updates its projected bubble.
  await expect(chant).toBeVisible();
  await expect(chant).toContainText('Abhiteep Bauna');
  await expect(chant).toContainText(/Gyaanu ji, resign karo!/i);
  await expect(chant).not.toContainText(/Vote chori/i);
  expect((await snapshot(page)).state).toBe('PLAYING');
  await page.screenshot({ path: 'docs/screenshots/issue-runner-chant.png' });
});
