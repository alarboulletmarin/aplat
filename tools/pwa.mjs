/* Installable, et vraiment hors ligne.
 *
 * La promesse « dans les transports » ne tient que si l'application démarre
 * sans réseau : on l'ouvre, on attend que le Service Worker prenne la main, on
 * coupe, on recharge, et on vérifie qu'un motif est bien dessiné, polices
 * comprises, sans quoi le titre tomberait sur une police de secours au moment
 * précis où l'utilisateur n'a plus de quoi la télécharger.
 */
import fs from 'node:fs'
import path from 'node:path'
import { launch } from './pw.mjs'
import { ouvrir, RACINE } from './serveur.mjs'

const ok = [], ko = [];
/* Même séparateur que dans e2e.js : les deux produisent la même forme de
   rapport, et la flèche ne s'imbrique avec rien. */
const t = (cond, titre, extra) => (cond ? ok : ko).push(titre + (extra ? ' -> ' + extra : ''));

/** Largeur et hauteur déclarées dans l'en-tête IHDR d'un PNG. */
function taillePNG(fichier) {
  const tampon = fs.readFileSync(fichier);
  if (tampon.length < 24 || tampon.readUInt32BE(0) !== 0x89504e47) return null;
  return { l: tampon.readUInt32BE(16), h: tampon.readUInt32BE(20) };
}

(async () => {
  const { srv, port } = await ouvrir();
  const base = 'http://127.0.0.1:' + port;
  const browser = await launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3,
    locale: 'fr-FR', hasTouch: true, isMobile: true
  });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message));

  // --- 1. le manifeste
  const rep = await page.request.get(base + '/manifest.webmanifest');
  t(rep.ok(), 'manifeste : servi', String(rep.status()));
  let manifeste = {};
  try { manifeste = await rep.json(); } catch (e) { /* signalé ci-dessous */ }
  t(!!manifeste.name && !!manifeste.short_name, 'manifeste : nommé', manifeste.short_name);
  t(manifeste.display === 'standalone', 'manifeste : affichage autonome', manifeste.display);
  /* La portée reste la racine, elle couvre les deux pages. Le démarrage, lui,
     vise l'application : une application installée s'ouvre sur l'outil, pas sur
     sa présentation. */
  t(manifeste.start_url === '/app' && manifeste.scope === '/',
    'manifeste : démarre sur l\u2019app, portée à la racine',
    manifeste.start_url + ' dans ' + manifeste.scope);
  t(!!manifeste.theme_color && !!manifeste.background_color, 'manifeste : couleurs de démarrage');
  t(manifeste.lang === 'fr' && !!manifeste.description, 'manifeste : décrit, et dans une langue');

  const icones = manifeste.icons || [];
  const tailles = icones.map(i => i.sizes);
  t(tailles.includes('192x192') && tailles.includes('512x512'),
    'manifeste : les deux tailles attendues', tailles.join(' '));
  t(icones.some(i => i.purpose === 'maskable'),
    'manifeste : une icône maskable, pour ne pas être rognée');

  const mauvaises = [];
  for (const icone of icones) {
    const fichier = path.join(RACINE, 'dist', icone.src.replace(/^\//, ''));
    if (!fs.existsSync(fichier)) { mauvaises.push(icone.src + ' absente'); continue; }
    const taille = taillePNG(fichier);
    const [l, h] = icone.sizes.split('x').map(Number);
    if (!taille || taille.l !== l || taille.h !== h) {
      mauvaises.push(icone.src + ' : ' + (taille ? taille.l + 'x' + taille.h : 'illisible'));
    }
  }
  t(mauvaises.length === 0, 'icônes : présentes et à la taille annoncée', mauvaises.join(' | ') || icones.length + ' fichiers');

  // --- 2. le Service Worker prend la main
  await page.goto(base + '/app?l=fr', { waitUntil: 'networkidle' });
  const enregistre = await page.evaluate(async () => {
    if (!navigator.serviceWorker) return 'pas de Service Worker';
    const inscription = await navigator.serviceWorker.ready;
    return inscription.active ? inscription.active.state : 'inactif';
  }).catch(e => 'échec : ' + e.message);
  t(enregistre === 'activated', 'service worker : activé', String(enregistre));

  /* Le premier chargement n'est pas contrôlé : c'est le rechargement qui l'est,
     et c'est lui qui compte pour une ouverture hors ligne. */
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  t(await page.evaluate(() => !!navigator.serviceWorker.controller),
    'service worker : contrôle la page au rechargement');

  // --- 3. hors ligne
  await ctx.setOffline(true);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const horsLigne = await page.evaluate(() => ({
    titre: (document.querySelector('.titre') || {}).textContent,
    peint: (document.getElementById('apercu') || {}).dataset?.peint === '1',
    vignettes: [...document.querySelectorAll('canvas[data-vignette]')].filter(c => c.dataset.peint).length,
    police: document.fonts.check('16px Anton'),
    cta: (document.getElementById('cta-libelle') || {}).textContent
  }));
  t(horsLigne.titre === 'Aplat', 'hors ligne : la page se charge', String(horsLigne.titre));
  t(horsLigne.peint, 'hors ligne : le motif est calculé');
  t(horsLigne.vignettes > 0, 'hors ligne : les vignettes aussi', horsLigne.vignettes + ' dessinées');
  t(horsLigne.police, 'hors ligne : la police du titre est là, pas une police de secours');
  t(horsLigne.cta === 'Télécharger', 'hors ligne : les libellés sont là', String(horsLigne.cta));

  // --- 4. un export réel, sans réseau
  const telechargements = [];
  page.on('download', d => telechargements.push(d.suggestedFilename()));
  await page.$eval('#btn-export', e => e.click());
  await page.waitForTimeout(3000);
  t(telechargements.length === 1, 'hors ligne : le téléchargement fonctionne', telechargements.join(', ') || 'aucun');

  /* Les trois adresses sont le même document : le repli de navigation les
     sert toutes hors ligne, et une installation dont la présentation ou
     l'explication tomberait en 404 serait à moitié installée. */
  const pageMoteur = await ctx.newPage();
  await pageMoteur.goto(base + '/moteur?l=fr', { waitUntil: 'load' });
  await pageMoteur.waitForTimeout(1200);
  t(await pageMoteur.locator('.moteur').count() === 1,
    'hors ligne : la page du mécanisme se charge aussi');
  await pageMoteur.close();

  await ctx.setOffline(false);
  t(erreurs.length === 0, 'aucune erreur JavaScript', erreurs.slice(0, 3).join(' | '));

  await browser.close();
  srv.close();

  for (const l of ok) console.log('  ok   ' + l);
  if (ko.length) {
    console.log('\n' + ko.length + ' ECHECS :');
    for (const l of ko) console.log('  KO   ' + l);
    process.exitCode = 1;
  } else console.log('\n' + ok.length + ' vérifications passent.');
})();
