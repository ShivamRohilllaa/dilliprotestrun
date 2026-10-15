import { test, expect } from '@playwright/test';

test('production loads from a subpath, excludes cheats, and runs after network loss', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  const failures: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(response.url());
  });
  await page.goto('./');
  await expect(page.getByTestId('main-menu')).toBeVisible();
  await expect(page.getByTestId('game-canvas')).toBeVisible();
  expect(await page.evaluate(() => typeof window.__DILLI_TEST__)).toBe('undefined');
  await page.getByTestId('play').click();
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
    expect(new URL(source).pathname).toMatch(/^\/dilli-protest-run\/assets\/[^/]+\.webp$/);
  }
  expect(failures).toEqual([]);
  await page.getByRole('button', { name: 'Dilli Protest Run home', exact: true }).click();
  await context.setOffline(true);
  await page.getByTestId('play').click();
  await expect(page.getByTestId('avatar-select')).toBeVisible();
  await page.getByTestId('choose-location').click();
  await page.getByTestId('choose-issue').click();
  await page.getByTestId('choose-pursuer').click();
  await page.getByTestId('start').click();
  await page.getByTestId('skip-intro').click();
  await expect(page.getByTestId('game-hud')).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Space');
  await expect(page.getByTestId('distance')).not.toHaveText('0m');
  await page.keyboard.press('p');
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  const distance = await page.getByTestId('distance').innerText();
  await page.waitForTimeout(200);
  expect(await page.getByTestId('distance').innerText()).toBe(distance);
  await page.getByTestId('resume').click();
  await expect(page.getByTestId('pause-menu')).toHaveCount(0);
  expect(errors).toEqual([]);
  await context.setOffline(false);
});

test('WebGL-disabled browsers get a friendly recovery screen', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof original>
    ) {
      if (String(args[0]).startsWith('webgl')) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await page.goto('./');
  await expect(
    page.getByRole('heading', { name: 'Your browser could not start the 3D game.' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'TRY AGAIN' })).toBeVisible();
  await expect(page.getByTestId('startup-error')).toContainText('Settings → System');
  await expect(
    page.getByRole('heading', { name: 'Play Dilli Protest Run: a free Delhi runner game' }),
  ).toBeVisible();
  await context.close();
});

test('Chrome can recover when multisampling is unavailable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof original>
    ) {
      if (String(args[0]) === 'webgl2') {
        const options = args[1] as WebGLContextAttributes | undefined;
        if (options?.antialias || options?.powerPreference === 'high-performance') return null;
      }
      return original.apply(this, args);
    } as typeof original;
  });
  await page.goto('./');
  await expect(page.getByTestId('main-menu')).toBeVisible();
  const attributes = await page
    .getByTestId('game-canvas')
    .evaluate((canvas) =>
      (canvas as HTMLCanvasElement).getContext('webgl2')!.getContextAttributes(),
    );
  expect(attributes?.antialias).toBe(false);
  expect(attributes?.powerPreference).toBe('default');
  await page.getByTestId('play').click();
  await page.getByTestId('choose-location').click();
  await page.getByTestId('choose-issue').click();
  await page.getByTestId('choose-pursuer').click();
  await page.getByTestId('start').click();
  await page.getByTestId('skip-intro').click();
  await expect(page.getByTestId('distance')).not.toHaveText('0m');
  expect(errors).toEqual([]);
});

test('other startup errors are not labelled as missing WebGL', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.matchMedia;
    window.matchMedia = function (query) {
      if (query === '(prefers-reduced-motion: reduce)')
        throw new Error('Simulated startup failure');
      return original.call(window, query);
    };
  });
  await page.goto('./');
  await expect(
    page.getByRole('heading', { name: 'The game could not start.', exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('startup-error')).not.toContainText('needs WebGL');
  await expect(page.getByRole('button', { name: 'TRY LOW GRAPHICS' })).toBeVisible();
  await expect(page.getByTestId('game-canvas')).toHaveCount(0);
});

test('low graphics link starts with a lighter renderer', async ({ page }) => {
  await page.goto('./?graphics=low');
  await expect(page.getByTestId('main-menu')).toBeVisible();
  const antialias = await page
    .getByTestId('game-canvas')
    .evaluate(
      (canvas) =>
        (canvas as HTMLCanvasElement).getContext('webgl2')!.getContextAttributes()!.antialias,
    );
  expect(antialias).toBe(false);
});

test('search metadata and game guide work without JavaScript or WebGL', async ({
  browser,
  request,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('./');
  await expect(page).toHaveTitle('Dilli Protest Run — Free Online 3D Runner Game');
  await expect(page.getByRole('heading', { name: 'Dilli Protest Run', exact: true })).toBeVisible();
  await expect(page.getByText('Enable JavaScript to play.', { exact: false })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://example.com/',
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://example.com/social-preview.png',
  );
  const data = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) || '{}',
  );
  expect(data['@type']).toBe('VideoGame');
  expect(data.url).toBe('https://example.com/');
  expect((await request.get('./robots.txt')).status()).toBe(200);
  expect(await (await request.get('./sitemap.xml')).text()).toContain(
    '<loc>https://example.com/</loc>',
  );
  const preview = await request.get('./social-preview.png');
  expect(preview.status()).toBe(200);
  expect(preview.headers()['content-type']).toContain('image/png');
  await context.close();
});

test('graphics-context loss freezes the run until recovery', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('play').click();
  await page.getByTestId('choose-location').click();
  await page.getByTestId('choose-issue').click();
  await page.getByTestId('choose-pursuer').click();
  await page.getByTestId('start').click();
  await page.getByTestId('skip-intro').click();
  await expect(page.getByTestId('game-hud')).toBeVisible();
  const contextExtension = await page.evaluateHandle(() => {
    const gl = document.querySelector('canvas')!.getContext('webgl2')!;
    const extension = gl.getExtension('WEBGL_lose_context');
    if (!extension) throw new Error('Chromium does not expose the context-loss test extension');
    extension.loseContext();
    return extension;
  });
  await expect(page.getByRole('heading', { name: 'The graphics took a break.' })).toBeVisible();
  const distance = await page.getByTestId('distance').innerText();
  await page.waitForTimeout(250);
  expect(await page.getByTestId('distance').innerText()).toBe(distance);
  await contextExtension.evaluate((extension) => extension.restoreContext());
  await contextExtension.dispose();
  await expect(page.getByRole('heading', { name: 'The graphics took a break.' })).toHaveCount(0);
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  await page.getByTestId('resume').click();
  await expect(page.getByTestId('distance')).not.toHaveText(distance);
});

test('sitemap pages and navigation work without JavaScript on mobile', async ({
  browser,
  request,
}, testInfo) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const sitemap = await request.get('./sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  const xml = await sitemap.text();
  const pages = [
    ['privacy.html', 'Privacy Policy'],
    ['terms.html', 'Terms & Conditions'],
    ['faq.html', 'Frequently Asked Questions'],
  ];
  await page.goto('./');
  for (const [file, heading] of pages) {
    expect(xml).toContain(`<loc>https://example.com/${file}</loc>`);
    await page.locator(`.site-links a[href$="${file}"]`).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://example.com/${file}`,
    );
    await expect(page.locator('nav a[aria-current="page"]')).toHaveCount(1);
    expect(await page.locator('a[href="mailto:contact@example.com"]').count()).toBeGreaterThan(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect(await page.locator('body').evaluate((body) => getComputedStyle(body).maxWidth)).toBe(
      '760px',
    );
    await page.screenshot({ path: testInfo.outputPath(`${file}.png`), fullPage: true });
    await page.getByRole('link', { name: '← Play the game', exact: true }).click();
    await expect(page.locator('.site-links')).toBeVisible();
  }
  expect((xml.match(/<loc>/g) || []).length).toBe(4);
  await context.close();
});
