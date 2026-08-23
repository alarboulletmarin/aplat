/* Capture l'écran dans plusieurs contextes et remonte les erreurs console. */
import fs from 'node:fs'
import path from 'node:path'
import { launch } from './pw.mjs'
import { ouvrir } from './serveur.mjs'
import { fileURLToPath } from 'node:url'

/* Le dossier de ce fichier : `__dirname` n'existe pas dans un module ES. */
const ICI = fileURLToPath(new URL('.', import.meta.url))

const OUT = process.env.SHOT_OUT || path.resolve(ICI, '../.shots');
let PORT = 0;

/* `p` est le chemin : l'application est sous `/app`, la page d'accueil à la
   racine. Les deux passent ici, parce que la promesse « aucun réseau » porte
   sur le document servi, pas sur l'une de ses pages. */
const CASES = [
  { name: 'phone-fr-light', p: '/app', w: 390, h: 844, dsf: 3, scheme: 'light', q: '?l=fr' },
  { name: 'phone-fr-dark', p: '/app', w: 390, h: 844, dsf: 3, scheme: 'dark', q: '?l=fr&t=sombre' },
  { name: 'phone-en-light', p: '/app', w: 390, h: 844, dsf: 3, scheme: 'light', q: '?l=en' },
  { name: 'desktop-fr-light', p: '/app', w: 1280, h: 900, dsf: 2, scheme: 'light', q: '?l=fr' },
  { name: 'desktop-fr-dark', p: '/app', w: 1280, h: 900, dsf: 2, scheme: 'dark', q: '?l=fr' },
  { name: 'tablet-en-dark', p: '/app', w: 834, h: 1112, dsf: 2, scheme: 'dark', q: '?l=en&r=2048x2732' },
  { name: 'desk-target', p: '/app', w: 1280, h: 900, dsf: 2, scheme: 'light', q: '?l=fr&r=2560x1440' },
  { name: 'narrow-360', p: '/app', w: 360, h: 740, dsf: 3, scheme: 'light', q: '?l=en' },
  { name: 'accueil-desk-fr-light', p: '/', w: 1280, h: 900, dsf: 2, scheme: 'light', q: '?l=fr' },
  { name: 'accueil-desk-fr-dark', p: '/', w: 1280, h: 900, dsf: 2, scheme: 'dark', q: '?l=fr' },
  { name: 'accueil-phone-fr-light', p: '/', w: 390, h: 844, dsf: 3, scheme: 'light', q: '?l=fr' },
  { name: 'accueil-desk-en-light', p: '/', w: 1280, h: 900, dsf: 2, scheme: 'light', q: '?l=en' }
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

    await page.goto(`http://127.0.0.1:${PORT}${c.p}${c.q}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    /* Les toiles de l'accueil ne se peignent qu'en approchant du champ de
       vision : une capture pleine page les prendrait vides. On parcourt la
       page avant de capturer. */
    if (c.p === '/') {
      const bas = await page.evaluate(() => document.body.scrollHeight);
      for (let y = 0; y < bas; y += c.h) {
        await page.evaluate(v => window.scrollTo(0, v), y);
        await page.waitForTimeout(260);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: path.join(OUT, `${c.name}.png`), fullPage: true });
    if (external.length) problems.push(`${c.name}: REQUÊTES EXTERNES ${external.join(', ')}`);
    await ctx.close();
  }

  await browser.close();
  srv.close();
  if (problems.length) { console.log('PROBLÈMES:\n' + problems.join('\n')); process.exitCode = 1; }
  else console.log('OK : aucune erreur console, aucune requête externe.');
})();
