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
    fam: document.querySelector('[data-family][aria-pressed="true"]').dataset.family,
    pal: document.querySelector('[data-pal][aria-pressed="true"]').dataset.pal,
    dens: document.querySelector('[data-dens][aria-pressed="true"]').dataset.dens,
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
  await tap('#resToggle');
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

  // --- 12. clavier, sur une page fraîche : l'ordre de tabulation part du haut
  {
    const kctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'fr-FR' });
    const kp = await kctx.newPage();
    await kp.goto('http://127.0.0.1:' + PORT + '/?l=fr', { waitUntil: 'networkidle' });
    await kp.waitForTimeout(300);
    const kb = await kp.evaluate(() => {
      const nodes = [...document.querySelectorAll('button, input, a[href]')].filter(n => n.offsetParent !== null || n.classList.contains('skip'));
      return { count: nodes.length, noTabIndexTrap: nodes.every(n => n.tabIndex >= 0) };
    });
    t(kb.noTabIndexTrap, 'clavier : aucun contrôle retiré de la tabulation', kb.count + ' contrôles');
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

  await browser.close();
  srv.close();

  console.log('\n' + ok.length + ' vérifications passent :');
  for (const l of ok) console.log('  ok   ' + l);
  if (ko.length) { console.log('\n' + ko.length + ' ECHECS :'); for (const l of ko) console.log('  KO   ' + l); }
  process.exitCode = ko.length ? 1 : 0;
})();
