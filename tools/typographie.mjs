/* Règles de ponctuation du projet.
 *
 * Pas de tiret cadratin, pas de tiret demi-cadratin, pas de point médian.
 * Ce ne sont pas des goûts : ces trois signes se glissent partout dès qu'on
 * écrit vite, et ils donnent au texte une allure qui n'est pas celle du
 * projet. Une phrase qui en réclame un se réécrit.
 *
 * Ce contrôle lit les sources, pas le build : c'est là qu'on écrit.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/* Le dossier de ce fichier : `__dirname` n'existe pas dans un module ES. */
const ICI = fileURLToPath(new URL('.', import.meta.url))

const RACINE = path.resolve(ICI, '..');

/* Les signes eux-mêmes sont écrits en séquences d'échappement, sans quoi ce
   fichier échouerait à son propre contrôle. */
const INTERDITS = [
  { signe: '\u2014', nom: 'tiret cadratin' },
  { signe: '\u2013', nom: 'tiret demi-cadratin' },
  { signe: '\u00b7', nom: 'point médian' },
];

/* `design/` est la maquette reçue, on ne la réécrit pas. Le reste est exclu
   parce qu'il n'est pas écrit ici. */
const IGNORES = new Set([
  'node_modules', 'dist', 'design', '.git', '.shots', '.exports', '.banc',
  'package-lock.json', 'THIRD-PARTY.txt', 'LICENSE',
]);

const EXTENSIONS = /\.(ts|tsx|js|mjs|cjs|css|html|md|json|yml|yaml)$/;

function fichiers(dossier) {
  const sortie = [];
  for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
    if (IGNORES.has(entree.name)) continue;
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) sortie.push(...fichiers(chemin));
    else if (EXTENSIONS.test(entree.name)) sortie.push(chemin);
  }
  return sortie;
}

const trouvailles = [];
for (const chemin of fichiers(RACINE)) {
  const lignes = fs.readFileSync(chemin, 'utf8').split('\n');
  lignes.forEach((ligne, index) => {
    for (const { signe, nom } of INTERDITS) {
      if (!ligne.includes(signe)) continue;
      trouvailles.push({
        fichier: path.relative(RACINE, chemin),
        ligne: index + 1,
        nom,
        extrait: ligne.trim().slice(0, 90),
      });
    }
  });
}

if (trouvailles.length === 0) {
  console.log('Aucun tiret cadratin, aucun point médian.');
} else {
  console.log(trouvailles.length + ' occurrence(s) :');
  for (const t of trouvailles) {
    console.log('  ' + t.fichier + ':' + t.ligne + '  ' + t.nom + '  ' + t.extrait);
  }
  process.exitCode = 1;
}
