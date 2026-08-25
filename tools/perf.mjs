/* Combien coûte une action au doigt, du geste jusqu'à la peinture ?
 *
 * Chronométrer le seul dispatchEvent ne mesure que la remise du message :
 * 0,2 ms là où l'écran met 30 à 90 ms à réagir. Chaque itération attend donc
 * la peinture par deux requestAnimationFrame emboîtés : le premier se cale
 * juste avant la prochaine image, quand le travail React et la mise en page
 * sont faits, et seul le second garantit que cette image est passée à
 * l'écran. Et on chronomètre chaque itération, pas la boucle : une moyenne
 * de boucle noie un pic derrière les tours rapides.
 *
 * Profil mobile lent : CPU bridé x6, 390x844, dpr 3. Sur cette machine les
 * médianes vont de 33 ms (frappe) à 75 ms (palette) et le pire max relevé
 * est 139 ms : les budgets ci-dessous laissent le bruit de la CI passer et
 * attrapent une régression x3. */
import { launch } from './pw.mjs'
import { ouvrir } from './serveur.mjs'

const BUDGET_MEDIANE = 200;
const BUDGET_MAX = 400;

(async () => {
  const { srv, port } = await ouvrir();
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'fr-FR', hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });   // téléphone d'entrée de gamme
  await page.goto(`http://127.0.0.1:${port}/app?l=fr&r=1179x2556`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const r = await page.evaluate(async () => {
    const out = {};
    const peinture = () => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));

    const el = document.getElementById('res-select');
    el.value = 'surMesure'; el.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(res => setTimeout(res, 200));
    const inW = document.getElementById('res-largeur');

    async function mesurer(label, fn, n) {
      const durees = [];
      for (let i = 0; i < n; i++) {
        const t0 = performance.now();
        fn(i);
        await peinture();
        durees.push(performance.now() - t0);
      }
      durees.sort((a, b) => a - b);
      out[label] = { mediane: +durees[Math.floor(n / 2)].toFixed(1), max: +durees[n - 1].toFixed(1) };
    }

    await mesurer('frappe dans le champ largeur', i => {
      inW.value = String(1170 + i);
      inW.dispatchEvent(new Event('input', { bubbles: true }));
    }, 12);

    const pals = [...document.querySelectorAll('[data-palette]')];
    await mesurer('changement de palette', i => pals[i % pals.length].click(), 8);

    const fams = [...document.querySelectorAll('[data-famille]')];
    await mesurer('changement de famille', i => fams[i % fams.length].click(), 8);

    await mesurer('nouvelle graine', () => document.getElementById('btn-graine').click(), 6);
    return out;
  });

  let bad = 0;
  console.log('CPU bridé x6 (téléphone d\'entrée de gamme), du geste à la peinture :');
  for (const [k, v] of Object.entries(r)) {
    const depasse = v.mediane > BUDGET_MEDIANE || v.max > BUDGET_MAX;
    if (depasse) bad++;
    console.log('  ' + k.padEnd(30) + `médiane ${v.mediane} ms, max ${v.max} ms` +
      (depasse ? `  AU-DESSUS DU BUDGET (médiane <= ${BUDGET_MEDIANE} ms, max <= ${BUDGET_MAX} ms)` : ''));
  }
  console.log(bad ? `\n${bad} scénario(s) au-dessus du budget.` : '\nTous les scénarios tiennent le budget.');
  await browser.close(); srv.close();
  process.exitCode = bad ? 1 : 0;
})();
