/* Découpes fortement agrandies sur les bords : c'est là qu'on voit si une
   courbe a été échantillonnée trop grossièrement ou si une trame a des coutures. */
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

  const crops = await page.evaluate(async () => {
    const E = window.APLAT_ENGINE;
    const W = 1179, H = 2556;
    const out = {};
    const specs = [
      ['vagues', 'lime', 1, 0, 900, 300],
      ['blobs', 'corail', 1, 200, 700, 300],
      ['trame', 'nuit', 2, 300, 1000, 200],
      ['fleurs', 'menthe', 1, 250, 800, 300],
      ['ecailles', 'ciel', 1, 200, 900, 300],
      ['lunes', 'prune', 1, 150, 700, 350],
      ['arches', 'soleil', 1, 200, 1400, 350],
      ['tournesol', 'argile', 0, 300, 1100, 300]
    ];
    for (const [fam, pal, dens, x, y, s] of specs) {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const ctx = c.getContext('2d', { alpha: false });
      E.draw(ctx, W, H, fam, pal, dens, 7314);
      const o = document.createElement('canvas'); o.width = 640; o.height = 640;
      const oc = o.getContext('2d'); oc.imageSmoothingEnabled = false;
      oc.drawImage(c, x, y, s, s, 0, 0, 640, 640);
      out[fam] = o.toDataURL('image/png');
      c.width = 1; c.height = 1;
    }
    return out;
  });

  for (const [k, uri] of Object.entries(crops)) {
    fs.writeFileSync(path.join(OUT, 'edge_' + k + '.png'), Buffer.from(uri.split(',')[1], 'base64'));
  }
  console.log(Object.keys(crops).join(' '));
  await browser.close();
  srv.close();
})();
