/* Deuxième passe : cellule anisotrope, moins de niveaux, opacité plus basse.
   On cherche le grain le plus léger qui reste du papier et non du bloc. */
const fs = require('fs');
const path = require('path');
const { launch } = require('./pw');
const { serve } = require('./serve');
const PORT = 8099;
const OUT = path.resolve(__dirname, '../.exports');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = serve(PORT);
  const browser = await launch();
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/?l=fr`, { waitUntil: 'networkidle' });

  const { rows, crops } = await page.evaluate(async () => {
    const E = window.APLAT_ENGINE;
    const W = 1179, H = 2556;
    const blobOf = c => new Promise(r => c.toBlob(r, 'image/png'));

    function tileOf(size, levels, span) {
      const n = document.createElement('canvas'); n.width = n.height = size;
      const c = n.getContext('2d');
      const img = c.createImageData(size, size), d = img.data;
      const r = E.rng(0x41504C41);
      const step = levels > 1 ? span / (levels - 1) : 0;
      for (let i = 0; i < d.length; i += 4) {
        const v = 150 - span / 2 + Math.round(r() * (levels - 1)) * step;
        d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
      }
      c.putImageData(img, 0, 0);
      return n;
    }

    function render(fam, pal, dens, g) {
      const P = E.PALETTES[pal];
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const ctx = c.getContext('2d', { alpha: false, willReadFrequently: true });
      const m = E.measure(fam, pal, dens, 7314, W, H);
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      E._shapes(ctx, W, H, fam, P.cols, dens, E.rng(E._drawSeed(fam, dens, 7314)), Math.min(W, H));
      E._applyVeil(ctx, W, H, m);
      if (g) {
        const pat = ctx.createPattern(tileOf(128, g.levels, g.span), 'repeat');
        ctx.save();
        ctx.globalAlpha = g.alpha;
        ctx.globalCompositeOperation = 'overlay';
        ctx.imageSmoothingEnabled = false;
        ctx.scale(g.cx, g.cy);
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, W / g.cx + 1, H / g.cy + 1);
        ctx.restore();
      }
      return c;
    }

    const cases = [['vagues', 'lime', 1], ['trame', 'nuit', 1], ['ondes', 'ciel', 1], ['terrazzo', 'corail', 2]];
    const variants = [
      { id: 'off', g: null },
      { id: '1x1 l3 a.06 s80', g: { cx: 1, cy: 1, levels: 3, alpha: 0.06, span: 80 } },
      { id: '2x2 l3 a.06 s80', g: { cx: 2, cy: 2, levels: 3, alpha: 0.06, span: 80 } },
      { id: '2x2 l2 a.06 s80', g: { cx: 2, cy: 2, levels: 2, alpha: 0.06, span: 80 } },
      { id: '2x2 l3 a.04 s80', g: { cx: 2, cy: 2, levels: 3, alpha: 0.04, span: 80 } },
      { id: '2x2 l3 a.06 s46', g: { cx: 2, cy: 2, levels: 3, alpha: 0.06, span: 46 } },
      { id: '1x2 l3 a.06 s80', g: { cx: 1, cy: 2, levels: 3, alpha: 0.06, span: 80 } },
      { id: '1x3 l3 a.06 s80', g: { cx: 1, cy: 3, levels: 3, alpha: 0.06, span: 80 } },
      { id: '1x4 l3 a.06 s80', g: { cx: 1, cy: 4, levels: 3, alpha: 0.06, span: 80 } },
      { id: '2x3 l3 a.06 s80', g: { cx: 2, cy: 3, levels: 3, alpha: 0.06, span: 80 } },
      { id: '2x4 l3 a.06 s80', g: { cx: 2, cy: 4, levels: 3, alpha: 0.06, span: 80 } },
      { id: '3x3 l3 a.06 s80', g: { cx: 3, cy: 3, levels: 3, alpha: 0.06, span: 80 } },
      { id: '2x2 l3 a.05 s60', g: { cx: 2, cy: 2, levels: 3, alpha: 0.05, span: 60 } }
    ];

    const rows = [];
    const crops = {};
    for (const v of variants) {
      let total = 0;
      for (const [fam, pal, dens] of cases) {
        const c = render(fam, pal, dens, v.g);
        total += (await blobOf(c)).size;
        c.width = 1; c.height = 1;
      }
      rows.push({ id: v.id, ko: Math.round(total / cases.length / 1024) });

      const c = render('vagues', 'lime', 1, v.g);
      const o = document.createElement('canvas'); o.width = 600; o.height = 600;
      const oc = o.getContext('2d'); oc.imageSmoothingEnabled = false;
      oc.drawImage(c, 300, 1400, 120, 120, 0, 0, 600, 600);
      crops[v.id.replace(/[^a-z0-9]+/gi, '_')] = o.toDataURL('image/png');
      c.width = 1; c.height = 1;
    }
    return { rows, crops };
  });

  for (const [k, uri] of Object.entries(crops)) {
    fs.writeFileSync(path.join(OUT, 'g_' + k + '.png'), Buffer.from(uri.split(',')[1], 'base64'));
  }
  console.log('variante            | poids moyen');
  for (const r of rows) console.log(`${r.id.padEnd(20)}|${String(r.ko).padStart(6)} Ko`);

  await browser.close();
  srv.close();
})();
