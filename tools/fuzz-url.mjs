/* L'URL est la seule entrée extérieure du produit. On lui envoie des valeurs
   hostiles et on vérifie que la page rend toujours, sans erreur ni injection. */
import { launch } from './pw.mjs'
import { ouvrir } from './serveur.mjs'
let PORT = 0;

const VALS = [
  '', '0', '-1', '1e9', 'NaN', 'null', 'undefined', 'constructor', '__proto__',
  'toString', 'hasOwnProperty', 'prototype', 'valueOf',
  '<script>x=1</script>', '"><img src=x onerror=x=1>', "';x=1;//",
  'javascript:x=1', 'data:text/html,x', '../../etc/passwd',
  '%3Cscript%3E', 'a'.repeat(500), '99999999999999999999',
  '1179x2556x9999', 'x', 'xx', '1179x', 'x2556', '-5x-5', '0x0', '16x16',
  '8001x8001', '  1179 x 2556  ', '1_179x2_556', '١١٧٩x٢٥٥٦'
];
const KEYS = ['m', 'p', 'd', 's', 'l', 'r', 't'];

(async () => {
  const { srv, port } = await ouvrir(); PORT = port;
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: 900, height: 900 }, locale: 'fr-FR' });
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', e => problems.push('ERREUR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') problems.push('CONSOLE ' + m.text()); });

  /* Le nombre de puces attendu se relève sur une adresse saine, il ne s'écrit
     pas ici : ce qu'on vérifie est qu'aucune URL hostile n'en ajoute ni n'en
     retire, pas qu'il y en ait un nombre donné. Écrit en dur, ce contrôle
     tombait à chaque famille ajoutée sans rien avoir découvert. */
  await page.goto('http://127.0.0.1:' + PORT + '/app?l=fr', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(150);
  const ATTENDU = await page.evaluate(() => document.querySelectorAll('.opt').length);
  console.log('puces sur une adresse saine : ' + ATTENDU);

  let n = 0;
  for (const k of KEYS) {
    for (const v of VALS) {
      n++;
      const q = '?' + k + '=' + encodeURIComponent(v);
      let ok;
      try {
        await page.goto('http://127.0.0.1:' + PORT + '/app' + q, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(90);
        ok = await page.evaluate(() => ({
          peint: (document.getElementById('apercu') || {}).dataset?.peint === '1' || !!document.getElementById('etat-vide'),
          fam: !!document.querySelector('[data-famille][aria-checked="true"]') || true,
          injecte: !!window.x,
          boutons: document.querySelectorAll('.opt').length,
          res: document.getElementById('res-valeur').textContent
        }));
      } catch (e) { problems.push(`${q} : ${e.message}`); continue; }
      if (!ok.peint) problems.push(`${q} : rien n'est peint`);
      if (ok.injecte) problems.push(`${q} : INJECTION exécutée`);
      if (ok.boutons !== ATTENDU) problems.push(`${q} : ${ok.boutons} puces au lieu de ${ATTENDU}`);
    }
  }

  // combinaisons hostiles
  for (const q of ['?m=constructor&p=__proto__&d=constructor&s=__proto__&r=constructor&l=constructor&t=constructor',
                   '?m=&p=&d=&s=&l=&r=&t=',
                   '?r=99999x99999&d=999&s=-1&l=zz&t=zz&p=zz&m=zz']) {
    n++;
    await page.goto('http://127.0.0.1:' + PORT + '/app' + q, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(150);
    const ok = await page.evaluate(() => ({
      peint: document.getElementById('apercu').width > 4,
      url: location.search
    }));
    if (!ok.peint) problems.push(`${q} : rien n'est peint`);
  }

  await browser.close(); srv.close();
  console.log(`${n} URL hostiles essayées`);
  if (problems.length) {
    const uniq = [...new Set(problems)];
    console.log(uniq.length + ' problèmes :');
    for (const p of uniq.slice(0, 20)) console.log('  ' + p);
    process.exitCode = 1;
  } else console.log('Aucune erreur, aucune injection, la page rend toujours.');
})();
