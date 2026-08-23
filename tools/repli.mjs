/* Le repli au défilement : ce qu'il rend, et ce qu'il ne casse pas.
 *
 * Sur téléphone en portrait, la scène collante, le verdict et la barre
 * d'action prenaient les deux tiers de l'écran ; il ne restait presque rien
 * pour choisir parmi dix-huit familles et onze palettes. Dès que la page
 * défile, l'aperçu se replie en vignette et le verdict passe sur une ligne.
 *
 * Trois choses à vérifier, et une seule façon honnête de le faire : défiler
 * pour de bon, en laissant à la page le temps de répondre. Un balayage
 * synchrone ne verrait jamais l'état replié, et conclurait sur l'état déplié.
 *
 * `reach.mjs` reste le juge de l'atteignabilité au doigt : ici on demande
 * davantage, que la puce soit ENTIÈREMENT dégagée des deux couches collantes,
 * ce qu'aucune carte de motif ne faisait sur un petit téléphone.
 */
import { launch } from './pw.mjs'
import { ouvrir } from './serveur.mjs'

const CAS = [
  /* `libre` : la part de la hauteur de la fenêtre laissée aux grilles une fois
     la page défilée.

     `replie` : le repli de l'aperçu en vignette. Il ne sert que là où la scène
     recouvre les réglages, c'est-à-dire sur une seule colonne, sous 360 px.
     Dès 360 px la page est sur deux colonnes : l'aperçu est épinglé dans la
     sienne, à côté du panneau et non devant lui, et il n'a plus rien à rendre
     en se repliant.

     C'est ce qui fait monter les chiffres d'un coup. Sur une colonne, la scène
     collante mangeait la moitié de la fenêtre ; à côté, elle n'en prend plus
     rien. Sous 360 px, où la colonne unique demeure, le repli reste seul à
     tenir les grilles, et l'en-tête collant lui coûte ses douze points : la
     barre, le verdict replié et les cibles de 44 px y sont tous au minimum, il
     n'y a rien à reprendre ailleurs.

     Ce sont des planchers mesurés : ils tiennent la régression, pas l'ambition. */
  { nom: 'phone 390x844', vp: { width: 390, height: 844 }, dsf: 3, mobile: true, replie: false, libre: 75 },
  { nom: 'phone 430x932', vp: { width: 430, height: 932 }, dsf: 3, mobile: true, replie: false, libre: 78 },
  { nom: 'phone 360x640', vp: { width: 360, height: 640 }, dsf: 3, mobile: true, replie: false, libre: 70 },
  { nom: 'phone 320x568', vp: { width: 320, height: 568 }, dsf: 2, mobile: true, replie: true, libre: 35 },
  { nom: 'phone paysage 844x390', vp: { width: 844, height: 390 }, dsf: 3, mobile: true, replie: false, libre: 55 },
  { nom: 'tablet 834x1112', vp: { width: 834, height: 1112 }, dsf: 2, mobile: true, replie: false, libre: 55 },
  { nom: 'desktop 1280x900', vp: { width: 1280, height: 900 }, dsf: 2, mobile: false, replie: false, libre: 55 },
  { nom: 'desktop 1440x900', vp: { width: 1440, height: 900 }, dsf: 2, mobile: false, replie: false, libre: 55 }
];

/* Dix motifs valides, écrits avant le premier rendu. */
const PLEIN = JSON.stringify(
  ['vagues', 'blobs', 'arches', 'decoupes', 'obliques', 'ondes', 'pointille', 'trame', 'colonnes', 'ecailles']
    .map((m, i) => ({ m, p: 'lime', d: 1, s: i + 1 }))
);

const ok = [], ko = [];
const t = (cond, label, extra) => (cond ? ok : ko).push(label + (extra ? ' -> ' + extra : ''));

(async () => {
  const { srv, port } = await ouvrir();
  const browser = await launch();

  for (const c of CAS) {
    const ctx = await browser.newContext({
      viewport: c.vp, deviceScaleFactor: c.dsf, colorScheme: 'light',
      locale: 'fr-FR', hasTouch: c.mobile, isMobile: c.mobile
    });
    const page = await ctx.newPage();
    /* Historique plein dès le premier rendu : c'est le cas le plus lourd, dix
       vignettes de plus à dégager des deux couches, et surtout une mise en
       page qui ne bouge plus. Sans lui, la carte apparaît au bout de deux
       secondes et demie, en plein balayage, et décale ce qu'on est en train de
       mesurer. */
    await page.addInitScript(plein => {
      try { localStorage.setItem('aplat:motifs', plein); } catch (e) { /* stockage refusé */ }
    }, PLEIN);
    await page.goto(`http://127.0.0.1:${port}/app?l=fr`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // 1. en haut de page, l'aperçu est déplié
    const haut = await page.evaluate(() => ({
      replie: !!document.querySelector('.scene-boite-repliee'),
      hauteur: Math.round(document.getElementById('appareil').getBoundingClientRect().height)
    }));
    t(!haut.replie, `${c.nom} : déplié en haut de page`, haut.hauteur + ' px');

    // 2. numérote les contrôles, puis balaie le document en attendant la page
    const total = await page.evaluate(() => {
      const noeuds = [...document.querySelectorAll('button, input, select, a[href]')]
        .filter(n => n.offsetParent !== null && !n.closest('.evitement') && !n.closest('.barre'));
      noeuds.forEach((n, i) => { n.dataset.scan = String(i); });
      return noeuds.length;
    });
    const vus = new Set();
    const maxY = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    for (let y = 0; y <= maxY + 40; y += 40) {
      await page.evaluate(y => scrollTo(0, y), Math.min(y, maxY));
      await page.waitForTimeout(60);
      const degages = await page.evaluate(() => {
        const scene = document.querySelector('.scene');
        const rs = scene.getBoundingClientRect();
        const rb = document.querySelector('.barre').getBoundingClientRect();
        /* Trois couches collantes, pas deux : l'en-tête recouvre le haut de la
           page à toute largeur, la scène seulement sous 360 px, la seule
           largeur où la page tient encore sur une colonne. Le seuil est celui
           de `.colonnes` dans `ecrans.css`. */
        const re = document.querySelector('.entete').getBoundingClientRect();
        const recouvre = getComputedStyle(scene).position === 'sticky' && innerWidth < 360;
        const out = [];
        for (const n of document.querySelectorAll('[data-scan]')) {
          const b = n.getBoundingClientRect();
          if (b.top < 0 || b.bottom > innerHeight) continue;
          if (b.bottom > rb.top + 0.5) continue;
          if (b.top < re.bottom - 0.5) continue;
          /* Un contrôle de la scène est dans la couche collante, pas dessous :
             il ne peut pas s'en dégager, et n'a pas à le faire. La barre est
             écartée de la même façon, à la constitution de la liste. */
          if (recouvre && !n.closest('.scene') && b.top < rs.bottom - 0.5) continue;
          out.push(Number(n.dataset.scan));
        }
        return out;
      });
      for (const i of degages) vus.add(i);
    }
    const caches = await page.evaluate(vus => [...document.querySelectorAll('[data-scan]')]
      .filter(n => !vus.includes(Number(n.dataset.scan)))
      .map(n => n.id || n.dataset.famille || n.dataset.palette || n.dataset.densite ||
        n.dataset.langue || n.dataset.theme || (n.textContent || '').trim().slice(0, 18)), [...vus]);
    t(caches.length === 0,
      `${c.nom} : chaque contrôle se dégage entièrement des deux couches collantes`,
      caches.length ? caches.join(', ') : total + ' contrôles');

    // 3. une fois défilé : état du repli, et hauteur rendue aux grilles
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(400);
    await page.evaluate(() => scrollTo(0, 700));
    await page.waitForTimeout(600);
    const bas = await page.evaluate(() => {
      const scene = document.querySelector('.scene').getBoundingClientRect();
      const barre = document.querySelector('.barre').getBoundingClientRect();
      const entete = document.querySelector('.entete').getBoundingClientRect();
      const haut = Math.max(0, entete.bottom, innerWidth < 360 ? scene.bottom : 0);
      return {
        replie: !!document.querySelector('.scene-boite-repliee'),
        bascule: !!document.getElementById('verdict-bascule'),
        libre: Math.round(((barre.top - haut) / innerHeight) * 100)
      };
    });
    t(bas.replie === c.replie, `${c.nom} : replié au défilement`, String(bas.replie));
    t(bas.libre >= c.libre, `${c.nom} : hauteur rendue aux grilles`, bas.libre + ' %, attendu >= ' + c.libre + ' %');

    // 4. le verdict replié se déplie au doigt, et l'aperçu revient en remontant
    if (bas.bascule) {
      const avant = await page.evaluate(() => document.getElementById('verdict-detail').hidden);
      await page.$eval('#verdict-bascule', e => e.click());
      await page.waitForTimeout(200);
      const apres = await page.evaluate(() => ({
        cache: document.getElementById('verdict-detail').hidden,
        etendu: document.getElementById('verdict-bascule').getAttribute('aria-expanded'),
        detail: document.getElementById('verdict-detail').textContent
      }));
      t(avant && !apres.cache && apres.etendu === 'true',
        `${c.nom} : le verdict replié se déplie au doigt`, apres.detail.slice(0, 40));
      t(/:1/.test(apres.detail),
        `${c.nom} : le détail garde le rapport exact`, apres.detail.slice(0, 24));
    }
    if (c.replie) {
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(600);
      const remonte = await page.evaluate(() => !!document.querySelector('.scene-boite-repliee'));
      t(!remonte, `${c.nom} : l'aperçu se déplie en remontant`);
    }

    await ctx.close();
  }

  await browser.close();
  srv.close();

  console.log(ok.length + ' vérifications passent :');
  for (const l of ok) console.log('  ok   ' + l);
  if (ko.length) { console.log('\n' + ko.length + ' ECHECS :'); for (const l of ko) console.log('  KO   ' + l); }
  process.exitCode = ko.length ? 1 : 0;
})();
