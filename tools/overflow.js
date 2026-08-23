/* Détecte les débordements : barre de défilement horizontale, contenu coupé,
   maquette d'écran qui déborde. Tourne aussi avec des libellés allongés de
   30 %, comme le demande la contrainte i18n. */
const { launch } = require('./pw');
const { ouvrir } = require('./serveur');
let PORT = 0;

const VIEWS = [
  { name: 'phone 320', w: 320, h: 568, dsf: 2 },
  { name: 'phone 360', w: 360, h: 640, dsf: 3 },
  { name: 'phone 390', w: 390, h: 844, dsf: 3 },
  { name: 'phone 430', w: 430, h: 932, dsf: 3 },
  { name: 'tablet 768', w: 768, h: 1024, dsf: 2 },
  { name: 'tablet 834', w: 834, h: 1112, dsf: 2 },
  { name: 'desk 1280', w: 1280, h: 900, dsf: 2 },
  { name: 'desk 1920', w: 1920, h: 1080, dsf: 1 }
];

const TARGETS = [
  { q: '', label: 'auto' },
  { q: '&r=1179x2556', label: 'téléphone' },
  { q: '&r=2048x2732', label: 'tablette' },
  { q: '&r=2560x1440', label: 'ordinateur' }
];

/* Rallonge chaque libellé de 30 % pour éprouver les gabarits.
   L'allongement se fait sur le DOM et non sur les dictionnaires : React rend
   depuis ses modules, une donnée modifiée après coup serait réécrite au
   premier rendu. Ce qu'on éprouve ici, c'est la mise en page, pas la donnée. */
const STRETCH = `(() => {
  const pad = s => {
    const net = s.trim();
    if (net.length <= 2) return s;
    // Espace insécable sur un libellé, ordinaire sur une phrase : autrement
    // l'allongement fabrique un mot de trente caractères qui ne peut pas
    // revenir à la ligne, et on mesurerait un défaut inventé par la mesure.
    const liant = net.length <= 24 ? '\\u00a0' : ' ';
    return s + liant + 'x'.repeat(Math.max(1, Math.round(net.length * 0.3)));
  };
  const racine = document.getElementById('root');
  const marche = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT);
  const noeuds = [];
  while (marche.nextNode()) noeuds.push(marche.currentNode);
  for (const n of noeuds) {
    if (!n.textContent.trim()) continue;
    n.textContent = pad(n.textContent);
  }
})()`;

(async () => {
  const { srv, port } = await ouvrir(); PORT = port;
  const browser = await launch();
  const problems = [];

  for (const stretched of [false, true]) {
    for (const lang of ['fr', 'en']) {
      for (const v of VIEWS) {
        for (const tg of TARGETS) {
          const ctx = await browser.newContext({
            viewport: { width: v.w, height: v.h }, deviceScaleFactor: v.dsf,
            colorScheme: 'light', locale: lang === 'fr' ? 'fr-FR' : 'en-US',
            hasTouch: v.w < 900, isMobile: v.w < 900
          });
          const page = await ctx.newPage();
          await page.goto(`http://127.0.0.1:${PORT}/?l=${lang}${tg.q}`, { waitUntil: 'networkidle' });
          await page.waitForTimeout(200);
          if (stretched) {
            await page.evaluate(STRETCH);
            await page.waitForTimeout(150);
          }

          const r = await page.evaluate(() => {
            const out = { hScroll: 0, clipped: [], mockOverflow: null };
            out.hScroll = document.documentElement.scrollWidth - document.documentElement.clientWidth;

            // texte coupé : scrollWidth > clientWidth sans ellipsis prévue
            for (const n of document.querySelectorAll('button, .carte-h, .grp, .verdict-t, .verdict-d, .res-val, .res-appareil, .partage-n, .note-t, .note-m, .note-h, .prefs h3, .accroche')) {
              const cs = getComputedStyle(n);
              if (n.offsetParent === null) continue;
              const okX = cs.textOverflow === 'ellipsis' || cs.overflowX !== 'visible';
              if (!okX && n.scrollWidth > n.clientWidth + 1) {
                out.clipped.push((n.id || n.className || n.tagName) + ' :: ' + n.textContent.trim().slice(0, 30));
              }
            }

            // libellés qui ne doivent jamais être coupés ni élidés
            out.truncated = [];
            const jamais = [
              ['#cta-libelle', 'appel primaire'],
              ['#liste-langue .opt', 'bouton de langue'],
              ['#liste-theme .opt span', 'bouton de thème'],
              
              ['#partage-libelle', 'copier le lien']
            ];
            for (const [sel, nom] of jamais) {
              for (const n of document.querySelectorAll(sel)) {
                if (n.offsetParent === null) continue;
                const elide = n.scrollWidth > n.clientWidth + 1;
                /* mot coupé : on compte les boîtes de ligne réellement produites
                   par le texte, via un Range — la hauteur du bouton ne dit rien,
                   elle est imposée par min-height:44px. */
                let lignes = 1;
                const txt = [...n.childNodes].find(c => c.nodeType === 3 && c.textContent.trim());
                if (txt) {
                  const rg = document.createRange();
                  rg.selectNodeContents(txt);
                  lignes = rg.getClientRects().length || 1;
                }
                const mots = n.textContent.trim().split(/\s+/).length;
                const casse = mots === 1 && lignes > 1;
                if (elide || casse) out.truncated.push(nom + (elide ? ':élidé' : ':coupé') + ' "' + n.textContent.trim().slice(0, 18) + '"');
              }
            }

            // la maquette d'écran doit tenir dans l'appareil
            const dev = document.getElementById('appareil');
            for (const id of ['maquette', 'maquette-bureau']) {
              const m = document.getElementById(id);
              if (!m) continue;
              const over = Math.max(0, m.scrollHeight - m.clientHeight);
              const dockSel = id === 'maquette-bureau' ? '.maqo-dock-b' : '.maq-dock';
              const dock = m.querySelector(dockSel);
              const dr = dock && dock.getBoundingClientRect();
              const vr = dev.getBoundingClientRect();
              const dockOut = dr ? Math.round(dr.bottom - vr.bottom) : null;
              if (over > 1 || (dockOut !== null && dockOut > 1)) {
                out.maqOverflow = { id, over, dockOut, devH: Math.round(vr.height) };
              }
            }
            return out;
          });

          const tag = `${stretched ? '+30% ' : ''}${lang} ${v.name} ${tg.label}`;
          if (r.hScroll > 0) problems.push(`${tag}: défilement horizontal ${r.hScroll}px`);
          if (r.clipped.length) problems.push(`${tag}: texte coupé — ${r.clipped.slice(0, 4).join(' | ')}`);
          if (r.truncated && r.truncated.length) problems.push(`${tag}: libellé coupé — ${r.truncated.slice(0, 3).join(' | ')}`);
          if (r.maqOverflow) problems.push(`${tag}: maquette ${r.maqOverflow.id} déborde de ${r.maqOverflow.over}px (dock à +${r.maqOverflow.dockOut}px, appareil ${r.maqOverflow.devH}px)`);
          await ctx.close();
        }
      }
    }
  }

  await browser.close();
  srv.close();
  if (problems.length) {
    console.log(`${problems.length} problèmes :`);
    const seen = new Set();
    for (const p of problems) { const k = p.replace(/\d+/g, '#'); if (!seen.has(k)) { seen.add(k); console.log('  ' + p); } }
    console.log(`\n(${problems.length} au total, ${seen.size} formes distinctes)`);
    process.exitCode = 1;
  } else console.log('Aucun débordement, y compris avec des libellés allongés de 30 %.');
})();
