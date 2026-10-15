import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { build } from 'vite';
import { seoPlugin } from '../../build/seo';

let fixture: string;
beforeAll(() => {
  fixture = realpathSync(mkdtempSync(join(tmpdir(), 'game-seo-')));
  writeFileSync(
    join(fixture, 'index.html'),
    '<!doctype html><html><head></head><body></body></html>',
  );
});
afterAll(() => rmSync(fixture, { recursive: true, force: true }));

test('subpath deployments share one normalized URL across metadata and sitemap', async () => {
  const result = await build({
    root: fixture,
    publicDir: join(process.cwd(), 'public'),
    configFile: false,
    logLevel: 'silent',
    plugins: [seoPlugin('https://example.com/games/dilli')],
    build: { write: false },
  });
  const outputs = Array.isArray(result) ? result : 'output' in result ? [result] : [];
  const assets = new Map(
    outputs.flatMap((output) =>
      output.output.flatMap((file) =>
        file.type === 'asset' ? [[file.fileName, String(file.source)]] : [],
      ),
    ),
  );
  expect(assets.get('index.html')).toContain('href="https://example.com/games/dilli/"');
  expect(assets.get('index.html')).toContain('https://example.com/games/dilli/social-preview.png');
  expect(assets.get('index.html')).toContain('"url":"https://example.com/games/dilli/"');
  expect(assets.get('sitemap.xml')).toContain('<loc>https://example.com/games/dilli/</loc>');
  for (const page of ['privacy.html', 'terms.html', 'faq.html']) {
    const url = `https://example.com/games/dilli/${page}`;
    expect(assets.get('sitemap.xml')).toContain(`<loc>${url}</loc>`);
    expect(assets.get(page)).toContain(`rel="canonical" href="${url}"`);
    expect(assets.get(page)).not.toContain(`rel="canonical" href="https://example.com/${page}"`);
  }
  expect(assets.get('robots.txt')).toContain(
    'Sitemap: https://example.com/games/dilli/sitemap.xml',
  );
});

test.each([
  'javascript:alert(1)',
  'https://user:password@example.com/',
  'https://example.com/?campaign=1',
  'https://example.com/#play',
])('rejects unsafe or noncanonical deployment URL: %s', (url) => {
  expect(() => seoPlugin(url)).toThrow('VITE_SITE_URL');
});
