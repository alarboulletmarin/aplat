/* Capture l'écran dans plusieurs contextes et remonte les erreurs console. */
const fs = require('fs');
const path = require('path');
const { launch } = require('./pw');
const { ouvrir } = require('./serveur');

const OUT = process.env.SHOT_OUT || path.resolve(__dirname, '../.shots');
let PORT = 0;

const CASES = [
  { name: 'phone-fr-light', w: 390, h: 844, dsf: 3, scheme: 'light', q: '?l=fr' },
  { name: 'phone-fr-dark', w: 390, h: 844, dsf: 3, scheme: 'dark', q: '?l=fr&t=dark' },
  { name: 'phone-en-light', w: 390, h: 844, dsf: 3, scheme: 'light', q: '?l=en' },
  { name: 'desktop-fr-light', w: 1280, h: 900, dsf: 2, scheme: 'light', q: '?l=fr' },
  { name: 'desktop-fr-dark', w: 1280, h: 900, dsf: 2, scheme: 'dark', q: '?l=fr' },
  { name: 'tablet-en-dark', w: 834, h: 1112, dsf: 2, scheme: 'dark', q: '?l=en&r=2048x2732' },
  { name: 'desk-target', w: 1280, h: 900, dsf: 2, scheme: 'light', q: '?l=fr&r=2560x1440' },
  { name: 'narrow-360', w: 360, h: 740, dsf: 3, scheme: 'light', q: '?l=en' }
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { srv, port } = await ouvrir(); PORT = port;
  const browser = await launch();
  const problems = [];

  for (const c of CASES) {
    const ctx = await browser.newContext({
      viewport: { width: c.w, height: c.h },
      deviceScaleFactor: c.dsf,
      colorScheme: c.scheme,
      locale: c.q.includes('l=en') ? 'en-US' : 'fr-FR'
    });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') problems.push(`${c.name}: console ${m.text()}`); });
    page.on('pageerror', e => problems.push(`${c.name}: pageerror ${e.message}`));
    page.on('requestfailed', r => problems.push(`${c.name}: requestfailed ${r.url()}`));
    const external = [];
    page.on('request', r => {
      const u = r.url();
      if (!u.startsWith(`http://127.0.0.1:${PORT}`) && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u);
    });

    await page.goto(`http://127.0.0.1:${PORT}/${c.q}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, `${c.name}.png`), fullPage: true });
    if (external.length) problems.push(`${c.name}: REQUÊTES EXTERNES ${external.join(', ')}`);
    await ctx.close();
  }

  await browser.close();
  srv.close();
  if (problems.length) { console.log('PROBLÈMES:\n' + problems.join('\n')); process.exitCode = 1; }
  else console.log('OK — aucune erreur console, aucune requête externe.');
})();
