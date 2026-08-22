/* Enchaîne toutes les vérifications. Sort en échec si l'une d'elles échoue. */
const { spawnSync } = require('child_process');
const path = require('path');

const STEPS = [
  ['parcours complet', 'e2e.js'],
  ['URL hostiles', 'fuzz-url.js'],
  ['contrastes', 'a11y.js'],
  ['cibles tactiles et atteignabilité', 'reach.js'],
  ['débordements et libellés +30 %', 'overflow.js'],
  ['marches du voile', 'band-test.js'],
  ['amplitude du grain', 'dither-check.js'],
  ['captures et requêtes sortantes', 'shot.js'],
  ['ouverture en file://', 'fileurl.js'],
  ['endurance', 'soak.js']
];

let failed = 0;
for (const [label, file] of STEPS) {
  console.log('\n---- ' + label + ' ----');
  const r = spawnSync(process.execPath, [path.join(__dirname, file)], { stdio: 'inherit' });
  if (r.status !== 0) { failed++; console.log('   ECHEC (' + file + ')'); }
}
console.log(failed ? '\n' + failed + ' verification(s) en echec.' : '\nToutes les verifications passent.');
process.exit(failed ? 1 : 0);
