/* Capture les quatre états dans la barre d'action et dans la scène. */
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

  async function shot(name, scheme, prep) {
    const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2, colorScheme: scheme, locale: 'fr-FR' });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/?l=fr&r=1179x2556`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    if (prep) await prep(page);
    await page.screenshot({ path: path.join(OUT, 'etat-' + name + '.png') });
    await ctx.close();
  }

  const tap = (page, sel) => page.$eval(sel, e => e.click());

  await shot('vide', 'light', async p => {
    await p.evaluate(() => { const s = document.getElementById('resSelect'); s.value = 'custom'; s.dispatchEvent(new Event('change', { bubbles: true })); });
    await p.waitForTimeout(200);
    await p.fill('#inW', '');
    await p.waitForTimeout(400);
  });

  await shot('chargement', 'light', async p => {
    await p.evaluate(() => {
      document.getElementById('stateBusy').hidden = false;
      document.getElementById('mockHandheld').hidden = true;
      document.getElementById('ctaLabel').textContent = 'Rendu en cours';
      document.getElementById('btnExport').disabled = true;
    });
    await p.waitForTimeout(250);
  });

  await shot('erreur', 'light', async p => {
    await p.evaluate(() => { const s = document.getElementById('resSelect'); s.value = 'custom'; s.dispatchEvent(new Event('change', { bubbles: true })); });
    await p.waitForTimeout(200);
    await p.fill('#inW', '7000');
    await p.fill('#inH', '7000');
    await p.waitForTimeout(250);
    await tap(p, '#btnExport');
    await p.waitForTimeout(600);
  });

  await shot('succes', 'light', async p => {
    await p.evaluate(() => {
      const c = document.getElementById('doneCard');
      c.hidden = false;
      document.getElementById('doneMeta').textContent = '1 179 × 2 556 px · PNG · 267 Ko';
    });
    await p.waitForTimeout(250);
  });

  await shot('succes-sombre', 'dark', async p => {
    await p.evaluate(() => {
      const c = document.getElementById('doneCard');
      c.hidden = false;
      document.getElementById('doneMeta').textContent = '1 179 × 2 556 px · PNG · 267 Ko';
    });
    await p.waitForTimeout(250);
  });

  await browser.close(); srv.close();
  console.log('etat-*.png');
})();
