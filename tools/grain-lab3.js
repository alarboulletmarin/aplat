/* Troisième passe : taille de tuile. Une petite tuile se répète dans la ligne,
   donc l'algorithme de PNG la retrouve et ne la recode pas. On regarde si le
   grain reste crédible malgré la périodicité. */
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

    function tileRandom(size, levels, span) {
      const n = document.createElement('canvas'); n.width = n.height = size;
      const c = n.getContext('2d');
      const img = c.createImageData(size, size), d = img.data;
      const r = E.rng(0x41504C41);
      const step = levels > 1 ? span / (levels - 1) : 0;
      for (let i = 0; i < d.length; i += 4) {
        const v = 150 - span / 2 + Math.round(r() * (levels - 1)) * step;
        d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
      }
      c.putImageData(img, 0, 0); return n;
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
        const pat = ctx.createPattern(tileRandom(g.tile, g.levels, g.span), 'repeat');
        ctx.save();
        ctx.globalAlpha = g.alpha; ctx.globalCompositeOperation = 'overlay';
        ctx.imageSmoothingEnabled = false;
        ctx.scale(g.cell, g.cell);
        ctx.fillStyle = pat; ctx.fillRect(0, 0, W / g.cell + 1, H / g.cell + 1);
        ctx.restore();
      }
      return c;
    }

    const cases = [['vagues', 'lime', 1], ['trame', 'nuit', 1], ['ondes', 'ciel', 1], ['terrazzo', 'corail', 2]];
    const variants = [{ id: 'off', g: null }];
    for (const tile of [8, 16, 24, 32, 48, 64, 128]) {
      for (const cell of [1, 2]) {
        variants.push({ id: `tuile ${tile} · cell ${cell}`, g: { tile, cell, levels: 3, alpha: 0.06, span: 80 } });
      }
    }

    const rows = [], crops = {};
    for (const v of variants) {
      let total = 0;
      for (const [fam, pal, dens] of cases) {
        const c = render(fam, pal, dens, v.g);
        total += (await blobOf(c)).size;
        c.width = 1; c.height = 1;
      }
      rows.push({ id: v.id, ko: Math.round(total / cases.length / 1024) });
      if (v.g && [16, 32, 64].includes(v.g.tile) && v.g.cell === 2) {
        const c = render('vagues', 'lime', 1, v.g);
        const o = document.createElement('canvas'); o.width = 640; o.height = 640;
        const oc = o.getContext('2d'); oc.imageSmoothingEnabled = false;
        oc.drawImage(c, 300, 1400, 160, 160, 0, 0, 640, 640);
        crops['t' + v.g.tile + '_c' + v.g.cell] = o.toDataURL('image/png');
        c.width = 1; c.height = 1;
      }
    }
    return { rows, crops };
  });

  for (const [k, uri] of Object.entries(crops)) {
    fs.writeFileSync(path.join(OUT, 'tile_' + k + '.png'), Buffer.from(uri.split(',')[1], 'base64'));
  }
  console.log('variante             | poids moyen');
  for (const r of rows) console.log(`${r.id.padEnd(21)}|${String(r.ko).padStart(6)} Ko`);

  await browser.close();
  srv.close();
})();
