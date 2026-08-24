/* Chromium.
 *
 * Playwright retrouve seul le navigateur que `npx playwright install chromium`
 * a posé pour sa version. Un chemin écrit en dur ici ne vaudrait que sur une
 * machine : `CHROMIUM_EXE` reste l'échappatoire des environnements qui ne
 * peuvent pas télécharger et désignent un exécutable déjà présent.
 */
import { chromium } from 'playwright'

async function launch(opts = {}) {
  const exe = process.env.CHROMIUM_EXE;
  return chromium.launch(exe ? Object.assign({ executablePath: exe }, opts) : opts);
}

export { launch }
