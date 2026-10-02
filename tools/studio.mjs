/* Le studio d'export, vu des vérifications.
 *
 * La résolution et le lien du motif n'ont plus de carte dans le panneau : ils
 * vivent dans la feuille basse que la puce de synthèse ouvre. Ces trois gestes
 * en sont le point d'entrée commun, pour que chaque vérification n'écrive pas
 * le sien.
 *
 * Le clic est logique (`e.click()`), comme celui des autres bancs : la
 * feuille rend la racine inerte, et c'est `reach.mjs` qui vérifie que chaque
 * contrôle répond au pointage.
 */

/** Ouvre la feuille, si elle ne l'est pas déjà, et attend ses champs. */
export async function ouvrirStudio(page) {
  if (!(await page.$('#feuille-modale'))) {
    await page.$eval('#synthese-sortie', e => e.click());
  }
  await page.waitForSelector('#studio-select');
}

/** La referme par Échap, qui est son geste de clavier, et attend qu'elle parte. */
export async function fermerStudio(page) {
  if (!(await page.$('#feuille-modale'))) return;
  await page.$eval('#feuille-modale', e => e.focus());
  await page.keyboard.press('Escape');
  await page.waitForSelector('#feuille-modale', { state: 'detached' });
}

/** Passe le choix de taille sur « sur mesure » : les champs apparaissent. */
export async function surMesure(page) {
  await ouvrirStudio(page);
  await page.evaluate(() => {
    const s = document.getElementById('studio-select');
    s.value = 'surMesure';
    s.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForSelector('#studio-largeur');
}
