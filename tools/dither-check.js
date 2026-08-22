/* Contrôle final du tramage : amplitude du grain sur toute la gamme tonale,
   et taille de la plus longue marche du voile une fois le grain posé. */
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
    const rows = [];
    for (const bg of ['#101A2E', '#17243F', '#4A5773', '#92BAD5', '#DFF478', '#F7F3E6', '#FFFFFF']) {
      const c = document.createElement('canvas'); c.width = 256; c.height = 256;
      const ctx = c.getContext('2d', { alpha: false, willReadFrequently: true });
      ctx.fillStyle = bg; ctx.fillRect(0, 0, 256, 256);
      E._paintGrain(ctx, 256, 256);
      const d = ctx.getImageData(0, 0, 256, 256).data;
      let mn = [255, 255, 255], mx = [0, 0, 0];
      for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) {
        if (d[i + k] < mn[k]) mn[k] = d[i + k];
        if (d[i + k] > mx[k]) mx[k] = d[i + k];
      }
      rows.push({ bg, spread: mx.map((v, k) => v - mn[k]).join('/') });
    }

    /* zooms sur palettes claire et sombre */
    const W = 1179, H = 2556;
    const crops = {};
    for (const [fam, pal] of [['vagues', 'lime'], ['vagues', 'nuit'], ['ondes', 'encre'], ['blobs', 'ciel']]) {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const ctx = c.getContext('2d', { alpha: false });
      E.draw(ctx, W, H, fam, pal, 1, 7314);
      const o = document.createElement('canvas'); o.width = 600; o.height = 600;
      const oc = o.getContext('2d'); oc.imageSmoothingEnabled = false;
      oc.drawImage(c, 300, 1300, 150, 150, 0, 0, 600, 600);
      crops[fam + '_' + pal] = o.toDataURL('image/png');
      c.width = 1; c.height = 1;
    }
    return { rows, crops };
  });

  for (const [k, uri] of Object.entries(crops)) {
    fs.writeFileSync(path.join(OUT, 'final_' + k + '.png'), Buffer.from(uri.split(',')[1], 'base64'));
  }
  console.log('fond      | amplitude du grain R/V/B (niveaux)');
  for (const r of rows) console.log(`${r.bg}  |  ${r.spread}`);
  await browser.close();
  srv.close();
})();
