/* Comparaison pixel à pixel maquette / portage, mêmes polices, même cadrage,
   même graine. Produit une carte des écarts et un pourcentage. Hors livraison. */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { launch } = require('./pw');
const { start } = require('./serve');

const REF = process.env.REF_DIR ||
  '/tmp/claude-0/-home-user-aplat/8f5dcbc4-f656-52ad-aa59-e5dc203b1088/scratchpad/refsite';
const OUT = path.resolve(__dirname, '../.shots');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2' };

if (!require('fs').existsSync(REF)) {
  console.log('maquette de référence absente : passe REF_DIR vers un dossier contenant');
  console.log('Aplat.dc.html, support.js et vendor/{react,react-dom,babel}.min.js.');
  console.log('Voir tools/README.md. Vérification ignorée.');
  process.exit(0);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const refSrv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/Aplat.dc.html';
    const f = path.join(REF, p);
    if (!f.startsWith(REF) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  }).listen(0);
  const refPort = refSrv.address().port;
  const { srv, port } = start();
  const browser = await launch();

  const W = 1280, H = 900;
  const VIEW = { viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: 'light', locale: 'fr-FR' };

  async function shot(url, wait, file) {
    const ctx = await browser.newContext(VIEW);
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(wait);
    // fige l'heure de la maquette : elle change entre deux captures
    await page.evaluate(() => {
      for (const n of document.querySelectorAll('*')) {
        if (n.children.length === 0 && /^\d{2}:\d{2}$/.test(n.textContent.trim())) n.textContent = '00:00';
      }
    });
    await page.waitForTimeout(100);
    const buf = await page.screenshot({ path: path.join(OUT, file) });
    await ctx.close();
    return buf;
  }

  await shot(`http://127.0.0.1:${refPort}/`, 6000, 'px-ref.png');
  await shot(`http://127.0.0.1:${port}/?l=fr`, 1500, 'px-mine.png');

  // diff dans une page vierge
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  const page = await ctx.newPage();
  const a = fs.readFileSync(path.join(OUT, 'px-ref.png')).toString('base64');
  const b = fs.readFileSync(path.join(OUT, 'px-mine.png')).toString('base64');
  const res = await page.evaluate(async ({ a, b, W, H }) => {
    const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
    const ia = await load('data:image/png;base64,' + a);
    const ib = await load('data:image/png;base64,' + b);
    const mk = img => { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(img, 0, 0); return c.getContext('2d').getImageData(0, 0, W, H).data; };
    const da = mk(ia), db = mk(ib);
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const oc = out.getContext('2d');
    const od = oc.createImageData(W, H);
    let diff = 0, strong = 0;
    const rows = new Int32Array(H);
    for (let i = 0; i < da.length; i += 4) {
      const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
      const y = Math.floor((i / 4) / W);
      if (d > 8) { diff++; rows[y]++; }
      if (d > 40) strong++;
      const v = Math.min(255, d * 4);
      od.data[i] = 255 - v; od.data[i + 1] = 255 - v; od.data[i + 2] = 255 - v; od.data[i + 3] = 255;
    }
    oc.putImageData(od, 0, 0);
    // bandes de lignes les plus divergentes
    const bands = [];
    for (let y = 0; y < H; y += 25) {
      let s = 0; for (let k = y; k < Math.min(H, y + 25); k++) s += rows[k];
      if (s > W * 25 * 0.02) bands.push({ y, pct: +(s / (W * 25) * 100).toFixed(1) });
    }
    return { total: W * H, diff, strong, url: out.toDataURL('image/png'), bands: bands.slice(0, 20) };
  }, { a, b, W, H });

  fs.writeFileSync(path.join(OUT, 'px-diff.png'), Buffer.from(res.url.split(',')[1], 'base64'));
  console.log(`pixels comparés : ${res.total}`);
  console.log(`écart > 8/255  : ${res.diff} (${(res.diff / res.total * 100).toFixed(2)} %)`);
  console.log(`écart > 40/255 : ${res.strong} (${(res.strong / res.total * 100).toFixed(2)} %)`);
  console.log('bandes divergentes (y, %) : ' + (res.bands.map(b => `${b.y}:${b.pct}`).join(' ') || 'aucune'));

  await browser.close(); srv.close(); refSrv.close();
})();
