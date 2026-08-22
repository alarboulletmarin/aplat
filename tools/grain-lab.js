/* Cherche le meilleur compromis grain : poids du PNG contre tramage du voile.
   Le grain n'est pas décoratif : il casse les marches du voile, qui n'est plus
   tramé par le navigateur depuis qu'il est peint en bandes. */
const { launch } = require('./pw');
const { serve } = require('./serve');
const PORT = 8099;

(async () => {
  const srv = serve(PORT);
  const browser = await launch();
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/?l=fr`, { waitUntil: 'networkidle' });

  const rows = await page.evaluate(async () => {
    const E = window.APLAT_ENGINE;
    const W = 1179, H = 2556;
    const blobOf = c => new Promise(r => c.toBlob(r, 'image/png'));

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

    /* mesure du tramage : sur un aplat uni couvert du voile, on compte les
       lignes où la couleur moyenne change d'un cran — plus il y en a, mieux
       la marche est cassée. On mesure aussi l'écart-type par ligne. */
    function bandScore(ctx, W, H) {
      const d = ctx.getImageData(Math.round(W / 2) - 40, 0, 80, H).data;
      let steps = 0, prev = -1, noise = 0;
      for (let y = 0; y < H; y += 1) {
        let s = 0, mn = 255, mx = 0;
        for (let x = 0; x < 80; x++) {
          const v = d[(y * 80 + x) * 4];
          s += v; if (v < mn) mn = v; if (v > mx) mx = v;
        }
        const avg = s / 80;
        noise += (mx - mn);
        if (prev >= 0 && Math.abs(avg - prev) > 0.35) steps++;
        prev = avg;
      }
      return { steps, noise: +(noise / H).toFixed(2) };
    }

    const cases = [['vagues', 'lime', 1], ['trame', 'nuit', 1], ['ondes', 'ciel', 1], ['terrazzo', 'corail', 2]];
    const variants = [];
    for (const cell of [1, 2, 3, 4]) {
      for (const levels of [3, 5, 9]) {
        for (const alpha of [0.045, 0.06]) {
          variants.push({ cell, levels, alpha, tile: 128 });
        }
      }
    }
    variants.push({ cell: 0, levels: 0, alpha: 0, tile: 0 });   // témoin sans grain

    const out = [];
    for (const v of variants) {
      let total = 0, steps = 0, noise = 0;
      for (const [fam, pal, dens] of cases) {
        const P = E.PALETTES[pal];
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const ctx = c.getContext('2d', { alpha: false, willReadFrequently: true });
        const m = E.measure(fam, pal, dens, 7314, W, H);
        ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
        E._shapes(ctx, W, H, fam, P.cols, dens, E.rng(E._drawSeed(fam, dens, 7314)), Math.min(W, H));
        E._applyVeil(ctx, W, H, m);
        if (v.cell) {
          const pat = ctx.createPattern(tileOf(v.tile, v.levels, 0x41504C41), 'repeat');
          ctx.save();
          ctx.globalAlpha = v.alpha;
          ctx.globalCompositeOperation = 'overlay';
          ctx.imageSmoothingEnabled = false;
          if (v.cell !== 1) { ctx.scale(v.cell, v.cell); ctx.fillStyle = pat; ctx.fillRect(0, 0, W / v.cell + 1, H / v.cell + 1); }
          else { ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H); }
          ctx.restore();
        }
        const b = await blobOf(c);
        total += b.size;
        const bs = bandScore(ctx, W, H);
        steps += bs.steps; noise += bs.noise;
        c.width = 1; c.height = 1;
      }
      out.push({ ...v, ko: Math.round(total / 4 / 1024), steps: Math.round(steps / 4), noise: +(noise / 4).toFixed(2) });
    }
    return out;
  });

  console.log('cell lvl alpha | poids moyen | marches cassées | bruit crête-crête');
  for (const r of rows) {
    console.log(
      `${String(r.cell).padStart(4)} ${String(r.levels).padStart(3)} ${String(r.alpha).padStart(5)} |` +
      `${String(r.ko).padStart(7)} Ko |${String(r.steps).padStart(12)} |${String(r.noise).padStart(10)}`
    );
  }
  await browser.close();
  srv.close();
})();
