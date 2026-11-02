// SPDX-License-Identifier: AGPL-3.0-only

/* Audit ciblé des champs de directions : onze palettes, aperçu réel avec
   icônes, poids des PNG et détails natifs pour juger les bords. Après build :
   node tools/courants.mjs */
import fs from 'node:fs'
import path from 'node:path'
import { ouvrir, RACINE } from './serveur.mjs'
import { launch } from './pw.mjs'
import { poser } from './banc.mjs'

const sortie = path.join(RACINE, '.exports/courants')
fs.mkdirSync(sortie, { recursive: true })
const { srv, url } = await ouvrir()
let navigateur
try {
  navigateur = await launch()
  const page = await navigateur.newPage({ viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'fr-FR', reducedMotion: 'reduce' })
  const erreurs = []
  page.on('pageerror', e => erreurs.push(e.message))
  const familles = ['courants', 'rubans', 'sillage']
  await page.goto(`${url}/app?l=fr&m=courants&r=1179x2556`)
  await poser(page)
  const palettes = await page.evaluate(() => window.MOTEUR.ORDRE_PALETTES)
  const mesures = []
  const apercus = []
  for (const famille of familles) {
    for (const palette of palettes) {
      await page.goto(`${url}/app?l=fr&m=${famille}&p=${palette}&d=1&s=7314&r=1179x2556`, { waitUntil: 'networkidle' })
      await page.waitForFunction(() => {
        const toile = document.querySelector('.appareil-canevas')
        return toile?.width > 10 && document.querySelector('.maq-app') && !document.querySelector('.etat-calcul')
      })
      const nom = `${famille}-${palette}`
      const capture = await page.locator('#appareil').screenshot({ path: path.join(sortie, `${nom}-icones.png`) })
      apercus.push({ nom, image: capture.toString('base64') })
      await poser(page)
      const mesure = await page.evaluate(async ({ famille, palette }) => {
        const M = window.MOTEUR
        const toile = document.createElement('canvas')
        toile.width = 1179
        toile.height = 2556
        const contexte = toile.getContext('2d', { alpha: false })
        const debut = performance.now()
        const lisibilite = M.dessiner(contexte, toile.width, toile.height,
          { famille, palette, densite: 1, graine: 7314 })
        const dessinMs = performance.now() - debut
        const png = await new Promise(resolve => toile.toBlob(resolve, 'image/png'))
        const detail = document.createElement('canvas')
        detail.width = detail.height = 400
        detail.getContext('2d').drawImage(toile, 390, 600, 400, 400, 0, 0, 400, 400)
        return { famille, palette, dessinMs, octets: png.size, contraste: lisibilite.contraste,
          png: toile.toDataURL().split(',')[1], detail: detail.toDataURL().split(',')[1] }
      }, { famille, palette })
      fs.writeFileSync(path.join(sortie, `${nom}.png`), Buffer.from(mesure.png, 'base64'))
      if (palette === 'lime') fs.writeFileSync(path.join(sortie, `${famille}-detail.png`), Buffer.from(mesure.detail, 'base64'))
      const { png, detail, ...chiffres } = mesure
      void png; void detail
      mesures.push(chiffres)
      console.log(`${nom}: ${(mesure.octets / 1048576).toFixed(2)} Mo, ${mesure.dessinMs.toFixed(0)} ms, ${mesure.contraste.toFixed(2)}:1`)
    }
  }
  /* Planche des vrais aperçus : aucun substitut d'icône ni rendu recomposé. */
  const planche = await navigateur.newPage({ viewport: { width: 1560, height: 1200 }, deviceScaleFactor: 1 })
  await planche.setContent('<html lang="fr"><body style="margin:0;background:#eee;font:16px sans-serif"><main style="display:grid;grid-template-columns:repeat(11,1fr);gap:6px"></main></body></html>')
  await planche.evaluate(apercus => {
    const grille = document.querySelector('main')
    for (const { nom, image } of apercus) {
      const caseApercu = document.createElement('div')
      const texte = document.createElement('p')
      texte.textContent = nom
      texte.style.fontSize = '11px'
      const img = document.createElement('img')
      img.src = `data:image/png;base64,${image}`
      img.style.width = '100%'
      caseApercu.append(texte, img)
      grille.append(caseApercu)
    }
  }, apercus)
  await planche.locator('img').evaluateAll(images => Promise.all(images.map(img => img.decode())))
  await planche.screenshot({ path: path.join(sortie, 'palettes-icones.png'), fullPage: true })
  fs.writeFileSync(path.join(sortie, 'mesures.json'), JSON.stringify(mesures, null, 2))
  if (erreurs.length) throw new Error(erreurs.join('\n'))
  console.log(`33 aperçus avec icônes, PNG 1179 × 2556 et détails natifs : ${sortie}`)
} finally {
  await navigateur?.close()
  srv.close()
}
