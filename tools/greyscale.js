/* Test en niveaux de gris : sélectionné et non sélectionné doivent rester
   distinguables sans la couleur. On compare les deux vignettes pixel par pixel
   après désaturation, et on sort les images pour jugement à l'œil. */
const fs = require('fs');
const path = require('path');
const { launch } = require('./pw');
const { start } = require('./serve');
let PORT = 0;
const OUT = path.resolve(__dirname, '../.shots');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { srv, port } = start(); PORT = port;
  const browser = await launch();

  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 3, colorScheme: scheme, locale: 'fr-FR' });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/?l=fr`, { waitUntil: 'networkidle' });
    await page.click('#resToggle', { force: true });
    await page.waitForTimeout(300);
    // désature toute la page
    await page.addStyleTag({ content: 'html{filter:grayscale(1) !important}' });
    await page.waitForTimeout(200);

    for (const [name, sel] of [
      ['densite', '#densList'],
      ['langue', '#langList'],
      ['theme', '#themeList'],
      ['palette', '#palList'],
      ['famille', '#famAbs']
    ]) {
      const elh = await page.$(sel);
      if (!elh) continue;
      await elh.screenshot({ path: path.join(OUT, `gris-${scheme}-${name}.png`) });
    }

    // mesure : luminance moyenne de la bordure sélectionnée vs non sélectionnée
    const diff = await page.evaluate(() => {
      const out = [];
      for (const grp of ['densList', 'langList', 'themeList', 'palList']) {
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
