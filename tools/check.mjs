/* Enchaîne toutes les vérifications. Sort en échec si l'une d'elles échoue.
 *
 * Toutes portent sur le build livré : `npm run build` d'abord, sans quoi on
 * vérifierait autre chose que ce qui part chez les gens.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/* Le dossier de ce fichier : `__dirname` n'existe pas dans un module ES. */
const ICI = fileURLToPath(new URL('.', import.meta.url))

const RACINE = path.resolve(ICI, '..');

const ETAPES = [
  ['typographie', 'typographie.mjs'],
  ['parcours complet', 'e2e.mjs'],
  ['page d’accueil', 'accueil.mjs'],
  ['page du mécanisme', 'moteur.mjs'],
  ['URL hostiles', 'fuzz-url.mjs'],
  ['contrastes', 'a11y.mjs'],
  ['cibles tactiles et atteignabilité', 'reach.mjs'],
  ['repli au défilement', 'repli.mjs'],
  ['débordements et libellés +30 %', 'overflow.mjs'],
  ['marches du voile', 'band-test.mjs'],
  ['amplitude du grain', 'dither-check.mjs'],
  ['captures et requêtes sortantes', 'shot.mjs'],
  ['installation et hors ligne', 'pwa.mjs'],
  ['coût des actions', 'perf.mjs'],
  ['endurance', 'soak.mjs']
];

console.log('---- build ----');
const build = spawnSync('npm', ['run', 'build'], { cwd: RACINE, stdio: 'inherit' });
if (build.status !== 0) {
  console.log('\nLe build a échoué : rien à vérifier.');
  process.exit(1);
}

let echecs = 0;
for (const [titre, fichier] of ETAPES) {
  console.log('\n---- ' + titre + ' ----');
  const r = spawnSync(process.execPath, [path.join(ICI, fichier)], { stdio: 'inherit' });
  if (r.status !== 0) { echecs++; console.log('   ÉCHEC (' + fichier + ')'); }
}
console.log(echecs ? '\n' + echecs + ' vérification(s) en échec.' : '\nToutes les vérifications passent.');
process.exit(echecs ? 1 : 0);
