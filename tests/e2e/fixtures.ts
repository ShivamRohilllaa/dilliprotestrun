import { test as base, expect, type Page } from '@playwright/test';

export interface GameSnapshot {
  state: string;
  lane: number;
  x: number;
  y: number;
  sliding: boolean;
  distance: number;
  coins: number;
  score: number;
  pressure: number;
  pursuer: string;
  speed: number;
  crowdCount: number;
  chaserCount: number;
  reinforcements: boolean;
  crowdStyle: string | null;
  objects: number;
  geometryCount: number;
  drawCalls: number;
}

export interface TestHooks {
  snapshot(): GameSnapshot;
  advance(seconds: number): void;
  crash(): void;
  grantCoins(amount: number): void;
  unlockAll(): void;
  manual(enabled: boolean): void;
}

export type TestWindow = Window & { __DILLI_TEST__: TestHooks };

// Every test fails on uncaught browser errors, including errors after its final assertion.
export const test = base.extend({
  page: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await use(page);
    expect(errors, 'Uncaught browser errors').toEqual([]);
  },
});
export { expect };

export async function loadGame(page: Page): Promise<void> {
  await page.goto('/?seed=20261014');
  await expect(page.getByTestId('main-menu')).toBeVisible();
  await page.waitForFunction(() => Boolean((window as TestWindow).__DILLI_TEST__));
  await page.evaluate(() => (window as TestWindow).__DILLI_TEST__.manual(true));
  await page.waitForFunction(() => (window as TestWindow).__DILLI_TEST__.snapshot().drawCalls > 0);
}

export function snapshot(page: Page): Promise<GameSnapshot> {
  return page.evaluate(() => (window as TestWindow).__DILLI_TEST__.snapshot());
}

export async function advance(page: Page, seconds: number): Promise<void> {
  await page.evaluate(
    (duration) => (window as TestWindow).__DILLI_TEST__.advance(duration),
    seconds,
  );
}

/** Navigate from the home screen, keeping each setup step explicit. */
export async function chooseLocation(page: Page): Promise<void> {
  await page.getByTestId('play').click();
  await expect(page.getByTestId('avatar-select')).toBeVisible();
  await page.getByTestId('choose-location').click();
  await expect(page.getByTestId('location-select')).toBeVisible();
}

export async function choosePursuer(page: Page): Promise<void> {
  await chooseLocation(page);
  await page.getByTestId('choose-issue').click();
  await expect(page.getByTestId('issue-select')).toBeVisible();
  await page.getByTestId('choose-pursuer').click();
  await expect(page.getByTestId('pursuer-select')).toBeVisible();
}

export async function startRun(page: Page): Promise<void> {
  await choosePursuer(page);
  await page.getByTestId('start').click();
  await expect(page.getByTestId('protest-intro')).toBeVisible();
  await page.getByTestId('skip-intro').click();
  await advance(page, 0.4);
  await expect(page.getByTestId('game-hud')).toBeVisible();
  expect((await snapshot(page)).state).toBe('PLAYING');
}

export async function settleView(page: Page): Promise<void> {
  // Let the real rendered camera finish its transition while manual simulation stays fixed.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let frames = 45;
        const frame = () => {
          frames -= 1;
          if (frames === 0) resolve();
          else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
  );
}

export async function assertNoOverflow(page: Page): Promise<void> {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}

/** Actual Chromium touch input exercises the browser's pointer-event conversion. */
export async function swipe(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
): Promise<void> {
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ ...from, id: 1 }],
    });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ ...to, id: 1 }],
    });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally {
    await session.detach();
  }
}
