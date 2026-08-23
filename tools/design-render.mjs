/* Rend la maquette d'origine (React + Babel servis en local) pour la comparer
   au portage, au même cadrage. Hors livraison. */
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { launch } from './pw.mjs'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

/* Le dossier de ce fichier : `__dirname` n'existe pas dans un module ES. */
const ICI = fileURLToPath(new URL('.', import.meta.url))

const REF = process.env.REF_DIR ||
  '/tmp/claude-0/-home-user-aplat/8f5dcbc4-f656-52ad-aa59-e5dc203b1088/scratchpad/refsite';
const OUT = path.resolve(ICI, '../.shots');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

if (!existsSync(REF)) {
  console.log('maquette de référence absente : passe REF_DIR vers un dossier contenant');
  console.log('Aplat.dc.html, support.js et vendor/{react,react-dom,babel}.min.js.');
  console.log('Voir tools/README.md. Vérification ignorée.');
  process.exit(0);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/Aplat.dc.html';
    const f = path.join(REF, p);
    if (!f.startsWith(REF) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  }).listen(0);
  const PORT = srv.address().port;

  const browser = await launch();
  for (const [name, w, h, q] of [
    ['ref-desk', 1280, 900, ''],
    ['ref-phone', 390, 844, ''],
    ['ref-phone-dark', 390, 844, '']
  ]) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: h }, deviceScaleFactor: 2,
      colorScheme: name.includes('dark') ? 'dark' : 'light', locale: 'fr-FR'
    });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message.slice(0, 120)));
    await page.goto(`http://127.0.0.1:${PORT}/${q}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    const txt = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 70));
    await page.screenshot({ path: path.join(OUT, name + '.png') });
    console.log(name, '| erreurs:', errs.slice(0, 2).join(' | ') || 'aucune', '|', JSON.stringify(txt));
    await ctx.close();
  }
  await browser.close();
  srv.close();
})();
