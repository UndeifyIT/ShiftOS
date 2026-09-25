// Serves the design handoff so its `.dc.html` prototypes render in a browser.
//   node tools/handoff-preview/server.mjs            → http://localhost:5192
//   http://localhost:5192/ShiftOS%20Dashboards.dc.html?role=Manager&page=Reports
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const handoffDir = join(here, '../../Local file check/design_handoff_shiftos');
const require = createRequire(join(here, '../../apps/web/package.json'));
const pkgDir = (name) => dirname(require.resolve(`${name}/package.json`));
const vendor = {
  '/__vendor/react.js': join(pkgDir('react'), 'umd/react.development.js'),
  '/__vendor/react-dom.js': join(pkgDir('react-dom'), 'umd/react-dom.development.js'),
  '/support.js': join(here, 'support.js')
};
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.css': 'text/css', '.svg': 'image/svg+xml' };
const port = Number(process.env.PORT ?? 5192);

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = vendor[path] ?? join(handoffDir, normalize(path).replace(/^([/\\])+/, ''));
  if (!file.startsWith(handoffDir) && !Object.values(vendor).includes(file)) return res.writeHead(403).end();
  if (!existsSync(file) || statSync(file).isDirectory()) return res.writeHead(404).end('not found');
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`handoff preview on http://localhost:${port}`));
