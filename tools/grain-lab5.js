/* Taille de tuile pour le mouchetis : combien coûte une texture moins répétitive. */
const fs = require('fs');
const path = require('path');
const { launch } = require('./pw');
const { start } = require('./serve');
let PORT = 0;
const OUT = path.resolve(__dirname, '../.exports');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { srv, port } = start(); PORT = port;
  const browser = await launch();
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/?l=fr`, { waitUntil: 'networkidle' });

  const { rows, crops } = await page.evaluate(async () => {
    const E = window.APLAT_ENGINE;
    const W = 1179, H = 2556;
    const blobOf = c => new Promise(r => c.toBlob(r, 'image/png'));

    function tile(size, A) {
      const n = document.createElement('canvas'); n.width = n.height = size;
      const c = n.getContext('2d');
      const img = c.createImageData(size, size), d = img.data;
      const r = E.rng(0x41504C41);
      for (let i = 0; i < d.length; i += 4) {
        const k = Math.floor(r() * 3);
        if (k === 0) { d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = A; }
        else if (k === 1) { d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = A; }
        else { d[i + 3] = 0; }
      }
      c.putImageData(img, 0, 0); return n;
    }

    function render(fam, pal, dens, g) {
      const P = E.PALETTES[pal];
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const ctx = c.getContext('2d', { alpha: false });
      const m = E.measure(fam, pal, dens, 7314, W, H);
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      E._shapes(ctx, W, H, fam, P.cols, dens, E.rng(E._drawSeed(fam, dens, 7314)), Math.min(W, H));
      E._applyVeil(ctx, W, H, m);
      if (g) {
        const pat = ctx.createPattern(tile(g.tile, g.A), 'repeat');
        ctx.save(); ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H); ctx.restore();
      }
      return c;
    }

    const cases = [['vagues', 'lime', 1], ['trame', 'nuit', 1], ['ondes', 'ciel', 1], ['terrazzo', 'corail', 2], ['tournesol', 'lime', 1]];
    const variants = [{ id: 'sans grain', g: null }];
    for (const tile2 of [8, 12, 16, 24, 32, 64]) for (const A of [2, 3]) variants.push({ id: `tuile ${tile2} · A=${A}`, g: { tile: tile2, A } });

    const rows = [], crops = {};
    for (const v of variants) {
      let total = 0;
      for (const [fam, pal, dens] of cases) {
        const c = render(fam, pal, dens, v.g);
        total += (await blobOf(c)).size;
        c.width = 1; c.height = 1;
      }
      rows.push({ id: v.id, ko: Math.round(total / cases.length / 1024) });
      if (v.g && v.g.A === 3 && [8, 16, 32].includes(v.g.tile)) {
        const c = render('ondes', 'encre', 1, v.g);
        const o = document.createElement('canvas'); o.width = 600; o.height = 600;
        const oc = o.getContext('2d'); oc.imageSmoothingEnabled = false;
        oc.drawImage(c, 300, 1300, 150, 150, 0, 0, 600, 600);
        crops['t' + v.g.tile] = o.toDataURL('image/png');
        c.width = 1; c.height = 1;
      }
    }
    return { rows, crops };
  });

  for (const [k, uri] of Object.entries(crops)) {
    fs.writeFileSync(path.join(OUT, 'sp_' + k + '.png'), Buffer.from(uri.split(',')[1], 'base64'));
  }
  console.log('variante        | poids moyen');
  for (const r of rows) console.log(`${r.id.padEnd(16)}|${String(r.ko).padStart(6)} Ko`);
  await browser.close();
  srv.close();
})();
