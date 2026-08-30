/* Planche des nouvelles familles, plus grande que la planche-contact :
   douze motifs sur trois palettes, pour juger le dessin plutôt que le
   catalogue. Outil de travail, jamais appelé par la CI. */
import fs from 'node:fs'
import path from 'node:path'
import { launch } from './pw.mjs'
import { poser } from './banc.mjs'
import { ouvrir } from './serveur.mjs'
import { fileURLToPath } from 'node:url'

const ICI = fileURLToPath(new URL('.', import.meta.url))
const OUT = path.resolve(ICI, '../.shots');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { srv, port } = await ouvrir();
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(`http://127.0.0.1:${port}/app?l=fr`, { waitUntil: 'networkidle' });
  await poser(page);

  /* Chaque case s'écrit `famille` ou `famille@palette@densite@graine`. C'est ce
     qui permet de juger une famille sur trois palettes et trois densités d'un
     seul coup d'oeil, ce qu'une planche à réglages communs ne montre pas. */
  const palDefaut = process.argv[3] || 'lime';
  const densDefaut = parseInt(process.argv[4] || '1', 10);
  const cases = (process.argv[2] || 'vagues').split(',').map((entree) => {
    const [famille, palette, densite, graine] = entree.split('@');
    return {
      famille,
      palette: palette || palDefaut,
      densite: densite === undefined ? densDefaut : parseInt(densite, 10),
      graine: graine === undefined ? 7314 : parseInt(graine, 10),
    };
  });

  const uri = await page.evaluate(({ cases }) => {
    const M = window.MOTEUR;
    const W = 1179, H = 2556;
    const cols = 6, cw = 330, ch = Math.round(cw * H / W), pad = 16, lab = 30;
    const rows = Math.ceil(cases.length / cols);
    const o = document.createElement('canvas');
    o.width = cols * (cw + pad) + pad;
    o.height = rows * (ch + pad + lab) + pad;
    const g = o.getContext('2d');
    g.fillStyle = '#F2EDDD'; g.fillRect(0, 0, o.width, o.height);
    g.font = '600 17px Archivo, sans-serif';
    g.textBaseline = 'top';

    const tmp = document.createElement('canvas');
    tmp.width = W; tmp.height = H;
    const tctx = tmp.getContext('2d', { alpha: false });

    cases.forEach((k, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const x = pad + c * (cw + pad), y = pad + r * (ch + pad + lab);
      M.dessiner(tctx, W, H, k);
      g.drawImage(tmp, 0, 0, W, H, x, y, cw, ch);
      g.strokeStyle = '#17243F'; g.lineWidth = 1.5;
      g.strokeRect(x + 0.75, y + 0.75, cw - 1.5, ch - 1.5);
      g.fillStyle = '#17243F';
      g.fillText(`${k.famille}  ${k.palette}  d${k.densite}`, x, y + ch + 8);
    });
    tmp.width = 1; tmp.height = 1;
    return o.toDataURL('image/png');
  }, { cases });

  const f = path.join(OUT, `${process.argv[5] || 'apercu'}.png`);
  fs.writeFileSync(f, Buffer.from(uri.split(',')[1], 'base64'));
  console.log(path.basename(f));
  await browser.close(); srv.close();
})();
