/* Fidélité à la maquette.
 *
 * On extrait chaque déclaration des styles en ligne de `design/Aplat.dc.html`
 * et chacun de ses jetons, puis on cherche la même valeur dans le portage. Ce
 * qui manque est listé pour arbitrage : l'outil ne tranche pas, il montre.
 *
 * Deux normalisations, sans lesquelles la comparaison ne dirait rien :
 * l'écriture (espaces, casse des hexadécimaux, zéro initial), et les noms de
 * jetons, que le portage a traduits.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/* Le dossier de ce fichier : `__dirname` n'existe pas dans un module ES. */
const ICI = fileURLToPath(new URL('.', import.meta.url))
const ROOT = path.resolve(ICI, '..');

/** Les jetons de la maquette, tels que le portage les nomme. */
const TRADUCTION = {
  '--bg': '--fond',
  '--field': '--champ',
  '--ink': '--encre',
  '--ink-muted': '--encre-douce',
  '--line': '--filet',
  '--line-strong': '--filet-franc',
  '--paper': '--papier',
  '--accent-ink': '--accent-encre',
  '--link': '--lien',
  '--link-hover': '--lien-survol',
  '--alert': '--alerte',
  '--label-inv': '--libelle-inv',
  '--label': '--libelle',
  '--cols': '--colonnes',
  'aplDot': 'aplat-point'
};

/**
 * Deux écritures pour la même chose. Le portage les préfère pour des raisons
 * dites ailleurs : `color-mix` recalculé à chaque peinture sur une maquette
 * qui se redessine à chaque frappe, et une famille de police qui n'a pas à
 * être répétée trente fois.
 */
const EQUIVALENCES = [
  [/color-mix\(in srgb,var\(--libelle\) (\d+)%,transparent\)/g, (_, p) => 'var(--l' + p + ')'],
  [/font-family:Anton,Impact,('Arial Narrow',)?sans-serif/g, 'font-family:var(--display)'],
  [/font-family:Archivo,"Helvetica Neue",Helvetica,system-ui,sans-serif/g, 'font-family:var(--texte)'],
  [/color-mix\(in srgb,var\(--surface\) 74%,transparent\)/g, 'var(--surface-74)'],
  /* Le retard dans le raccourci, ou dans sa propre règle : même résultat. Le
     raccourci sans retard reste vérifié par ailleurs. */
  [/animation:aplat-point 900ms ease-in-out (\d+ms) infinite/g, 'animation-delay:$1']
];

const design = fs.readFileSync(path.join(ROOT, 'design/Aplat.dc.html'), 'utf8');

function lireTout(dossier, motif) {
  const sortie = [];
  for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) sortie.push(lireTout(chemin, motif));
    else if (motif.test(entree.name)) sortie.push(fs.readFileSync(chemin, 'utf8'));
  }
  return sortie.join('\n');
}

/** Même écriture des deux côtés : espaces, hexadécimaux, zéro initial. */
function normaliser(texte) {
  let t = texte.replace(/\s+/g, ' ');
  t = t.replace(/\s*:\s*/g, ':').replace(/\s*,\s*/g, ',');
  t = t.replace(/\s*([*/])\s*/g, '$1');   // calc(var(--mu) * 3) === calc(var(--mu)*3)
  t = t.replace(/#[0-9a-fA-F]{3,8}\b/g, h => h.toLowerCase());
  t = t.replace(/([:,(*\s-])0\.(\d)/g, '$1.$2');
  return t;
}

/** Les jetons de la maquette portent leurs noms français dans le portage. */
function traduire(texte) {
  let t = texte;
  for (const [avant, apres] of Object.entries(TRADUCTION)) {
    t = t.replace(new RegExp(avant + '(?![a-z0-9-])', 'g'), apres);
  }
  for (const [motif, remplacement] of EQUIVALENCES) t = t.replace(motif, remplacement);
  return t;
}

const portage = normaliser(
  lireTout(path.join(ROOT, 'src'), /\.(css|tsx?)$/) + '\n' +
  fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
);

/* déclarations des attributs style="" de la maquette */
const declarations = new Map();
for (const bloc of design.matchAll(/style="([^"]*)"/g)) {
  for (const morceau of bloc[1].split(';')) {
    const coupe = morceau.indexOf(':');
    if (coupe < 0) continue;
    const propriete = morceau.slice(0, coupe).trim();
    const valeur = morceau.slice(coupe + 1);
    if (!propriete || !valeur.trim()) continue;
    if (valeur.includes('{{')) continue;   // valeur pilotée par l'état
    const cle = traduire(normaliser(propriete + ':' + valeur));
    declarations.set(cle, (declarations.get(cle) || 0) + 1);
  }
}

/* le bloc <style> de la maquette : ses jetons */
const blocStyle = (design.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
const jetons = new Map();
for (const trouve of blocStyle.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;}]+)/g)) {
  jetons.set(trouve[1], normaliser(trouve[2]).trim());
}

const absentes = [];
for (const [declaration, nombre] of declarations) {
  if (!portage.includes(declaration)) absentes.push({ declaration, nombre });
}

const jetonsAbsents = [];
for (const [nom, valeur] of jetons) {
  if (!portage.includes(traduire(nom) + ':' + valeur)) {
    jetonsAbsents.push(traduire(nom) + ':' + valeur);
  }
}

console.log(`déclarations distinctes dans la maquette : ${declarations.size}`);
console.log(`jetons de la maquette : ${jetons.size}`);
console.log(`\njetons absents du portage : ${jetonsAbsents.length}`);
for (const j of jetonsAbsents) console.log('  ' + j);
console.log(`\ndéclarations absentes du portage : ${absentes.length}`);
for (const a of absentes.sort((x, y) => y.nombre - x.nombre)) {
  console.log(`  x${a.nombre}  ${a.declaration}`);
}
