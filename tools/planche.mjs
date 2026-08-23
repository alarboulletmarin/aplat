/* Planche-contact : les 18 familles rendues à la résolution d'un téléphone,
   réduites côte à côte. Sert à juger d'un coup d'œil ce que produit le moteur. */
import fs from 'node:fs'
import path from 'node:path'
import { launch } from './pw.mjs'
import { poser } from './banc.mjs'
import { ouvrir } from './serveur.mjs'
import { fileURLToPath } from 'node:url'

/* Le dossier de ce fichier : `__dirname` n'existe pas dans un module ES. */
const ICI = fileURLToPath(new URL('.', import.meta.url))
let PORT = 0;
const OUT = path.resolve(ICI, '../.shots');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { srv, port } = await ouvrir(); PORT = port;
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(`http://127.0.0.1:${PORT}/app?l=fr`, { waitUntil: 'networkidle' });
  await poser(page);

  const pal = process.argv[2] || 'lime';
  const dens = parseInt(process.argv[3] || '1', 10);

  const uri = await page.evaluate(({ pal, dens }) => {
    const M = window.MOTEUR;
    const W = 1179, H = 2556;
    const cols = 6, cw = 210, ch = Math.round(cw * H / W), pad = 14, lab = 26;
    const rows = Math.ceil(M.FAMILLES.length / cols);
    const o = document.createElement('canvas');
    o.width = cols * (cw + pad) + pad;
    o.height = rows * (ch + pad + lab) + pad;
    const g = o.getContext('2d');
    g.fillStyle = '#F2EDDD'; g.fillRect(0, 0, o.width, o.height);
    g.font = '600 13px Archivo, sans-serif';
    g.textBaseline = 'top';

    const tmp = document.createElement('canvas');
    tmp.width = W; tmp.height = H;
    const tctx = tmp.getContext('2d', { alpha: false });

    M.FAMILLES.forEach((f, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const x = pad + c * (cw + pad), y = pad + r * (ch + pad + lab);
      M.dessiner(tctx, W, H, { famille: f.id, palette: pal, densite: dens, graine: 7314 });
      g.drawImage(tmp, 0, 0, W, H, x, y, cw, ch);
      g.strokeStyle = '#17243F'; g.lineWidth = 1.5;
      g.strokeRect(x + 0.75, y + 0.75, cw - 1.5, ch - 1.5);
      g.fillStyle = '#17243F';
      g.fillText(f.fr, x, y + ch + 6);
    });
    tmp.width = 1; tmp.height = 1;
    return o.toDataURL('image/png');
  }, { pal, dens });

  const f = path.join(OUT, `planche-${pal}-d${dens}.png`);
  fs.writeFileSync(f, Buffer.from(uri.split(',')[1], 'base64'));
  console.log(path.basename(f));
  await browser.close(); srv.close();
})();
