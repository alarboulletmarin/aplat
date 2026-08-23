/* Contrôle de contraste sur le DOM réel : on remonte la pile de fonds pour
   composer les couleurs semi-transparentes, puis on applique la formule WCAG.
   Texte courant 4,5:1 · texte large 3:1 · bordures d'éléments d'interface 3:1.
   La fausse maquette d'écran est exclue : elle est posée sur le motif, et sa
   lisibilité est mesurée par le moteur, pas par cette sonde. */
const { launch } = require('./pw');
const { ouvrir } = require('./serveur');
let PORT = 0;

const CASES = [
  { name: 'clair fr', scheme: 'light', q: '?l=fr' },
  { name: 'sombre fr', scheme: 'dark', q: '?l=fr' },
  { name: 'clair en', scheme: 'light', q: '?l=en' },
  { name: 'sombre en', scheme: 'dark', q: '?l=en' },
  { name: 'clair forcé', scheme: 'dark', q: '?l=fr&t=light' },
  { name: 'sombre forcé', scheme: 'light', q: '?l=fr&t=dark' }
];

const PROBE = () => {
  function parse(c) {
    const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (!m) return null;
    return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
  }
  function over(fg, bg) {
    const a = fg[3];
    return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1];
  }
  function lum(c) {
    const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  }
  function ratio(a, b) {
    const la = lum(a), lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  /* fond effectif : on empile les fonds des ancêtres jusqu'à l'opacité */
  function bgOf(node) {
    const stack = [];
    let n = node;
    while (n && n.nodeType === 1) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c[3] > 0) stack.push(c);
      if (c && c[3] === 1) break;
      n = n.parentElement;
    }
    let base = [255, 255, 255, 1];
    for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base);
    return base;
  }
  function isLarge(cs) {
    const px = parseFloat(cs.fontSize);
    const w = parseInt(cs.fontWeight, 10) || 400;
    return px >= 24 || (px >= 18.66 && w >= 700);
  }

  const skip = el => el.closest('.maq, .maqo, .evitement, noscript') !== null;
  const out = { text: [], border: [], vus: { texte: 0, bordure: 0, forme: 0 }, temoins: [] };

  for (const n of document.querySelectorAll('*')) {
    if (skip(n) || n.offsetParent === null) continue;
    const cs = getComputedStyle(n);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;

    // formes pleines porteuses de sens : triangle d'alerte, pastilles de niveau
    if (n.matches('.note-erreur-i, .verdict-bonne, .verdict-correcte, .verdict-faible')) {
      const fg = parse(cs.backgroundColor);
      if (fg && fg[3] > 0) {
        out.vus.forme++;
        out.temoins.push(String(n.className));
        const bg = n.parentElement ? bgOf(n.parentElement) : [255, 255, 255, 1];
        const r = ratio(over(fg, bg), bg);
        if (r < 3) out.border.push({ sel: '.' + String(n.className), txt: 'forme pleine', rIn: +r.toFixed(2), rOut: +r.toFixed(2), color: cs.backgroundColor });
      }
    }

    // texte : seulement les noeuds qui portent vraiment du texte
    const own = [...n.childNodes].some(c => c.nodeType === 3 && c.textContent.trim().length > 0);
    if (own) {
      const fg = parse(cs.color);
      if (fg) {
        out.vus.texte++;
        const bg = bgOf(n);
        const r = ratio(over(fg, bg), bg);
        const need = isLarge(cs) ? 3 : 4.5;
        if (r < need) {
          out.text.push({
            sel: (n.id ? '#' + n.id : '') + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).join('.') : n.tagName),
            txt: n.textContent.trim().slice(0, 40),
            ratio: +r.toFixed(2), need, size: cs.fontSize, weight: cs.fontWeight
          });
        }
      }
    }

    /* Éléments porteurs de sens dont la bordure ou l'aplat identifie l'état :
       les contrôles, mais aussi la carte d'erreur, dont le trait et le triangle
       sont les seuls porteurs non textuels qui la distinguent du succès. */
    if (n.matches('button, input, select, textarea, [role="button"], [role="radio"], .note-erreur')) {
      const bw = parseFloat(cs.borderTopWidth) || 0;
      if (bw > 0) {
        const bc = parse(cs.borderTopColor);
        if (bc && bc[3] > 0) {
          out.vus.bordure++;
          if (n.classList.contains('note-erreur')) out.temoins.push('note-erreur');
          const inside = bgOf(n);
          const outside = n.parentElement ? bgOf(n.parentElement) : inside;
          const rIn = ratio(over(bc, inside), inside);
          const rOut = ratio(over(bc, outside), outside);
          const best = Math.max(rIn, rOut);
          if (best < 3) {
            out.border.push({
              sel: (n.id ? '#' + n.id : '') + (typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).join('.') : n.tagName),
              txt: n.textContent.trim().slice(0, 28),
              rIn: +rIn.toFixed(2), rOut: +rOut.toFixed(2), color: cs.borderTopColor
            });
          }
        }
      }
    }
  }
  return out;
};

(async () => {
  const { srv, port } = await ouvrir(); PORT = port;
  const browser = await launch();
  let bad = 0, sawErr = false;

  for (const c of CASES) {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2,
      colorScheme: c.scheme, locale: c.q.includes('en') ? 'en-US' : 'fr-FR'
    });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/${c.q}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => { const s = document.getElementById('res-select'); s.value = 'surMesure'; s.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.waitForTimeout(200);
    await page.fill('#res-largeur', '7000');
    await page.fill('#res-hauteur', '7000');
    await page.waitForTimeout(200);
    await page.$eval('#btn-export', e => e.click());   // fait apparaître la carte d'erreur
    await page.waitForTimeout(500);
    const r = await page.evaluate(PROBE);
    if (r.temoins.indexOf('note-erreur') >= 0) sawErr = true;

    console.log(`\n=== ${c.name} === (${r.vus.texte} textes, ${r.vus.bordure} bordures, ${r.vus.forme} formes ; témoins : ${[...new Set(r.temoins)].join(', ') || 'AUCUN'})`);
    if (!r.text.length) console.log('  texte : tous les rapports tiennent');
    else {
      bad += r.text.length;
      const seen = new Set();
      for (const t of r.text) {
        const k = t.sel + t.ratio;
        if (seen.has(k)) continue; seen.add(k);
        console.log(`  TEXTE ${t.ratio}:1 (min ${t.need}) — ${t.sel} · ${t.size}/${t.weight} · "${t.txt}"`);
      }
    }
    if (!r.border.length) console.log('  bordures : toutes >= 3:1');
    else {
      bad += r.border.length;
      const seen = new Set();
      for (const b of r.border) {
        const k = b.sel + b.rIn;
        if (seen.has(k)) continue; seen.add(k);
        console.log(`  BORDURE int ${b.rIn}:1 / ext ${b.rOut}:1 — ${b.sel} · ${b.color} · "${b.txt}"`);
      }
    }
    await ctx.close();
  }

  await browser.close();
  srv.close();
  console.log(bad ? `\n${bad} occurrences sous le seuil.` : '\nAucun manquement au contraste.');
  if (!bad && !sawErr) { console.log('MAIS la carte d\'erreur n\'a jamais été examinée : contrôle non concluant.'); process.exitCode = 1; }
  process.exitCode = bad ? 1 : 0;
})();
