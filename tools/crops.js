/* Sort des découpes 1:1 et des agrandissements au plus proche voisin, pour
   juger à l'œil les marches du voile et le grain. */
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

  const shots = await page.evaluate(async () => {
    const E = window.APLAT_ENGINE;
    const W = 1179, H = 2556;

    function tileOf(size, levels, seed) {
      const n = document.createElement('canvas'); n.width = n.height = size;
      const c = n.getContext('2d');
      const img = c.createImageData(size, size), d = img.data;
      const r = E.rng(seed);
      const span = 80, step = span / (levels - 1);
      for (let i = 0; i < d.length; i += 4) {
        const v = 150 - span / 2 + Math.round(r() * (levels - 1)) * step;
        d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
      }
      c.putImageData(img, 0, 0);
      return n;
    }

    function render(fam, pal, dens, grain) {
      const P = E.PALETTES[pal];
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const ctx = c.getContext('2d', { alpha: false, willReadFrequently: true });
      const m = E.measure(fam, pal, dens, 7314, W, H);
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      E._shapes(ctx, W, H, fam, P.cols, dens, E.rng(E._drawSeed(fam, dens, 7314)), Math.min(W, H));
      E._applyVeil(ctx, W, H, m);
      if (grain) {
        const pat = ctx.createPattern(tileOf(128, grain.levels, 0x41504C41), 'repeat');
        ctx.save();
        ctx.globalAlpha = grain.alpha;
        ctx.globalCompositeOperation = 'overlay';
        ctx.imageSmoothingEnabled = false;
        if (grain.cell !== 1) { ctx.scale(grain.cell, grain.cell); ctx.fillStyle = pat; ctx.fillRect(0, 0, W / grain.cell + 1, H / grain.cell + 1); }
        else { ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H); }
        ctx.restore();
      }
      return c;
    }

    /* découpe une bande verticale étroite et l'étire : les marches d'un voile
       non tramé sautent aux yeux dans ce format. */
    function strip(src, x, w, scale) {
      const o = document.createElement('canvas');
      o.width = w * scale; o.height = Math.round(H / 4);
      const c = o.getContext('2d');
      c.imageSmoothingEnabled = false;
      c.drawImage(src, x, 0, w, H, 0, 0, w * scale, Math.round(H / 4));
      return o.toDataURL('image/png');
    }

    function zoom(src, x, y, s, scale) {
      const o = document.createElement('canvas');
      o.width = s * scale; o.height = s * scale;
      const c = o.getContext('2d');
      c.imageSmoothingEnabled = false;
      c.drawImage(src, x, y, s, s, 0, 0, s * scale, s * scale);
      return o.toDataURL('image/png');
    }

    const cases = {
      'nograin': null,
      'c2l3': { cell: 2, levels: 3, alpha: 0.06 },
      'c4l3': { cell: 4, levels: 3, alpha: 0.06 }
    };
    const out = {};
    for (const [k, g] of Object.entries(cases)) {
      const c = render('vagues', 'lime', 1, g);
      out['veil-' + k] = strip(c, 40, 60, 4);
      out['zoom-' + k] = zoom(c, 300, 1400, 120, 5);
      c.width = 1; c.height = 1;
    }
    return out;
  });

  for (const [k, uri] of Object.entries(shots)) {
    fs.writeFileSync(path.join(OUT, k + '.png'), Buffer.from(uri.split(',')[1], 'base64'));
  }
  console.log(Object.keys(shots).join('\n'));
  await browser.close();
  srv.close();
})();
