/* Vérifie qu'on n'a échangé aucune bande horizontale contre des raies
   verticales, et compare trois façons de trancher le problème. */
const { launch } = require('./pw');
const { serve } = require('./serve');
const PORT = 8099;

(async () => {
  const srv = serve(PORT);
  const browser = await launch();
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/?l=fr`, { waitUntil: 'networkidle' });

  const out = await page.evaluate(async () => {
    const E = window.APLAT_ENGINE;
    const W = 1179, H = 2556;
    const blobOf = c => new Promise(r => c.toBlob(r, 'image/png'));

    function speckleTile(size, alpha) {
      const n = document.createElement('canvas'); n.width = n.height = size;
      const c = n.getContext('2d');
      const img = c.createImageData(size, size), d = img.data;
      const r = E.rng(0x41504C41);
      const A = Math.round(alpha * 255);
      for (let i = 0; i < d.length; i += 4) {
        const k = Math.floor(r() * 3);
        if (k === 0) { d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = A; }
        else if (k === 1) { d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = A; }
        else { d[i + 3] = 0; }
      }
      c.putImageData(img, 0, 0); return n;
    }

    function paintSpeckle(ctx, W, H, alpha) {
      const pat = ctx.createPattern(speckleTile(8, alpha), 'repeat');
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    /* raies verticales : sur une ligne, écart max entre deux colonnes
       horizontales : sur une colonne, écart max entre deux lignes */
    function scan(ctx, W, H) {
      const rowY = Math.round(H * 0.55);
      const row = ctx.getImageData(0, rowY, W, 1).data;
      let rmin = 255, rmax = 0;
      for (let x = 0; x < W; x++) { const v = row[x * 4]; if (v < rmin) rmin = v; if (v > rmax) rmax = v; }
      const colX = Math.round(W * 0.5);
      const col = ctx.getImageData(colX, 0, 1, H).data;
      let cmin = 255, cmax = 0;
      for (let y = 0; y < H; y++) { const v = col[y * 4]; if (v < cmin) cmin = v; if (v > cmax) cmax = v; }
      /* moyenne par colonne, sur une bande : révèle une raie persistante */
      const band = ctx.getImageData(0, Math.round(H * 0.5), W, 200).data;
      const avg = new Float64Array(W);
      for (let y = 0; y < 200; y++) for (let x = 0; x < W; x++) avg[x] += band[(y * W + x) * 4];
      let amin = 1e9, amax = -1e9;
      for (let x = 0; x < W; x++) { const v = avg[x] / 200; if (v < amin) amin = v; if (v > amax) amax = v; }
      return { rowSpread: rmax - rmin, colSpread: cmax - cmin, colMeanSpread: +(amax - amin).toFixed(2) };
    }

    const results = [];
    for (const bg of ['#17243F', '#101A2E', '#92BAD5', '#F7F3E6']) {
      for (const veil of [0.12, 0.3, 0.5]) {
        for (const variant of ['veil-jitter+overlay', 'veil-flat+speckle', 'veil-jitter+speckle', 'veil-flat+overlay']) {
          const c = document.createElement('canvas'); c.width = W; c.height = H;
          const ctx = c.getContext('2d', { alpha: false, willReadFrequently: true });
          ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
          const m = { mode: 'light', veil };
          if (variant.startsWith('veil-jitter')) E._applyVeil(ctx, W, H, m, 12345);
          else E._applyVeil(ctx, W, H, m, 0);       // seed 0 -> rng(1), phase quasi nulle? on force à plat ci-dessous
          if (variant.endsWith('speckle')) paintSpeckle(ctx, W, H, 0.012);
          else E._paintGrain(ctx, W, H);
          const s = scan(ctx, W, H);
          const b = await blobOf(c);
          results.push({ bg, veil, variant, ...s, ko: Math.round(b.size / 1024) });
          c.width = 1; c.height = 1;
        }
      }
    }
    return results;
  });

  console.log('fond      voile variante              | bruit/ligne | bruit/colonne | raie persistante | poids');
  for (const r of out) {
    const flag = r.colMeanSpread > 0.6 ? '  <-- raie' : '';
    console.log(
      `${r.bg} ${String(r.veil).padStart(4)} ${r.variant.padEnd(21)}|${String(r.rowSpread).padStart(12)} |${String(r.colSpread).padStart(14)} |${String(r.colMeanSpread).padStart(17)} |${String(r.ko).padStart(5)} Ko${flag}`
    );
  }
  await browser.close();
  srv.close();
})();
