/* Le passage d'un document à l'autre, sans recharger la page.
 *
 * Les trois adresses étaient reliées par des ancres nues, et chaque clic
 * était un chargement de document : React redémarrait à zéro, puis allait
 * chercher le morceau de la page visée. Deux attentes en file, et entre les
 * deux un écran qui n'avait plus rien à montrer. React Router remplace
 * maintenant la page dans le document déjà chargé.
 *
 * Ce que ce contrôle tient fermé, dans l'ordre où ça casse :
 *
 * 1. Le document survit au passage. C'est toute la question, et c'est
 *    invisible à l'oeil nu sur une machine rapide : un témoin est posé sur
 *    `window` avant le clic, et un rechargement l'effacerait. Une ancre
 *    remise par mégarde à la place d'un lien, et le témoin disparaît.
 * 2. Les six portes. La marque, l'entrée, la galerie, les deux pieds et
 *    l'appel de la page du mécanisme mènent où ils disent, et par le même
 *    chemin. C'est la liste qu'on oublie de mettre à jour en ajoutant une
 *    porte.
 * 3. Ce que le navigateur faisait tout seul et qu'il ne fait plus : le haut
 *    de la page, le focus dans la page arrivée, le titre du document. Rien
 *    de tout cela ne casse un rendu, et tout se voit à l'usage.
 * 4. Le retour arrière. Une page remplacée sans rechargement doit encore
 *    s'empiler dans l'historique, sinon le geste le plus courant du
 *    navigateur ne ramène nulle part.
 * 5. L'adresse de l'application. Elle est réécrite à chaque réglage sans
 *    passer par le routeur, et cette réécriture ne doit ni empiler d'entrée,
 *    ni faire perdre au routeur le fil du retour arrière.
 * 6. Ce qu'on laisse derrière soi. L'application n'était jamais démontée :
 *    chaque sortie rechargeait le document, et le navigateur ramassait tout.
 *    Elle l'est maintenant, et un écouteur oublié à chaque passage
 *    s'accumulerait dans un onglet qu'on garde ouvert.
 */
import { launch } from './pw.mjs'
import { ouvrir } from './serveur.mjs'

let echecs = 0;
function t(condition, titre, detail = '') {
  if (!condition) echecs += 1;
  console.log(`${condition ? 'ok  ' : 'ÉCHEC'} ${titre}${detail ? '  (' + detail + ')' : ''}`);
}

/* Le témoin : une valeur posée sur `window`, que seul un chargement de
   document efface. Il est reposé après chaque vérification, puisqu'une page
   arrivée sans rechargement le porte encore. */
const POSER = () => { window.__temoinAplat = 'garde'; };
const LIRE = () => window.__temoinAplat;

/**
 * Clique une porte et attend la page visée.
 *
 * L'attente porte sur le chemin **et** sur la marque de la page arrivée : le
 * chemin change dès le clic, le morceau de la page peut mettre un instant à
 * venir, et vérifier le témoin entre les deux le trouverait toujours intact.
 */
async function passer(page, porte, chemin, marque) {
  await page.evaluate(POSER);
  await page.locator(porte).first().click();
  await page.waitForFunction(
    ([c, m]) => location.pathname === c && document.querySelector(m) !== null,
    [chemin, marque],
    { timeout: 5000 },
  );
  /* Le titre, le focus et l'annonce sont posés par un effet, donc juste après
     le rendu que l'on vient d'attendre. */
  await page.waitForTimeout(200);
  return page.evaluate(LIRE);
}

(async () => {
  const { srv, port } = await ouvrir();
  const base = 'http://127.0.0.1:' + port;
  const browser = await launch();

  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 }, colorScheme: 'light', locale: 'fr-FR'
  });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });

  /* --- 1 et 2. les six portes, sans rechargement --------------------------- */

  await page.goto(base + '/', { waitUntil: 'networkidle' });

  t(await passer(page, '.enseigne-app', '/app', '.page') === 'garde',
    'la porte de l’enseigne ouvre l’application sans recharger');

  t(await passer(page, '.entete-marque', '/', '.accueil') === 'garde',
    'la marque de l’application ramène à la présentation sans recharger');

  t(await passer(page, '.tuile-porte', '/moteur', '.moteur') === 'garde',
    'la tuile de la galerie ouvre le mécanisme sans recharger');

  t(await passer(page, '.enseigne-marque', '/', '.accueil') === 'garde',
    'la marque du mécanisme ramène à la présentation sans recharger');

  /* Le pied de la présentation, tout en bas. */
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  t(await passer(page, '.accueil-pied a[href="/moteur"]', '/moteur', '.moteur') === 'garde',
    'le pied de la présentation ouvre le mécanisme sans recharger');

  /* L'appel de la page du mécanisme porte le motif traversé : il ouvre
     l'application avec une requête, et c'est le seul lien interne qui en
     porte une. */
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const motif = await page.evaluate(() => {
    const q = new URL(document.querySelector('.moteur-appel .appel-primaire').href).searchParams;
    return { m: q.get('m'), p: q.get('p'), d: q.get('d'), s: q.get('s') };
  });
  await page.evaluate(POSER);
  await page.locator('.moteur-appel .appel-primaire').click();
  await page.waitForFunction(() => location.pathname === '/app' && document.querySelector('.page'));
  await page.waitForTimeout(200);
  t(await page.evaluate(LIRE) === 'garde',
    'l’appel du mécanisme ouvre l’application sans recharger');
  /* L'application relit l'adresse au montage, puis y réécrit son état : si
     elle avait lu de travers, la requête réécrite ne serait plus celle du
     lien. C'est la promesse de la page du mécanisme, et elle passe désormais
     par une navigation sans rechargement. */
  const motifRelu = await page.evaluate(() => {
    const q = new URLSearchParams(location.search);
    return ['m', 'p', 'd', 's'].map(c => `${c}=${q.get(c)}`).join('&');
  });
  t(motifRelu === `m=${motif.m}&p=${motif.p}&d=${motif.d}&s=${motif.s}`,
    'et le motif traversé arrive intact dans l’application',
    `${motifRelu} pour m=${motif.m}&p=${motif.p}&d=${motif.d}&s=${motif.s}`);

  /* Le pied de l'application. */
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  t(await passer(page, '.pied-meta a[href="/moteur"]', '/moteur', '.moteur') === 'garde',
    'le pied de l’application ouvre le mécanisme sans recharger');

  /* --- 3. ce que le chargement de document faisait tout seul ---------------- */

  /* On repart du bas de la page du mécanisme : sans remise à zéro, la
     présentation s'ouvrirait au milieu de la galerie. */
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const partiDuBas = await page.evaluate(() => window.scrollY > 0);
  await passer(page, '.enseigne-marque', '/', '.accueil');
  t(partiDuBas && await page.evaluate(() => window.scrollY) === 0,
    'la page arrivée s’ouvre en haut',
    String(await page.evaluate(() => window.scrollY)));

  t(await page.evaluate(() => document.activeElement === document.querySelector('main')),
    'le focus est posé dans la page arrivée, et non laissé sur le lien cliqué',
    await page.evaluate(() => document.activeElement?.tagName ?? 'aucun'));

  /* Le titre du document, sur un passage où il change pour de bon : la
     présentation et l'application portent le même, à dessein, et c'est la
     page du mécanisme qui a le sien. */
  const titreAccueil = await page.title();
  await passer(page, '.tuile-porte', '/moteur', '.moteur');
  const titreMoteur = await page.title();
  t(titreAccueil !== '' && titreMoteur !== '' && titreAccueil !== titreMoteur,
    'le titre du document suit la page arrivée',
    `${titreAccueil} -> ${titreMoteur}`);

  /* L'annonce : sans changement de document, personne ne dit qu'on a changé
     de page. La région discrète porte le titre de la page arrivée. */
  const annonce = await page.locator('#annonce').innerText();
  t(annonce.trim() === titreMoteur.trim(), 'et il est annoncé aux lecteurs d’écran', annonce);

  /* Et l'annonce est rejouée quand deux pages partagent leur titre, sinon le
     passage de la présentation à l'application serait le seul à se faire en
     silence : une région vivante dont le texte ne bouge pas n'annonce rien.
     Le noeud d'avant est marqué, celui d'après ne doit pas être le même. */
  await passer(page, '.enseigne-marque', '/', '.accueil');
  await page.evaluate(() => {
    const n = document.querySelector("#annonce span");
    if (n) n.dataset.temoin = 'avant';
  });
  const titreAvant = await page.title();
  await passer(page, '.enseigne-app', '/app', '.page');
  const rejoue = await page.evaluate(() => {
    const n = document.querySelector("#annonce span");
    return n !== null && n.dataset.temoin !== 'avant' && n.textContent;
  });
  t(titreAvant === await page.title(),
    'la présentation et l’application portent bien le même titre',
    titreAvant);
  t(rejoue === titreAvant, 'et l’annonce est rejouée malgré tout', String(rejoue));

  /* --- 4 et 5. l'historique ------------------------------------------------ */

  /* L'application réécrit son adresse à chaque réglage. Un tirage, puis le
     retour arrière : il doit ramener à la présentation, et non défaire les
     réglages un à un. */
  await page.evaluate(POSER);
  await page.locator('[aria-keyshortcuts="v"]').first().click();
  await page.waitForTimeout(400);
  t(await page.evaluate(LIRE) === 'garde', 'un tirage ne recharge pas le document');

  await page.goBack();
  await page.waitForFunction(() => location.pathname === '/' && document.querySelector('.accueil'));
  t(await page.evaluate(LIRE) === 'garde',
    'le retour arrière ramène à la présentation sans recharger',
    await page.evaluate(() => location.pathname));

  /* --- 6. ce que les trois pages laissent derrière elles --------------------
     L'application n'était jamais démontée : chaque sortie était un chargement
     de document, et le navigateur ramassait tout. Elle l'est maintenant, et
     un écouteur ou un canevas oublié à chaque passage s'accumulerait dans un
     onglet qui reste ouvert. Dix allers-retours suffisent à le voir. */

  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  const mesurer = async () => {
    await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
    const m = await cdp.send('Performance.getMetrics').catch(() => ({ metrics: [] }));
    const lire = k => (m.metrics.find(x => x.name === k) || {}).value || 0;
    return {
      ecouteurs: lire('JSEventListeners'),
      canevas: await page.evaluate(() => document.getElementsByTagName('canvas').length),
      noeuds: await page.evaluate(() => document.getElementsByTagName('*').length),
    };
  };

  /* Un premier aller-retour avant la mesure : c'est lui qui charge les
     morceaux et remplit les caches, et son coût n'est pas une fuite. */
  await passer(page, '.enseigne-app', '/app', '.page');
  await passer(page, '.entete-marque', '/', '.accueil');
  const avant = await mesurer();

  for (let i = 0; i < 10; i += 1) {
    await passer(page, '.enseigne-app', '/app', '.page');
    await passer(page, '.entete-marque', '/', '.accueil');
  }
  const apres = await mesurer();

  const derive = (cle) => apres[cle] - avant[cle];
  t(derive('canevas') === 0, 'dix allers-retours ne laissent aucun canevas derrière eux',
    `${avant.canevas} -> ${apres.canevas}`);
  t(derive('noeuds') <= 40, 'ni de noeuds',
    `${avant.noeuds} -> ${apres.noeuds}`);
  t(derive('ecouteurs') <= 20, 'ni d’écouteurs',
    `${avant.ecouteurs} -> ${apres.ecouteurs}`);

  t(erreurs.length === 0, 'aucune erreur de page', erreurs.join(' | '));

  await ctx.close();
  await browser.close();
  srv.close();

  console.log(echecs ? `\n${echecs} vérification(s) en échec.` : '\nLe passage entre les documents tient.');
  process.exit(echecs ? 1 : 0);
})();
