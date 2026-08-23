/* La page d'accueil, sur « / ».
 *
 * Ce que ce contrôle tient fermé, dans l'ordre où ça casse :
 *
 * 1. Les deux adresses. `/` présente, `/app` fait tourner, et un lien partagé
 *    du temps où l'application vivait à la racine ouvre encore son motif.
 * 2. Les deux bascules. Elles écrivent dans l'adresse, elles retournent le
 *    document, et leur nom accessible dit ce qu'un appui donnera.
 * 3. Les toiles. Aucune image de la page n'est un fichier : si le moteur
 *    cesse d'y tourner, il ne reste rien à voir, et une page vide se remarque
 *    moins qu'une image cassée.
 * 4. Les cibles et la largeur. Quarante-quatre pixels, comme partout ailleurs,
 *    et aucun défilement de côté, de 320 px à 1280.
 */
import { launch } from './pw.mjs'
import { ouvrir } from './serveur.mjs'

let echecs = 0;
function t(condition, titre, detail = '') {
  if (!condition) echecs += 1;
  console.log(`${condition ? 'ok  ' : 'ÉCHEC'} ${titre}${detail ? '  (' + detail + ')' : ''}`);
}

/** Parcourt la page : les toiles ne se peignent qu'en approchant du champ. */
async function derouler(page) {
  const bas = await page.evaluate(() => document.body.scrollHeight);
  const pas = await page.evaluate(() => window.innerHeight);
  for (let y = 0; y < bas; y += pas) {
    await page.evaluate(v => window.scrollTo(0, v), y);
    await page.waitForTimeout(260);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
}

(async () => {
  const { srv, port } = await ouvrir();
  const base = 'http://127.0.0.1:' + port;
  const browser = await launch();

  /* --- 1. les deux adresses ------------------------------------------------ */

  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 }, colorScheme: 'light', locale: 'fr-FR'
  });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });

  await page.goto(base + '/?l=fr', { waitUntil: 'networkidle' });
  t(await page.locator('.accueil').count() === 1, 'la racine sert la présentation');
  t(await page.locator('.page').count() === 0, 'la racine ne monte pas l’application');

  await page.goto(base + '/app?l=fr', { waitUntil: 'networkidle' });
  t(await page.locator('.page').count() === 1, '/app sert l’application');
  t(await page.locator('.accueil').count() === 0, '/app ne monte pas la présentation');

  /* Le lien qu'on a envoyé à quelqu'un du temps où l'application vivait à la
     racine. Il porte une image : la perdre, c'est perdre la promesse. */
  await page.goto(base + '/?m=blobs&p=nuit&d=2&s=4242&l=fr', { waitUntil: 'networkidle' });
  const reconduit = new URL(page.url());
  t(reconduit.pathname === '/app', 'un lien partagé d’avant retombe sur l’application',
    reconduit.pathname);
  t(reconduit.searchParams.get('m') === 'blobs' && reconduit.searchParams.get('s') === '4242',
    'et il y arrive avec son motif intact', reconduit.search);

  /* Une adresse qui ne porte que de l'affichage reste sur la présentation :
     sans quoi la page d'accueil perdrait ses visiteurs anglophones. */
  await page.goto(base + '/?l=en&t=sombre', { waitUntil: 'networkidle' });
  t(new URL(page.url()).pathname === '/', 'la langue et le thème seuls ne reconduisent pas');
  t(await page.locator('.accueil').count() === 1, 'et la présentation est bien là');

  /* --- 2. les deux bascules ------------------------------------------------ */

  await page.goto(base + '/?l=fr&t=clair', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  const langue = page.locator('.bascule-langue');
  const theme = page.locator('.bascule-theme');

  t(await langue.getAttribute('lang') === 'en',
    'la bascule de langue est écrite dans la langue d’arrivée');
  const nomLangue = await langue.getAttribute('aria-label');
  t(/^EN\b/.test(nomLangue || ''),
    'son nom accessible commence par le code visible', nomLangue);
  t(await theme.getAttribute('aria-label') === 'Passer au thème sombre',
    'la bascule de thème dit ce qu’un appui donnera',
    await theme.getAttribute('aria-label'));

  await theme.click();
  await page.waitForTimeout(300);
  t(await page.evaluate(() => document.documentElement.dataset.theme) === 'sombre',
    'un appui sur le thème retourne le document');
  t(new URL(page.url()).searchParams.get('t') === 'sombre',
    'et l’écrit dans l’adresse', page.url().split('?')[1]);
  t(await page.locator('.bascule-theme').getAttribute('aria-label') === 'Passer au thème clair',
    'le bouton annonce alors le chemin inverse');

  await langue.click();
  await page.waitForTimeout(300);
  t(await page.evaluate(() => document.documentElement.lang) === 'en',
    'un appui sur la langue retourne le document');
  t(new URL(page.url()).searchParams.get('l') === 'en',
    'et l’écrit dans l’adresse', page.url().split('?')[1]);
  t((await page.locator('.bascule-langue').getAttribute('aria-label') || '').startsWith('FR'),
    'le bouton annonce alors le chemin inverse');

  /* Le lien d'entrée emporte les deux : personne ne choisit sa langue deux
     fois. */
  const entree = new URL(await page.locator('.enseigne-app').getAttribute('href'), base);
  t(entree.pathname === '/app', 'le lien d’entrée mène à l’application', entree.pathname);
  t(entree.searchParams.get('l') === 'en' && entree.searchParams.get('t') === 'sombre',
    'et emporte la langue et le thème choisis ici', entree.search);

  /* Sans choix explicite, le thème ne s'écrit pas : l'absence de choix
     s'écrit par l'absence, et le lien suit. */
  await page.goto(base + '/?l=fr', { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);
  const nu = new URL(await page.locator('.enseigne-app').getAttribute('href'), base);
  t(!nu.searchParams.has('t'), 'le thème « système » ne part pas dans le lien', nu.search);

  /* --- 3. les toiles ------------------------------------------------------- */

  await derouler(page);
  const toiles = await page.evaluate(() => {
    const n = [...document.querySelectorAll('canvas')];
    return { total: n.length, peintes: n.filter(c => c.dataset.peint).length };
  });
  t(toiles.total >= 15, 'la page montre le moteur, pas des images',
    toiles.total + ' toiles');
  t(toiles.peintes === toiles.total, 'et toutes finissent par se peindre',
    toiles.peintes + '/' + toiles.total);

  /* Une vignette touchée retire sa graine : c'est le seul mouvement de la
     page, et il doit changer quelque chose. */
  const tuile = page.locator('.tuile').first();
  const avant = await tuile.locator('canvas').evaluate(c => c.toDataURL().length);
  await tuile.click();
  await page.waitForTimeout(500);
  const apres = await tuile.locator('canvas').evaluate(c => c.toDataURL().length);
  t(avant !== apres, 'une vignette touchée redessine son motif');

  /* --- 4. les cibles et la largeur ------------------------------------------
     Mesurées sur cinq cadrages : c'est l'enseigne, où la marque, deux
     bascules et l'entrée se partagent une ligne, qui cède en premier. La
     largeur de 320 px est celle qu'`overflow.mjs` tient pour l'application. */

  const CADRAGES = [
    { nom: '320x568', l: 320, h: 568 },
    { nom: '360x740', l: 360, h: 740 },
    { nom: '390x844', l: 390, h: 844 },
    { nom: '834x1112', l: 834, h: 1112 },
    { nom: '1280x900', l: 1280, h: 900 },
  ];

  for (const cadrage of CADRAGES) {
    const c = await browser.newContext({
      viewport: { width: cadrage.l, height: cadrage.h },
      colorScheme: 'light', locale: 'fr-FR', hasTouch: cadrage.l < 800, isMobile: cadrage.l < 800
    });
    const p = await c.newPage();
    await p.goto(base + '/?l=fr', { waitUntil: 'networkidle' });
    await p.waitForTimeout(300);

    const petites = await p.evaluate(() => {
      const mauvaises = [];
      for (const n of document.querySelectorAll('.accueil a, .accueil button')) {
        const b = n.getBoundingClientRect();
        if (b.width < 1 && b.height < 1) continue;
        if (b.height < 44 || b.width < 44) {
          mauvaises.push((n.className || n.tagName) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height));
        }
      }
      return mauvaises;
    });
    t(petites.length === 0, `${cadrage.nom} : aucune cible sous 44 px`, petites.join(' | '));

    const deborde = await p.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    t(deborde <= 1, `${cadrage.nom} : la page ne défile pas de côté`, deborde + ' px');

    await c.close();
  }

  /* Un seul titre de premier niveau, et l'ordre des niveaux tenu. */
  const titres = await page.evaluate(() =>
    [...document.querySelectorAll('h1, h2, h3')].map(n => Number(n.tagName[1])));
  t(titres.filter(n => n === 1).length === 1, 'un seul h1', String(titres.filter(n => n === 1).length));
  let saut = '';
  for (let i = 1; i < titres.length; i += 1) {
    if (titres[i] - titres[i - 1] > 1) saut = `h${titres[i - 1]} puis h${titres[i]}`;
  }
  t(saut === '', 'aucun niveau de titre sauté', saut);

  t(erreurs.length === 0, 'aucune erreur de page', erreurs.join(' | '));

  await ctx.close();
  await browser.close();
  srv.close();

  console.log(echecs ? `\n${echecs} vérification(s) en échec.` : '\nLa page d’accueil tient.');
  process.exit(echecs ? 1 : 0);
})();
