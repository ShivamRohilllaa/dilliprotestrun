import { defineConfig, loadEnv } from 'vite';
import { seoPlugin } from './build/seo';

export default defineConfig(({ mode }) => {
  // Hosting-provider variables take precedence over local .env files.
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env };
  const proxy = {
    '/api/presence': { target: process.env.PRESENCE_PROXY_TARGET || 'http://127.0.0.1:3001' },
  };
  return {
    server: { proxy },
    preview: { proxy },
    base: env.VITE_BASE_PATH || './',
    plugins: [seoPlugin(env.VITE_SITE_URL || 'https://example.com/')],
    build: { chunkSizeWarningLimit: 650 },
  };
});
