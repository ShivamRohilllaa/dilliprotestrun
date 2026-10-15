import { test, expect, loadGame, chooseLocation, type TestWindow } from './fixtures';

test('location purchase requires confirmation, spends once, and persists selection', async ({
  page,
}) => {
  await loadGame(page);
  await chooseLocation(page);
  await page.getByTestId('location-ramlila').click();
  await expect(page.locator('.toast[role="status"]')).toContainText('Earn 160 more');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.evaluate(() => (window as TestWindow).__DILLI_TEST__.grantCoins(200));
  await page.getByTestId('location-ramlila').click();
  await expect(page.getByRole('dialog')).toContainText('Spend 160 chai tokens');
  await expect(page.getByTestId('wallet')).toHaveText('200');
  await page.getByTestId('confirm-purchase').evaluate((button: HTMLElement) => {
    button.click();
    button.click();
  });
  await expect(page.getByTestId('wallet')).toHaveText('40');
  await expect(page.getByTestId('location-ramlila')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('location-ramlila').click();
  await expect(page.getByTestId('wallet')).toHaveText('40');
  await page.reload();
  await expect(page.getByTestId('wallet')).toHaveText('40');
  await chooseLocation(page);
  await expect(page.getByTestId('location-ramlila')).toHaveAttribute('aria-pressed', 'true');
});

test('location unlocks and settings persist across a page reload', async ({ page }) => {
  await loadGame(page);
  await page.evaluate(() => (window as TestWindow).__DILLI_TEST__.grantCoins(100));
  await chooseLocation(page);
  await page.getByTestId('location-india').click();
  await page.getByTestId('confirm-purchase').click();
  await expect(page.getByTestId('location-india')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Dilli Protest Run home', exact: true }).click();
  await page.getByTestId('settings').click();
  await page.getByLabel('Master sound', { exact: true }).uncheck();
  await page.getByLabel('Reduced motion', { exact: true }).check();
  await page.getByLabel('Graphics quality', { exact: true }).selectOption('low');
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.reload();
  await expect(page.getByTestId('wallet')).toHaveText('20');
  await chooseLocation(page);
  await expect(page.getByTestId('location-india')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Dilli Protest Run home', exact: true }).click();
  await page.getByTestId('settings').click();
  await expect(page.getByLabel('Master sound', { exact: true })).not.toBeChecked();
  await expect(page.getByLabel('Reduced motion', { exact: true })).toBeChecked();
  await expect(page.getByLabel('Graphics quality', { exact: true })).toHaveValue('low');
});

test('malformed storage recovers and reset requires confirmation', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dilli-protest-run.save', '{broken'));
  await loadGame(page);
  await expect(page.locator('.toast[role="status"]')).toContainText('safe defaults');
  await page.evaluate(() => (window as TestWindow).__DILLI_TEST__.grantCoins(75));
  await page.getByTestId('settings').click();
  await page.getByRole('button', { name: 'Reset local progress', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('A fresh start?');
  await expect(page.getByTestId('wallet')).toHaveText('75');
  await page.getByRole('button', { name: 'Keep my progress', exact: true }).click();
  await expect(page.getByTestId('wallet')).toHaveText('75');
  await page.getByTestId('settings').click();
  await page.getByRole('button', { name: 'Reset local progress', exact: true }).click();
  await page.getByRole('button', { name: 'YES, RESET MY PROGRESS', exact: true }).click();
  await expect(page.getByTestId('wallet')).toHaveText('0');
});
