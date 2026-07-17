import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const toAbsolute = (p) => path.resolve(__dirname, '..', p)

const template = fs.readFileSync(toAbsolute('dist/static/index.html'), 'utf-8')
const serverAssetsDir = toAbsolute('dist/server/assets')
const entryFile = fs.readdirSync(serverAssetsDir).find(f => f.startsWith('entry-server') && f.endsWith('.js'))
const { render } = await import(`file://${path.join(serverAssetsDir, entryFile)}`)

const routesToPrerender = fs
  .readFileSync(toAbsolute('src/App.tsx'), 'utf-8')
  .match(/<Route path="([^"]+)"/g)
  .map(match => match.match(/path="([^"]+)"/)[1])

// Absolute routes list
const absoluteRoutes = Array.from(new Set([
  '/',
  '/about',
  '/services',
  '/destinations',
  '/wedding-stories',
  '/gallery',
  '/testimonials',
  '/contact'
]))

const BASE_URL = 'https://alankaran.com';

(async () => {
  let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const url of absoluteRoutes) {
    const context = {}
    const { html: appHtml, head } = await render(url)

    const html = template
      .replace(`<!--app-head-->`, head ?? '')
      .replace(`<!--app-html-->`, appHtml)

    const filePath = `dist/static${url === '/' ? '/index' : url}.html`
    const absoluteFilePath = toAbsolute(filePath)
    
    // Create directory if it doesn't exist (e.g. for /about -> dist/static/about)
    const dir = path.dirname(absoluteFilePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(absoluteFilePath, html)
    console.log('pre-rendered:', filePath)

    const priority = url === '/' ? '1.0' : '0.8';
    sitemapContent += `  <url>
    <loc>${BASE_URL}${url}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>\n`;
  }

  sitemapContent += `</urlset>`;
  fs.writeFileSync(toAbsolute('dist/static/sitemap.xml'), sitemapContent);
  console.log('generated: dist/static/sitemap.xml');

  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml
`;
  fs.writeFileSync(toAbsolute('dist/static/robots.txt'), robotsTxt);
  console.log('generated: dist/static/robots.txt');

  // Clean up the server build directory to ensure exactly one output directory for Vercel
  fs.rmSync(toAbsolute('dist/server'), { recursive: true, force: true });
  console.log('cleaned up: dist/server');
})();
