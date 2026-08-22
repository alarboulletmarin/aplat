/* Mesure exacte des marches du voile : sur un aplat uni, on relève la valeur
   de chaque ligne et on regarde la hauteur des paliers et l'amplitude des
   sauts. Une marche d'un seul cran étalée sur des centaines de lignes se voit ;
   des paliers courts, non. */
const { launch } = require('./pw');
const { serve } = require('./serve');
const PORT = 8099;

(async () => {
  const srv = serve(PORT);
  const browser = await launch();
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/?l=fr`, { waitUntil: 'networkidle' });

  const out = await page.evaluate(async () => {
    const E = window.APLAT_ENGINE;
    const W = 1179, H = 2556;
    const results = [];

    for (const bg of ['#F7F3E6', '#92BAD5', '#17243F', '#EFA22B']) {
      for (const veil of [0.5, 0.44, 0.25, 0.12]) {
        for (const mode of ['light', 'dark']) {
          const c = document.createElement('canvas'); c.width = W; c.height = H;
          const ctx = c.getContext('2d', { alpha: false, willReadFrequently: true });
          ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
          E._applyVeil(ctx, W, H, { mode, veil });
          const d = ctx.getImageData(Math.round(W / 2), 0, 1, H).data;
          let runs = [], cur = 1, maxJump = 0;
          for (let y = 1; y < H; y++) {
            const a = [d[y * 4], d[y * 4 + 1], d[y * 4 + 2]];
            const b = [d[(y - 1) * 4], d[(y - 1) * 4 + 1], d[(y - 1) * 4 + 2]];
            const jump = Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
            if (jump === 0) cur++;
            else { runs.push(cur); cur = 1; if (jump > maxJump) maxJump = jump; }
          }
          runs.push(cur);
          runs.sort((x, y) => y - x);
          results.push({ bg, veil, mode, maxRun: runs[0], p90Run: runs[Math.floor(runs.length * 0.1)], steps: runs.length, maxJump });
          c.width = 1; c.height = 1;
        }
      }
    }
    return results;
  });

  const bad = out.filter(r => r.maxJump > 1 || r.maxRun > 260);
  console.log('bg        voile mode  | paliers | palier max | saut max');
  for (const r of out) {
    const flag = (r.maxJump > 1 || r.maxRun > 260) ? '  <-- à surveiller' : '';
    console.log(`${r.bg} ${String(r.veil).padStart(5)} ${r.mode.padEnd(5)} |${String(r.steps).padStart(8)} |${String(r.maxRun).padStart(11)} |${String(r.maxJump).padStart(9)}${flag}`);
  }
  console.log(bad.length ? `\n${bad.length} cas à surveiller` : '\nAucune marche > 1 cran, aucun palier > 260 lignes.');
  await browser.close();
  srv.close();
})();
