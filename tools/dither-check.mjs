/* Contrôle final du tramage : amplitude du grain sur toute la gamme tonale,
   et taille de la plus longue marche du voile une fois le grain posé.

   Les deux grains y passent, et ils n'ont pas le même emploi. Celui du tirage
   net doit rester sous le seuil du visible tout en cassant une marche d'un cran
   sur 255 : son amplitude se lit en unités, pas en dizaines. Celui du tirage
   tramé doit se voir : la sienne est comptée ici pour qu'on sache de combien,
   et pour qu'un réglage distrait ne la ramène pas au niveau de l'autre. */
import fs from 'node:fs'
import path from 'node:path'
import { launch } from './pw.mjs'
import { poser } from './banc.mjs'
import { ouvrir } from './serveur.mjs'
import { fileURLToPath } from 'node:url'

/* Le dossier de ce fichier : `__dirname` n'existe pas dans un module ES. */
const ICI = fileURLToPath(new URL('.', import.meta.url))
let PORT = 0;
const OUT = path.resolve(ICI, '../.exports');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { srv, port } = await ouvrir(); PORT = port;
  const browser = await launch();
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/app?l=fr`, { waitUntil: 'networkidle' });
  await poser(page);

  const { rows, crops } = await page.evaluate(async () => {
    const M = window.MOTEUR;
    const rows = [];
    for (const bg of ['#101A2E', '#17243F', '#4A5773', '#92BAD5', '#DFF478', '#F7F3E6', '#FFFFFF']) {
      const c = document.createElement('canvas'); c.width = 256; c.height = 256;
      const ctx = c.getContext('2d', { alpha: false, willReadFrequently: true });
      const amplitude = (peindre) => {
        ctx.fillStyle = bg; ctx.fillRect(0, 0, 256, 256);
        peindre();
        const d = ctx.getImageData(0, 0, 256, 256).data;
        let mn = [255, 255, 255], mx = [0, 0, 0];
        for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) {
          if (d[i + k] < mn[k]) mn[k] = d[i + k];
          if (d[i + k] > mx[k]) mx[k] = d[i + k];
        }
        return mx.map((v, k) => v - mn[k]).join('/');
      };
      rows.push({
        bg,
        spread: amplitude(() => M.peindreGrain(ctx, 256, 256)),
        tirage: amplitude(() => M.peindreGrainDeTirage(ctx, 256, 256, 1179)),
      });
    }

    /* zooms sur palettes claire et sombre */
    const W = 1179, H = 2556;
    const crops = {};
    for (const [fam, pal, tirage] of [
      ['vagues', 'lime', 'net'], ['vagues', 'nuit', 'net'],
      ['ondes', 'encre', 'net'], ['blobs', 'ciel', 'net'],
      ['blobs', 'lime', 'trame'], ['blobs', 'lime', 'decale'],
    ]) {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const ctx = c.getContext('2d', { alpha: false });
      M.dessiner(ctx, W, H, { famille: fam, palette: pal, densite: 1, graine: 7314 }, { tirage });
      const o = document.createElement('canvas'); o.width = 600; o.height = 600;
      const oc = o.getContext('2d'); oc.imageSmoothingEnabled = false;
      oc.drawImage(c, 300, 1300, 150, 150, 0, 0, 600, 600);
      crops[fam + '_' + pal + '_' + tirage] = o.toDataURL('image/png');
      c.width = 1; c.height = 1;
    }
    return { rows, crops };
  });

  for (const [k, uri] of Object.entries(crops)) {
    fs.writeFileSync(path.join(OUT, 'final_' + k + '.png'), Buffer.from(uri.split(',')[1], 'base64'));
  }
  console.log('fond      | grain net R/V/B | grain du tirage tramé R/V/B (niveaux)');
  for (const r of rows) console.log(`${r.bg}  |  ${r.spread.padEnd(15)} |  ${r.tirage}`);
  await browser.close();
  srv.close();
})();
