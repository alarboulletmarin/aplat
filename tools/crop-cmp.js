/* Empile deux régions correspondantes des captures pour les comparer à l'œil. */
const fs = require('fs');
const path = require('path');
const { launch } = require('./pw');
const OUT = path.resolve(__dirname, '../.shots');

(async () => {
  const [x, y, w, h, scale, name] = [
    +(process.argv[2] || 100), +(process.argv[3] || 30), +(process.argv[4] || 340), +(process.argv[5] || 120),
    +(process.argv[6] || 3), process.argv[7] || 'cmp'
  ];
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: w * scale, height: h * scale * 2 + 12 } });
  const a = fs.readFileSync(path.join(OUT, 'px-ref.png')).toString('base64');
  const b = fs.readFileSync(path.join(OUT, 'px-mine.png')).toString('base64');
  const uri = await page.evaluate(async ({ a, b, x, y, w, h, scale }) => {
    const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
    const ia = await load('data:image/png;base64,' + a);
    const ib = await load('data:image/png;base64,' + b);
    const c = document.createElement('canvas');
    c.width = w * scale; c.height = h * scale * 2 + 12;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#FF00FF'; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(ia, x, y, w, h, 0, 0, w * scale, h * scale);
    g.drawImage(ib, x, y, w, h, 0, h * scale + 12, w * scale, h * scale);
    return c.toDataURL('image/png');
  }, { a, b, x, y, w, h, scale });
  fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(uri.split(',')[1], 'base64'));
  console.log(name + '.png — haut = maquette, bas = portage');
  await browser.close();
})();
