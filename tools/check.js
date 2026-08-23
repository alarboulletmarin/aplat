/* Enchaîne toutes les vérifications. Sort en échec si l'une d'elles échoue.
 *
 * Toutes portent sur le build livré : `npm run build` d'abord, sans quoi on
 * vérifierait autre chose que ce qui part chez les gens.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const RACINE = path.resolve(__dirname, '..');

const ETAPES = [
  ['parcours complet', 'e2e.js'],
  ['URL hostiles', 'fuzz-url.js'],
  ['contrastes', 'a11y.js'],
  ['cibles tactiles et atteignabilité', 'reach.js'],
  ['débordements et libellés +30 %', 'overflow.js'],
  ['marches du voile', 'band-test.js'],
  ['amplitude du grain', 'dither-check.js'],
  ['captures et requêtes sortantes', 'shot.js'],
  ['installation et hors ligne', 'pwa.js'],
  ['endurance', 'soak.js']
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
  const r = spawnSync(process.execPath, [path.join(__dirname, fichier)], { stdio: 'inherit' });
  if (r.status !== 0) { echecs++; console.log('   ECHEC (' + fichier + ')'); }
}
console.log(echecs ? '\n' + echecs + ' verification(s) en echec.' : '\nToutes les verifications passent.');
process.exit(echecs ? 1 : 0);
