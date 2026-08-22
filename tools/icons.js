/* Rasterise assets/icon.svg vers les PNG attendus par iOS et le manifeste. */
const fs = require('fs');
const path = require('path');
const { launch } = require('./pw');

const ROOT = path.resolve(__dirname, '..');
const svg = fs.readFileSync(path.join(ROOT, 'assets/icon.svg'), 'utf8');

(async () => {
  const browser = await launch();
  for (const size of [180, 512]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(
      `<style>html,body{margin:0;padding:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`
    );
    const buf = await page.screenshot({ omitBackground: true, type: 'png' });
    fs.writeFileSync(path.join(ROOT, `assets/icon-${size}.png`), buf);
    console.log(`assets/icon-${size}.png — ${buf.length} bytes`);
    await page.close();
  }
  await browser.close();
})();
