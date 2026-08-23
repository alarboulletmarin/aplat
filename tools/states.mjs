/* Capture les cinq états : vide, calcul, erreur, succès, succès en sombre.
 *
 * Chacun est atteint pour de vrai, par les mêmes gestes qu'un utilisateur :
 * une capture d'un état fabriqué à la main ne prouve rien sur l'application.
 */
import fs from 'node:fs'
import path from 'node:path'
import { launch } from './pw.mjs'
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

  const surMesure = async (page) => {
    await page.$eval('#res-select', s => {
      s.value = 'surMesure';
      s.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForSelector('#res-largeur');
  };
  const tap = (page, sel) => page.$eval(sel, e => e.click());

  async function shot(nom, scheme, prep) {
    const ctx = await browser.newContext({
      viewport: { width: 420, height: 900 }, deviceScaleFactor: 2,
      colorScheme: scheme, locale: 'fr-FR', acceptDownloads: true
    });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/?l=fr&r=1179x2556`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    if (prep) await prep(page);
    await page.screenshot({ path: path.join(OUT, 'etat-' + nom + '.png') });
    await ctx.close();
  }

  await shot('vide', 'light', async p => {
    await surMesure(p);
    await p.fill('#res-largeur', '');
    await p.waitForTimeout(400);
  });

  /* 25 Mpx : assez long à encoder pour que la capture tombe pendant le calcul,
     assez court pour que la vérification ne s'éternise pas. */
  await shot('chargement', 'light', async p => {
    await surMesure(p);
    await p.fill('#res-largeur', '5000');
    await p.fill('#res-hauteur', '5000');
    await p.waitForTimeout(300);
    await tap(p, '#btn-export');
    await p.waitForSelector('#etat-calcul', { timeout: 5000 });
  });

  await shot('erreur', 'light', async p => {
    await surMesure(p);
    await p.fill('#res-largeur', '7000');
    await p.fill('#res-hauteur', '7000');
    await p.waitForTimeout(250);
    await tap(p, '#btn-export');
    await p.waitForSelector('#note-erreur', { timeout: 5000 });
  });

  const succes = async p => {
    await tap(p, '#btn-export');
    await p.waitForSelector('#note-faite', { timeout: 20000 });
    await p.waitForTimeout(250);
  };
  await shot('succes', 'light', succes);
  await shot('succes-sombre', 'dark', succes);

  await browser.close(); srv.close();
  console.log('etat-*.png');
})();
