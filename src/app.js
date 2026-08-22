/* ==========================================================================
   Aplat — interface.
   Une seule page. Trois réglages. Un seul appel primaire : télécharger.
   Rien n'est stocké, rien n'est envoyé : l'état partageable tient dans l'URL.
   ========================================================================== */
(function () {
  'use strict';

  var E = window.APLAT_ENGINE;
  var STR = window.APLAT_I18N;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- état --------------------------------------------------------- */

  var S = {
    lang: 'fr',
    theme: 'system',
    family: 'vagues',
    pal: 'lime',
    dens: 1,
    seed: 7314,
    wStr: '',
    hStr: '',
    editRes: false,
    phase: 'idle',       /* idle · rendering · done · error */
    errKind: null,
    last: null,
    copied: false,
    copyFailed: false,
    clock: '',
    leg: null
  };

  var detected = { w: 1170, h: 2532 };
  var els = {};
  var thumbs = {};
  var ctxCache = new WeakMap();
  var timers = {};

  /* ---------- utilitaires --------------------------------------------------- */

  function t() { return STR[S.lang]; }
  function locale() { return S.lang === 'fr' ? 'fr-FR' : 'en-US'; }
  function num(n) { return n.toLocaleString(locale()); }
  function dec(n) { var s = n.toFixed(1); return S.lang === 'fr' ? s.replace('.', ',') : s; }
  function now() { return new Date().toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' }); }

  function ctxOf(canvas) {
    var c = ctxCache.get(canvas);
    if (!c) { c = canvas.getContext('2d', { alpha: false }); ctxCache.set(canvas, c); }
    return c;
  }

  var RES_MIN = 16, RES_MAX = 8000;

  /* Les champs annoncent min="16" ; hors d'un <form> le navigateur ne l'applique
     pas, et l'ancienne borne « > 0 » laissait exporter une image de 5 px. */
  function res() {
    var w = parseInt(S.wStr, 10), h = parseInt(S.hStr, 10);
    return {
      w: w >= RES_MIN ? Math.min(w, RES_MAX) : 0,
      h: h >= RES_MIN ? Math.min(h, RES_MAX) : 0
    };
  }

  function outOfRange(str) {
    if (!str) return false;
    var n = parseInt(str, 10);
    return isNaN(n) || n < RES_MIN || n > RES_MAX;
  }

  function kind(w, h) {
    if (!w || !h) return 'phone';
    var short = Math.min(w, h);
    if (w > h) return short >= 800 ? 'desk' : 'tablet';
    return short <= 1200 ? 'phone' : 'tablet';
  }

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt !== undefined && txt !== null) n.textContent = txt;
    return n;
  }

  /* Marque le choix d'un groupe radio et n'y laisse qu'un seul arrêt de
     tabulation, sur l'option choisie. */
  function mark(group, isOn) {
    if (!group) return;
    var opts = group.querySelectorAll('.opt');
    var any = false;
    for (var i = 0; i < opts.length; i++) {
      var on = isOn(opts[i]);
      if (on) any = true;
      opts[i].setAttribute('role', 'radio');
      opts[i].setAttribute('aria-checked', on ? 'true' : 'false');
      opts[i].tabIndex = on ? 0 : -1;
    }
    /* un groupe sans choix courant garde une porte d'entrée au clavier */
    if (!any && opts.length) opts[0].tabIndex = 0;
  }

  /* Flèches, Début et Fin dans un groupe radio : elles déplacent le choix,
     comme pour des boutons radio natifs. */
  function radioKeys(group) {
    if (!group) return;
    group.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k !== 'ArrowRight' && k !== 'ArrowDown' && k !== 'ArrowLeft' &&
          k !== 'ArrowUp' && k !== 'Home' && k !== 'End') return;
      var opts = [].slice.call(group.querySelectorAll('.opt'));
      var i = opts.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      var j = k === 'Home' ? 0
        : k === 'End' ? opts.length - 1
        : (k === 'ArrowRight' || k === 'ArrowDown') ? (i + 1) % opts.length
        : (i - 1 + opts.length) % opts.length;
      opts[j].focus();
      opts[j].click();
    });
  }

  /* Ramène l'élément qui vient de prendre le focus dans la bande libre, entre
     la scène collante et la barre d'action. Sans ça, un élément atteint au
     clavier se colle au bord de la fenêtre, c'est-à-dire sous l'une des deux
     couches, et son anneau de focus disparaît (WCAG 2.2, 2.4.11). */
  function keepFocusVisible(e) {
    var n = e.target;
    if (!n || !n.getBoundingClientRect || !n.closest) return;
    if (n.closest('.bar') || n.closest('.stage')) return;   /* déjà au-dessus */
    var cs = getComputedStyle(document.documentElement);
    var padT = parseFloat(cs.scrollPaddingTop) || 0;
    var padB = parseFloat(cs.scrollPaddingBottom) || 0;
    var vh = window.innerHeight;
    var b = n.getBoundingClientRect();
    if (b.height > vh - padT - padB) return;   /* trop grand pour la bande */
    if (b.top < padT) window.scrollBy(0, b.top - padT);
    else if (b.bottom > vh - padB) window.scrollBy(0, b.bottom - (vh - padB));
  }

  function set(patch) {
    /* Un réglage touché pendant un export ne doit pas effacer l'état « rendu en
       cours » : l'export continue, avec l'instantané pris au clic. */
    Object.assign(S, { phase: exporting ? S.phase : 'idle', errKind: null, copied: false, copyFailed: false }, patch);
    render();
  }

  /* ---------- résolution détectée ------------------------------------------ */

  function detect() {
    var dpr = window.devicePixelRatio || 1;
    var sw = (window.screen && screen.width) || 390;
    var sh = (window.screen && screen.height) || 844;
    var w = Math.max(320, Math.round(sw * dpr));
    var h = Math.max(320, Math.round(sh * dpr));
    /* Sur un appareil tactile, screen.width/height suivent l'orientation sur
       Android mais pas sur iOS. On propose toujours le portrait : c'est ce
       qu'on met en fond d'écran, et le format reste modifiable à la main. */
    var touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (touch && w > h) { var s = w; w = h; h = s; }
    return { w: w, h: h };
  }

  /* ---------- chrome : thème, langue, boîte de l'appareil ------------------ */

  function labelTokens(dev, mode) {
    var base = mode === 'light' ? '247,243,230' : '23,36,63';
    dev.style.setProperty('--label', mode === 'light' ? '#F7F3E6' : '#17243F');
    dev.style.setProperty('--label-inv', mode === 'light' ? '#17243F' : '#F7F3E6');
    [14, 15, 16, 20, 24, 26, 28, 90].forEach(function (p) {
      dev.style.setProperty('--l' + p, 'rgba(' + base + ',' + (p / 100) + ')');
    });
  }

  var chromeSig = null;
  function applyChrome(force) {
    var box = els.stageBox, dev = els.device;
    if (!box || !dev) return;
    var r0 = res();
    var sig = [S.theme, S.lang, r0.w, r0.h, window.innerWidth, window.innerHeight, box.clientWidth].join('|');
    if (!force && sig === chromeSig) return;
    chromeSig = sig;

    var root = document.documentElement;
    root.setAttribute('data-theme', S.theme);
    root.setAttribute('lang', S.lang);
    document.title = t().htmlTitle;
    var d = document.querySelector('meta[name="description"]');
    if (d) d.setAttribute('content', t().metaDesc);

    /* la vue reste épinglée : elle prend une part de l'écran, jamais tout */
    var narrow = window.innerWidth < 760;
    var vh = window.innerHeight || 800;
    box.style.height = Math.round(narrow
      ? Math.max(214, Math.min(348, vh * 0.40))
      : Math.max(300, Math.min(600, vh * 0.62))) + 'px';

    var r = r0;
    if (!r.w || !r.h) return;
    var k = kind(r.w, r.h);
    var capW = k === 'phone' ? 300 : (k === 'tablet' ? 430 : 660);
    var maxW = Math.max(160, Math.min(box.clientWidth || 300, capW));
    var maxH = Math.max(200, box.clientHeight || 420);
    var dw = maxW, dh = dw * r.h / r.w;
    if (dh > maxH) { dh = maxH; dw = dh * r.w / r.h; }
    dev.style.width = Math.round(dw) + 'px';
    dev.style.height = Math.round(dh) + 'px';
    dev.style.borderRadius = Math.round(Math.min(dw, dh) * (k === 'phone' ? 0.13 : k === 'tablet' ? 0.055 : 0.024)) + 'px';
    dev.style.setProperty('--mu', (Math.min(dw, dh) / 100) + 'px');
    dev.style.setProperty('--cols', k === 'phone' ? 4 : 6);
    stickyHeights();
  }

  /* La feuille de style réserve la place des deux couches collantes pour que le
     focus clavier ne finisse jamais dessous : elle a besoin de leurs hauteurs.
     Mesuré : ni le défilement déclenché par le focus ni scrollIntoView
     n'appliquent scroll-padding aujourd'hui. Les déclarations restent — elles
     servent aux ancres et aux navigateurs qui les respectent — mais la
     correction fiable est faite à la main dans keepFocusVisible(). */
  function stickyHeights() {
    var root = document.documentElement.style;
    var stage = els.stage ? els.stage.offsetHeight : 0;
    var bar = els.bar ? els.bar.offsetHeight : 0;
    var narrow = window.innerWidth < 760;
    root.setProperty('--stage-h', (narrow ? stage : 0) + 'px');
    root.setProperty('--bar-h', bar + 'px');
  }

  /* ---------- construction des listes -------------------------------------- */

  function famButton(f) {
    var b = el('button', 'opt opt-fam');
    b.type = 'button';
    var cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    b.appendChild(cv);
    cv.dataset.thumb = f.id;
    thumbs[f.id] = cv;
    var lab = el('span', 'opt-fam-l');
    lab.appendChild(el('span', 'opt-dot'));
    lab.firstChild.setAttribute('aria-hidden', 'true');
    var txt = el('span', null, f[S.lang]);
    txt.dataset.famLabel = f.id;
    lab.appendChild(txt);
    b.appendChild(lab);
    b.addEventListener('click', function () { set({ family: f.id }); });
    b.dataset.family = f.id;
    return b;
  }

  function palButton(id) {
    var P = E.PALETTES[id];
    var b = el('button', 'opt opt-pal');
    b.type = 'button';
    var sw = el('span', 'opt-pal-s');
    sw.setAttribute('aria-hidden', 'true');
    [P.bg, P.cols[0], P.cols[1], P.cols[2]].forEach(function (hex) {
      var i = el('i'); i.style.background = hex; sw.appendChild(i);
    });
    b.appendChild(sw);
    var lab = el('span', 'opt-pal-l');
    var dot = el('span', 'opt-dot'); dot.setAttribute('aria-hidden', 'true');
    lab.appendChild(dot);
    var txt = el('span', null, P[S.lang]);
    txt.dataset.palLabel = id;
    lab.appendChild(txt);
    b.appendChild(lab);
    b.addEventListener('click', function () { set({ pal: id }); });
    b.dataset.pal = id;
    return b;
  }

  function densButton(i) {
    var b = el('button', 'opt opt-dens');
    b.type = 'button';
    b.dataset.level = String(i);
    var dots = el('span', 'opt-dens-d');
    dots.setAttribute('aria-hidden', 'true');
    dots.appendChild(el('i')); dots.appendChild(el('i')); dots.appendChild(el('i'));
    b.appendChild(dots);
    var txt = el('span', 'opt-dens-t');
    txt.dataset.densLabel = String(i);
    b.appendChild(txt);
    b.addEventListener('click', function () { set({ dens: i }); });
    b.dataset.dens = String(i);
    return b;
  }

  function buildLists() {
    E.FAMILIES.forEach(function (f) {
      (f.g === 'abs' ? els.famAbs : els.famFig).appendChild(famButton(f));
    });
    E.PAL_ORDER.forEach(function (id) { els.palList.appendChild(palButton(id)); });
    [0, 1, 2].forEach(function (i) { els.densList.appendChild(densButton(i)); });

    [['fr', 'Français'], ['en', 'English']].forEach(function (l) {
      var b = el('button', 'opt opt-lang', l[1]);
      b.type = 'button';
      b.lang = l[0];
      b.dataset.lang = l[0];
      b.addEventListener('click', function () { set({ lang: l[0] }); });
      els.langList.appendChild(b);
    });

    ['light', 'dark', 'system'].forEach(function (id) {
      var b = el('button', 'opt opt-theme');
      b.type = 'button';
      b.dataset.theme = id;
      var i = el('i'); i.setAttribute('aria-hidden', 'true');
      b.appendChild(i);
      var s = el('span'); s.dataset.themeLabel = id;
      b.appendChild(s);
      b.addEventListener('click', function () { set({ theme: id }); });
      els.themeList.appendChild(b);
    });

    ['pDetected', 'pPhone', 'pTablet', 'pDesk'].forEach(function (key, i) {
      var b = el('button', 'pill');
      b.type = 'button';
      b.dataset.preset = key;
      b.addEventListener('click', function () {
        var wh = presetSize(i);
        set({ wStr: String(wh.w), hStr: String(wh.h) });
      });
      els.presets.appendChild(b);
    });
  }

  function presetSize(i) {
    return [detected, { w: 1179, h: 2556 }, { w: 2048, h: 2732 }, { w: 2560, h: 1440 }][i];
  }

  /* ---------- maquette d'écran --------------------------------------------- */

  function mockIcon(cls, radius) {
    var s = el('span', cls);
    var i = el('i');
    i.style.borderRadius = radius;
    s.appendChild(i);
    return s;
  }

  var mockSig = null;
  function buildMock(k) {
    var T = t();
    var n = new Date();
    /* la maquette ne dépend que du type d'appareil, de la langue et de la
       géométrie : inutile de la reconstruire à chaque frappe */
    var sig = [k, S.lang, els.device.style.width, els.device.style.height, n.getDate()].join('|');
    if (sig === mockSig) return;
    mockSig = sig;

    /* recalculée ici et pas seulement au tick de 20 s : sinon l'heure gardait
       le format de la langue précédente pendant vingt secondes */
    S.clock = now();
    els.mockClock.textContent = S.clock;
    els.mockdClock.textContent = S.clock;
    els.mockDay.textContent = String(n.getDate());
    els.mockdDay.textContent = String(n.getDate());
    var dn = n.toLocaleDateString(locale(), { weekday: 'long' });
    var mn = n.toLocaleDateString(locale(), { month: 'long' });
    els.mockDayName.textContent = dn;
    els.mockdDayName.textContent = dn;
    els.mockMonth.textContent = mn;
    els.mockdMonth.textContent = mn;
    els.mockSearch.textContent = T.search;

    var apps = k === 'desk' ? T.desk : T.apps.slice(0, k === 'phone' ? 16 : 24);
    var dock = T.dock.slice(0, k === 'desk' ? 6 : 4);

    if (k === 'desk') {
      els.mockdIcons.textContent = '';
      apps.forEach(function (label, i) {
        var w = el('span', 'mockd-app');
        w.appendChild(mockIcon('mockd-app-i', E.RADII[i % E.RADII.length]));
        w.appendChild(el('span', 'mockd-app-t', label));
        els.mockdIcons.appendChild(w);
      });
      els.mockdMenu.textContent = '';
      T.menu.forEach(function (label) {
        els.mockdMenu.appendChild(el('span', 'mockd-menu', label));
      });
      els.mockdDock.textContent = '';
      dock.forEach(function (label, i) {
        els.mockdDock.appendChild(mockIcon('mockd-dock-i', E.RADII[(i + 2) % E.RADII.length]));
      });
      trimMock(els.mockDesk, els.mockdIcons, 1);
    } else {
      els.mockGrid.textContent = '';
      apps.forEach(function (label, i) {
        var w = el('span', 'mock-app');
        w.appendChild(mockIcon('mock-app-i', E.RADII[i % E.RADII.length]));
        w.appendChild(el('span', 'mock-app-t', label));
        els.mockGrid.appendChild(w);
      });
      els.mockDock.textContent = '';
      dock.forEach(function (label, i) {
        els.mockDock.appendChild(mockIcon('mock-dock-i', E.RADII[(i + 2) % E.RADII.length]));
      });
      trimMock(els.mockHandheld, els.mockGrid, k === 'phone' ? 4 : 6);
    }
  }

  /* La grille d'icônes est dimensionnée en unités --mu, elles-mêmes calées sur
     le petit côté de l'appareil. Un écran large — tablette en 4:3, ordinateur
     en 16:9 — est proportionnellement moins haut qu'un téléphone : la grille
     complète débordait alors par le bas et emportait le dock et la barre de
     recherche hors du cadre. On retire des rangées jusqu'à ce que tout tienne,
     pour que la zone basse du fond d'écran reste jugeable elle aussi. */
  function trimMock(mock, host, step) {
    if (!mock || !host || mock.hidden) return;
    var guard = 0;
    while (mock.scrollHeight > mock.clientHeight + 1 &&
           host.children.length > step && guard++ < 12) {
      for (var i = 0; i < step && host.lastChild; i++) host.removeChild(host.lastChild);
    }
  }

  /* ---------- rendu de l'interface ------------------------------------------ */

  function fill(key, node) { node.textContent = t()[key]; }

  var staticLang = null;
  function renderStatic() {
    if (staticLang === S.lang) return;
    staticLang = S.lang;
    var T = t();
    document.querySelectorAll('[data-t]').forEach(function (n) {
      var v = T[n.dataset.t];
      if (typeof v === 'string') n.textContent = v;
    });
    els.famAbs.querySelectorAll('[data-fam-label]').forEach(function (n) {
      var f = E.FAMILIES.find(function (x) { return x.id === n.dataset.famLabel; });
      if (f) n.textContent = f[S.lang];
    });
    els.famFig.querySelectorAll('[data-fam-label]').forEach(function (n) {
      var f = E.FAMILIES.find(function (x) { return x.id === n.dataset.famLabel; });
      if (f) n.textContent = f[S.lang];
    });
    document.querySelectorAll('[data-pal-label]').forEach(function (n) {
      n.textContent = E.PALETTES[n.dataset.palLabel][S.lang];
    });
    document.querySelectorAll('[data-dens-label]').forEach(function (n) {
      n.textContent = [T.dCalm, T.dMid, T.dDense][+n.dataset.densLabel];
    });
    document.querySelectorAll('[data-theme-label]').forEach(function (n) {
      n.textContent = { light: T.tLight, dark: T.tDark, system: T.tAuto }[n.dataset.themeLabel];
      n.parentNode.title = n.textContent;
    });
    els.presets.querySelectorAll('[data-preset]').forEach(function (n, i) {
      var wh = presetSize(i);
      n.textContent = T[n.dataset.preset];
      n.setAttribute('aria-label', T[n.dataset.preset] + ' — ' + num(wh.w) + ' × ' + num(wh.h) + ' px');
    });
  }

  function render() {
    var T = t();
    var r = res();
    var k = kind(r.w, r.h);
    var empty = !r.w || !r.h;

    renderStatic();
    applyChrome(false);

    /* — états de la scène — */
    var busy = S.phase === 'rendering';
    els.stateEmpty.hidden = !empty;
    els.stateBusy.hidden = !busy;
    els.mockHandheld.hidden = empty || busy || k === 'desk';
    els.mockDesk.hidden = empty || busy || k !== 'desk';
    els.previewCanvas.hidden = empty;
    if (!empty && !busy) buildMock(k);

    /* — sélections —
         Ces cinq groupes sont à choix unique et exclusif : ce sont des boutons
         radio, pas des bascules. Un seul arrêt de tabulation par groupe, les
         flèches déplacent le choix. Le parcours clavier passe de 42 arrêts à
         une dizaine, ce qui compte d'autant plus que la page a deux barres
         collantes. */
    mark(els.famAbs, function (b) { return b.dataset.family === S.family; });
    mark(els.famFig, function (b) { return b.dataset.family === S.family; });
    mark(els.palList, function (b) { return b.dataset.pal === S.pal; });
    mark(els.densList, function (b) { return +b.dataset.dens === S.dens; });
    mark(els.langList, function (b) { return b.dataset.lang === S.lang; });
    mark(els.themeList, function (b) { return b.dataset.theme === S.theme; });

    /* — résolution — */
    els.resValue.textContent = empty ? '— × —' : num(r.w) + ' × ' + num(r.h) + ' px';
    els.resDevice.textContent =
      (k === 'phone' ? T.devPhone : k === 'tablet' ? T.devTablet : T.devDesk) + ' · ' +
      (r.w === detected.w && r.h === detected.h ? T.detected : T.custom);
    els.resToggle.textContent = S.editRes ? T.close : T.edit;
    els.resToggle.setAttribute('aria-expanded', S.editRes ? 'true' : 'false');
    els.resToggle.setAttribute('aria-label', (S.editRes ? T.close : T.edit) + ' — ' + T.resolution);
    els.resEditor.hidden = !S.editRes;
    els.inW.setAttribute('aria-invalid', outOfRange(S.wStr) ? 'true' : 'false');
    els.inH.setAttribute('aria-invalid', outOfRange(S.hStr) ? 'true' : 'false');
    if (document.activeElement !== els.inW && els.inW.value !== S.wStr) els.inW.value = S.wStr;
    if (document.activeElement !== els.inH && els.inH.value !== S.hStr) els.inH.value = S.hStr;

    /* — lisibilité — */
    renderLeg();

    /* — description de l'aperçu pour les lecteurs d'écran —
         Elle est portée par le canevas seul : sur le conteneur, role="img" en
         faisait une feuille et retirait de l'arbre le texte de l'état vide,
         qui est pourtant la seule consigne actionnable de l'application.
         La note sur la maquette est rattachée par aria-describedby, elle n'est
         donc plus recopiée ici. */
    var fam = E.FAMILIES.find(function (f) { return f.id === S.family; });
    if (empty || busy) {
      els.previewCanvas.setAttribute('aria-hidden', 'true');
      els.previewCanvas.removeAttribute('role');
      els.previewCanvas.removeAttribute('aria-label');
      els.previewCanvas.removeAttribute('aria-describedby');
    } else {
      els.previewCanvas.removeAttribute('aria-hidden');
      els.previewCanvas.setAttribute('role', 'img');
      els.previewCanvas.setAttribute('aria-describedby', 'mockNote');
      els.previewCanvas.setAttribute('aria-label',
        T.previewAlt
          .replace('{family}', fam ? fam[S.lang] : S.family)
          .replace('{palette}', E.PALETTES[S.pal][S.lang])
          .replace('{density}', [T.dCalm, T.dMid, T.dDense][S.dens])
          .replace('{seed}', String(S.seed)));
    }

    /* — partage — */
    els.shareLabel.textContent = S.copied ? T.copied : T.share;
    if (S.copyFailed) {
      els.shareNote.textContent = T.copyFail;
      els.shareFallback.hidden = false;
      if (els.shareUrl.value !== location.href) els.shareUrl.value = location.href;
    } else {
      els.shareFallback.hidden = true;
      els.shareNote.textContent = T.shareNote + ' ';
      els.shareNote.appendChild(el('span', 'share-seed', T.seed + ' ' + S.seed));
    }

    /* — barre d'action — */
    els.doneCard.hidden = !(S.phase === 'done' && !empty);
    els.errCard.hidden = S.phase !== 'error';
    if (S.last) {
      /* sous le mégaoctet on affiche des kilooctets : « 262 Ko » dit ce que
         « 0,3 Mo » cache, et le poids du fichier fait partie du résultat. */
      var b = S.last.size;
      var poids = b < 1048576
        ? num(Math.round(b / 1024)) + ' ' + T.savedSizeK
        : dec(b / 1048576) + ' ' + T.savedSize;
      els.doneMeta.textContent = num(S.last.w) + ' × ' + num(S.last.h) + ' px · PNG · ' + poids;
    }
    els.errMsg.textContent = S.errKind === 'big'
      ? T.errBig.replace('{mp}', dec(r.w * r.h / 1e6))
      : T.errGen;

    /* Pendant le rendu on ne met pas `disabled` : le navigateur retirerait le
       focus du bouton et le renverrait au début du document, obligeant à tout
       reparcourir. aria-disabled le neutralise sans le rendre infocusable, et
       onExport() refuse de repartir. `disabled` reste pour l'état vide, où le
       bouton n'a rien à faire dans le parcours. */
    els.ctaLabel.textContent = busy ? T.rendering : T.download;
    els.btnExport.disabled = empty;
    els.btnExport.setAttribute('aria-disabled', busy ? 'true' : 'false');
    els.btnExport.setAttribute('aria-busy', busy ? 'true' : 'false');

    /* — dessin — */
    paint(false);
    syncUrl();
  }

  /* ---------- dessin -------------------------------------------------------- */

  /* Deux signatures distinctes : l'aperçu dépend de la résolution visée, les
     vignettes non. Sans ça, taper un chiffre dans le champ largeur redessinait
     les dix-huit vignettes pour rien. */
  var sigPreview = null;
  var sigThumb = Object.create(null);
  var seen = Object.create(null);

  function paintPreview(force) {
    var r = res();
    var c = els.previewCanvas;
    if (!c || !r.w || !r.h) return;
    var rect = c.getBoundingClientRect();
    if (rect.width <= 4) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    var pw = Math.round(rect.width * dpr), ph = Math.round(rect.height * dpr);
    var sig = [S.family, S.pal, S.dens, S.seed, pw, ph].join('|');
    if (!force && sig === sigPreview) return;
    sigPreview = sig;

    if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
    var m = E.draw(ctxOf(c), pw, ph, S.family, S.pal, S.dens, S.seed);
    labelTokens(els.device, m.mode);

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      c.style.transition = 'none';
      c.style.opacity = '0.35';
      requestAnimationFrame(function () {
        c.style.transition = 'opacity 260ms ease-out';
        c.style.opacity = '1';
      });
    }

    var prev = S.leg;
    if (!prev || prev.mode !== m.mode ||
        Math.abs(prev.ratio - m.ratio) > 0.08 || Math.abs(prev.veil - m.veil) > 0.02) {
      S.leg = m;
      renderLeg();
    }
  }

  /* Seules les vignettes réellement à l'écran sont dessinées : sur un téléphone
     il y en a six ou sept, pas dix-huit. Celles qui reviennent dans le champ
     sont redessinées à ce moment-là si leurs réglages ont changé. */
  function paintThumbs(force) {
    var base = [S.pal, S.dens, S.seed].join('|');
    var k = Math.max(1.5, Math.min(window.devicePixelRatio || 1, 2));
    E.FAMILIES.forEach(function (f) {
      var tc = thumbs[f.id];
      if (!tc || !seen[f.id]) return;
      var tr = tc.getBoundingClientRect();
      if (tr.width < 4) return;
      var tw = Math.round(tr.width * k), th = Math.round(tr.height * k);
      var sig = base + '|' + tw + 'x' + th;
      if (!force && sigThumb[f.id] === sig) return;
      sigThumb[f.id] = sig;
      if (tc.width !== tw || tc.height !== th) { tc.width = tw; tc.height = th; }
      E.draw(ctxOf(tc), tw, th, f.id, S.pal, S.dens, S.seed);
      tc.dataset.painted = '1';
    });
  }

  function paint(force) {
    applyChrome(force);
    if (S.phase !== 'rendering') paintPreview(force);
    paintThumbs(force);
  }

  function watchThumbs() {
    if (!window.IntersectionObserver) {
      E.FAMILIES.forEach(function (f) { seen[f.id] = true; });
      paintThumbs(true);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var id = e.target.dataset.thumb;
        if (id) seen[id] = e.isIntersecting;
      });
      paintThumbs(false);
    }, { rootMargin: '200px 0px' });
    E.FAMILIES.forEach(function (f) { if (thumbs[f.id]) io.observe(thumbs[f.id]); });
  }

  /* mise à jour ciblée du bloc lisibilité, sans relancer un rendu complet */
  function renderLeg() {
    var T = t();
    var leg = S.leg || { mode: 'light', ratio: 5.4, veil: 0.18 };
    var lvl = leg.ratio >= 4.5 ? 'good' : leg.ratio >= 3 ? 'ok' : 'low';
    els.legGood.hidden = lvl !== 'good';
    els.legOk.hidden = lvl !== 'ok';
    els.legLow.hidden = lvl !== 'low';
    els.legTitle.textContent = T.legibTitle + ' · ' +
      (lvl === 'good' ? T.lvGood : lvl === 'ok' ? T.lvOk : T.lvLow);
    var veilTxt = leg.veil > 0.02 ? T.veil.replace('{n}', String(Math.round(leg.veil * 100))) : T.noVeil;
    els.legDetail.textContent = dec(leg.ratio) + ':1 · ' +
      (leg.mode === 'light' ? T.labLight : T.labDark) + ' · ' + veilTxt + ' — ' +
      (lvl === 'good' ? T.adviceGood : lvl === 'ok' ? T.adviceOk : T.adviceLow);
  }

  /* ---------- URL ----------------------------------------------------------- */

  var lastQuery = null;
  function syncUrl() {
    var r = res();
    var q = new URLSearchParams();
    q.set('m', S.family);
    q.set('p', S.pal);
    q.set('d', String(S.dens));
    q.set('s', String(S.seed));
    q.set('l', S.lang);
    /* La résolution détectée est une mesure de l'appareil, pas un réglage : elle
       n'a rien à faire dans un lien partagé. Son absence veut dire « la
       résolution de l'appareil qui ouvre le lien », ce qui sert aussi mieux le
       destinataire. Seule une saisie manuelle est transmise. */
    if (r.w && r.h && !(r.w === detected.w && r.h === detected.h)) q.set('r', r.w + 'x' + r.h);
    if (S.theme !== 'system') q.set('t', S.theme);
    var str = q.toString();
    if (str === lastQuery) return;
    lastQuery = str;
    try { history.replaceState(null, '', location.pathname + '?' + str); } catch (e) { /* file:// */ }
  }

  function readUrl() {
    var q;
    try { q = new URLSearchParams(location.search); } catch (e) { return; }
    var fam = q.get('m');
    if (E.FAMILIES.some(function (f) { return f.id === fam; })) S.family = fam;
    /* Liste blanche, jamais un accès par index : PALETTES['constructor'] est
       « vrai » et faisait planter le premier rendu, aperçu et vignettes compris. */
    var pal = q.get('p');
    if (E.PAL_ORDER.indexOf(pal) >= 0) S.pal = pal;
    var d = parseInt(q.get('d'), 10);
    if (d >= 0 && d <= 2) S.dens = d;
    var s = parseInt(q.get('s'), 10);
    if (s > 0 && s <= 99999) S.seed = s;
    var l = q.get('l');
    if (l === 'fr' || l === 'en') S.lang = l;
    else S.lang = (navigator.language || 'fr').toLowerCase().indexOf('fr') === 0 ? 'fr' : 'en';
    var th = q.get('t');
    if (th === 'light' || th === 'dark' || th === 'system') S.theme = th;

    /* La résolution est un couple : une moitié illisible et on retombe
       entièrement sur la détection, plutôt que de mélanger l'écran de
       l'expéditeur et celui du destinataire. Mêmes bornes que les champs. */
    var parts = (q.get('r') || '').split('x');
    var rw = parseInt(parts[0], 10), rh = parseInt(parts[1], 10);
    var okRes = parts.length === 2 &&
      rw >= RES_MIN && rw <= RES_MAX && rh >= RES_MIN && rh <= RES_MAX;
    S.wStr = String(okRes ? rw : detected.w);
    S.hStr = String(okRes ? rh : detected.h);
  }

  /* ---------- actions -------------------------------------------------------- */

  function onSeed() { set({ seed: Math.floor(Math.random() * 99999) + 1 }); }

  function onToggleRes() {
    S.editRes = !S.editRes;
    render();
    if (S.editRes) els.inW.focus();
    else els.resToggle.focus();
  }

  function digits(v) { return String(v).replace(/[^0-9]/g, '').slice(0, 4); }

  /* Le même rappel servait de succès et d'échec : un refus de permission, un
     document non focalisé ou un navigateur sans API affichaient « Lien copié »
     alors que rien n'avait été copié. Le partage par URL est le seul mécanisme
     d'état partageable du produit : annoncer une copie qui n'a pas eu lieu
     serait un mensonge d'interface. */
  function onShare() {
    function finish(ok) {
      S.copied = ok;
      S.copyFailed = !ok;
      render();
      if (!ok && els.shareUrl) { els.shareUrl.focus(); els.shareUrl.select(); }
      clearTimeout(timers.copy);
      if (ok) timers.copy = setTimeout(function () { S.copied = false; render(); }, 2600);
    }
    var url = location.href;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(
          function () { finish(true); },
          function () { finish(false); }
        );
        return;
      }
    } catch (e) { /* API absente ou contexte non sécurisé */ }
    finish(false);
  }

  /* Le verrou de réentrance ne peut pas vivre dans la phase d'affichage : set()
     la remet à « idle » et set() est le gestionnaire de tous les boutons de
     réglage. Un clic sur une palette pendant l'encodage relançait donc un
     second export en parallèle du premier. */
  var exporting = false;

  function onExport() {
    if (exporting) return;
    var r = res();
    if (!r.w || !r.h) { S.editRes = true; render(); els.inW.focus(); return; }
    if (r.w * r.h > 40e6) { S.phase = 'error'; S.errKind = 'big'; render(); return; }

    /* Instantané pris au clic : l'encodage d'un PNG de plusieurs mégapixels dure
       plusieurs centaines de millisecondes, pendant lesquelles l'interface reste
       cliquable. Sans ça, un changement de palette pendant l'encodage renommait
       un fichier déjà dessiné, et la densité — absente du nom — glissait sans
       laisser de trace. */
    var job = { fam: S.family, pal: S.pal, dens: S.dens, seed: S.seed, w: r.w, h: r.h };

    exporting = true;
    S.phase = 'rendering';
    S.errKind = null;
    render();

    setTimeout(function () {
      var c = null;
      try {
        c = document.createElement('canvas');
        c.width = job.w; c.height = job.h;
        var ctx = c.getContext('2d', { alpha: false });
        if (!ctx) throw new Error('no 2d context');
        E.draw(ctx, job.w, job.h, job.fam, job.pal, job.dens, job.seed);
        c.toBlob(function (b) {
          if (!b || b.size < 128) { release(c); fail(); return; }
          var url = URL.createObjectURL(b);
          var a = document.createElement('a');
          a.href = url;
          a.rel = 'noopener';
          a.download = 'aplat-' + job.fam + '-' + job.pal + '-' + job.seed + '-' + job.w + 'x' + job.h + '.png';
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(function () { URL.revokeObjectURL(url); }, 6000);
          /* libéré avant render() : celui-ci repeint l'aperçu et les vignettes,
             inutile de garder un bitmap de 160 Mo vivant pendant ce temps */
          release(c);
          exporting = false;
          S.phase = 'done';
          S.last = { w: job.w, h: job.h, size: b.size };
          render();
        }, 'image/png');
      } catch (e) { release(c); fail(); }
    }, 70);

    function fail() {
      exporting = false;
      S.phase = 'error';
      S.errKind = 'gen';
      render();
    }
    /* libère la mémoire du canevas hors écran : un 4K pèse ~33 Mo en RAM */
    function release(cv) { if (cv) { cv.width = 1; cv.height = 1; } }
  }

  /* ---------- démarrage ------------------------------------------------------ */

  function boot() {
    [
      'stageBox', 'device', 'previewCanvas', 'mockHandheld', 'mockDesk', 'stateEmpty', 'stateBusy',
      'mockClock', 'mockDay', 'mockDayName', 'mockMonth', 'mockGrid', 'mockSearch', 'mockDock',
      'mockdClock', 'mockdDay', 'mockdDayName', 'mockdMonth', 'mockdIcons', 'mockdMenu', 'mockdDock',
      'legGood', 'legOk', 'legLow', 'legTitle', 'legDetail',
      'famAbs', 'famFig', 'palList', 'densList',
      'resValue', 'resDevice', 'resToggle', 'resEditor', 'inW', 'inH', 'presets',
      'shareBtn', 'shareLabel', 'shareNote', 'shareFallback', 'shareUrl', 'langList', 'themeList',
      'stage', 'bar',
      'doneCard', 'doneMeta', 'errCard', 'errMsg', 'btnRetry', 'btnSeed', 'btnExport', 'ctaLabel'
    ].forEach(function (id) { els[id] = $(id); });

    detected = detect();
    readUrl();
    S.clock = now();

    buildLists();

    [els.famAbs, els.famFig, els.palList, els.densList, els.langList, els.themeList]
      .forEach(radioKeys);
    document.addEventListener('focusin', keepFocusVisible);

    els.resToggle.addEventListener('click', onToggleRes);
    els.inW.addEventListener('input', function (e) {
      var v = digits(e.target.value);
      if (e.target.value !== v) e.target.value = v;
      set({ wStr: v });
    });
    els.inH.addEventListener('input', function (e) {
      var v = digits(e.target.value);
      if (e.target.value !== v) e.target.value = v;
      set({ hStr: v });
    });
    els.shareBtn.addEventListener('click', onShare);
    els.btnSeed.addEventListener('click', onSeed);
    els.btnExport.addEventListener('click', onExport);
    els.btnRetry.addEventListener('click', onExport);

    var rz;
    window.addEventListener('resize', function () {
      clearTimeout(rz);
      rz = setTimeout(function () { stickyHeights(); paint(true); }, 120);
    });

    if (window.ResizeObserver && els.stageBox) {
      var ro = new ResizeObserver(function () {
        clearTimeout(rz);
        rz = setTimeout(function () { paint(true); }, 90);
      });
      ro.observe(els.stageBox);
    }

    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', function () { paint(true); });

    setInterval(function () {
      S.clock = now();
      els.mockClock.textContent = S.clock;
      els.mockdClock.textContent = S.clock;
    }, 20000);

    render();
    watchThumbs();
    /* les polices changent la métrique des vignettes : on repeint une fois prêtes */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { paint(true); });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
