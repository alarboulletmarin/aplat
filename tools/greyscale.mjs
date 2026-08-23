/* Test en niveaux de gris : sélectionné et non sélectionné doivent rester
   distinguables sans la couleur. On compare les deux vignettes pixel par pixel
   après désaturation, et on sort les images pour jugement à l'œil. */
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

  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 3, colorScheme: scheme, locale: 'fr-FR' });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/?l=fr`, { waitUntil: 'networkidle' });
    await page.evaluate(() => { const s = document.getElementById('res-select'); s.value = 'surMesure'; s.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.waitForTimeout(300);
    // désature toute la page
    await page.addStyleTag({ content: 'html{filter:grayscale(1) !important}' });
    await page.waitForTimeout(200);

    for (const [name, sel] of [
      ['densite', '#liste-densite'],
      ['langue', '#liste-langue'],
      ['theme', '#liste-theme'],
      ['palette', '#liste-palettes'],
      ['famille', '#liste-abstraits']
    ]) {
      const elh = await page.$(sel);
      if (!elh) continue;
      await elh.screenshot({ path: path.join(OUT, `gris-${scheme}-${name}.png`) });
    }

    // mesure : luminance moyenne de la bordure sélectionnée vs non sélectionnée
    const diff = await page.evaluate(() => {
      const out = [];
      for (const grp of ['liste-densite', 'liste-langue', 'liste-theme', 'liste-palettes']) {
        const bs = [...document.getElementById(grp).querySelectorAll('.opt')];
        const on = bs.find(b => b.getAttribute('aria-checked') === 'true');
        const off = bs.find(b => b.getAttribute('aria-checked') === 'false');
        if (!on || !off) continue;
        const cs = n => getComputedStyle(n);
        out.push({ grp, onBorder: cs(on).borderTopColor, offBorder: cs(off).borderTopColor, onBg: cs(on).backgroundColor, offBg: cs(off).backgroundColor });
      }
      return out;
    });
    console.log(scheme, JSON.stringify(diff[0]));
    await ctx.close();
  }
  await browser.close(); srv.close();
  console.log('captures dans .shots/gris-*.png');
})();
