/* Comparaison chiffrée maquette / portage : pour une série de repères
   identifiés par leur texte, on relève géométrie et style calculé des deux
   côtés et on liste les écarts. Hors livraison. */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { launch } = require('./pw');
const { ouvrir } = require('./serveur');

const REF = process.env.REF_DIR ||
  '/tmp/claude-0/-home-user-aplat/8f5dcbc4-f656-52ad-aa59-e5dc203b1088/scratchpad/refsite';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2', '.txt': 'text/plain', '.md': 'text/plain' };

const PROBES = [
  'Aplat',
  'Famille de motif', 'Abstraits', 'Figures', 'Palette', 'Densité', 'Résolution de l’image',
  'Vagues', 'Blobs', 'Lime & crème', 'Soleil', 'Calme', 'Moyen', 'Dense',
  'Copier le lien du motif', 'Langue', 'Thème', 'Partage et réglages',
  'Français', 'English', 'Clair', 'Sombre', 'Système',
  'Nouveau motif', 'Télécharger'
];

const COLLECT = (probes) => {
  const up = s => s.trim().replace(/\s+/g, ' ').toLowerCase();
  const all = [...document.querySelectorAll('*')];
  const out = {};
  for (const p of probes) {
    const want = up(p);
    // le noeud le plus profond dont le texte correspond exactement
    const hits = all.filter(n => up(n.textContent) === want && n.offsetParent !== null);
    const n = hits[hits.length - 1];
    if (!n) { out[p] = null; continue; }
    // pour les boutons, on remonte au bouton porteur
    const box = n.closest('button, h1, h2, h3, p, label') || n;
    const r = box.getBoundingClientRect();
    const cs = getComputedStyle(box);
    const bs = getComputedStyle(box);
    const own = getComputedStyle(n);
    out[p] = {
      x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
      fs: cs.fontSize, fw: cs.fontWeight, ls: cs.letterSpacing, lh: cs.lineHeight,
      tt: cs.textTransform, ff: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
      color: own.color,
      br: bs.borderTopLeftRadius, bw: bs.borderTopWidth,
      pad: bs.paddingTop + ' ' + bs.paddingRight + ' ' + bs.paddingBottom + ' ' + bs.paddingLeft,
      bg: bs.backgroundColor
    };
  }
  // quelques repères structurels
  const dev = document.querySelector('[style*="border-radius"][style*="overflow:hidden"], #appareil') ||
              [...document.querySelectorAll('div')].find(d => getComputedStyle(d).overflow === 'hidden' && parseFloat(getComputedStyle(d).borderTopWidth) >= 4);
  if (dev) {
    const r = dev.getBoundingClientRect();
    const cs = getComputedStyle(dev);
    out['~appareil'] = { w: Math.round(r.width), h: Math.round(r.height), br: cs.borderTopLeftRadius, bw: cs.borderTopWidth, mu: cs.getPropertyValue('--mu').trim(), cols: cs.getPropertyValue('--cols').trim() };
  }
  const cards = [...document.querySelectorAll('div')].filter(d => {
    const cs = getComputedStyle(d);
    return cs.borderTopLeftRadius === '26px' && parseFloat(cs.paddingTop) === 16;
  });
  out['~cartes 26px'] = { n: cards.length, w: cards[0] ? Math.round(cards[0].getBoundingClientRect().width) : 0 };
  return out;
};

if (!require('fs').existsSync(REF)) {
  console.log('maquette de référence absente : passe REF_DIR vers un dossier contenant');
  console.log('Aplat.dc.html, support.js et vendor/{react,react-dom,babel}.min.js.');
  console.log('Voir tools/README.md. Vérification ignorée.');
  process.exit(0);
}

(async () => {
  const refSrv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/Aplat.dc.html';
    const f = path.join(REF, p);
    if (!f.startsWith(REF) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  }).listen(0);
  const refPort = refSrv.address().port;
  const { srv, port } = await ouvrir();

  const browser = await launch();
  const VIEW = { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, colorScheme: 'light', locale: 'fr-FR' };

  async function grab(url, wait) {
    const ctx = await browser.newContext(VIEW);
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(wait);
    const r = await page.evaluate(COLLECT, PROBES);
    await ctx.close();
    return r;
  }

  const ref = await grab(`http://127.0.0.1:${refPort}/`, 6000);
  const mine = await grab(`http://127.0.0.1:${port}/?l=fr`, 1200);

  const keys = [...new Set([...Object.keys(ref), ...Object.keys(mine)])];
  let diffs = 0, same = 0;
  const TOL = { w: 2, h: 2, x: 1, y: 1 };
  for (const k of keys) {
    const a = ref[k], b = mine[k];
    if (!a && !b) { console.log(`  ?  ${k} : absent des deux côtés`); continue; }
    if (!a) { console.log(`  +  ${k} : présent seulement dans le portage`); continue; }
    if (!b) { console.log(`  -  ${k} : présent seulement dans la maquette`); diffs++; continue; }
    const bad = [];
    for (const f of Object.keys(a)) {
      const av = a[f], bv = b[f];
      if (typeof av === 'number' && typeof bv === 'number') {
        if (Math.abs(av - bv) > (TOL[f] || 1)) bad.push(`${f}: ${av} vs ${bv}`);
      } else if (String(av) !== String(bv)) bad.push(`${f}: ${av} vs ${bv}`);
    }
    if (bad.length) { diffs++; console.log(`  !  ${k}\n       ${bad.join('\n       ')}`); }
    else same++;
  }
  console.log(`\n${same} repères identiques · ${diffs} avec écart`);
  await browser.close(); srv.close(); refSrv.close();
})();
