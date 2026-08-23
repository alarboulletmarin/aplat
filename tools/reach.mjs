/* Chaque contrôle doit être atteignable au doigt : on cherche une position de
   défilement où le centre du contrôle répond bien au test de pointage, et on
   vérifie la cible de 44 px.

   Puis on vérifie que la scène collante, une fois collée en haut, tient
   entière au-dessus de la barre d'action. Sans ça, l'aperçu et le verdict de
   lisibilité restent coupés quelle que soit la position de défilement : c'est
   ce qui se passait en paysage, où la scène était calculée pour un écran
   debout. */
import path from 'node:path'
import { launch } from './pw.mjs'
import { ouvrir } from './serveur.mjs'
let PORT = 0;

const CASES = [
  { name: 'phone 390x844', vp: { width: 390, height: 844 }, dsf: 3, mobile: true },
  { name: 'phone 360x640', vp: { width: 360, height: 640 }, dsf: 3, mobile: true },
  { name: 'phone 320x568', vp: { width: 320, height: 568 }, dsf: 2, mobile: true },
  { name: 'phone paysage 844x390', vp: { width: 844, height: 390 }, dsf: 3, mobile: true },
  { name: 'tablet 834x1112', vp: { width: 834, height: 1112 }, dsf: 2, mobile: true },
  { name: 'desktop court 1180x550', vp: { width: 1180, height: 550 }, dsf: 2, mobile: false },
  { name: 'desktop 1280x900', vp: { width: 1280, height: 900 }, dsf: 2, mobile: false },
  { name: 'desktop 1440x900', vp: { width: 1440, height: 900 }, dsf: 2, mobile: false }
];

(async () => {
  const { srv, port } = await ouvrir(); PORT = port;
  const browser = await launch();
  let bad = 0;

  for (const c of CASES) {
    const ctx = await browser.newContext({
      viewport: c.vp, deviceScaleFactor: c.dsf, colorScheme: 'light', locale: 'fr-FR',
      hasTouch: c.mobile, isMobile: c.mobile
    });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/?l=fr`, { waitUntil: 'networkidle' });
    await page.evaluate(() => { const s = document.getElementById('res-select'); s.value = 'surMesure'; s.dispatchEvent(new Event('change', { bubbles: true })); });   // ouvre l'éditeur de résolution
    await page.waitForTimeout(300);

    const report = await page.evaluate(() => {
      const sel = 'button, input, a[href], [tabindex]:not([tabindex="-1"])';
      const nodes = [...document.querySelectorAll(sel)].filter(n => n.offsetParent !== null || n.classList.contains('skip'));
      const out = [];
      const maxY = document.documentElement.scrollHeight - innerHeight;

      for (const n of nodes) {
        if (n.classList.contains('skip')) continue;
        let ok = false, best = null;
        // balaie le document par pas de 40 px et cherche une position où ça clique
        for (let y = 0; y <= maxY + 40 && !ok; y += 40) {
          scrollTo(0, Math.min(y, maxY));
          const r = n.getBoundingClientRect();
          if (r.bottom < 0 || r.top > innerHeight) continue;
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          if (cy < 0 || cy > innerHeight || cx < 0 || cx > innerWidth) continue;
          const hit = document.elementFromPoint(cx, cy);
          if (hit && (hit === n || n.contains(hit))) { ok = true; best = { y: Math.min(y, maxY) }; }
        }
        const r = n.getBoundingClientRect();
        out.push({
          id: n.id || n.dataset.famille || n.dataset.palette || n.dataset.densite || n.dataset.langue ||
              n.dataset.theme || n.dataset.preset || (n.textContent || '').trim().slice(0, 24) || n.tagName,
          ok, w: Math.round(r.width), h: Math.round(r.height), at: best && best.y
        });
      }
      scrollTo(0, 0);
      return out;
    });

    // la scène collée doit tenir entière au-dessus de la barre d'action
    const couvert = await page.evaluate(() => {
      const maxY = document.documentElement.scrollHeight - innerHeight;
      scrollTo(0, Math.min(maxY, 1200));
      const scene = document.querySelector('.scene').getBoundingClientRect();
      const barre = document.querySelector('.barre').getBoundingClientRect();
      const appareil = document.getElementById('appareil').getBoundingClientRect();
      const verdict = document.querySelector('.verdict').getBoundingClientRect();
      scrollTo(0, 0);
      /* Sous 760 px la scène est collante et recouvre la page ; au-delà elle
         tient dans sa colonne et ne recouvre plus rien, mais la barre la
         recouvre toujours, elle. */
      return {
        collee: Math.round(scene.top) <= 1,
        apercu: Math.round(appareil.bottom - barre.top),
        verdict: Math.round(verdict.bottom - barre.top)
      };
    });
    const sousLaBarre = couvert.collee && (couvert.apercu > 1 || couvert.verdict > 1);

    const unreachable = report.filter(r => !r.ok);
    const small = report.filter(r => r.ok && (r.h < 44 || r.w < 44));
    console.log(`\n=== ${c.name} : ${report.length} contrôles ===`);
    if (unreachable.length) { bad++; console.log('  INATTEIGNABLES: ' + unreachable.map(r => r.id).join(', ')); }
    else console.log('  atteignables: tous');
    if (small.length) console.log('  < 44 px: ' + small.map(r => `${r.id}(${r.w}x${r.h})`).join(', '));
    else console.log('  cibles >= 44 px: toutes');
    if (sousLaBarre) {
      bad++;
      console.log(`  SCÈNE COUPÉE PAR LA BARRE: aperçu ${couvert.apercu} px, verdict ${couvert.verdict} px dessous`);
    } else {
      console.log(`  scène collée : entière au-dessus de la barre (aperçu ${-couvert.apercu} px, verdict ${-couvert.verdict} px de marge)`);
    }
    await ctx.close();
  }

  await browser.close();
  srv.close();
  process.exitCode = bad ? 1 : 0;
})();
