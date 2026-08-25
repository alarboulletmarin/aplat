/* Parcours réel dans le navigateur : téléchargement, aller-retour par l'URL,
   déterminisme, états vide / chargement / erreur / succès, clavier. */
import fs from 'node:fs'
import path from 'node:path'
import { launch } from './pw.mjs'
import { poser } from './banc.mjs'
import { ouvrir } from './serveur.mjs'
import { fileURLToPath } from 'node:url'

/* Le dossier de ce fichier : `__dirname` n'existe pas dans un module ES. */
const ICI = fileURLToPath(new URL('.', import.meta.url))
let PORT = 0;
const OUT = path.resolve(ICI, '../.exports/e2e');

const ok = [], ko = [];
/* Le détail est amené par une flèche : la barre verticale sert déjà à
   énumérer les éléments d'un détail, et la parenthèse figure dans plusieurs
   libellés. La flèche n'apparaît nulle part ailleurs, et ne s'imbrique pas. */
const t = (cond, label, extra) => (cond ? ok : ko).push(label + (extra ? ' -> ' + extra : ''));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { srv, port } = await ouvrir(); PORT = port;
  const browser = await launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3,
    locale: 'fr-FR', hasTouch: true, isMobile: true, acceptDownloads: true
  });
  const page = await ctx.newPage();
  /* clic logique : reach.js vérifie déjà que chaque contrôle est physiquement
     atteignable sous les deux barres collantes ; ici on teste le comportement. */
  const tap = sel => page.$eval(sel, e => e.click());
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(`http://127.0.0.1:${PORT}/app?l=fr&m=blobs&p=nuit&d=2&s=4242&r=1179x2556`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await poser(page);

  // --- 1. l'URL est bien lue
  const st = await page.evaluate(() => ({
    fam: document.querySelector('[data-famille][aria-checked="true"]').dataset.famille,
    pal: document.querySelector('[data-palette][aria-checked="true"]').dataset.palette,
    dens: document.querySelector('[data-densite][aria-checked="true"]').dataset.densite,
    res: document.getElementById('res-valeur').textContent,
    seed: document.getElementById('partage-note').textContent
  }));
  t(st.fam === 'blobs', 'URL : famille lue', st.fam);
  t(st.pal === 'nuit', 'URL : palette lue', st.pal);
  t(st.dens === '2', 'URL : densité lue', st.dens);
  t(/1\s*179/.test(st.res) && /2\s*556/.test(st.res), 'URL : résolution lue', st.res);
  t(/4242/.test(st.seed), 'URL : graine lue', st.seed.slice(-20));

  // --- 2. aller-retour : l'URL réécrite doit relire à l'identique
  const url1 = page.url();
  await page.goto(url1, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await poser(page);
  const url2 = page.url();
  t(new URL(url1).search === new URL(url2).search, 'URL : aller-retour stable', url2.split('?')[1]);

  // --- 3. déterminisme du rendu
  const h = async () => page.evaluate(() => {
    const M = window.MOTEUR;
    const c = document.createElement('canvas'); c.width = 300; c.height = 650;
    M.dessiner(c.getContext('2d', { alpha: false }), 300, 650, { famille: 'terrazzo', palette: 'corail', densite: 2, graine: 987 });
    return c.toDataURL('image/png').length + ':' + c.toDataURL('image/png').slice(-64);
  });
  const h1 = await h(), h2 = await h();
  await page.reload({ waitUntil: 'networkidle' });
  await poser(page);
  const h3 = await h();
  t(h1 === h2 && h2 === h3, 'moteur : rendu déterministe, y compris après rechargement');

  // --- 4. indépendance à l'échelle : mêmes proportions à deux résolutions
  const scale = await page.evaluate(() => {
    const M = window.MOTEUR;
    function sample(W, H) {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const ctx = c.getContext('2d', { alpha: false, willReadFrequently: true });
      M.dessiner(ctx, W, H, { famille: 'arches', palette: 'soleil', densite: 1, graine: 555 });
      const pts = [];
      for (const [fx, fy] of [[0.2, 0.2], [0.5, 0.5], [0.8, 0.35], [0.35, 0.8], [0.9, 0.9]]) {
        const d = ctx.getImageData(Math.round(W * fx), Math.round(H * fy), 1, 1).data;
        pts.push([d[0], d[1], d[2]]);
      }
      return pts;
    }
    const a = sample(300, 650), b = sample(1179, 2556);
    return a.map((p, i) => p.map((v, k) => Math.abs(v - b[i][k])).reduce((x, y) => Math.max(x, y)));
  });
  t(scale.every(d => d <= 6), 'moteur : même image à deux résolutions', 'écarts max ' + scale.join(','));

  // --- 5. toutes les familles rendent sans erreur, et non vides
  const fams = await page.evaluate(() => {
    const M = window.MOTEUR;
    const bad = [];
    const total = M.FAMILLES.length * 3;
    for (const f of M.FAMILLES) for (const d of [0, 1, 2]) {
      const c = document.createElement('canvas'); c.width = 240; c.height = 520;
      const ctx = c.getContext('2d', { alpha: false, willReadFrequently: true });
      try { M.dessiner(ctx, 240, 520, { famille: f.id, palette: 'lime', densite: d, graine: 31337 }); } catch (e) { bad.push(f.id + '/d' + d + ': ' + e.message); continue; }
      const px = ctx.getImageData(0, 0, 240, 520).data;
      const seen = new Set();
      for (let i = 0; i < px.length; i += 4 * 97) seen.add(px[i] + ',' + px[i + 1] + ',' + px[i + 2]);
      if (seen.size < 6) bad.push(f.id + '/d' + d + ': quasi uni (' + seen.size + ' teintes)');
    }
    return { bad, total };
  });
  t(fams.bad.length === 0, 'moteur : chaque famille x 3 densités rend une image',
    fams.bad.join(' | ') || fams.total + ' combinaisons');

  /* Ce que « Variante » promet : une autre graine, une autre image. Quatre
     familles n'en tiennent rien, et c'est voulu : ce sont des pavages
     entièrement réguliers, sans un seul tirage. Le bouton ne fait donc rien
     dessus, ce qui est un défaut connu et non une surprise. Ce contrôle fige
     la liste : une cinquième famille devenue sourde à sa graine se signale
     ici, et une des quatre qui se mettrait à varier aussi. */
  const REGULIERES = ['ecailles', 'arcade', 'azulejos', 'tresse'];
  const graines = await page.evaluate(() => {
    const M = window.MOTEUR;
    const sourdes = [];
    for (const f of M.FAMILLES) {
      const rendu = (s) => {
        const c = document.createElement('canvas'); c.width = 200; c.height = 420;
        const ctx = c.getContext('2d', { alpha: false, willReadFrequently: true });
        M.dessiner(ctx, 200, 420, { famille: f.id, palette: 'lime', densite: 1, graine: s });
        return c.toDataURL();
      };
      if (rendu(101) === rendu(4242)) sourdes.push(f.id);
    }
    return sourdes;
  });
  t(graines.sort().join(',') === [...REGULIERES].sort().join(','),
    'moteur : seuls les pavages réguliers ignorent leur graine',
    graines.join(' ') || 'aucune');

  // --- 6. état vide
  await page.evaluate(() => { const s = document.getElementById('res-select'); s.value = 'surMesure'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(200);
  await page.fill('#res-largeur', '');
  await page.waitForTimeout(250);
  const empty = await page.evaluate(() => ({
    shown: !!document.getElementById('etat-vide'),
    disabled: document.getElementById('btn-export').disabled,
    res: document.getElementById('res-valeur').textContent
  }));
  t(empty.shown, 'état vide : hachure affichée');
  t(empty.disabled, 'état vide : téléchargement désactivé');
  t(/Aucune/.test(empty.res), 'état vide : la résolution est dite absente', empty.res);

  // --- 7. état erreur : au-delà de 40 Mpx
  await page.fill('#res-largeur', '7000');
  await page.fill('#res-hauteur', '7000');
  await page.waitForTimeout(250);
  await tap('#btn-export');
  await page.waitForTimeout(400);
  const err = await page.evaluate(() => ({
    shown: !!document.getElementById('note-erreur'),
    msg: document.getElementById('note-erreur-message').textContent
  }));
  t(err.shown, 'état erreur : carte affichée');
  t(/49/.test(err.msg) && /40/.test(err.msg), 'état erreur : message chiffré', err.msg);

  // --- 8. bouton Réessayer présent et cliquable
  t(await page.isEnabled('#btn-reessayer'), 'état erreur : Réessayer actif');

  // --- 9. téléchargement réel
  await page.fill('#res-largeur', '1179');
  await page.fill('#res-hauteur', '2556');
  /* Un vrai doigt quitte le champ en allant taper Télécharger ; le `tap`
     logique de ce banc, lui, ne déplace jamais le focus. Or la barre cesse
     de coller pendant la saisie (voir ecrans.css, `pointer: coarse`) : sans
     ce blur, elle resterait décollée, la carte de succès naîtrait sous le
     bord de l'écran, et le glissement de 10 bis toucherait le vide. */
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  await page.waitForTimeout(300);
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    tap('#btn-export')
  ]);
  const fname = dl.suggestedFilename();
  const fpath = path.join(OUT, fname);
  await dl.saveAs(fpath);
  const size = fs.statSync(fpath).size;
  const head = fs.readFileSync(fpath).subarray(0, 8);
  t(/^aplat-[a-z]+-[a-z]+-\d+-1179x2556\.png$/.test(fname), 'export : nom de fichier', fname);
  t(head.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'export : vrai PNG');
  t(size > 50000 && size < 2e6, 'export : poids raisonnable', (size / 1048576).toFixed(2) + ' Mo');

  await page.waitForTimeout(600);
  const done = await page.evaluate(() => ({
    shown: !!document.getElementById('note-faite'),
    meta: document.getElementById('note-meta').textContent
  }));
  t(done.shown, 'état succès : carte affichée');
  t(/PNG/.test(done.meta) && /(Mo|Ko)/.test(done.meta) && /1\s*179/.test(done.meta), 'état succès : dimensions, format et poids', done.meta);

  // --- 10. dimensions réelles du PNG (largeur/hauteur dans l'en-tête IHDR)
  const buf = fs.readFileSync(fpath);
  const w = buf.readUInt32BE(16), hh = buf.readUInt32BE(20);
  t(w === 1179 && hh === 2556, 'export : dimensions exactes du fichier', w + 'x' + hh);

  /* --- 10 bis. la carte succès sait partir : un bouton, un glissement, le
     temps. Elle restait sinon jusqu'au prochain réglage, en décor. La
     minuterie se teste en payant les douze secondes : un retrait automatique
     qui casserait ne se verrait nulle part ailleurs qu'ici. */
  t(await page.isEnabled('#note-fermer'), 'succès : bouton Fermer actif');
  await tap('#note-fermer');
  await page.waitForTimeout(250);
  t(await page.evaluate(() => !document.getElementById('note-faite')),
    'succès : le bouton Fermer retire la carte');

  await Promise.all([page.waitForEvent('download', { timeout: 30000 }), tap('#btn-export')]);
  await page.waitForTimeout(600);
  t(await page.evaluate(() => !!document.getElementById('note-faite')),
    'succès : la carte revient au téléchargement suivant');
  const carte = await page.locator('#note-faite').boundingBox();
  await page.mouse.move(carte.x + carte.width / 2, carte.y + 18);
  await page.mouse.down();
  await page.mouse.move(carte.x + carte.width / 2, carte.y + 130, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  t(await page.evaluate(() => !document.getElementById('note-faite')),
    'succès : un glissement vers le bas retire la carte');

  await Promise.all([page.waitForEvent('download', { timeout: 30000 }), tap('#btn-export')]);
  await page.waitForTimeout(600);
  await page.waitForTimeout(12600);
  t(await page.evaluate(() => !document.getElementById('note-faite')),
    'succès : la carte se retire seule après douze secondes');

  /* Un dernier export laisse une carte fraîche : l'étape suivante vérifie
     qu'un réglage touché l'efface, ce qui suppose qu'elle soit là. */
  await Promise.all([page.waitForEvent('download', { timeout: 30000 }), tap('#btn-export')]);
  await page.waitForTimeout(600);
  t(await page.evaluate(() => !!document.getElementById('note-faite')),
    'succès : carte en place avant le test des onglets');

  /* --- 11. les trois onglets de familles, et un réglage touché efface la
     carte succès. « Étoiles » est dans les figures : l'atteindre demande
     d'ouvrir son onglet, ce qui est exactement ce que la grille plate ne
     demandait pas et ce pour quoi elle mettait mille pixels entre deux
     motifs. */
  const onglets = await page.evaluate(() => ({
    ouvert: document.querySelector('.onglet[aria-selected="true"]').dataset.groupe,
    visibles: document.querySelectorAll('#liste-familles .opt').length,
    comptes: [...document.querySelectorAll('.onglet-n')].map(n => parseInt(n.textContent, 10))
  }));
  t(onglets.ouvert === 'abs', 'onglets : celui de la famille en cours est ouvert', onglets.ouvert);
  t(onglets.visibles === onglets.comptes[0],
    'onglets : la grille montre exactement ce que l\'onglet annonce',
    onglets.visibles + ' pour ' + onglets.comptes[0]);
  t(onglets.comptes.reduce((a, b) => a + b, 0) === 41,
    'onglets : les quatre couvrent les quarante et une familles', onglets.comptes.join(' + '));

  await page.$eval('#onglet-fig', e => e.click());
  await page.waitForTimeout(300);
  await tap('[data-famille="etoiles"]');
  await page.waitForTimeout(300);
  t(await page.evaluate(() => !document.getElementById('note-faite')), 'succès effacé au changement de réglage');
  t(await page.evaluate(() => document.querySelector('.onglet[aria-selected="true"]').dataset.groupe === 'fig'),
    'onglets : celui qu\'on a ouvert le reste');

  // --- 13. langue
  await tap('[data-langue="en"]');
  await page.waitForTimeout(300);
  const en = await page.evaluate(() => ({
    html: document.documentElement.lang,
    cta: document.getElementById('cta-libelle').textContent,
    title: document.title,
    url: location.search,
    stock: localStorage.getItem('aplat:langue')
  }));
  t(en.html === 'en' && en.cta === 'Download' && /Download|generative/.test(en.title) && en.stock === 'en' && !en.url.includes('l='),
    'langue : bascule complète, retenue sur l\'appareil et pas dans l\'adresse', JSON.stringify(en));

  // --- 14. thème
  await tap('[data-theme="sombre"]');
  await page.waitForTimeout(200);
  const th = await page.evaluate(() => ({
    attr: document.documentElement.getAttribute('data-theme'),
    bg: getComputedStyle(document.body).backgroundColor,
    url: location.search,
    stock: localStorage.getItem('aplat:theme')
  }));
  t(th.attr === 'sombre' && th.stock === 'sombre' && !th.url.includes('t='),
    'thème : bascule retenue sur l\'appareil et pas dans l\'adresse', th.bg);

  /* --- 15. ce qui est écrit sur l'appareil, et rien d'autre
     Trois choses existent, et les annoncer absentes serait faux : le cache du
     Service Worker, parce que l'application est installable ; l'historique
     des motifs ; et l'affichage, parce que la langue et le thème viennent
     d'être choisis aux étapes 13 et 14. On vérifie donc leur contenu, pas
     leur absence. Le cache ne porte que les fichiers de l'application ;
     l'historique ne porte que dix fois quatre réglages, sans image, sans
     horodatage, sans identifiant, sans URL ; l'affichage ne porte que les
     deux valeurs choisies. Les autres mécanismes, eux, restent vides. */
  await page.evaluate(() => navigator.serviceWorker && navigator.serviceWorker.ready).catch(() => {});
  await page.waitForTimeout(600);
  const store = await page.evaluate(async () => {
    const entrees = [];
    if ('caches' in window) {
      for (const nom of await caches.keys()) {
        const cache = await caches.open(nom);
        for (const requete of await cache.keys()) entrees.push(requete.url);
      }
    }
    let bases = [];
    try { bases = (await indexedDB.databases()).map(b => b.name); } catch (e) { bases = []; }
    const cles = Object.keys(localStorage);
    return {
      cles, ss: sessionStorage.length,
      cookie: document.cookie.length, bases, entrees,
      motifs: localStorage.getItem('aplat:motifs'),
      langue: localStorage.getItem('aplat:langue'),
      theme: localStorage.getItem('aplat:theme')
    };
  });
  t(store.ss === 0 && store.cookie === 0 && store.bases.length === 0,
    'vie privée : ni session, ni cookie, ni base indexée',
    `session ${store.ss}, cookies ${store.cookie}, bases ${store.bases.length}`);
  const clesEnTrop = store.cles.filter(c =>
    c !== 'aplat:motifs' && c !== 'aplat:palettes' && c !== 'aplat:langue' && c !== 'aplat:theme');
  t(clesEnTrop.length === 0,
    'vie privée : le stockage ne porte que motifs, palettes composées et affichage choisi',
    store.cles.join(', ') || 'aucune clé');
  t(store.langue === 'en' && store.theme === 'sombre',
    'vie privée : l\'affichage retenu est exactement le choix des étapes 13 et 14',
    `langue ${store.langue}, thème ${store.theme}`);
  t(!store.cles.includes('aplat:palettes'),
    'vie privée : rien n\'est écrit pour les palettes tant qu\'on n\'en compose aucune');
  {
    let liste = null;
    try { liste = JSON.parse(store.motifs || '[]'); } catch (e) { liste = null; }
    const tableau = Array.isArray(liste) ? liste : null;
    const champs = new Set(tableau ? tableau.flatMap(e => Object.keys(e || {})) : ['?']);
    const suspect = /https?:|\d{10,}|[a-f0-9]{16,}/i.test(store.motifs || '');
    t(tableau !== null && tableau.length <= 10 && [...champs].every(c => 'mpds'.includes(c)) && !suspect,
      'vie privée : l\'historique ne porte que quatre réglages par motif, dix au plus',
      `${tableau ? tableau.length : '?'} entrées, champs ${[...champs].join('')}, ${(store.motifs || '').length} octets`);
  }
  const horsSite = store.entrees.filter(u => !u.startsWith('http://127.0.0.1:' + PORT));
  const avecEtat = store.entrees.filter(u => /[?&](m|p|d|s|r|t)=/.test(u));
  t(store.entrees.length > 0 && horsSite.length === 0 && avecEtat.length === 0,
    'vie privée : le cache ne contient que les fichiers de l\'application',
    `${store.entrees.length} entrées` + (horsSite.length ? ' | HORS SITE ' + horsSite.join(', ') : '')
      + (avecEtat.length ? ' | AVEC ÉTAT ' + avecEtat.join(', ') : ''));

  t(errors.length === 0, 'aucune erreur JavaScript', errors.slice(0, 3).join(' | '));

  // --- 11a. paresse : au premier affichage, seules les vignettes proches
  //          du champ de vision sont dessinées
  {
    const lctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'fr-FR' });
    const lp = await lctx.newPage();
    await lp.goto('http://127.0.0.1:' + PORT + '/app?l=fr', { waitUntil: 'networkidle' });
    await lp.waitForTimeout(900);
    const lazy = await lp.evaluate(() => {
      let drawn = 0, total = 0;
      for (const cv of document.querySelectorAll('canvas[data-vignette]')) { total++; if (cv.dataset.peint) drawn++; }
      return { drawn, total };
    });
    t(lazy.drawn < lazy.total, 'vignettes : paresseuses au premier affichage', lazy.drawn + '/' + lazy.total + ' dessinées');
    await lctx.close();
  }

  // --- 11b. vignettes paresseuses : dessinées à l'entrée dans le champ,
  //          remises à jour au changement de palette, et conformes à un
  //          recalcul indépendant par le moteur
  {
    await tap('[data-palette="encre"]');
    await page.waitForTimeout(300);
    await page.evaluate(() => document.getElementById('liste-familles').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(800);

    const vign = await page.evaluate(() => {
      const M = window.MOTEUR;
      const q = new URLSearchParams(location.search);
      const PAL = q.get('p'), DENS = parseInt(q.get('d'), 10), SEED = parseInt(q.get('s'), 10);
      const out = { drawn: 0, blank: [], offscreen: 0, mismatch: [], hashes: {} };
      const vh = innerHeight;
      for (const cv of document.querySelectorAll('canvas[data-vignette]')) {
        const r = cv.getBoundingClientRect();
        if (!(r.bottom > -200 && r.top < vh + 200)) { out.offscreen++; continue; }
        if (!cv.dataset.peint) { out.blank.push(cv.dataset.vignette); continue; }
        const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        const teintes = new Set();
        let h = 2166136261;
        for (let i = 0; i < d.length; i += 4 * 53) {
          teintes.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
          h = Math.imul(h ^ (d[i] * 65536 + d[i + 1] * 256 + d[i + 2]), 16777619) >>> 0;
        }
        if (teintes.size < 4) { out.blank.push(cv.dataset.vignette); continue; }
        out.drawn++;
        out.hashes[cv.dataset.vignette] = h;
        // recalcul indépendant : le moteur doit produire exactement la même image
        const ref = document.createElement('canvas');
        ref.width = cv.width; ref.height = cv.height;
        M.dessiner(ref.getContext('2d', { alpha: false }), cv.width, cv.height, { famille: cv.dataset.vignette, palette: PAL, densite: DENS, graine: SEED });
        const rd = ref.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        let rh = 2166136261;
        for (let i = 0; i < rd.length; i += 4 * 53) rh = Math.imul(rh ^ (rd[i] * 65536 + rd[i + 1] * 256 + rd[i + 2]), 16777619) >>> 0;
        if (rh !== h) out.mismatch.push(cv.dataset.vignette);
      }
      return out;
    });
    t(vign.drawn >= 4 && vign.blank.length === 0, 'vignettes : celles à l\'écran sont dessinées',
      vign.drawn + ' dessinées, ' + vign.offscreen + ' hors champ, vides: ' + (vign.blank.join(',') || 'aucune'));
    t(vign.mismatch.length === 0, 'vignettes : conformes à un recalcul indépendant du moteur',
      vign.mismatch.join(',') || 'toutes identiques');

    await tap('[data-palette="lime"]');
    await page.waitForTimeout(500);
    const apres = await page.evaluate(hashes => {
      const changed = [], same = [];
      for (const cv of document.querySelectorAll('canvas[data-vignette]')) {
        const id = cv.dataset.vignette;
        if (!(id in hashes) || !cv.dataset.peint) continue;
        const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        let h = 2166136261;
        for (let i = 0; i < d.length; i += 4 * 53) h = Math.imul(h ^ (d[i] * 65536 + d[i + 1] * 256 + d[i + 2]), 16777619) >>> 0;
        (h === hashes[id] ? same : changed).push(id);
      }
      return { changed: changed.length, same };
    }, vign.hashes);
    t(apres.changed >= 4 && apres.same.length === 0, 'vignettes : remises à jour au changement de palette',
      apres.changed + ' changées, inchangées: ' + (apres.same.join(',') || 'aucune'));
  }

  // --- 12. clavier, sur une page fraîche : l'ordre de tabulation part du haut
  {
    const kctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'fr-FR' });
    const kp = await kctx.newPage();
    await kp.goto('http://127.0.0.1:' + PORT + '/app?l=fr', { waitUntil: 'networkidle' });
    await kp.waitForTimeout(300);
    await kp.keyboard.press('Tab');
    const f1 = await kp.evaluate(() => {
      const a = document.activeElement, cs = getComputedStyle(a);
      return { cls: String(a.className), outline: cs.outlineWidth, left: a.getBoundingClientRect().left, txt: (a.textContent || '').trim().slice(0, 24) };
    });
    t(f1.cls.includes('evitement'), 'clavier : le lien d\'évitement vient en premier', f1.txt);
    t(parseFloat(f1.outline) >= 3, 'clavier : focus visible', f1.outline);
    t(f1.left > 0, 'clavier : le lien d\'évitement apparaît au focus', 'left=' + Math.round(f1.left));
    await kp.keyboard.press('Enter');
    await kp.waitForTimeout(200);
    t(await kp.evaluate(() => document.activeElement.id === 'reglages'), 'clavier : il mène bien aux réglages');

    const kb = await kp.evaluate(() => {
      const stops = [...document.querySelectorAll('button, input, a[href], [tabindex]')]
        .filter(n => n.tabIndex >= 0 && (n.offsetParent !== null || n.classList.contains('skip')) && n.id !== 'reglages');
      const groups = [...document.querySelectorAll('[role="radiogroup"]')].map(g => ({
        id: g.id,
        opts: g.querySelectorAll('.opt').length,
        stops: [...g.querySelectorAll('.opt')].filter(o => o.tabIndex >= 0).length,
        checked: g.querySelectorAll('.opt[aria-checked="true"]').length,
        roles: [...g.querySelectorAll('.opt')].every(o => o.getAttribute('role') === 'radio')
      }));
      return { stops: stops.length, groups };
    });
    /* Six, tant qu'aucune palette n'a été composée : la grille de familles de
       l'onglet ouvert, les palettes livrées, les densités, la version, la
       langue et le thème. La grille des palettes composées est la septième, et
       elle n'apparaît que lorsqu'il y en a. Un groupe ajouté sans son
       `radiogroup` casserait le parcours clavier sans rien changer à
       l'affichage. */
    t(kb.groups.length === 6, 'clavier : les six groupes sont des groupes radio', kb.groups.length + ' groupes');
    t(kb.groups.every(g => g.stops === 1), 'clavier : un seul arrêt de tabulation par groupe',
      kb.groups.map(g => g.id + ':' + g.stops + '/' + g.opts).join(' '));
    t(kb.groups.every(g => g.roles), 'clavier : chaque option porte role="radio"');
    t(kb.groups.filter(g => g.checked === 1).length >= 4, 'clavier : le choix courant est marqué aria-checked',
      kb.groups.map(g => g.id + ':' + g.checked).join(' '));
    t(kb.stops <= 22, 'clavier : parcours ramené sous 22 arrêts', kb.stops + ' arrêts (42 avant)');

    // flèches : elles déplacent le choix dans le groupe
    await kp.evaluate(() => document.querySelector('#liste-densite .opt[aria-checked="true"]').focus());
    const avant = await kp.evaluate(() => document.querySelector('#liste-densite .opt[aria-checked="true"]').dataset.densite);
    await kp.keyboard.press('ArrowRight');
    await kp.waitForTimeout(250);
    const apresFleche = await kp.evaluate(() => ({
      checked: document.querySelector('#liste-densite .opt[aria-checked="true"]').dataset.densite,
      focused: document.activeElement.dataset.densite
    }));
    t(apresFleche.checked !== avant && apresFleche.checked === apresFleche.focused,
      'clavier : la flèche déplace le choix et le focus ensemble', avant + ' puis ' + apresFleche.checked);

    // WCAG 2.2 SC 2.4.11 : le focus ne doit jamais finir sous une barre collante
    const masque = await kp.evaluate(async () => {
      const stops = [...document.querySelectorAll('button, input, a[href]')]
        .filter(n => n.tabIndex >= 0 && n.offsetParent !== null && !n.classList.contains('skip'));
      const bad = [];
      for (const n of stops) {
        n.focus();   // le correcteur de l'app agit sur focusin
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const r = n.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (cy < 0 || cy > innerHeight) { bad.push((n.id || n.textContent.trim().slice(0, 14)) + ':hors-fenêtre'); continue; }
        const hit = document.elementFromPoint(cx, cy);
        if (!(hit === n || n.contains(hit) || n.contains(hit && hit.parentElement))) {
          bad.push((n.id || n.textContent.trim().slice(0, 14)) + ':' + (hit ? (hit.id || String(hit.className) || hit.tagName) : 'rien'));
        }
      }
      return { total: stops.length, bad };
    });
    t(masque.bad.length === 0, 'clavier : aucun focus masqué par les barres collantes (WCAG 2.4.11)',
      masque.total + ' arrêts testés' + (masque.bad.length ? ', dont ' + masque.bad.slice(0, 5).join(' | ') : ''));
    // le focus doit rester visible sur le bouton primaire, qui est sur aplat lime
    await kp.evaluate(() => document.getElementById('btn-export').focus());
    const f2 = await kp.evaluate(() => {
      const cs = getComputedStyle(document.activeElement);
      return { w: cs.outlineWidth, c: cs.outlineColor };
    });
    t(parseFloat(f2.w) >= 3, 'clavier : focus visible sur le bouton primaire', f2.w + ' ' + f2.c);

    // prefers-reduced-motion
    await kctx.close();
    const rctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', locale: 'fr-FR' });
    const rp = await rctx.newPage();
    await rp.goto('http://127.0.0.1:' + PORT + '/app?l=fr', { waitUntil: 'networkidle' });
    await rp.waitForTimeout(300);
    const rm = await rp.evaluate(() => {
      const c = document.getElementById('apercu');
      const dots = document.querySelector('.etat-calcul-p i');
      return {
        canvasTransition: getComputedStyle(c).transitionDuration,
        canvasOpacity: getComputedStyle(c).opacity,
        dotDuration: dots ? getComputedStyle(dots).animationDuration : null,
        /* Le repli de l'aperçu au défilement : la boîte et l'échelle de
           l'appareil sont les deux seules transitions ajoutées depuis. */
        boiteTransition: getComputedStyle(document.getElementById('scene-boite')).transitionDuration,
        appareilTransition: getComputedStyle(document.getElementById('appareil')).transitionDuration
      };
    });
    const small = v => !v || parseFloat(v) <= 0.01;
    t(small(rm.canvasTransition) && small(rm.dotDuration) &&
      small(rm.boiteTransition) && small(rm.appareilTransition),
      'mouvement réduit : transitions et animations coupées, repli compris', JSON.stringify(rm));
    t(parseFloat(rm.canvasOpacity) === 1, 'mouvement réduit : le canevas reste opaque', rm.canvasOpacity);
    await rctx.close();
  }

  // --- 15b. course à l'export : un réglage changé pendant l'encodage ne doit
  //          ni renommer le fichier, ni lancer un second export
  {
    const rctx = await browser.newContext({ viewport: { width: 900, height: 900 }, locale: 'fr-FR', acceptDownloads: true });
    const rp = await rctx.newPage();
    // image volontairement lourde : l'encodage dure assez pour cliquer pendant
    await rp.goto('http://127.0.0.1:' + PORT + '/app?l=fr&m=blobs&p=nuit&d=1&s=777&r=5000x5000', { waitUntil: 'networkidle' });
    await rp.waitForTimeout(500);
    const dls = [];
    rp.on('download', d => dls.push(d.suggestedFilename()));

    // tout en une seule évaluation : les clics sont synchrones, donc bien
    // pendant la fenêtre d'encodage
    const pendant = await rp.evaluate(async () => {
      document.getElementById('btn-export').click();
      await new Promise(r => setTimeout(r, 120));       // le dessin a démarré
      const busyAvant = document.getElementById('btn-export').getAttribute('aria-busy');
      document.querySelector('[data-palette="soleil"]').click();
      document.querySelector('[data-densite="2"]').click();
      document.getElementById('btn-export').click();
      document.getElementById('btn-export').click();
      document.getElementById('btn-export').click();
      const busyApres = document.getElementById('btn-export').getAttribute('aria-busy');
      const voile = !!document.getElementById('etat-calcul');
      return { busyAvant, busyApres, voile };
    });
    t(pendant.busyAvant === 'true', 'export : le bouton est marqué occupé pendant le rendu', pendant.busyAvant);
    t(pendant.busyApres === 'true' && pendant.voile,
      'export : un réglage changé pendant le rendu n\'efface pas l\'état occupé',
      'aria-busy=' + pendant.busyApres + ' voile=' + pendant.voile);

    await rp.waitForTimeout(9000);
    t(dls.length === 1, 'export : un seul fichier malgré cinq clics pendant l\'encodage', dls.length + ' téléchargement(s)');
    t(dls[0] === 'aplat-blobs-nuit-777-5000x5000.png',
      'export : le nom du fichier décrit bien l\'image dessinée, pas les réglages changés depuis', dls[0]);
    const apres = await rp.evaluate(() => ({
      pal: document.querySelector('[data-palette][aria-checked="true"]').dataset.palette,
      meta: document.getElementById('note-meta').textContent,
      done: !!document.getElementById('note-faite')
    }));
    t(apres.pal === 'soleil', 'export : le réglage changé pendant l\'encodage vaut pour la suite', apres.pal);
    t(apres.done && /5\s*000/.test(apres.meta), 'export : la fiche décrit l\'image produite', apres.meta);
    await rctx.close();
  }

  // --- 15c. canevas resté noir : on doit le dire, pas livrer une image vide
  {
    const bctx = await browser.newContext({ viewport: { width: 900, height: 900 }, locale: 'fr-FR', acceptDownloads: true });
    const bp = await bctx.newPage();
    // on simule le refus silencieux d'allocation : le dessin ne fait rien
    await bp.addInitScript(() => {
      window.__blockDraw = true;
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, attrs) {
        const ctx = orig.call(this, type, attrs);
        if (window.__blockDraw && this.width > 3000 && ctx && !ctx.__patched) {
          ctx.__patched = true;
          for (const m of ['fillRect', 'fill', 'drawImage', 'arc', 'ellipse']) {
            const f = ctx[m];
            ctx[m] = function () { /* refus silencieux */ };
          }
        }
        return ctx;
      };
    });
    await bp.goto('http://127.0.0.1:' + PORT + '/app?l=fr&r=4000x4000', { waitUntil: 'networkidle' });
    await bp.waitForTimeout(500);
    const dls2 = [];
    bp.on('download', d => dls2.push(d.suggestedFilename()));
    await bp.$eval('#btn-export', e => e.click());
    await bp.waitForTimeout(4000);
    const vide = await bp.evaluate(() => ({
      err: !!document.getElementById('note-erreur'),
      msg: document.getElementById('note-erreur-message').textContent
    }));
    t(vide.err, 'export : un canevas resté noir est signalé comme une erreur');
    t(/taille|large/i.test(vide.msg), 'export : le message dit quoi faire', vide.msg.slice(0, 60));
    t(dls2.length === 0, 'export : aucune image vide n\'est livrée', dls2.length + ' téléchargement(s)');
    await bctx.close();
  }

  // --- 15d. l'aperçu et le fichier sont bien la même image
  {
    const actx = await browser.newContext({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 2, locale: 'fr-FR' });
    const ap = await actx.newPage();
    await ap.goto('http://127.0.0.1:' + PORT + '/app?l=fr&r=1179x2556', { waitUntil: 'networkidle' });
    await ap.waitForTimeout(600);
    await poser(ap);
    const inv = await ap.evaluate(() => {
      const M = window.MOTEUR;
      const cv = document.getElementById('apercu');
      const r = cv.getBoundingClientRect();
      const arCv = r.width / r.height, arCible = 1179 / 2556;
      let veil = 0, niveau = 0, total = 0;
      const niv = m => m.contraste >= 4.5 ? 'bonne' : m.contraste >= 3 ? 'juste' : 'insuffisante';
      for (const f of M.FAMILLES) for (const p of M.ORDRE_PALETTES) for (const d of [0, 1, 2]) {
        total++;
        const a = M.mesurer(f.id, p, d, 7314, cv.width, cv.height);
        const b = M.mesurer(f.id, p, d, 7314, 1179, 2556);
        if (Math.round(a.voile * 100) !== Math.round(b.voile * 100)) veil++;
        if (niv(a) !== niv(b) || a.libelles !== b.libelles) niveau++;
      }
      return { ecart: +(((arCv / arCible) - 1) * 100).toFixed(2), total, veil, niveau };
    });
    t(Math.abs(inv.ecart) < 0.5, 'aperçu : le canevas porte le rapport d\'aspect visé', inv.ecart + ' %');
    t(inv.veil === 0 && inv.niveau === 0,
      'aperçu : même voile et même verdict que le fichier, sur toutes les combinaisons',
      inv.veil + ' voiles et ' + inv.niveau + ' verdicts divergents sur ' + inv.total);

    // un téléphone récent doit être classé comme un téléphone
    const classe = [];
    for (const [w, h, attendu] of [[1179, 2556, 'Téléphone'], [1290, 2796, 'Téléphone'], [1440, 3200, 'Téléphone'],
                                   [2048, 2732, 'Tablette'], [1536, 2048, 'Tablette'], [2560, 1440, 'Ordinateur']]) {
      await ap.goto('http://127.0.0.1:' + PORT + '/app?l=fr&r=' + w + 'x' + h, { waitUntil: 'domcontentloaded' });
      await ap.waitForTimeout(200);
      const got = await ap.evaluate(() => document.getElementById('res-appareil').textContent.split(', ')[0]);
      if (got !== attendu) classe.push(w + 'x' + h + ': ' + got + ' au lieu de ' + attendu);
    }
    t(classe.length === 0, 'aperçu : le type d\'appareil est correct, téléphones récents compris', classe.join(' | ') || '6 formats');
    await actx.close();
  }

  // --- 15e. saisie de résolution : une seule vérité affichée
  {
    const sctx2 = await browser.newContext({ viewport: { width: 900, height: 1000 }, locale: 'fr-FR' });
    const sp2 = await sctx2.newPage();
    await sp2.goto('http://127.0.0.1:' + PORT + '/app?l=fr', { waitUntil: 'networkidle' });
    await sp2.waitForTimeout(400);
    await sp2.evaluate(() => { const s = document.getElementById('res-select'); s.value = 'surMesure'; s.dispatchEvent(new Event('change', { bubbles: true })); });
    await sp2.waitForTimeout(200);

    await sp2.fill('#res-largeur', '');
    await sp2.type('#res-largeur', '9999');
    await sp2.waitForTimeout(300);
    const clamp = await sp2.evaluate(() => ({
      champ: document.getElementById('res-largeur').value,
      carte: document.getElementById('res-valeur').textContent,
      url: location.search
    }));
    t(clamp.champ === '8000' && /8\s*000/.test(clamp.carte) && /8000x/.test(clamp.url),
      'saisie : au-delà de la borne haute, le champ, la carte et le lien disent la même chose',
      clamp.champ + ' / ' + clamp.carte + ' / ' + clamp.url);

    // saisie mal formée : le champ montre ce que l'app utilise
    await sp2.fill('#res-largeur', '');
    await sp2.type('#res-largeur', '19e20');
    await sp2.waitForTimeout(300);
    const mal = await sp2.evaluate(() => ({
      champ: document.getElementById('res-largeur').value,
      carte: document.getElementById('res-valeur').textContent
    }));
    t(mal.champ === '1920' && /1\s*920/.test(mal.carte),
      'saisie : un caractère non numérique est filtré sans vider l\'état',
      mal.champ + ' / ' + mal.carte);

    // borne basse : signalée, et visible
    await sp2.fill('#res-largeur', '');
    await sp2.type('#res-largeur', '5');
    await sp2.waitForTimeout(300);
    const bas = await sp2.evaluate(() => {
      const i = document.getElementById('res-largeur'), j = document.getElementById('res-hauteur');
      const h = document.getElementById('res-aide');
      const cs = getComputedStyle(i), csOk = getComputedStyle(j);
      return {
        invalide: i.getAttribute('aria-invalid'),
        etat: h.dataset.etat,
        message: h.textContent.trim(),
        bordure: cs.borderTopWidth,
        bordureOk: csOk.borderTopWidth,
        teinte: cs.borderTopColor !== csOk.borderTopColor,
        triangle: getComputedStyle(h.querySelector('i')).display
      };
    });
    t(bas.invalide === 'true', 'saisie : la valeur hors bornes est marquée aria-invalid');
    t(bas.etat === 'erreur' && bas.triangle !== 'none' &&
      parseFloat(bas.bordure) > parseFloat(bas.bordureOk) && bas.teinte,
      'saisie : l\'erreur se voit au trait épaissi et au triangle, pas seulement à la teinte',
      'bordure ' + bas.bordure + ' contre ' + bas.bordureOk + ', triangle ' + bas.triangle);
    t(/16/.test(bas.message) && /8000/.test(bas.message), 'saisie : le message dit les bornes', bas.message);
    await sctx2.close();
  }

  // --- 15f. régions live : pas de réannonce quand rien n'a changé
  {
    const lctx2 = await browser.newContext({ viewport: { width: 900, height: 1000 }, locale: 'fr-FR' });
    const lp2 = await lctx2.newPage();
    await lp2.goto('http://127.0.0.1:' + PORT + '/app?l=fr', { waitUntil: 'networkidle' });
    await lp2.waitForTimeout(600);
    const churn = await lp2.evaluate(async () => {
      const cibles = ['verdict-titre', 'verdict-detail', 'partage-note', 'res-valeur', 'cta-libelle'];
      let ecritures = 0;
      const obs = new MutationObserver(ms => { ecritures += ms.length; });
      for (const id of cibles) obs.observe(document.getElementById(id), { childList: true, characterData: true, subtree: true });
      // trois rendus qui ne changent rien de ces textes
      const b = document.querySelector('[data-famille][aria-checked="true"]');
      for (let i = 0; i < 3; i++) { b.click(); await new Promise(r => setTimeout(r, 120)); }
      obs.disconnect();
      return ecritures;
    });
    t(churn === 0, 'régions live : rien n\'est réécrit quand rien ne change', churn + ' écritures');

    // et l'état vide n'affiche aucun chiffre inventé
    await lp2.evaluate(() => { const s = document.getElementById('res-select'); s.value = 'surMesure'; s.dispatchEvent(new Event('change', { bubbles: true })); });
    await lp2.waitForTimeout(200);
    await lp2.fill('#res-largeur', '');
    await lp2.waitForTimeout(400);
    const vide2 = await lp2.evaluate(() => ({
      detail: document.getElementById('verdict-detail').textContent,
      titre: document.getElementById('verdict-titre').textContent,
      pastilles: document.querySelectorAll('.verdict-bonne, .verdict-juste, .verdict-insuffisante').length
    }));
    t(!/:1/.test(vide2.detail) && vide2.pastilles === 0,
      'lisibilité : aucun chiffre affiché tant qu\'il n\'y a rien à mesurer', vide2.detail.slice(0, 50));
    await lctx2.close();
  }

  // --- 16. URL : robustesse et discrétion
  {
    const uctx = await browser.newContext({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 2, locale: 'fr-FR' });
    const up = await uctx.newPage();
    const uerr = [];
    up.on('pageerror', e => uerr.push(e.message));
    up.on('console', m => { if (m.type() === 'error') uerr.push(m.text()); });

    // une palette empruntée à la chaîne de prototypes ne doit rien casser
    await up.goto('http://127.0.0.1:' + PORT + '/app?l=fr&p=constructor&m=blobs', { waitUntil: 'networkidle' });
    await up.waitForTimeout(500);
    const proto = await up.evaluate(() => ({
      pal: (document.querySelector('[data-palette][aria-checked="true"]') || {}).dataset,
      peint: document.getElementById('apercu').dataset.peint === '1',
      url: location.search
    }));
    t(proto.pal && proto.pal.palette === 'lime', 'URL : palette inconnue ramenée au défaut', proto.pal && proto.pal.palette);
    t(proto.peint, 'URL : le rendu a bien eu lieu malgré le paramètre hostile');
    t(uerr.length === 0, 'URL : aucune erreur levée', uerr.slice(0, 2).join(' | '));

    // resolution hors bornes ou incomplète : on retombe entièrement sur la détection
    for (const [q, label] of [['r=5x5', 'trop petite'], ['r=99999x2000', 'trop grande'], ['r=1179', 'moitié manquante'], ['r=abcxdef', 'illisible']]) {
      await up.goto('http://127.0.0.1:' + PORT + '/app?l=fr&' + q, { waitUntil: 'networkidle' });
      await up.waitForTimeout(300);
      const v = await up.evaluate(() => ({
        res: document.getElementById('res-valeur').textContent,
        dev: document.getElementById('res-appareil').textContent,
        url: location.search
      }));
      t(/détecté/.test(v.dev) && !/Aucune/.test(v.res), 'URL : résolution ' + label + ' ignorée', v.res + ' / ' + v.dev);
    }

    // la résolution détectée ne part pas dans le lien
    await up.goto('http://127.0.0.1:' + PORT + '/app?l=fr', { waitUntil: 'networkidle' });
    await up.waitForTimeout(400);
    const propre = await up.evaluate(() => location.search);
    t(!/[?&]r=/.test(propre), 'URL : la résolution détectée ne part pas dans le lien partagé', propre);

    // une résolution saisie à la main, elle, est transmise
    await up.evaluate(() => { const s = document.getElementById('res-select'); s.value = 'surMesure'; s.dispatchEvent(new Event('change', { bubbles: true })); });
    await up.waitForTimeout(200);
    await up.fill('#res-largeur', '2560');
    await up.fill('#res-hauteur', '1440');
    await up.waitForTimeout(400);
    const manuel = await up.evaluate(() => location.search);
    t(/[?&]r=2560x1440/.test(manuel), 'URL : une résolution saisie à la main est transmise', manuel);
    await uctx.close();
  }

  // --- 17. partage : l'échec de copie ne doit jamais s'annoncer comme un succès
  {
    const sctx = await browser.newContext({ viewport: { width: 900, height: 900 }, locale: 'fr-FR' });
    const sp = await sctx.newPage();
    await sp.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        get: () => ({ writeText: () => Promise.reject(new Error('refusé')) })
      });
    });
    await sp.goto('http://127.0.0.1:' + PORT + '/app?l=fr', { waitUntil: 'networkidle' });
    await sp.waitForTimeout(400);
    await sp.$eval('#partage-bouton', e => e.click());
    await sp.waitForTimeout(400);
    const echec = await sp.evaluate(() => ({
      label: document.getElementById('partage-libelle').textContent,
      note: document.getElementById('partage-note').textContent,
      repli: !!document.querySelector('.partage-repli'),
      url: document.getElementById('partage-lien').value,
      live: !!document.getElementById('partage-note').getAttribute('aria-live')
    }));
    t(!/copié/i.test(echec.label), 'partage : pas de « lien copié » quand la copie échoue', echec.label);
    t(/impossible/i.test(echec.note), 'partage : l\'échec est dit', echec.note.slice(0, 40));
    t(echec.repli && echec.url === sp.url(), 'partage : le lien est proposé à copier à la main', echec.url ? 'champ rempli' : 'vide');
    t(echec.live, 'partage : la note est dans une région live');
    await sctx.close();

    // et le succès reste un succès
    const octx = await browser.newContext({ viewport: { width: 900, height: 900 }, locale: 'fr-FR', permissions: ['clipboard-read', 'clipboard-write'] });
    const op = await octx.newPage();
    await op.goto('http://127.0.0.1:' + PORT + '/app?l=fr', { waitUntil: 'networkidle' });
    await op.waitForTimeout(400);
    await op.$eval('#partage-bouton', e => e.click());
    await op.waitForTimeout(400);
    const ok2 = await op.evaluate(() => ({
      label: document.getElementById('partage-libelle').textContent,
      repli: !!document.querySelector('.partage-repli')
    }));
    t(/copié/i.test(ok2.label) && !ok2.repli, 'partage : succès annoncé, pas de repli affiché', ok2.label);
    await octx.close();
  }

  // --- 18. la promesse « aucun réseau » est inscrite dans le document
  {
    const cctx = await browser.newContext({ viewport: { width: 900, height: 900 }, locale: 'fr-FR' });
    const cp = await cctx.newPage();
    await cp.goto('http://127.0.0.1:' + PORT + '/app?l=fr', { waitUntil: 'networkidle' });
    const csp = await cp.evaluate(() => {
      const m = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      return m ? m.getAttribute('content') : null;
    });
    t(csp && /connect-src 'none'/.test(csp), 'réseau : connect-src none déclaré', csp || 'absente');
    const bloque = await cp.evaluate(async () => {
      try { await fetch('https://example.com/x'); return 'passée'; }
      catch (e) { return 'bloquée'; }
    });
    t(bloque === 'bloquée', 'réseau : une requête sortante est refusée par la politique', bloque);
    await cctx.close();
  }

  /* --- 19. le mot du verdict suit toujours la bande du rapport mesuré
     Le titre annonçait « correcte » pour 3,5:1 pendant que le corps disait
     « un peu juste » : deux mots pour une seule mesure, et le plus rassurant
     des deux sous le seuil AA du petit texte. On relit ici le rapport affiché,
     on en déduit la bande, et on exige le mot et la forme de cette bande.
     La bande basse ne se produit pas : le voile ramène toute combinaison
     au-dessus de 3:1. Elle est éprouvée dans `src/lib/moteur.test.ts`. */
  {
    const MOTS = {
      fr: { bonne: 'bonne', juste: 'juste', insuffisante: 'insuffisante' },
      en: { bonne: 'good', juste: 'borderline', insuffisante: 'insufficient' }
    };
    const MOTIFS = [
      { q: 'm=vagues&p=soleil&d=0', attendu: 'bonne' },
      { q: 'm=vagues&p=ciel&d=2', attendu: 'juste' },
      { q: 'm=marguerites&p=nuit&d=2', attendu: null }
    ];
    const vctx = await browser.newContext({ viewport: { width: 900, height: 1000 }, locale: 'fr-FR' });
    const vp = await vctx.newPage();
    for (const langue of ['fr', 'en']) {
      for (const motif of MOTIFS) {
        await vp.goto(`http://127.0.0.1:${PORT}/app?l=${langue}&s=4242&r=1179x2556&${motif.q}`, { waitUntil: 'networkidle' });
        await vp.waitForTimeout(300);
        const lu = await vp.evaluate(() => {
          const forme = document.querySelector('.verdict-i > span');
          return {
            titre: document.getElementById('verdict-titre').textContent,
            detail: document.getElementById('verdict-detail').textContent,
            forme: forme ? forme.className : ''
          };
        });
        // « 3,9:1 » en français, « 3.9:1 » en anglais
        const trouve = lu.detail.match(/(\d+[.,]\d+):1/);
        const rapport = trouve ? parseFloat(trouve[1].replace(',', '.')) : NaN;
        /* Le rapport est affiché arrondi au dixième : à moins d'un demi
           dixième d'une borne, les deux bandes voisines sont recevables. */
        const bande = rapport >= 4.5 ? 'bonne' : rapport >= 3 ? 'juste' : 'insuffisante';
        const voisine = Math.abs(rapport - 4.5) < 0.05 ? 'juste'
          : Math.abs(rapport - 3) < 0.05 ? 'insuffisante' : bande;
        const mots = [...new Set([MOTS[langue][bande], MOTS[langue][voisine]])];
        t(Number.isFinite(rapport), `verdict ${langue} ${motif.q} : le détail donne un rapport`, lu.detail.slice(0, 40));
        t(mots.some(m => lu.titre.toLowerCase().endsWith(m)),
          `verdict ${langue} ${motif.q} : le titre porte le mot de la bande`,
          `${rapport}:1 -> attendu « ${mots.join(' ou ')} », lu « ${lu.titre} »`);
        t(lu.forme === 'verdict-' + bande || lu.forme === 'verdict-' + voisine,
          `verdict ${langue} ${motif.q} : la forme suit la bande`,
          `${bande} -> ${lu.forme}`);
        if (motif.attendu) {
          t(lu.forme === 'verdict-' + motif.attendu,
            `verdict ${langue} ${motif.q} : la bande attendue est atteinte`, lu.forme);
        }
      }
    }
    await vctx.close();
  }

  /* --- 20. deux gestes voisins, deux effets distincts
     « Variante » ne touche que la graine, « Surprends-moi » tire aussi la
     famille et la palette. Deux boutons qui feraient la même chose ne
     mériteraient pas deux libellés. */
  {
    const sctx3 = await browser.newContext({ viewport: { width: 900, height: 1000 }, locale: 'fr-FR' });
    const sp = await sctx3.newPage();
    const etat = () => sp.evaluate(() => ({
      fam: document.querySelector('[data-famille][aria-checked="true"]').dataset.famille,
      pal: document.querySelector('[data-palette][aria-checked="true"]').dataset.palette,
      dens: document.querySelector('[data-densite][aria-checked="true"]').dataset.densite,
      graine: new URLSearchParams(location.search).get('s')
    }));
    await sp.goto('http://127.0.0.1:' + PORT + '/app?l=fr&m=vagues&p=lime&d=1&s=4242&r=1179x2556', { waitUntil: 'networkidle' });
    await sp.waitForTimeout(400);

    const depart = await etat();
    await sp.$eval('#btn-graine', e => e.click());
    await sp.waitForTimeout(300);
    const apresGraine = await etat();
    t(apresGraine.fam === depart.fam && apresGraine.pal === depart.pal && apresGraine.dens === depart.dens,
      'variante : ni la famille ni la palette ni la densité ne bougent',
      `${apresGraine.fam}/${apresGraine.pal}/d${apresGraine.dens}`);
    t(apresGraine.graine !== depart.graine, 'variante : la graine change',
      `${depart.graine} -> ${apresGraine.graine}`);

    /* Dix tirages : le tirage exclut la valeur courante, aucun ne doit donc
       laisser la famille ou la palette en place, ni répéter la densité. */
    let familleFigee = 0, paletteFigee = 0, densiteBougee = 0, graineFigee = 0;
    let avant = apresGraine;
    for (let i = 0; i < 10; i++) {
      await sp.$eval('#btn-surprise', e => e.click());
      await sp.waitForTimeout(220);
      const apres = await etat();
      if (apres.fam === avant.fam) familleFigee++;
      if (apres.pal === avant.pal) paletteFigee++;
      if (apres.dens !== avant.dens) densiteBougee++;
      if (apres.graine === avant.graine) graineFigee++;
      avant = apres;
    }
    t(familleFigee === 0 && paletteFigee === 0,
      'surprends-moi : famille et palette changent à chaque tirage',
      `${familleFigee} familles et ${paletteFigee} palettes figées sur 10`);
    t(graineFigee === 0, 'surprends-moi : la graine change aussi', graineFigee + ' graines figées sur 10');
    t(densiteBougee === 0, 'surprends-moi : la densité ne bouge pas, c\'est un goût',
      densiteBougee + ' densités changées sur 10');

    const libelles = await sp.evaluate(() => ({
      variante: document.querySelector('#btn-graine span:last-child').textContent.trim(),
      surprise: document.querySelector('#btn-surprise span:last-child').textContent.trim()
    }));
    t(libelles.variante !== libelles.surprise && libelles.variante.length > 0,
      'les deux gestes portent deux libellés distincts',
      `« ${libelles.variante} » et « ${libelles.surprise} »`);
    await sctx3.close();
  }

  /* --- 21. la version sombre est un fichier, pas un aperçu
     C'est le défaut que cette section tient fermé, et il était grave : un
     rideau qu'on tirait sur l'aperçu montrait le motif « tel qu'un thème sombre
     l'assombrirait », sans jamais toucher au fichier. Poussé à fond, l'écran
     n'était plus que cette image ; on téléchargeait, et le PNG arrivait clair.
     L'aperçu mentait, et c'est la seule chose que ce produit promet de ne
     jamais faire.

     La version sombre est donc devenue un réglage : un aplat noir peint dans le
     fichier, mesuré par la sonde comme n'importe quelle autre image. Ce qui se
     vérifie ici est cette promesse et rien d'autre : ce qu'on voit est ce qu'on
     reçoit, dans les deux positions. */
  {
    const dctx = await browser.newContext({
      viewport: { width: 900, height: 1000 }, locale: 'fr-FR', acceptDownloads: true
    });
    const dp = await dctx.newPage();
    await dp.goto('http://127.0.0.1:' + PORT + '/app?l=fr&m=vagues&p=ciel&d=2&s=4242&r=1179x2556', { waitUntil: 'networkidle' });
    await dp.waitForTimeout(400);

    /* La luminance moyenne sur la bande des icônes, la même que celle que la
       sonde regarde. Elle sert à comparer deux choses que rien d'autre ne
       compare : l'aperçu à l'écran et le fichier sur le disque. Passer par les
       octets ne dirait rien, deux encodages d'une même image différant déjà. */
    const luminance = (source) => dp.evaluate((src) => new Promise((resoudre) => {
      const mesurer = (cv) => {
        const y0 = Math.round(cv.height * 0.24);
        const hauteur = Math.max(1, Math.round(cv.height * 0.92) - y0);
        const d = cv.getContext('2d').getImageData(0, y0, cv.width, hauteur).data;
        const lin = (c) => {
          const v = c / 255;
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        };
        let somme = 0, n = 0;
        for (let i = 0; i < d.length; i += 4 * 37) {
          somme += 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
          n += 1;
        }
        resoudre(n ? somme / n : 0);
      };
      if (src === 'apercu') { mesurer(document.getElementById('apercu')); return; }
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = img.width;
        cv.height = img.height;
        cv.getContext('2d').drawImage(img, 0, 0);
        mesurer(cv);
      };
      img.src = src;
    }), source);

    const telecharger = async (etiquette) => {
      const [fichier] = await Promise.all([
        dp.waitForEvent('download', { timeout: 30000 }),
        dp.$eval('#btn-export', e => e.click())
      ]);
      const chemin = path.join(OUT, etiquette + '-' + fichier.suggestedFilename());
      await fichier.saveAs(chemin);
      const lum = await luminance(
        'data:image/png;base64,' + fs.readFileSync(chemin).toString('base64')
      );
      return { nom: fichier.suggestedFilename(), chemin, lum };
    };

    const dire = () => dp.evaluate(() => ({
      url: location.search,
      coche: [...document.querySelectorAll('#liste-version [role="radio"]')]
        .map((b) => b.dataset.version + ':' + b.getAttribute('aria-checked')).join(' '),
      detail: document.getElementById('verdict-detail').textContent,
      ligne: document.getElementById('barre-voile').textContent,
      alternative: document.getElementById('apercu').getAttribute('aria-label')
    }));

    /* Deux puces, et le choix se lit sur elles : une bascule aurait obligé à
       lire son état pour savoir laquelle des deux images on regarde. */
    const claire = await dire();
    t(claire.coche === 'claire:true sombre:false',
      'version : deux puces, et la claire est celle qu\'on livre par défaut', claire.coche);
    t(!/n=1/.test(claire.url), 'version : l\'adresse ne dit rien tant qu\'elle est claire');

    const apercuClair = await luminance('apercu');
    const fichierClair = await telecharger('claire');
    t(!/-sombre/.test(fichierClair.nom),
      'version : le nom du fichier clair ne porte aucune mention', fichierClair.nom);

    /* La promesse, du côté clair : l'aperçu est le fichier. La comparaison porte
       sur la luminance et non sur les octets, l'aperçu étant rendu à la taille
       de sa boîte et le fichier à celle de l'écran visé ; c'est bien la même
       image, à deux échelles. */
    t(Math.abs(apercuClair - fichierClair.lum) < 0.03,
      'version : en clair, l\'aperçu est le fichier',
      `aperçu ${apercuClair.toFixed(3)}, fichier ${fichierClair.lum.toFixed(3)}`);

    await dp.$eval('#liste-version [data-version="sombre"]', e => e.click());
    await dp.waitForTimeout(600);

    const sombre = await dire();
    t(sombre.coche === 'claire:false sombre:true',
      'version : la puce sombre prend le choix', sombre.coche);
    t(/n=1/.test(sombre.url),
      'version : elle part dans l\'adresse, parce qu\'elle change le fichier', sombre.url);

    const apercuSombre = await luminance('apercu');
    t(apercuSombre < apercuClair * 0.75,
      'version : l\'aperçu s\'assombrit pour de bon, ce n\'est pas un habillage',
      `${apercuClair.toFixed(3)} -> ${apercuSombre.toFixed(3)}`);

    const fichierSombre = await telecharger('sombre');
    t(/-sombre\.png$/.test(fichierSombre.nom),
      'version : le nom du fichier le dit', fichierSombre.nom);
    t(!fs.readFileSync(fichierClair.chemin).equals(fs.readFileSync(fichierSombre.chemin)),
      'version : les deux PNG diffèrent, la puce agit bien sur le fichier',
      fs.statSync(fichierClair.chemin).size + ' o contre ' + fs.statSync(fichierSombre.chemin).size + ' o');

    /* Et la promesse, du côté sombre. C'est exactement le contrôle qui manquait
       au rideau : poussé au sombre, il montrait une image que le téléchargement
       ne rendait pas. */
    t(Math.abs(apercuSombre - fichierSombre.lum) < 0.03,
      'version : en sombre, l\'aperçu est encore le fichier',
      `aperçu ${apercuSombre.toFixed(3)}, fichier ${fichierSombre.lum.toFixed(3)}`);
    t(fichierSombre.lum < fichierClair.lum * 0.75,
      'version : le fichier téléchargé est bien le sombre, pas le clair',
      `${fichierClair.lum.toFixed(3)} -> ${fichierSombre.lum.toFixed(3)}`);

    /* Un seul rapport, et c'est celui du fichier. Le verdict en annonçait deux
       du temps du rideau, celui du fichier et celui d'une simulation : ce second
       chiffre était l'aveu qu'on jugeait une image qu'on ne livrait pas. */
    const rapports = (texte) => [...texte.matchAll(/(\d+[.,]\d+):1/g)]
      .map((m) => parseFloat(m[1].replace(',', '.')));
    t(rapports(claire.detail).length === rapports(sombre.detail).length,
      'version : le verdict garde le même nombre de chiffres dans les deux',
      rapports(claire.detail).join(' / ') + ' contre ' + rapports(sombre.detail).join(' / '));
    t(!/ne change pas/.test(sombre.detail),
      'version : le verdict n\'a plus de simulation à excuser', sombre.detail.slice(0, 70));
    t(rapports(sombre.detail)[0] !== rapports(claire.detail)[0],
      'version : le rapport suit l\'image, il est mesuré sur elle',
      rapports(claire.detail)[0] + ':1 puis ' + rapports(sombre.detail)[0] + ':1');
    t(/[Ss]ombre/.test(sombre.alternative) && !/[Ss]ombre/.test(claire.alternative),
      'version : le texte alternatif la dit, l\'image n\'est pas la même',
      sombre.alternative.slice(-60));

    /* La ligne sous le bouton dit ce que le fichier contient, et elle doit dire
       vrai jusqu'au bout : la version sombre passe sous le seuil que le voile
       vise, la sonde n'a donc plus de voile à poser, et annoncer là un voile
       inclus serait le même genre de mensonge que celui du rideau. */
    t(/[Vv]ersion sombre/.test(sombre.ligne) && !/[Vv]ersion sombre/.test(claire.ligne),
      'version : la ligne sous le bouton la nomme', sombre.ligne.slice(0, 70));
    t(/inclus dans le fichier/.test(claire.ligne),
      'version : en clair, la ligne annonce le voile', claire.ligne.slice(0, 70));
    t(!/inclus dans le fichier/.test(sombre.ligne) && /sans voile/.test(sombre.detail),
      'version : en sombre, elle n\'annonce pas un voile que le fichier ne porte pas',
      sombre.ligne.slice(0, 90));

    /* Le lien porte le choix : c'est ce qui distingue un réglage d'un affichage,
       et le rideau n'en était pas un. */
    await dp.goto('http://127.0.0.1:' + PORT + '/app?l=fr&m=vagues&p=ciel&d=2&s=4242&r=1179x2556&n=1', { waitUntil: 'networkidle' });
    await dp.waitForTimeout(500);
    const recu = await dire();
    t(recu.coche === 'claire:false sombre:true',
      'version : un lien reçu rouvre la même version', recu.coche);
    const apercuRecu = await luminance('apercu');
    t(Math.abs(apercuRecu - apercuSombre) < 0.02,
      'version : et la même image, au rechargement',
      `${apercuSombre.toFixed(3)} -> ${apercuRecu.toFixed(3)}`);

    /* Le thème de l'application et la version du fichier portent les mêmes mots
       et ne font pas la même chose. Un lien peut porter l'un sans l'autre, et
       aucun des deux ne doit décider pour l'autre. */
    await dp.goto('http://127.0.0.1:' + PORT + '/app?l=fr&m=vagues&p=ciel&d=2&s=4242&r=1179x2556&t=sombre', { waitUntil: 'networkidle' });
    await dp.waitForTimeout(500);
    const habille = await dp.evaluate(() => ({
      theme: document.documentElement.dataset.theme,
      coche: [...document.querySelectorAll('#liste-version [role="radio"]')]
        .map((b) => b.dataset.version + ':' + b.getAttribute('aria-checked')).join(' ')
    }));
    t(habille.theme === 'sombre' && habille.coche === 'claire:true sombre:false',
      'version : le thème sombre de la page n\'assombrit pas le fichier',
      JSON.stringify(habille));

    await dctx.close();
  }

  /* --- 21b. le voile est dans le fichier, et l'interrupteur l'en retire
     C'est le défaut que cette section tient fermé : le voile était brûlé dans
     le PNG sans que rien de l'écran ne le dise, et quelqu'un qui téléchargeait
     sans avoir lu la présentation recevait une image plus sombre que celle
     qu'il croyait avoir choisie. */
  {
    const vctx = await browser.newContext({
      viewport: { width: 900, height: 1000 }, locale: 'fr-FR', acceptDownloads: true
    });
    const vp = await vctx.newPage();
    await vp.goto('http://127.0.0.1:' + PORT + '/app?l=fr&m=vagues&p=lime&d=1&s=7314&r=1179x2556', { waitUntil: 'networkidle' });
    await vp.waitForTimeout(400);

    const dire = () => vp.evaluate(() => ({
      ligne: document.getElementById('barre-voile').textContent,
      presse: document.getElementById('btn-voile').getAttribute('aria-pressed'),
      url: location.search,
      empreinte: document.getElementById('apercu').toDataURL('image/png').slice(-96),
      detail: document.getElementById('verdict-detail').textContent
    }));

    /* Un bouton qui change de taille ou de place à l'instant où on l'appuie se
       dérobe sous le doigt. Ici deux choses changeaient : le libellé, plus long
       dans un sens que dans l'autre, et la phrase à côté, plus courte une fois
       le voile retiré. Les deux mots occupent maintenant la même cellule, et la
       phrase prend toute la place qui reste. */
    const boite = () => vp.evaluate(() => {
      const b = document.getElementById('btn-voile').getBoundingClientRect();
      return [+b.x.toFixed(1), +b.y.toFixed(1), +b.width.toFixed(1)];
    });
    const boiteAvant = await boite();

    const avec = await dire();
    t(/inclus dans le fichier/.test(avec.ligne),
      'voile : une ligne sous le bouton dit qu\'il est dans le fichier', avec.ligne.slice(0, 60));
    t(!/v=0/.test(avec.url), 'voile : l\'adresse ne dit rien tant qu\'il est là');

    const [avecFichier] = await Promise.all([
      vp.waitForEvent('download', { timeout: 30000 }),
      vp.$eval('#btn-export', e => e.click())
    ]);
    const cheminAvec = path.join(OUT, 'voile-' + avecFichier.suggestedFilename());
    await avecFichier.saveAs(cheminAvec);

    await vp.$eval('#btn-voile', e => e.click());
    await vp.waitForTimeout(500);
    const sans = await dire();
    t(/retiré du fichier/.test(sans.ligne), 'voile : la ligne suit l\'interrupteur', sans.ligne.slice(0, 60));
    t(sans.presse === 'true', 'voile : l\'interrupteur dit son état');
    const boiteApres = await boite();
    t(JSON.stringify(boiteAvant) === JSON.stringify(boiteApres),
      'voile : l\'interrupteur ne bouge pas d\'un pixel quand on l\'appuie',
      JSON.stringify(boiteAvant) + ' -> ' + JSON.stringify(boiteApres));
    t(/v=0/.test(sans.url), 'voile : le retrait part dans l\'adresse, il change le fichier');
    t(sans.empreinte !== avec.empreinte, 'voile : l\'aperçu est redessiné, il reste le fichier');
    t(/voile retiré/.test(sans.detail), 'voile : le verdict le nomme autrement qu\'un voile nul mesuré',
      sans.detail.slice(0, 70));

    const [sansFichier] = await Promise.all([
      vp.waitForEvent('download', { timeout: 30000 }),
      vp.$eval('#btn-export', e => e.click())
    ]);
    t(/-sansvoile\.png$/.test(sansFichier.suggestedFilename()),
      'voile : le nom du fichier le dit', sansFichier.suggestedFilename());
    const cheminSans = path.join(OUT, sansFichier.suggestedFilename());
    await sansFichier.saveAs(cheminSans);
    t(!fs.readFileSync(cheminAvec).equals(fs.readFileSync(cheminSans)),
      'voile : les deux PNG diffèrent, l\'interrupteur agit bien sur le fichier',
      fs.statSync(cheminAvec).size + ' o contre ' + fs.statSync(cheminSans).size + ' o');
    await vctx.close();
  }

  /* --- 21c. les autres formats
     Quatre sorties de plus derrière un dépli, et le presse-papiers. Ce qui doit
     tenir : chacune livre le type qu'elle annonce, et le SVG se refuse quand le
     motif compte trop de formes plutôt que de livrer un fichier inouvrable. */
  {
    const fctx = await browser.newContext({
      viewport: { width: 900, height: 1000 }, locale: 'fr-FR', acceptDownloads: true
    });
    const fp = await fctx.newPage();
    await fp.goto('http://127.0.0.1:' + PORT + '/app?l=fr&m=arches&p=nuit&d=0&s=7314&r=1179x2556', { waitUntil: 'networkidle' });
    await fp.waitForTimeout(400);

    await fp.$eval('#btn-formats', e => e.click());
    await fp.waitForTimeout(300);
    const ouvert = await fp.evaluate(() => ({
      deplie: document.getElementById('btn-formats').getAttribute('aria-expanded'),
      sorties: [...document.querySelectorAll('#feuille-formats .feuille-b')].map(b => b.id),
      svgActif: !document.getElementById('format-svg').disabled
    }));
    t(ouvert.deplie === 'true', 'formats : le dépli dit son état');
    t(ouvert.sorties.length === 5, 'formats : cinq sorties de plus', ouvert.sorties.join(', '));
    t(ouvert.svgActif, 'formats : le SVG est offert pour une famille géométrique calme');

    const attraper = async (id) => {
      const [dl] = await Promise.all([
        fp.waitForEvent('download', { timeout: 45000 }),
        fp.$eval(id, e => e.click())
      ]);
      const chemin = path.join(OUT, dl.suggestedFilename());
      await dl.saveAs(chemin);
      return { nom: dl.suggestedFilename(), chemin, octets: fs.statSync(chemin).size };
    };

    const svg = await attraper('#format-svg');
    const texte = fs.readFileSync(svg.chemin, 'utf8');
    t(/\.svg$/.test(svg.nom) && texte.startsWith('<?xml'), 'formats : le SVG est un vrai SVG', svg.nom);

    /* Le vectoriel est le même fichier dans un autre format, version sombre
       comprise : il doit porter l'aplat noir, à l'opacité que la sonde a dosée,
       et sur toute la surface. C'est ici plutôt qu'en test unitaire parce que
       la sonde réclame un canevas, donc un navigateur. */
    /* La signature de l'ombre, et d'elle seule : le voile écrit lui aussi des
       `fill-opacity`, mais sur la teinte de son libellé, jamais sur du noir
       pur. C'est ce couple qu'il faut chercher, pas l'opacité seule. */
    const ombreDe = (svg) => svg.match(/fill="#000000" fill-opacity="([0-9.]+)"/);
    t(!ombreDe(texte), 'formats : le SVG clair ne porte aucun aplat de version');

    /* Un réglage ne referme pas la feuille : elle reste ouverte pendant qu'on
       change de version, et il n'y a donc rien à rouvrir entre les deux. */
    await fp.$eval('#liste-version [data-version="sombre"]', e => e.click());
    await fp.waitForTimeout(500);
    const svgSombre = await attraper('#format-svg');
    const texteSombre = fs.readFileSync(svgSombre.chemin, 'utf8');
    const ombre = ombreDe(texteSombre);
    t(/-sombre\.svg$/.test(svgSombre.nom), 'formats : le SVG sombre se nomme comme le PNG', svgSombre.nom);
    t(Boolean(ombre) && Number(ombre[1]) > 0.2,
      'formats : le SVG sombre porte l\'aplat de la version, dosé par la sonde',
      ombre ? ombre[1] : 'aucun');
    await fp.$eval('#liste-version [data-version="claire"]', e => e.click());
    await fp.waitForTimeout(400);
    t(/viewBox="0 0 1179 2556"/.test(texte), 'formats : le SVG porte la résolution visée');
    /* Le voile est peint en rgba() sur un canevas ; dans un SVG, cette notation
       n'appartient pas à la norme 1.1 et un outil de dessin y perdrait les
       bandes. L'opacité doit donc être sortie dans `fill-opacity`. */
    t(!/rgba?\(/.test(texte), 'formats : le SVG n\'écrit aucune couleur fonctionnelle');
    t(/fill-opacity=/.test(texte), 'formats : le voile y passe par fill-opacity');
    const teintes = [...texte.matchAll(/fill="([^"]*)"/g)].map(m => m[1]);
    t(teintes.length > 0 && teintes.every(c => /^#[0-9A-F]{6}$/.test(c)),
      'formats : toutes ses couleurs sont hexadécimales', teintes.length + ' remplissages');

    await fp.$eval('#btn-formats', e => e.click());
    await fp.waitForTimeout(200);
    await fp.$eval('#btn-formats', e => e.click());
    await fp.waitForTimeout(200);
    const png2x = await attraper('#format-png2x');
    const tete = fs.readFileSync(png2x.chemin).subarray(0, 8);
    t(tete.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
      'formats : le PNG 2x est un PNG', png2x.nom);
    t(/2358x5112/.test(png2x.nom), 'formats : le PNG 2x fait deux fois la résolution', png2x.nom);

    await fp.$eval('#btn-formats', e => e.click());
    await fp.waitForTimeout(200);
    await fp.$eval('#btn-formats', e => e.click());
    await fp.waitForTimeout(200);
    const webp = await attraper('#format-webp');
    const entete = fs.readFileSync(webp.chemin).subarray(0, 12).toString('latin1');
    t(/^RIFF/.test(entete) && /WEBP/.test(entete), 'formats : le WebP est un WebP', webp.nom);
    t(webp.octets < png2x.octets, 'formats : le WebP est plus léger que le PNG doublé',
      webp.octets + ' o contre ' + png2x.octets + ' o');

    /* Le garde-fou du SVG ne se déclenche sur aucune famille livrée : la plus
       peuplée, Mosaïque en dense, compte moins de mille formes, et le plafond
       est à vingt-quatre mille. La sortie doit donc être offerte partout, y
       compris sur la trame la plus serrée, et le fichier rester plus léger que
       le PNG qu'il remplace. */
    await fp.goto('http://127.0.0.1:' + PORT + '/app?l=fr&m=mosaique&p=nuit&d=2&s=7314&r=2560x1440', { waitUntil: 'networkidle' });
    await fp.waitForTimeout(400);
    await fp.$eval('#btn-formats', e => e.click());
    await fp.waitForTimeout(600);
    const dense = await fp.evaluate(() => ({
      actif: !document.getElementById('format-svg').disabled,
      note: document.querySelector('#format-svg .feuille-n').textContent
    }));
    t(dense.actif, 'formats : le SVG est offert même sur la famille la plus peuplée');
    t(/grain/.test(dense.note), 'formats : et la note dit ce que le vectoriel ne porte pas', dense.note);
    const svgDense = await attraper('#format-svg');
    t(svgDense.octets < 400000, 'formats : le SVG dense reste un fichier raisonnable',
      Math.round(svgDense.octets / 1024) + ' Ko');
    await fctx.close();
  }

  /* --- 21d. une palette composée à la main
     La deuxième chose qu'Aplat écrit sur l'appareil, et la première qui voyage
     dans un lien. Ce qui doit tenir : elle se compose, elle se dessine, elle
     part dans l'adresse avec ses teintes, et elle se supprime. */
  {
    const pctx = await browser.newContext({ viewport: { width: 900, height: 1400 }, locale: 'fr-FR' });
    const pp = await pctx.newPage();
    await pp.goto('http://127.0.0.1:' + PORT + '/app?l=fr&m=vagues&p=lime&d=1&s=7314&r=1179x2556', { waitUntil: 'networkidle' });
    await pp.waitForTimeout(400);

    await pp.$eval('#btn-composer-palette', e => e.click());
    await pp.waitForTimeout(300);
    const poser = async (id, valeur) => {
      await pp.evaluate(([selecteur, v]) => {
        const el = document.getElementById(selecteur);
        const mutateur = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        mutateur.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, [id, valeur]);
      await pp.waitForTimeout(120);
    };
    await poser('palette-nom', 'OLED');
    await poser('palette-teinte-0', '#000000');
    await poser('palette-teinte-1', '#DFF478');
    await poser('palette-teinte-2', '#FF6648');
    await pp.waitForTimeout(400);

    const brouillon = await pp.evaluate(() => ({
      apercu: !!document.querySelector('.editeur-apercu canvas[data-peint]'),
      actif: !document.getElementById('btn-enregistrer-palette').disabled
    }));
    t(brouillon.apercu, 'palette : la vignette montre le motif pendant qu\'on compose');
    t(brouillon.actif, 'palette : trois teintes recevables suffisent à enregistrer');

    await pp.$eval('#btn-enregistrer-palette', e => e.click());
    await pp.waitForTimeout(600);
    const apres = await pp.evaluate(() => ({
      url: location.search,
      puces: [...document.querySelectorAll('#liste-palettes-perso .opt')].map(o => o.textContent.trim()),
      choisie: document.querySelector('#liste-palettes-perso .opt[aria-checked="true"]')?.textContent.trim(),
      stockage: localStorage.getItem('aplat:palettes'),
      apercu: document.getElementById('apercu').dataset.peint
    }));
    t(/k=000000-DFF478-FF6648/.test(apres.url),
      'palette : le lien porte les teintes, pas seulement le nom', apres.url);
    t(/p=x/.test(apres.url), 'palette : et un nom dérivé des couleurs');
    t(apres.puces.length === 1 && /OLED/.test(apres.puces[0]),
      'palette : la puce entre dans la grille', apres.puces.join(', '));
    t(/OLED/.test(apres.choisie || ''), 'palette : elle devient la palette du motif');
    t(/OLED/.test(apres.stockage || ''), 'palette : elle est gardée sur l\'appareil');
    t(apres.apercu === '1', 'palette : l\'aperçu la dessine');

    /* Deux grilles de palettes, donc deux groupes radio, donc deux portes
       d'entrée au clavier. Celle qui ne contient pas la sélection n'a aucune
       option cochée : sans porte d'entrée, elle deviendrait injoignable. */
    const clavier = await pp.evaluate(() => [...document.querySelectorAll('[role="radiogroup"]')]
      .map(g => ({
        id: g.id,
        stops: [...g.querySelectorAll('.opt')].filter(o => o.tabIndex >= 0).length
      })));
    t(clavier.length === 7, 'palette : la grille des composées est un septième groupe radio',
      clavier.map(g => g.id).join(', '));
    t(clavier.every(g => g.stops === 1),
      'palette : chaque grille garde un arrêt de tabulation, celle de la sélection comme l\'autre',
      clavier.map(g => g.id + ':' + g.stops).join(' '));

    /* Le lien, ouvert ailleurs, doit rendre la même image sans rien écrire. */
    const rctx = await browser.newContext({ viewport: { width: 900, height: 1400 }, locale: 'fr-FR' });
    const rp = await rctx.newPage();
    await rp.goto('http://127.0.0.1:' + PORT + '/app' + apres.url, { waitUntil: 'networkidle' });
    await rp.waitForTimeout(600);
    const recue = await rp.evaluate(() => ({
      choisie: document.querySelector('#liste-palettes-perso .opt[aria-checked="true"]')?.textContent.trim(),
      note: document.querySelector('.palette-note')?.textContent || '',
      stockage: localStorage.getItem('aplat:palettes')
    }));
    t(!!recue.choisie, 'palette reçue : le lien la rend utilisable sans l\'avoir', recue.choisie);
    t(/Enregistre-la/.test(recue.note), 'palette reçue : et propose de la garder', recue.note.slice(0, 50));
    t(recue.stockage === null, 'palette reçue : rien n\'est écrit tant qu\'on ne l\'a pas gardée');
    await rctx.close();

    await pp.$eval('#btn-supprimer-palette', e => e.click());
    await pp.waitForTimeout(500);
    const vide = await pp.evaluate(() => ({
      puces: document.querySelectorAll('#liste-palettes-perso .opt').length,
      palette: new URLSearchParams(location.search).get('p'),
      stockage: localStorage.getItem('aplat:palettes')
    }));
    t(vide.puces === 0, 'palette : la suppression la retire de la grille');
    t(vide.palette === 'lime', 'palette : le motif retombe sur une palette livrée', vide.palette);
    t(vide.stockage === '[]', 'palette : et le stockage est vidé de la sienne', String(vide.stockage));
    await pctx.close();
  }

  /* --- 22. l'historique : ce qu'il retient, ce qu'il rend, ce qu'il oublie
     La seule mémoire de l'application. Elle doit se remplir de ce qu'on a
     vraiment regardé, tenir un rechargement, rendre un motif d'un appui, se
     vider d'un bouton, et ne jamais dépasser dix. */
  {
    const hctx = await browser.newContext({ viewport: { width: 900, height: 1400 }, locale: 'fr-FR' });
    const hp = await hctx.newPage();
    const lu = () => hp.evaluate(() => ({
      vignettes: document.querySelectorAll('#liste-historique button').length,
      stockage: JSON.parse(localStorage.getItem('aplat:motifs') || '[]'),
      vide: !!document.querySelector('.historique-vide')
    }));

    await hp.goto('http://127.0.0.1:' + PORT + '/app?l=fr&m=vagues&p=lime&d=1&s=4242', { waitUntil: 'networkidle' });
    await hp.waitForTimeout(400);
    const neuf = await lu();
    t(neuf.vignettes === 0 && neuf.vide && neuf.stockage.length === 0,
      'historique : rien tant que rien n\'a été regardé', JSON.stringify(neuf.stockage));

    /* Un motif traversé en un clin d'oeil ne compte pas : sans ce délai,
       parcourir les familles remplirait la liste de motifs jamais regardés. */
    await hp.$eval('[data-famille="blobs"]', e => e.click());
    await hp.waitForTimeout(500);
    await hp.$eval('[data-famille="arches"]', e => e.click());
    await hp.waitForTimeout(500);
    const traverse = await lu();
    t(traverse.stockage.length === 0,
      'historique : un motif traversé ne s\'enregistre pas', traverse.stockage.length + ' entrées');

    await hp.waitForTimeout(2600);
    const regarde = await lu();
    t(regarde.stockage.length === 1 && regarde.stockage[0].m === 'arches',
      'historique : un motif regardé s\'enregistre', JSON.stringify(regarde.stockage));

    /* Dix-huit familles regardées : la liste s'arrête à dix, la plus ancienne
       tombe, et rien ne se répète. */
    await hp.evaluate(() => {
      const dix = ['vagues', 'blobs', 'arches', 'decoupes', 'obliques', 'ondes',
        'pointille', 'trame', 'colonnes', 'ecailles', 'terrazzo', 'confettis'];
      localStorage.setItem('aplat:motifs',
        JSON.stringify(dix.map((m, i) => ({ m, p: 'lime', d: 1, s: i + 1 }))));
    });
    await hp.reload({ waitUntil: 'networkidle' });
    await hp.waitForTimeout(500);
    const relu = await lu();
    t(relu.vignettes === 10, 'historique : dix au plus, même si le stockage en porte douze',
      relu.vignettes + ' vignettes');

    const cible = await hp.evaluate(() => {
      const b = document.querySelectorAll('#liste-historique button')[3];
      b.click();
      return b.getAttribute('aria-label');
    });
    await hp.waitForTimeout(400);
    const apres = await hp.evaluate(() => location.search);
    t(/m=decoupes/.test(apres), 'historique : un appui restaure le motif',
      `${cible} -> ${apres}`);

    await hp.$eval('#btn-oublier', e => e.click());
    await hp.waitForTimeout(300);
    const efface = await hp.evaluate(() => ({
      cle: localStorage.getItem('aplat:motifs'),
      vignettes: document.querySelectorAll('#liste-historique button').length
    }));
    t(efface.cle === null && efface.vignettes === 0,
      'historique : le bouton efface la clé, pas seulement l\'affichage',
      String(efface.cle));

    /* Un stockage se trafique à la main : ce qui en sort est traité comme une
       barre d'adresse, avec les mêmes listes blanches. */
    await hp.evaluate(() => localStorage.setItem('aplat:motifs',
      '[{"m":"constructor","p":"lime","d":1,"s":1},{"m":"vagues","p":"lime","d":9,"s":1},{"m":"vagues","p":"lime","d":1,"s":7},"texte",42]'));
    const errAvant = errors.length;
    await hp.reload({ waitUntil: 'networkidle' });
    await hp.waitForTimeout(500);
    const hostile = await lu();
    t(hostile.vignettes === 1 && errors.length === errAvant,
      'historique : un stockage trafiqué ne passe pas, et ne casse rien',
      hostile.vignettes + ' vignette retenue sur 5 entrées');
    await hctx.close();
  }

  /* --- 23. l'épingle : ce que dix entrées ne savaient pas faire
     Garder celle qu'on a aimée pendant qu'on en regarde dix autres. Elle ne
     doit ni allonger la liste, ni pouvoir la remplir entièrement, ni laisser
     tomber ce qu'elle est censée garder. */
  {
    const ectx = await browser.newContext({ viewport: { width: 900, height: 1400 }, locale: 'fr-FR' });
    const ep = await ectx.newPage();
    await ep.goto('http://127.0.0.1:' + PORT + '/app?l=fr&m=arches&p=nuit&d=1&s=101&r=1179x2556', { waitUntil: 'networkidle' });
    await ep.waitForTimeout(400);

    const etat = () => ep.evaluate(() => ({
      presse: document.getElementById('btn-epingler').getAttribute('aria-pressed'),
      epingles: document.querySelectorAll('#liste-historique .historique-b[data-epingle]').length,
      premier: document.querySelector('#liste-historique .historique-b')?.getAttribute('aria-label') || '',
      stockage: localStorage.getItem('aplat:motifs')
    }));

    /* Épingler n'attend pas les deux secondes et demie du passage : c'est un
       geste, et un bouton qui répondrait « pas encore » serait le pire des
       deux mondes. */
    const boiteEpingle = () => ep.evaluate(() => {
      const b = document.getElementById('btn-epingler').getBoundingClientRect();
      return [+b.x.toFixed(1), +b.width.toFixed(1)];
    });
    const epingleAvant = await boiteEpingle();
    await ep.$eval('#btn-epingler', e => e.click());
    await ep.waitForTimeout(400);
    const gardee = await etat();
    t(gardee.presse === 'true', 'épingle : le bouton dit son état');
    t(gardee.epingles === 1, 'épingle : la vignette porte sa coche', gardee.epingles + ' épinglée');
    t(/"f":1/.test(gardee.stockage || ''), 'épingle : elle est gardée sur l\'appareil');
    t(/Épinglé/.test(gardee.premier), 'épingle : elle s\'entend dans le nom du bouton, pas seulement à la forme',
      gardee.premier);
    /* Deux pièges ici, et le premier appui les réunit : le mot raccourcit
       (« Épingler » puis « Épinglé »), et « Effacer » apparaît à côté puisque
       la liste cesse d'être vide. Le bouton reste pourtant où il est. */
    const epingleApres = await boiteEpingle();
    t(JSON.stringify(epingleAvant) === JSON.stringify(epingleApres),
      'épingle : le bouton ne bouge pas d\'un pixel quand on l\'appuie',
      JSON.stringify(epingleAvant) + ' -> ' + JSON.stringify(epingleApres));

    /* Dix motifs traversés ensuite : l'épinglée doit rester, et rester en
       tête, pendant que les autres passent. */
    for (let i = 0; i < 12; i++) {
      await ep.goto('http://127.0.0.1:' + PORT + '/app?l=fr&m=vagues&p=lime&d=1&s=' + (500 + i) + '&r=1179x2556', { waitUntil: 'domcontentloaded' });
      await ep.waitForTimeout(2700);
    }
    const apres = await ep.evaluate(() => {
      const liste = JSON.parse(localStorage.getItem('aplat:motifs') || '[]');
      return {
        total: liste.length,
        epingles: liste.filter(e => e.f === 1).length,
        tete: liste[0],
        garde: liste.some(e => e.m === 'arches' && e.s === 101)
      };
    });
    t(apres.total === 10, 'épingle : la liste reste bornée à dix', apres.total + ' entrées');
    t(apres.garde, 'épingle : le motif épinglé a survécu à douze motifs regardés');
    t(apres.tete && apres.tete.f === 1 && apres.tete.m === 'arches',
      'épingle : il tient la tête, les autres passent dessous', JSON.stringify(apres.tete));
    t(apres.epingles === 1, 'épingle : une seule, personne n\'en a ajouté');
    await ectx.close();
  }

  /* --- 24. les trois appareils en une fois
     Le lien de partage porte déjà la graine ; la même image sur trois écrans
     ne devait être qu'à un bouton près. Trois fichiers partent l'un après
     l'autre, aux trois formats de référence, et la note le dit. */
  {
    const tctx = await browser.newContext({
      viewport: { width: 900, height: 1000 }, locale: 'fr-FR', acceptDownloads: true
    });
    const tp = await tctx.newPage();
    const recus = [];
    tp.on('download', dl => recus.push(dl.suggestedFilename()));
    await tp.goto('http://127.0.0.1:' + PORT + '/app?l=fr&m=arches&p=nuit&d=0&s=7314&r=1179x2556', { waitUntil: 'networkidle' });
    await tp.waitForTimeout(400);
    await tp.$eval('#btn-formats', e => e.click());
    await tp.waitForTimeout(200);
    await tp.$eval('#format-trois', e => e.click());
    await tp.waitForTimeout(9000);
    t(recus.length === 3, 'trois appareils : trois fichiers partent', recus.join(', '));
    t(recus.some(n => /1179x2556/.test(n)) && recus.some(n => /2048x2732/.test(n))
      && recus.some(n => /2560x1440/.test(n)),
      'trois appareils : téléphone, tablette et ordinateur', recus.join(', '));
    t(new Set(recus.map(n => n.split('-')[3])).size === 1,
      'trois appareils : la même graine sur les trois', recus.join(', '));
    const note = await tp.evaluate(() => document.getElementById('note-meta')?.textContent || '');
    t(/Téléphone/.test(note) && /(Mo|Ko)/.test(note),
      'trois appareils : la note dit ce qui a été enregistré', note);
    await tctx.close();
  }

  await browser.close();
  srv.close();

  console.log('\n' + ok.length + ' vérifications passent :');
  for (const l of ok) console.log('  ok   ' + l);
  if (ko.length) { console.log('\n' + ko.length + ' ECHECS :'); for (const l of ko) console.log('  KO   ' + l); }
  process.exitCode = ko.length ? 1 : 0;
})();
