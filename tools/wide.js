const { launch } = require('./pw');
const { ouvrir } = require('./serveur');
let PORT = 0;
/* Même allongement que overflow.js : sur le DOM, parce que React rend depuis
   ses modules et qu'une donnée modifiée après coup serait réécrite. */
const STRETCH = `(() => {
  const pad = s => {
    const net = s.trim();
    if (net.length <= 2) return s;
    const liant = net.length <= 24 ? '\\u00a0' : ' ';
    return s + liant + 'x'.repeat(Math.max(1, Math.round(net.length * 0.3)));
  };
  const marche = document.createTreeWalker(document.getElementById('root'), NodeFilter.SHOW_TEXT);
  const noeuds = [];
  while (marche.nextNode()) noeuds.push(marche.currentNode);
  for (const n of noeuds) if (n.textContent.trim()) n.textContent = pad(n.textContent);
})()`;
(async () => {
  const { srv, port } = await ouvrir(); PORT = port;
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, locale: 'fr-FR', hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/?l=fr`, { waitUntil: 'networkidle' });
  await page.evaluate(() => { const s = document.getElementById('res-select'); s.value = 'surMesure'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(300);
  await page.evaluate(STRETCH);
  await page.waitForTimeout(200);
  const out = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const bad = [];
    for (const n of document.querySelectorAll('*')) {
      if (n.offsetParent === null && n !== document.body) continue;
      const r = n.getBoundingClientRect();
      if (r.right > vw + 0.5 || r.left < -0.5) {
        bad.push({
          tag: n.tagName, id: n.id, cls: typeof n.className === 'string' ? n.className : '',
          left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width),
          txt: (n.textContent || '').trim().slice(0, 34),
          parent: n.parentElement ? (n.parentElement.id || n.parentElement.className) : ''
        });
      }
    }
    return { vw, scrollW: document.documentElement.scrollWidth, bad: bad.slice(0, 14) };
  });
  console.log('viewport', out.vw, 'scrollWidth', out.scrollW);
  for (const b of out.bad) console.log(`  ${b.tag}#${b.id}.${b.cls} [${b.left}..${b.right}] w=${b.w} parent=${b.parent} "${b.txt}"`);
  await browser.close(); srv.close();
})();
