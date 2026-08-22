/* Parcours réel dans le navigateur : téléchargement, aller-retour par l'URL,
   déterminisme, états vide / chargement / erreur / succès, clavier. */
const fs = require('fs');
const path = require('path');
const { launch } = require('./pw');
const { start } = require('./serve');
let PORT = 0;
const OUT = path.resolve(__dirname, '../.exports/e2e');

const ok = [], ko = [];
const t = (cond, label, extra) => (cond ? ok : ko).push(label + (extra ? ' — ' + extra : ''));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { srv, port } = start(); PORT = port;
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

  await page.goto(`http://127.0.0.1:${PORT}/?l=fr&m=blobs&p=nuit&d=2&s=4242&r=1179x2556`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  // --- 1. l'URL est bien lue
  const st = await page.evaluate(() => ({
    fam: document.querySelector('[data-family][aria-checked="true"]').dataset.family,
    pal: document.querySelector('[data-pal][aria-checked="true"]').dataset.pal,
    dens: document.querySelector('[data-dens][aria-checked="true"]').dataset.dens,
    res: document.getElementById('resValue').textContent,
    seed: document.getElementById('shareNote').textContent
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
  const url2 = page.url();
  t(new URL(url1).search === new URL(url2).search, 'URL : aller-retour stable', url2.split('?')[1]);

  // --- 3. déterminisme du rendu
  const h = async () => page.evaluate(() => {
    const E = window.APLAT_ENGINE;
    const c = document.createElement('canvas'); c.width = 300; c.height = 650;
    E.draw(c.getContext('2d', { alpha: false }), 300, 650, 'terrazzo', 'corail', 2, 987);
    return c.toDataURL('image/png').length + ':' + c.toDataURL('image/png').slice(-64);
  });
  const h1 = await h(), h2 = await h();
  await page.reload({ waitUntil: 'networkidle' });
  const h3 = await h();
  t(h1 === h2 && h2 === h3, 'moteur : rendu déterministe, y compris après rechargement');

  // --- 4. indépendance à l'échelle : mêmes proportions à deux résolutions
  const scale = await page.evaluate(() => {
    const E = window.APLAT_ENGINE;
    function sample(W, H) {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const ctx = c.getContext('2d', { alpha: false, willReadFrequently: true });
      E.draw(ctx, W, H, 'arches', 'soleil', 1, 555);
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

  // --- 5. les 18 familles rendent sans erreur, et non vides
  const fams = await page.evaluate(() => {
    const E = window.APLAT_ENGINE;
    const bad = [];
    for (const f of E.FAMILIES) for (const d of [0, 1, 2]) {
      const c = document.createElement('canvas'); c.width = 240; c.height = 520;
      const ctx = c.getContext('2d', { alpha: false, willReadFrequently: true });
      try { E.draw(ctx, 240, 520, f.id, 'lime', d, 31337); } catch (e) { bad.push(f.id + '/d' + d + ': ' + e.message); continue; }
      const px = ctx.getImageData(0, 0, 240, 520).data;
      const seen = new Set();
      for (let i = 0; i < px.length; i += 4 * 97) seen.add(px[i] + ',' + px[i + 1] + ',' + px[i + 2]);
      if (seen.size < 6) bad.push(f.id + '/d' + d + ': quasi uni (' + seen.size + ' teintes)');
    }
    return bad;
  });
  t(fams.length === 0, 'moteur : 18 familles x 3 densités rendent une image', fams.join(' | ') || '54 combinaisons');

  // --- 6. état vide
  await page.evaluate(() => { const s = document.getElementById('resSelect'); s.value = 'custom'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(200);
  await page.fill('#inW', '');
  await page.waitForTimeout(250);
  const empty = await page.evaluate(() => ({
    shown: !document.getElementById('stateEmpty').hidden,
    disabled: document.getElementById('btnExport').disabled,
    res: document.getElementById('resValue').textContent
  }));
  t(empty.shown, 'état vide : hachure affichée');
  t(empty.disabled, 'état vide : téléchargement désactivé');
  t(empty.res.includes('—'), 'état vide : résolution en tirets', empty.res);

  // --- 7. état erreur : au-delà de 40 Mpx
  await page.fill('#inW', '7000');
  await page.fill('#inH', '7000');
  await page.waitForTimeout(250);
  await tap('#btnExport');
  await page.waitForTimeout(400);
  const err = await page.evaluate(() => ({
    shown: !document.getElementById('errCard').hidden,
    msg: document.getElementById('errMsg').textContent
  }));
  t(err.shown, 'état erreur : carte affichée');
  t(/49/.test(err.msg) && /40/.test(err.msg), 'état erreur : message chiffré', err.msg);

  // --- 8. bouton Réessayer présent et cliquable
  t(await page.isEnabled('#btnRetry'), 'état erreur : Réessayer actif');

  // --- 9. téléchargement réel
  await page.fill('#inW', '1179');
  await page.fill('#inH', '2556');
  await page.waitForTimeout(300);
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    tap('#btnExport')
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
    shown: !document.getElementById('doneCard').hidden,
    meta: document.getElementById('doneMeta').textContent
  }));
  t(done.shown, 'état succès : carte affichée');
  t(/PNG/.test(done.meta) && /(Mo|Ko)/.test(done.meta) && /1\s*179/.test(done.meta), 'état succès : dimensions, format et poids', done.meta);

  // --- 10. dimensions réelles du PNG (largeur/hauteur dans l'en-tête IHDR)
  const buf = fs.readFileSync(fpath);
  const w = buf.readUInt32BE(16), hh = buf.readUInt32BE(20);
  t(w === 1179 && hh === 2556, 'export : dimensions exactes du fichier', w + 'x' + hh);

  // --- 11. changer de réglage efface la carte succès
  await tap('[data-family="etoiles"]');
  await page.waitForTimeout(300);
  t(await page.evaluate(() => document.getElementById('doneCard').hidden), 'succès effacé au changement de réglage');

  // --- 13. langue
  await tap('[data-lang="en"]');
  await page.waitForTimeout(300);
  const en = await page.evaluate(() => ({
    html: document.documentElement.lang,
    cta: document.getElementById('ctaLabel').textContent,
    title: document.title,
    url: location.search
  }));
  t(en.html === 'en' && en.cta === 'Download' && /Download|generative/.test(en.title) && en.url.includes('l=en'), 'langue : bascule complète', JSON.stringify(en));

  // --- 14. thème
  await tap('[data-theme="dark"]');
  await page.waitForTimeout(200);
  const th = await page.evaluate(() => ({
    attr: document.documentElement.getAttribute('data-theme'),
    bg: getComputedStyle(document.body).backgroundColor,
    url: location.search
  }));
  t(th.attr === 'dark' && th.url.includes('t=dark'), 'thème : bascule et mémorisation dans l\'URL', th.bg);

  // --- 15. aucun stockage
  const store = await page.evaluate(() => ({
    ls: localStorage.length, ss: sessionStorage.length, cookie: document.cookie.length,
    sw: navigator.serviceWorker ? navigator.serviceWorker.controller !== null : false
  }));
  t(store.ls === 0 && store.ss === 0 && store.cookie === 0 && !store.sw, 'vie privée : aucun stockage', JSON.stringify(store));

  t(errors.length === 0, 'aucune erreur JavaScript', errors.slice(0, 3).join(' | '));

  // --- 11a. paresse : au premier affichage, seules les vignettes proches
  //          du champ de vision sont dessinées
  {
    const lctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'fr-FR' });
    const lp = await lctx.newPage();
    await lp.goto('http://127.0.0.1:' + PORT + '/?l=fr', { waitUntil: 'networkidle' });
    await lp.waitForTimeout(900);
    const lazy = await lp.evaluate(() => {
      let drawn = 0, total = 0;
      for (const cv of document.querySelectorAll('canvas[data-thumb]')) { total++; if (cv.dataset.painted) drawn++; }
      return { drawn, total };
    });
    t(lazy.drawn < lazy.total, 'vignettes : paresseuses au premier affichage', lazy.drawn + '/' + lazy.total + ' dessinées');
    await lctx.close();
  }

  // --- 11b. vignettes paresseuses : dessinées à l'entrée dans le champ,
  //          remises à jour au changement de palette, et conformes à un
  //          recalcul indépendant par le moteur
  {
    await tap('[data-pal="encre"]');
    await page.waitForTimeout(300);
    await page.evaluate(() => document.getElementById('famAbs').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(800);

    const vign = await page.evaluate(() => {
      const E = window.APLAT_ENGINE;
      const q = new URLSearchParams(location.search);
      const PAL = q.get('p'), DENS = parseInt(q.get('d'), 10), SEED = parseInt(q.get('s'), 10);
      const out = { drawn: 0, blank: [], offscreen: 0, mismatch: [], hashes: {} };
      const vh = innerHeight;
      for (const cv of document.querySelectorAll('canvas[data-thumb]')) {
        const r = cv.getBoundingClientRect();
        if (!(r.bottom > -200 && r.top < vh + 200)) { out.offscreen++; continue; }
        if (!cv.dataset.painted) { out.blank.push(cv.dataset.thumb); continue; }
        const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        const teintes = new Set();
        let h = 2166136261;
        for (let i = 0; i < d.length; i += 4 * 53) {
          teintes.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
          h = Math.imul(h ^ (d[i] * 65536 + d[i + 1] * 256 + d[i + 2]), 16777619) >>> 0;
        }
        if (teintes.size < 4) { out.blank.push(cv.dataset.thumb); continue; }
        out.drawn++;
        out.hashes[cv.dataset.thumb] = h;
        // recalcul indépendant : le moteur doit produire exactement la même image
        const ref = document.createElement('canvas');
        ref.width = cv.width; ref.height = cv.height;
        E.draw(ref.getContext('2d', { alpha: false }), cv.width, cv.height, cv.dataset.thumb, PAL, DENS, SEED);
        const rd = ref.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        let rh = 2166136261;
        for (let i = 0; i < rd.length; i += 4 * 53) rh = Math.imul(rh ^ (rd[i] * 65536 + rd[i + 1] * 256 + rd[i + 2]), 16777619) >>> 0;
        if (rh !== h) out.mismatch.push(cv.dataset.thumb);
      }
      return out;
    });
    t(vign.drawn >= 4 && vign.blank.length === 0, 'vignettes : celles à l\'écran sont dessinées',
      vign.drawn + ' dessinées, ' + vign.offscreen + ' hors champ, vides: ' + (vign.blank.join(',') || 'aucune'));
    t(vign.mismatch.length === 0, 'vignettes : conformes à un recalcul indépendant du moteur',
      vign.mismatch.join(',') || 'toutes identiques');

    await tap('[data-pal="lime"]');
    await page.waitForTimeout(500);
    const apres = await page.evaluate(hashes => {
      const changed = [], same = [];
      for (const cv of document.querySelectorAll('canvas[data-thumb]')) {
        const id = cv.dataset.thumb;
        if (!(id in hashes) || !cv.dataset.painted) continue;
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
    await kp.goto('http://127.0.0.1:' + PORT + '/?l=fr', { waitUntil: 'networkidle' });
    await kp.waitForTimeout(300);
    await kp.keyboard.press('Tab');
    const f1 = await kp.evaluate(() => {
      const a = document.activeElement, cs = getComputedStyle(a);
      return { cls: String(a.className), outline: cs.outlineWidth, left: a.getBoundingClientRect().left, txt: (a.textContent || '').trim().slice(0, 24) };
    });
    t(f1.cls.includes('skip'), 'clavier : le lien d\'évitement vient en premier', f1.txt);
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
    t(kb.groups.length === 6, 'clavier : les six groupes sont des groupes radio', kb.groups.length + ' groupes');
    t(kb.groups.every(g => g.stops === 1), 'clavier : un seul arrêt de tabulation par groupe',
      kb.groups.map(g => g.id + ':' + g.stops + '/' + g.opts).join(' '));
    t(kb.groups.every(g => g.roles), 'clavier : chaque option porte role="radio"');
    t(kb.groups.filter(g => g.checked === 1).length >= 4, 'clavier : le choix courant est marqué aria-checked',
      kb.groups.map(g => g.id + ':' + g.checked).join(' '));
    t(kb.stops <= 22, 'clavier : parcours ramené sous 22 arrêts', kb.stops + ' arrêts (42 avant)');

    // flèches : elles déplacent le choix dans le groupe
    await kp.evaluate(() => document.querySelector('#densList .opt[aria-checked="true"]').focus());
    const avant = await kp.evaluate(() => document.querySelector('#densList .opt[aria-checked="true"]').dataset.dens);
    await kp.keyboard.press('ArrowRight');
    await kp.waitForTimeout(250);
    const apresFleche = await kp.evaluate(() => ({
      checked: document.querySelector('#densList .opt[aria-checked="true"]').dataset.dens,
      focused: document.activeElement.dataset.dens
    }));
    t(apresFleche.checked !== avant && apresFleche.checked === apresFleche.focused,
      'clavier : la flèche déplace le choix et le focus ensemble', avant + ' -> ' + apresFleche.checked);

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
      masque.total + ' arrêts testés' + (masque.bad.length ? ' — ' + masque.bad.slice(0, 5).join(' | ') : ''));
    // le focus doit rester visible sur le bouton primaire, qui est sur aplat lime
    await kp.evaluate(() => document.getElementById('btnExport').focus());
    const f2 = await kp.evaluate(() => {
      const cs = getComputedStyle(document.activeElement);
      return { w: cs.outlineWidth, c: cs.outlineColor };
    });
    t(parseFloat(f2.w) >= 3, 'clavier : focus visible sur le bouton primaire', f2.w + ' ' + f2.c);

    // prefers-reduced-motion
    await kctx.close();
    const rctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', locale: 'fr-FR' });
    const rp = await rctx.newPage();
    await rp.goto('http://127.0.0.1:' + PORT + '/?l=fr', { waitUntil: 'networkidle' });
    await rp.waitForTimeout(300);
    const rm = await rp.evaluate(() => {
      const c = document.getElementById('previewCanvas');
      const dots = document.querySelector('.st-busy-d i');
      return {
        canvasTransition: getComputedStyle(c).transitionDuration,
        canvasOpacity: getComputedStyle(c).opacity,
        dotDuration: dots ? getComputedStyle(dots).animationDuration : null
      };
    });
    const small = v => !v || parseFloat(v) <= 0.01;
    t(small(rm.canvasTransition) && small(rm.dotDuration), 'mouvement réduit : transitions et animations coupées', JSON.stringify(rm));
    t(parseFloat(rm.canvasOpacity) === 1, 'mouvement réduit : le canevas reste opaque', rm.canvasOpacity);
    await rctx.close();
  }

  // --- 15b. course à l'export : un réglage changé pendant l'encodage ne doit
  //          ni renommer le fichier, ni lancer un second export
  {
    const rctx = await browser.newContext({ viewport: { width: 900, height: 900 }, locale: 'fr-FR', acceptDownloads: true });
    const rp = await rctx.newPage();
    // image volontairement lourde : l'encodage dure assez pour cliquer pendant
    await rp.goto('http://127.0.0.1:' + PORT + '/?l=fr&m=blobs&p=nuit&d=1&s=777&r=5000x5000', { waitUntil: 'networkidle' });
    await rp.waitForTimeout(500);
    const dls = [];
    rp.on('download', d => dls.push(d.suggestedFilename()));

    // tout en une seule évaluation : les clics sont synchrones, donc bien
    // pendant la fenêtre d'encodage
    const pendant = await rp.evaluate(async () => {
      document.getElementById('btnExport').click();
      await new Promise(r => setTimeout(r, 120));       // le dessin a démarré
      const busyAvant = document.getElementById('btnExport').getAttribute('aria-busy');
      document.querySelector('[data-pal="soleil"]').click();
      document.querySelector('[data-dens="2"]').click();
      document.getElementById('btnExport').click();
      document.getElementById('btnExport').click();
      document.getElementById('btnExport').click();
      const busyApres = document.getElementById('btnExport').getAttribute('aria-busy');
      const voile = !document.getElementById('stateBusy').hidden;
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
      pal: document.querySelector('[data-pal][aria-checked="true"]').dataset.pal,
      meta: document.getElementById('doneMeta').textContent,
      done: !document.getElementById('doneCard').hidden
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
    await bp.goto('http://127.0.0.1:' + PORT + '/?l=fr&r=4000x4000', { waitUntil: 'networkidle' });
    await bp.waitForTimeout(500);
    const dls2 = [];
    bp.on('download', d => dls2.push(d.suggestedFilename()));
    await bp.$eval('#btnExport', e => e.click());
    await bp.waitForTimeout(4000);
    const vide = await bp.evaluate(() => ({
      err: !document.getElementById('errCard').hidden,
      msg: document.getElementById('errMsg').textContent
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
    await ap.goto('http://127.0.0.1:' + PORT + '/?l=fr&r=1179x2556', { waitUntil: 'networkidle' });
    await ap.waitForTimeout(600);
    const inv = await ap.evaluate(() => {
      const E = window.APLAT_ENGINE;
      const cv = document.getElementById('previewCanvas');
      const r = cv.getBoundingClientRect();
      const arCv = r.width / r.height, arCible = 1179 / 2556;
      let veil = 0, niveau = 0, total = 0;
      const niv = m => m.ratio >= 4.5 ? 'bonne' : m.ratio >= 3 ? 'correcte' : 'faible';
      for (const f of E.FAMILIES) for (const p of E.PAL_ORDER) for (const d of [0, 1, 2]) {
        total++;
        const a = E.measure(f.id, p, d, 7314, cv.width, cv.height);
        const b = E.measure(f.id, p, d, 7314, 1179, 2556);
        if (Math.round(a.veil * 100) !== Math.round(b.veil * 100)) veil++;
        if (niv(a) !== niv(b) || a.mode !== b.mode) niveau++;
      }
      return { ecart: +(((arCv / arCible) - 1) * 100).toFixed(2), total, veil, niveau };
    });
    t(Math.abs(inv.ecart) < 0.5, 'aperçu : le canevas porte le rapport d\'aspect visé', inv.ecart + ' %');
    t(inv.veil === 0 && inv.niveau === 0,
      'aperçu : même voile et même verdict que le fichier, sur les 594 combinaisons',
      inv.veil + ' voiles et ' + inv.niveau + ' verdicts divergents sur ' + inv.total);

    // un téléphone récent doit être classé comme un téléphone
    const classe = [];
    for (const [w, h, attendu] of [[1179, 2556, 'Téléphone'], [1290, 2796, 'Téléphone'], [1440, 3200, 'Téléphone'],
                                   [2048, 2732, 'Tablette'], [1536, 2048, 'Tablette'], [2560, 1440, 'Ordinateur']]) {
      await ap.goto('http://127.0.0.1:' + PORT + '/?l=fr&r=' + w + 'x' + h, { waitUntil: 'domcontentloaded' });
      await ap.waitForTimeout(200);
      const got = await ap.evaluate(() => document.getElementById('resDevice').textContent.split(' · ')[0]);
      if (got !== attendu) classe.push(w + 'x' + h + ': ' + got + ' au lieu de ' + attendu);
    }
    t(classe.length === 0, 'aperçu : le type d\'appareil est correct, téléphones récents compris', classe.join(' | ') || '6 formats');
    await actx.close();
  }

  // --- 15e. saisie de résolution : une seule vérité affichée
  {
    const sctx2 = await browser.newContext({ viewport: { width: 900, height: 1000 }, locale: 'fr-FR' });
    const sp2 = await sctx2.newPage();
    await sp2.goto('http://127.0.0.1:' + PORT + '/?l=fr', { waitUntil: 'networkidle' });
    await sp2.waitForTimeout(400);
    await sp2.evaluate(() => { const s = document.getElementById('resSelect'); s.value = 'custom'; s.dispatchEvent(new Event('change', { bubbles: true })); });
    await sp2.waitForTimeout(200);

    await sp2.fill('#inW', '');
    await sp2.type('#inW', '9999');
    await sp2.waitForTimeout(300);
    const clamp = await sp2.evaluate(() => ({
      champ: document.getElementById('inW').value,
      carte: document.getElementById('resValue').textContent,
      url: location.search
    }));
    t(clamp.champ === '8000' && /8\s*000/.test(clamp.carte) && /8000x/.test(clamp.url),
      'saisie : au-delà de la borne haute, le champ, la carte et le lien disent la même chose',
      clamp.champ + ' / ' + clamp.carte + ' / ' + clamp.url);

    // saisie mal formée : le champ montre ce que l'app utilise
    await sp2.fill('#inW', '');
    await sp2.type('#inW', '19e20');
    await sp2.waitForTimeout(300);
    const mal = await sp2.evaluate(() => ({
      champ: document.getElementById('inW').value,
      carte: document.getElementById('resValue').textContent
    }));
    t(mal.champ === '1920' && /1\s*920/.test(mal.carte),
      'saisie : un caractère non numérique est filtré sans vider l\'état',
      mal.champ + ' / ' + mal.carte);

    // borne basse : signalée, et visible
    await sp2.fill('#inW', '');
    await sp2.type('#inW', '5');
    await sp2.waitForTimeout(300);
    const bas = await sp2.evaluate(() => {
      const i = document.getElementById('inW'), j = document.getElementById('inH');
      const h = document.getElementById('resHint');
      const cs = getComputedStyle(i), csOk = getComputedStyle(j);
      return {
        invalide: i.getAttribute('aria-invalid'),
        etat: h.dataset.state,
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
      'saisie : l\'erreur se voit aussi — trait épaissi et triangle, pas seulement la teinte',
      'bordure ' + bas.bordure + ' contre ' + bas.bordureOk + ', triangle ' + bas.triangle);
    t(/16/.test(bas.message) && /8000/.test(bas.message), 'saisie : le message dit les bornes', bas.message);
    await sctx2.close();
  }

  // --- 15f. régions live : pas de réannonce quand rien n'a changé
  {
    const lctx2 = await browser.newContext({ viewport: { width: 900, height: 1000 }, locale: 'fr-FR' });
    const lp2 = await lctx2.newPage();
    await lp2.goto('http://127.0.0.1:' + PORT + '/?l=fr', { waitUntil: 'networkidle' });
    await lp2.waitForTimeout(600);
    const churn = await lp2.evaluate(async () => {
      const cibles = ['legTitle', 'legDetail', 'shareNote', 'resValue', 'ctaLabel'];
      let ecritures = 0;
      const obs = new MutationObserver(ms => { ecritures += ms.length; });
      for (const id of cibles) obs.observe(document.getElementById(id), { childList: true, characterData: true, subtree: true });
      // trois rendus qui ne changent rien de ces textes
      const b = document.querySelector('[data-family][aria-checked="true"]');
      for (let i = 0; i < 3; i++) { b.click(); await new Promise(r => setTimeout(r, 120)); }
      obs.disconnect();
      return ecritures;
    });
    t(churn === 0, 'régions live : rien n\'est réécrit quand rien ne change', churn + ' écritures');

    // et l'état vide n'affiche aucun chiffre inventé
    await lp2.evaluate(() => { const s = document.getElementById('resSelect'); s.value = 'custom'; s.dispatchEvent(new Event('change', { bubbles: true })); });
    await lp2.waitForTimeout(200);
    await lp2.fill('#inW', '');
    await lp2.waitForTimeout(400);
    const vide2 = await lp2.evaluate(() => ({
      detail: document.getElementById('legDetail').textContent,
      titre: document.getElementById('legTitle').textContent,
      pastilles: [...document.querySelectorAll('.leg-good, .leg-ok, .leg-low')].filter(n => !n.hidden).length
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
    await up.goto('http://127.0.0.1:' + PORT + '/?l=fr&p=constructor&m=blobs', { waitUntil: 'networkidle' });
    await up.waitForTimeout(500);
    const proto = await up.evaluate(() => ({
      pal: (document.querySelector('[data-pal][aria-checked="true"]') || {}).dataset,
      peint: document.getElementById('previewCanvas').width > 4,
      url: location.search
    }));
    t(proto.pal && proto.pal.pal === 'lime', 'URL : palette inconnue ramenée au défaut', proto.pal && proto.pal.pal);
    t(proto.peint, 'URL : le rendu a bien eu lieu malgré le paramètre hostile');
    t(uerr.length === 0, 'URL : aucune erreur levée', uerr.slice(0, 2).join(' | '));

    // resolution hors bornes ou incomplète : on retombe entièrement sur la détection
    for (const [q, label] of [['r=5x5', 'trop petite'], ['r=99999x2000', 'trop grande'], ['r=1179', 'moitié manquante'], ['r=abcxdef', 'illisible']]) {
      await up.goto('http://127.0.0.1:' + PORT + '/?l=fr&' + q, { waitUntil: 'networkidle' });
      await up.waitForTimeout(300);
      const v = await up.evaluate(() => ({
        res: document.getElementById('resValue').textContent,
        dev: document.getElementById('resDevice').textContent,
        url: location.search
      }));
      t(/détecté/.test(v.dev) && !/—/.test(v.res), 'URL : résolution ' + label + ' ignorée', v.res + ' / ' + v.dev);
    }

    // la résolution détectée ne part pas dans le lien
    await up.goto('http://127.0.0.1:' + PORT + '/?l=fr', { waitUntil: 'networkidle' });
    await up.waitForTimeout(400);
    const propre = await up.evaluate(() => location.search);
    t(!/[?&]r=/.test(propre), 'URL : la résolution détectée ne part pas dans le lien partagé', propre);

    // une résolution saisie à la main, elle, est transmise
    await up.evaluate(() => { const s = document.getElementById('resSelect'); s.value = 'custom'; s.dispatchEvent(new Event('change', { bubbles: true })); });
    await up.waitForTimeout(200);
    await up.fill('#inW', '2560');
    await up.fill('#inH', '1440');
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
    await sp.goto('http://127.0.0.1:' + PORT + '/?l=fr', { waitUntil: 'networkidle' });
    await sp.waitForTimeout(400);
    await sp.$eval('#shareBtn', e => e.click());
    await sp.waitForTimeout(400);
    const echec = await sp.evaluate(() => ({
      label: document.getElementById('shareLabel').textContent,
      note: document.getElementById('shareNote').textContent,
      repli: !document.getElementById('shareFallback').hidden,
      url: document.getElementById('shareUrl').value,
      live: !!document.getElementById('shareNote').getAttribute('aria-live')
    }));
    t(!/copié/i.test(echec.label), 'partage : pas de « lien copié » quand la copie échoue', echec.label);
    t(/impossible/i.test(echec.note), 'partage : l\'échec est dit', echec.note.slice(0, 40));
    t(echec.repli && echec.url === sp.url(), 'partage : le lien est proposé à copier à la main', echec.url ? 'champ rempli' : 'vide');
    t(echec.live, 'partage : la note est dans une région live');
    await sctx.close();

    // et le succès reste un succès
    const octx = await browser.newContext({ viewport: { width: 900, height: 900 }, locale: 'fr-FR', permissions: ['clipboard-read', 'clipboard-write'] });
    const op = await octx.newPage();
    await op.goto('http://127.0.0.1:' + PORT + '/?l=fr', { waitUntil: 'networkidle' });
    await op.waitForTimeout(400);
    await op.$eval('#shareBtn', e => e.click());
    await op.waitForTimeout(400);
    const ok2 = await op.evaluate(() => ({
      label: document.getElementById('shareLabel').textContent,
      repli: !document.getElementById('shareFallback').hidden
    }));
    t(/copié/i.test(ok2.label) && !ok2.repli, 'partage : succès annoncé, pas de repli affiché', ok2.label);
    await octx.close();
  }

  // --- 18. la promesse « aucun réseau » est inscrite dans le document
  {
    const cctx = await browser.newContext({ viewport: { width: 900, height: 900 }, locale: 'fr-FR' });
    const cp = await cctx.newPage();
    await cp.goto('http://127.0.0.1:' + PORT + '/?l=fr', { waitUntil: 'networkidle' });
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

  await browser.close();
  srv.close();

  console.log('\n' + ok.length + ' vérifications passent :');
  for (const l of ok) console.log('  ok   ' + l);
  if (ko.length) { console.log('\n' + ko.length + ' ECHECS :'); for (const l of ko) console.log('  KO   ' + l); }
  process.exitCode = ko.length ? 1 : 0;
})();
