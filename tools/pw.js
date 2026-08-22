const { chromium } = require('playwright');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
async function launch(opts = {}) {
  return chromium.launch(Object.assign({ executablePath: EXE }, opts));
}
module.exports = { launch };
