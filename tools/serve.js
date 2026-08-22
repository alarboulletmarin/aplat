/* Petit serveur statique, uniquement pour les vérifications locales. */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json'
};

function serve(port) {
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
      res.writeHead(404); res.end('not found'); return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    fs.createReadStream(f).pipe(res);
  }).listen(port);
}

module.exports = { serve, ROOT };
if (require.main === module) { serve(8099); console.log('http://127.0.0.1:8099'); }
