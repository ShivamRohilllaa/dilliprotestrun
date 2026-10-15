import type { HtmlTagDescriptor, Plugin } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const informationPages = ['privacy.html', 'terms.html', 'faq.html'];

const title = 'Dilli Protest Run — Free Online 3D Runner Game';
const description =
  'Play Dilli Protest Run, a free Delhi-inspired 3D runner game. Dodge obstacles, collect chai tokens and race 1,000 metres. Play on mobile or desktop, no download.';

function escapeXml(value: string): string {
  return value.replace(
    /[<>&"']/g,
    (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]!,
  );
}

/** Generate crawlable metadata at build time, including for crawlers without WebGL. */
export function seoPlugin(siteUrl: string): Plugin {
  let publicDir: string;
  const url = new URL(siteUrl);
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      'VITE_SITE_URL must be a public HTTP(S) URL without credentials, query or hash.',
    );
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  const canonical = url.href;
  const image = new URL('social-preview.png', url).href;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: 'Dilli Protest Run',
    description,
    url: canonical,
    image,
    genre: ['Arcade', 'Runner'],
    gamePlatform: 'Web browser',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any platform with a WebGL 2-capable browser',
    playMode: 'https://schema.org/SinglePlayer',
    isAccessibleForFree: true,
    inLanguage: 'en',
  };
  return {
    name: 'game-seo',
    apply: 'build',
    configResolved(config) {
      publicDir = config.publicDir;
    },
    transformIndexHtml() {
      const tags: HtmlTagDescriptor[] = [
        { tag: 'link', attrs: { rel: 'canonical', href: canonical }, injectTo: 'head' },
        ...Object.entries({
          'og:type': 'website',
          'og:site_name': 'Dilli Protest Run',
          'og:title': title,
          'og:description': description,
          'og:url': canonical,
          'og:locale': 'en_IN',
          'og:image': image,
          'og:image:type': 'image/png',
          'og:image:width': '1200',
          'og:image:height': '630',
          'og:image:alt': 'Dilli Protest Run game menu overlooking a fictional Delhi street',
        }).map(([property, content]) => ({
          tag: 'meta',
          attrs: { property, content },
          injectTo: 'head' as const,
        })),
        ...Object.entries({
          'twitter:card': 'summary_large_image',
          'twitter:title': title,
          'twitter:description': description,
          'twitter:image': image,
          'twitter:image:alt': 'Dilli Protest Run game menu overlooking a fictional Delhi street',
        }).map(([name, content]) => ({
          tag: 'meta',
          attrs: { name, content },
          injectTo: 'head' as const,
        })),
        {
          tag: 'script',
          attrs: { type: 'application/ld+json' },
          children: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
          injectTo: 'head',
        },
      ];
      return tags;
    },
    generateBundle() {
      // Public pages stay readable in development; production uses the configured canonical host.
      for (const fileName of informationPages) {
        const source = readFileSync(resolve(publicDir, fileName), 'utf8');
        this.emitFile({
          type: 'asset',
          fileName,
          source: source.replace(
            /(<link rel="canonical" href=")[^"]+("\s*\/>)/,
            (_, start, end) => `${start}${escapeXml(new URL(fileName, url).href)}${end}`,
          ),
        });
      }
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap.xml', url).href}\n`,
      });
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['', ...informationPages].map((path) => `  <url><loc>${escapeXml(new URL(path, url).href)}</loc></url>`).join('\n')}\n</urlset>\n`,
      });
    },
  };
}
