/* Le banc : le moteur, empaqueté seul, pour les mesures qui portent sur
 * l'image et non sur l'interface.
 *
 * L'application n'expose pas son moteur sur `window` — une application qui
 * l'ouvre pour ses propres tests l'ouvre à tout le monde. L'outillage en
 * construit donc sa propre copie, hors livraison, et l'injecte dans la page
 * au moment où il en a besoin.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..');
const SORTIE = path.join(__dirname, '.banc', 'moteur.js');
const SOURCE = path.join(RACINE, 'src', 'lib', 'moteur.ts');

/** Construit le banc s'il manque ou si le moteur a changé depuis. */
function construire() {
  const frais =
    fs.existsSync(SORTIE) &&
    fs.statSync(SORTIE).mtimeMs > fs.statSync(SOURCE).mtimeMs;
  if (frais) return SORTIE;
  execFileSync(
    path.join(RACINE, 'node_modules', '.bin', 'vite'),
    ['build', '--config', path.join(__dirname, 'vite.banc.config.mjs'), '--logLevel', 'warn'],
    { cwd: RACINE, stdio: 'inherit' }
  );
  return SORTIE;
}

/** Pose `window.MOTEUR` sur une page, quelle qu'elle soit. */
async function poser(page) {
  await page.addScriptTag({ path: construire() });
  await page.waitForFunction(() => !!window.MOTEUR, null, { timeout: 15000 });
}

module.exports = { construire, poser, SORTIE };
