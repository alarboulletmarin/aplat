/* Combien coûte une frappe dans le champ de résolution, et un changement de
   palette ? Mesuré sur un profil mobile lent. */
const { launch } = require('./pw');
const { start } = require('./serve');
let PORT = 0;
(async () => {
  const { srv, port } = start(); PORT = port;
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'fr-FR', hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });   // téléphone d'entrée de gamme
  await page.goto(`http://127.0.0.1:${PORT}/?l=fr&r=1179x2556`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const r = await page.evaluate(async () => {
    const out = {};
    const el = document.getElementById('resSelect');
    el.value = 'custom'; el.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 200));
    const inW = document.getElementById('inW');

    function timeIt(label, fn, n) {
      const t0 = performance.now();
      for (let i = 0; i < n; i++) fn(i);
      return out[label] = +((performance.now() - t0) / n).toFixed(1);
    }

    timeIt('frappe dans le champ largeur', i => {
      inW.value = String(1170 + i);
      inW.dispatchEvent(new Event('input', { bubbles: true }));
    }, 12);

    const pals = [...document.querySelectorAll('[data-pal]')];
    timeIt('changement de palette', i => pals[i % pals.length].click(), 8);

    const fams = [...document.querySelectorAll('[data-family]')];
    timeIt('changement de famille', i => fams[i % fams.length].click(), 8);

    timeIt('nouvelle graine', () => document.getElementById('btnSeed').click(), 6);
    return out;
  });

  console.log('CPU bridé x6 (téléphone d\'entrée de gamme), millisecondes par action :');
  for (const [k, v] of Object.entries(r)) console.log('  ' + k.padEnd(30) + v + ' ms');
  await browser.close(); srv.close();
})();
