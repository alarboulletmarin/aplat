/* Fidélité au design : on extrait chaque déclaration des styles en ligne de la
   maquette et on vérifie qu'elle existe telle quelle dans la feuille de style
   ou dans le script. Ce qui manque est listé pour arbitrage. */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const design = fs.readFileSync(path.join(ROOT, 'design/Aplat.dc.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'src/app.css'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'src/app.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const hay = (css + '\n' + js + '\n' + html).replace(/\s+/g, ' ');

const norm = v => v.trim().replace(/\s+/g, ' ').replace(/, /g, ',');

/* déclarations des attributs style="" */
const decls = new Map();          // "prop:value" -> nombre d'occurrences
for (const m of design.matchAll(/style="([^"]*)"/g)) {
  for (const part of m[1].split(';')) {
    const i = part.indexOf(':');
    if (i < 0) continue;
    const prop = part.slice(0, i).trim();
    const val = norm(part.slice(i + 1));
    if (!prop || !val) continue;
    if (val.includes('{{')) continue;               // valeur pilotée par l'état
    decls.set(prop + ':' + val, (decls.get(prop + ':' + val) || 0) + 1);
  }
}

/* le bloc <style> de la maquette : jetons et règles de base */
const styleBlock = (design.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
const tokens = new Map();
for (const m of styleBlock.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;}]+)/g)) {
  tokens.set(m[1], norm(m[2]));
}

const missing = [];
for (const [d, n] of decls) {
  const [prop, ...rest] = d.split(':');
  const val = rest.join(':');
  const needle = (prop + ':' + val).replace(/\s+/g, ' ');
  if (hay.includes(needle)) continue;
  // tolère l'écriture sans espace après la virgule et les raccourcis équivalents
  const alt = needle.replace(/,/g, ', ');
  if (hay.includes(alt)) continue;
  missing.push({ d, n });
}

const tokMissing = [];
for (const [k, v] of tokens) {
  if (!hay.includes(k + ':' + v) && !hay.includes(k + ': ' + v)) tokMissing.push(k + ':' + v);
}

console.log(`déclarations distinctes dans la maquette : ${decls.size}`);
console.log(`jetons de la maquette : ${tokens.size}`);
console.log(`\njetons absents du portage : ${tokMissing.length}`);
for (const t of tokMissing) console.log('  ' + t);
console.log(`\ndéclarations absentes du portage : ${missing.length}`);
for (const m of missing.sort((a, b) => b.n - a.n)) console.log(`  x${m.n}  ${m.d}`);
