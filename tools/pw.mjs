/* Chromium.
 *
 * Playwright attend une révision précise de Chromium ; celle installée ici est
 * plus ancienne. On désigne l'exécutable plutôt que d'en télécharger un autre.
 */
import { chromium } from 'playwright'
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

async function launch(opts = {}) {
  return chromium.launch(Object.assign({ executablePath: EXE }, opts));
}

export { launch }
