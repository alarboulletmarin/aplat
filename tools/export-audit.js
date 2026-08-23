/* Mesure le poids réel des PNG exportés et extrait des zooms 1:1 pour juger
   la qualité. Tourne dans un vrai Chromium : mêmes encodeurs que l'utilisateur. */
const fs = require('fs');
const path = require('path');
const { launch } = require('./pw');
const { poser } = require('./banc');
const { ouvrir } = require('./serveur');

let PORT = 0;
const OUT = path.resolve(__dirname, '../.exports');
const ALL_RES = [
  { name: 'phone', w: 1179, h: 2556 },
  { name: 'phone-hi', w: 1290, h: 2796 },
  { name: 'tablet', w: 2048, h: 2732 },
  { name: 'desk4k', w: 3840, h: 2160 }
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { srv, port } = await ouvrir(); PORT = port;
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`http://127.0.0.1:${PORT}/?l=fr`, { waitUntil: 'networkidle' });
  await poser(page);

  const mode = process.argv[2] || 'all';
  const RES = mode === 'phone-full' ? [ALL_RES[0]] : ALL_RES;

  const rows = await page.evaluate(async ({ RES, mode }) => {
    const M = window.MOTEUR;
    const fams = mode === 'quick' ? ['vagues', 'trame', 'terrazzo', 'confettis', 'tournesol'] : M.FAMILLES.map(f => f.id);
    const dl = mode === 'quick' ? [1] : [0, 1, 2];
    const pals = mode === 'quick' ? ['lime', 'nuit'] : M.ORDRE_PALETTES;
    const out = [];

    function blobOf(canvas) {
      return new Promise(r => canvas.toBlob(r, 'image/png'));
    }

    for (const res of RES) {
      for (const fam of fams) {
        for (const pal of pals) {
          for (const dens of dl) {
            const c = document.createElement('canvas');
            c.width = res.w; c.height = res.h;
            const ctx = c.getContext('2d', { alpha: false });
            const t0 = performance.now();
            M.dessiner(ctx, res.w, res.h, { famille: fam, palette: pal, densite: dens, graine: 7314 });
            const tDraw = performance.now() - t0;
            const t1 = performance.now();
            const b = await blobOf(c);
            const tEnc = performance.now() - t1;
            out.push({ res: res.name, px: res.w * res.h, fam, pal, dens, bytes: b ? b.size : 0, tDraw, tEnc });
            c.width = 1; c.height = 1;
          }
        }
      }
    }
    return out;
  }, { RES, mode });

  await browser.close();
  srv.close();

  const mb = b => (b / 1048576);
  const byRes = {};
  for (const r of rows) {
    (byRes[r.res] ||= []).push(r);
  }
  console.log(`échantillons : ${rows.length}\n`);
  for (const [res, list] of Object.entries(byRes)) {
    const sizes = list.map(r => r.bytes).sort((a, b) => a - b);
    const med = sizes[Math.floor(sizes.length / 2)];
    const p90 = sizes[Math.floor(sizes.length * 0.9)];
    const px = list[0].px;
    console.log(`${res} (${(px / 1e6).toFixed(1)} Mpx) — médiane ${mb(med).toFixed(2)} Mo · p90 ${mb(p90).toFixed(2)} Mo · max ${mb(sizes[sizes.length - 1]).toFixed(2)} Mo · min ${mb(sizes[0]).toFixed(2)} Mo`);
    const worst = [...list].sort((a, b) => b.bytes - a.bytes).slice(0, 5);
    console.log('   plus lourds : ' + worst.map(r => `${r.fam}/${r.pal}/d${r.dens} ${mb(r.bytes).toFixed(2)}Mo`).join(' · '));
    const slow = [...list].sort((a, b) => (b.tDraw + b.tEnc) - (a.tDraw + a.tEnc)).slice(0, 3);
    console.log('   plus lents  : ' + slow.map(r => `${r.fam} ${Math.round(r.tDraw)}+${Math.round(r.tEnc)}ms`).join(' · '));
  }
  fs.writeFileSync(path.join(OUT, 'audit.json'), JSON.stringify(rows, null, 1));
})();
