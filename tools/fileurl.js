/* Ouverture en file:// : le contrat dit que le fichier doit s'ouvrir seul.
   On vérifie qu'il n'y a ni erreur console, ni requête refusée, ni police
   téléchargée deux fois, et que le rendu a bien lieu. */
const path = require('path');
const { launch } = require('./pw');

(async () => {
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: 900, height: 900 }, locale: 'fr-FR' });
  const page = await ctx.newPage();
  const errs = [], warns = [], reqs = [];
  page.on('console', m => {
    if (m.type() === 'error') errs.push(m.text());
    if (m.type() === 'warning') warns.push(m.text());
  });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('requestfailed', r => errs.push('requestfailed: ' + r.url().split('/').pop()));
  page.on('request', r => reqs.push(r.url()));

  const file = 'file://' + path.resolve(__dirname, '../index.html');
  await page.goto(file, { waitUntil: 'load' });
  await page.waitForTimeout(2500);

  const st = await page.evaluate(() => ({
    peint: document.getElementById('previewCanvas').width > 4,
    police: getComputedStyle(document.querySelector('.title')).fontFamily,
    anton: document.fonts ? [...document.fonts].filter(f => f.family === 'Anton' && f.status === 'loaded').length : -1,
    vignettes: [...document.querySelectorAll('canvas[data-thumb]')].filter(c => c.dataset.painted).length
  }));

  const fonts = reqs.filter(u => u.endsWith('.woff2'));
  const dup = fonts.length !== new Set(fonts).size;

  console.log('requêtes            :', reqs.length, '(' + reqs.map(u => u.split('/').pop()).join(', ') + ')');
  console.log('polices dupliquées  :', dup ? 'OUI' : 'non');
  console.log('rendu               :', st.peint ? 'ok' : 'ABSENT', '· vignettes peintes :', st.vignettes);
  console.log('famille du titre    :', st.police, '· faces Anton chargées :', st.anton);
  console.log('erreurs console     :', errs.length ? errs.join(' | ') : 'aucune');
  console.log('avertissements      :', warns.length ? warns.slice(0, 3).join(' | ') : 'aucun');

  await browser.close();
  const bad = errs.length > 0 || dup || !st.peint;
  console.log(bad ? '\nECHEC en file://' : '\nOuverture en file:// propre.');
  process.exitCode = bad ? 1 : 0;
})();
