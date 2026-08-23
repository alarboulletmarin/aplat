/* Décompose le poids du PNG exporté : fond, formes, voile, grain. */
import { launch } from './pw.mjs'
import { poser } from './banc.mjs'
import { ouvrir } from './serveur.mjs'
let PORT = 0;

(async () => {
  const { srv, port } = await ouvrir(); PORT = port;
  const browser = await launch();
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/?l=fr`, { waitUntil: 'networkidle' });
  await poser(page);

  const rows = await page.evaluate(async () => {
    const M = window.MOTEUR;
    const W = 1179, H = 2556;
    const cases = [
      ['vagues', 'nuit', 1], ['vagues', 'lime', 1], ['trame', 'nuit', 1],
      ['blobs', 'lime', 0], ['terrazzo', 'corail', 2], ['ondes', 'ciel', 1],
      ['tournesol', 'nuit', 1], ['confettis', 'lime', 2], ['obliques', 'orage', 1]
    ];
    const blobOf = c => new Promise(r => c.toBlob(r, 'image/png'));
    const out = [];

    async function build(fam, pal, dens, steps) {
      const P = M.PALETTES[pal];
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const ctx = c.getContext('2d', { alpha: false });
      const m = M.mesurer(fam, pal, dens, 7314, W, H);
      ctx.fillStyle = P.fond; ctx.fillRect(0, 0, W, H);
      if (steps.shapes) M.formes(ctx, W, H, fam, P.couleurs, dens, M.alea(M.graineDeDessin(fam, dens, 7314)), Math.min(W, H));
      if (steps.veil) M.peindreVoile(ctx, W, H, m);
      if (steps.grain) M.peindreGrain(ctx, W, H);
      const b = await blobOf(c);
      c.width = 1; c.height = 1;
      return b.size;
    }

    for (const [fam, pal, dens] of cases) {
      const m = M.mesurer(fam, pal, dens, 7314, W, H);
      const bg = await build(fam, pal, dens, {});
      const sh = await build(fam, pal, dens, { shapes: 1 });
      const shv = await build(fam, pal, dens, { shapes: 1, veil: 1 });
      const all = await build(fam, pal, dens, { shapes: 1, veil: 1, grain: 1 });
      out.push({ fam, pal, dens, veil: +m.voile.toFixed(3), bg, sh, shv, all });
    }
    return out;
  });

  const kb = b => (b / 1024).toFixed(0).padStart(6) + ' Ko';
  console.log('cas                          voile |   fond seul | + formes  | + voile   | + grain');
  for (const r of rows) {
    console.log(
      `${(r.fam + '/' + r.pal + '/d' + r.dens).padEnd(28)} ${String(r.veil).padStart(5)} |${kb(r.bg)} |${kb(r.sh)} |${kb(r.shv)} |${kb(r.all)}`
    );
  }
  const dVeil = rows.reduce((s, r) => s + (r.shv - r.sh), 0) / rows.length;
  const dGrain = rows.reduce((s, r) => s + (r.all - r.shv), 0) / rows.length;
  console.log(`\ncoût moyen du voile : ${(dVeil / 1024).toFixed(0)} Ko ; coût moyen du grain : ${(dGrain / 1024).toFixed(0)} Ko`);

  await browser.close();
  srv.close();
})();
