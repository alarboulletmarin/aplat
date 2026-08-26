/* La page du mécanisme, sur « /moteur ».
 *
 * Ce que ce contrôle tient fermé, dans l'ordre où ça casse :
 *
 * 1. La troisième adresse. `/moteur` sert sa page et pas une autre, et un lien
 *    qui porte un motif y reste au lieu de rebondir vers l'application. C'est
 *    le point le plus facile à casser en simplifiant `route()`, et il se
 *    casserait en silence.
 * 2. Les toiles. Aucune image de la page n'est un fichier : si le moteur cesse
 *    d'y tourner, il ne reste rien à voir, et une page vide se remarque moins
 *    qu'une image cassée.
 * 3. Le fil. Les six étapes travaillent sur le même motif, et c'est la seule
 *    chose qui distingue cette page d'une documentation illustrée. Ce qu'on
 *    choisit à la première doit se retrouver dans le lien de la dernière, et
 *    les fiches de gestes, elles, ne doivent pas bouger.
 * 4. L'escalier des couches. L'arrêt vient du moteur : la dernière marche doit
 *    rendre exactement l'image que `dessiner` peint sans arrêt, faute de quoi
 *    la page enseignerait un ordre qui n'est plus celui du produit.
 * 5. Les cibles et la largeur. Quarante-quatre pixels, comme partout ailleurs,
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

  /* --- 1. la troisième adresse --------------------------------------------- */

  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 }, colorScheme: 'light', locale: 'fr-FR'
  });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });

  await page.goto(base + '/moteur', { waitUntil: 'networkidle' });
  t(await page.locator('.moteur').count() === 1, '/moteur sert la page du mécanisme');
  t(await page.locator('.page').count() === 0, '/moteur ne monte pas l’application');
  t((await page.locator('.etape').count()) === 6, 'les six étapes sont dans le document',
    String(await page.locator('.etape').count()));

  await page.goto(base + '/', { waitUntil: 'networkidle' });
  t(await page.locator('.moteur').count() === 0, '« / » ne monte pas la page du mécanisme');

  /* Un lien qui porte un motif désigne l'application ; sous « /moteur », il
     désigne l'explication et ne doit pas rebondir. */
  await page.goto(base + '/moteur?m=vagues&p=lime&d=1&s=7314', { waitUntil: 'networkidle' });
  t(new URL(page.url()).pathname === '/moteur',
    'un paramètre de motif ne fait pas rebondir la page', new URL(page.url()).pathname);
  t(await page.locator('.moteur').count() === 1, 'et la page rend quand même');

  /* --- 2. les toiles -------------------------------------------------------- */

  await page.goto(base + '/moteur', { waitUntil: 'networkidle' });
  await derouler(page);
  const toiles = await page.evaluate(() => {
    const n = [...document.querySelectorAll('canvas')];
    return { total: n.length, peintes: n.filter(c => c.dataset.peint).length };
  });
  t(toiles.total >= 18, 'la page montre le moteur, pas des images', toiles.total + ' toiles');
  t(toiles.peintes === toiles.total, 'et toutes finissent par se peindre',
    toiles.peintes + '/' + toiles.total);

  /* --- 3. le fil ------------------------------------------------------------ */

  const adresse = () => page.locator('.moteur-adresse code').innerText();
  const avantLien = await adresse();

  /* Une palette touchée à la première étape change l'adresse de la dernière. */
  await page.locator('.opt-pastille').nth(8).click();
  await page.waitForTimeout(400);
  const apresLien = await adresse();
  t(avantLien !== apresLien, 'un réglage de l’étape 01 se retrouve dans le lien de la sortie',
    avantLien + ' puis ' + apresLien);
  t(apresLien.startsWith('/app?m='), 'et ce lien mène à l’application', apresLien);

  /* Les fiches de gestes gardent leur exemple : elles démontrent une
     mécanique, pas la palette du moment. */
  const geste = page.locator('.geste').first();
  await geste.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const gesteAvant = await geste.locator('canvas').evaluate(c => c.toDataURL().length);
  await page.locator('.opt-pastille').nth(2).click();
  await page.waitForTimeout(500);
  const gesteApres = await geste.locator('canvas').evaluate(c => c.toDataURL().length);
  t(gesteAvant === gesteApres, 'une fiche de geste ne suit pas le motif de la page');

  /* Toucher une fiche fait passer le motif de la page à sa mécanique. */
  const adopter = page.locator('.geste-adopter').first();
  await adopter.click();
  await page.waitForTimeout(400);
  t((await adresse()) !== apresLien, 'toucher une fiche fait adopter sa mécanique');

  /* --- 4. l'escalier des couches -------------------------------------------- */

  await page.goto(base + '/moteur', { waitUntil: 'networkidle' });
  const couches = page.locator('.couche');
  await couches.first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  const toileCouches = page.locator('.couches-toile');
  const entiere = await toileCouches.evaluate(c => c.toDataURL());
  await couches.nth(0).click();
  await page.waitForTimeout(500);
  const fond = await toileCouches.evaluate(c => c.toDataURL());
  t(fond !== entiere, 'l’arrêt sur la première couche change l’image');

  /* Un aplat, une seule couleur : c'est ce que « le fond » veut dire. */
  const unies = await toileCouches.evaluate((c) => {
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const teintes = new Set();
    for (let i = 0; i < d.length; i += 4 * 997) {
      teintes.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
    }
    return teintes.size;
  });
  t(unies === 1, 'et cette image est un aplat d’une seule couleur', unies + ' teintes');

  await couches.last().click();
  await page.waitForTimeout(500);
  const retour = await toileCouches.evaluate(c => c.toDataURL());
  t(retour === entiere, 'la dernière marche redonne l’image entière');

  /* --- 5. les cibles et la largeur ------------------------------------------ */

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
      colorScheme: 'light', locale: 'fr-FR',
      hasTouch: cadrage.l < 800, isMobile: cadrage.l < 800
    });
    const p = await c.newPage();
    await p.goto(base + '/moteur?l=fr', { waitUntil: 'networkidle' });
    await p.waitForTimeout(300);

    const petites = await p.evaluate(() => {
      const mauvaises = [];
      for (const n of document.querySelectorAll('.moteur a, .moteur button')) {
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

    /* Les libellés allongés de 30 %, comme le veut la règle des deux langues.
       La page est bavarde, et c'est là qu'un gabarit cède.

       L'allongement porte sur le corps et non sur la racine : l'enseigne est
       celle de la présentation, au composant près, et c'est son gabarit à elle
       qu'il faudrait mesurer, dans son propre contrôle. L'étirer ici ferait
       échouer cette page pour une ligne qu'elle n'écrit pas. */
    await p.evaluate(() => {
      const marcher = (n) => {
        for (const enfant of n.childNodes) {
          if (enfant.nodeType === 3 && enfant.nodeValue.trim().length > 3) {
            enfant.nodeValue = enfant.nodeValue + enfant.nodeValue.slice(0, Math.ceil(enfant.nodeValue.length * 0.3));
          } else if (enfant.nodeType === 1) {
            marcher(enfant);
          }
        }
      };
      marcher(document.querySelector('.moteur-corps'));
    });
    await p.waitForTimeout(200);
    const debordeLong = await p.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    t(debordeLong <= 1, `${cadrage.nom} : libellés +30 %, toujours pas de côté`, debordeLong + ' px');

    await c.close();
  }

  /* Un seul appel primaire, et un seul titre de premier niveau. */
  t(await page.locator('.appel-primaire').count() === 1,
    'un seul appel primaire sur la page',
    String(await page.locator('.appel-primaire').count()));

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

  console.log(echecs ? `\n${echecs} vérification(s) en échec.` : '\nLa page du mécanisme tient.');
  process.exit(echecs ? 1 : 0);
})();
