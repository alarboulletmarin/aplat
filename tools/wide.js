const { launch } = require('./pw');
const { start } = require('./serve');
let PORT = 0;
const STRETCH = `(() => {
  const pad = s => typeof s === 'string' && s.length > 2 ? s + '\\u00a0' + 'x'.repeat(Math.max(1, Math.round(s.length * 0.3))) : s;
  for (const lang of ['fr','en']) { const T = window.APLAT_I18N[lang];
    for (const k of Object.keys(T)) { if (typeof T[k] === 'string') T[k] = pad(T[k]); else if (Array.isArray(T[k])) T[k] = T[k].map(pad); } }
  for (const f of window.APLAT_ENGINE.FAMILIES) { f.fr = pad(f.fr); f.en = pad(f.en); }
  for (const k of Object.keys(window.APLAT_ENGINE.PALETTES)) { const P = window.APLAT_ENGINE.PALETTES[k]; P.fr = pad(P.fr); P.en = pad(P.en); }
})()`;
(async () => {
  const { srv, port } = start(); PORT = port;
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, locale: 'fr-FR', hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/?l=fr`, { waitUntil: 'networkidle' });
  await page.evaluate(STRETCH);
  await page.evaluate(() => document.querySelectorAll('[data-family]')[0].click());
  await page.evaluate(() => { const s = document.getElementById('resSelect'); s.value = 'custom'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(300);
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
