import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/release',
  workers: 1,
  timeout: 45_000,
  use: {
    baseURL: 'http://127.0.0.1:4175/dilli-protest-run/',
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    headless: true,
    viewport: { width: 1280, height: 800 },
    launchOptions: {
      args: [
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
      ],
    },
  },
  webServer: [
    {
      command: 'node server/presence.mjs',
      url: 'http://127.0.0.1:4180/api/presence',
      env: { PRESENCE_PORT: '4180', PRESENCE_ORIGIN: 'http://127.0.0.1:4175' },
      reuseExistingServer: false,
    },
    {
      command: 'npm run preview -- --port 4175 --strictPort --base /dilli-protest-run/',
      url: 'http://127.0.0.1:4175/dilli-protest-run/',
      reuseExistingServer: false,
      env: { PRESENCE_PROXY_TARGET: 'http://127.0.0.1:4180' },
    },
  ],
});
