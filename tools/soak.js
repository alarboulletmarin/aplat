/* Test d'endurance : on martèle les réglages et on regarde si la mémoire, le
   nombre de nœuds ou le nombre de canevas dérivent. */
const { launch } = require('./pw');
const { start } = require('./serve');
let PORT = 0;

(async () => {
  const { srv, port } = start(); PORT = port;
  const browser = await launch({ args: ['--js-flags=--expose-gc'] });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 1000 }, locale: 'fr-FR' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/?l=fr`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const cdp = await ctx.newCDPSession(page);
  const mesure = async () => {
    await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
    const m = await cdp.send('Performance.getMetrics').catch(() => ({ metrics: [] }));
    const g = k => (m.metrics.find(x => x.name === k) || {}).value || 0;
    const dom = await page.evaluate(() => ({
      noeuds: document.getElementsByTagName('*').length,
      canevas: document.getElementsByTagName('canvas').length
    }));
    return { heapMo: +(g('JSHeapUsedSize') / 1048576).toFixed(1), listeners: g('JSEventListeners'), ...dom };
  };

  await cdp.send('Performance.enable');
  const avant = await mesure();

  const TOURS = 400;
  await page.evaluate(async (n) => {
    const pick = sel => { const l = document.querySelectorAll(sel); return l[Math.floor(Math.random() * l.length)]; };
    for (let i = 0; i < n; i++) {
      const r = i % 5;
      if (r === 0) pick('[data-family]').click();
      else if (r === 1) pick('[data-pal]').click();
      else if (r === 2) pick('[data-dens]').click();
      else if (r === 3) document.getElementById('btnSeed').click();
      else pick('[data-theme]').click();
      if (i % 40 === 0) await new Promise(r => setTimeout(r, 30));
    }
    // et un aller-retour de langue
    document.querySelector('[data-lang="en"]').click();
    document.querySelector('[data-lang="fr"]').click();
  }, TOURS);
  await page.waitForTimeout(1500);

  const apres = await mesure();
  const dHeap = +(apres.heapMo - avant.heapMo).toFixed(1);
  console.log(`avant : ${avant.heapMo} Mo · ${avant.noeuds} nœuds · ${avant.canevas} canevas · ${avant.listeners} écouteurs`);
  console.log(`après ${TOURS} actions : ${apres.heapMo} Mo · ${apres.noeuds} nœuds · ${apres.canevas} canevas · ${apres.listeners} écouteurs`);
  console.log(`dérive : ${dHeap > 0 ? '+' : ''}${dHeap} Mo · ${apres.noeuds - avant.noeuds} nœuds · ${apres.canevas - avant.canevas} canevas · ${apres.listeners - avant.listeners} écouteurs`);
  console.log('erreurs :', errs.length ? errs.slice(0, 3).join(' | ') : 'aucune');

  const bad = errs.length > 0 || dHeap > 12 || (apres.noeuds - avant.noeuds) > 40 ||
              (apres.canevas - avant.canevas) !== 0 || (apres.listeners - avant.listeners) > 20;
  console.log(bad ? '\nDÉRIVE ANORMALE' : '\nAucune dérive.');
  await browser.close(); srv.close();
  process.exitCode = bad ? 1 : 0;
})();
