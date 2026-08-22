const fs = require('fs');
const path = require('path');
const { launch } = require('./pw');
const { start } = require('./serve');
const OUT = path.resolve(__dirname, '../.shots');
let PORT = 0;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { srv, port } = start(); PORT = port;
  const browser = await launch();

  async function grab(name, opts, q, actions) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/${q}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    if (actions) await actions(page);
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    await ctx.close();
  }

  const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, colorScheme: 'light', locale: 'fr-FR', hasTouch: true, isMobile: true };
  const phoneDark = Object.assign({}, phone, { colorScheme: 'dark' });
  const desk = { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, colorScheme: 'light', locale: 'fr-FR' };
  const deskDark = Object.assign({}, desk, { colorScheme: 'dark' });

  await grab('vp-phone-top', phone, '?l=fr');
  await grab('vp-phone-dark-top', phoneDark, '?l=fr');
  await grab('vp-phone-scroll', phone, '?l=fr', async p => { await p.mouse.wheel(0, 700); await p.waitForTimeout(300); });
  await grab('vp-desk', desk, '?l=fr');
  await grab('vp-desk-dark', deskDark, '?l=fr');
  await grab('vp-desk-en', desk, '?l=en');
  await grab('vp-desk-target', desk, '?l=fr&r=2560x1440');
  await grab('vp-tablet-target', desk, '?l=fr&r=2048x2732');
  await grab('vp-phone-resedit', phone, '?l=fr', async p => {
    await p.evaluate(() => { const s = document.getElementById('resSelect'); s.value = 'custom'; s.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(300);
    await p.mouse.wheel(0, 2600); await p.waitForTimeout(300);
  });

  await browser.close();
  srv.close();
  console.log('ok');
})();
