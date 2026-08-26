/* La vitrine : les images d'exemple du README, sorties du moteur lui-même.
 *
 * Le README vit sur GitHub, où le moteur ne tourne pas : il lui faut des
 * images fixes. Plutôt que des captures d'écran, on demande au moteur de les
 * produire, graine écrite en dur, si bien que chacune se refait à l'identique
 * avec `node tools/vitrine.mjs` et qu'aucune ne peut promettre un rendu que
 * l'application ne donnerait pas.
 *
 * Trois séries, écrites dans `docs/vitrine/` :
 * une galerie de familles, un thumbnail par groupe au moins ;
 * le même motif en PNG, WebP et SVG, pour montrer les formats d'export ;
 * le même motif en version claire et en version sombre.
 */
import fs from 'node:fs'
import path from 'node:path'
import { launch } from './pw.mjs'
import { poser } from './banc.mjs'
import { ouvrir } from './serveur.mjs'
import { fileURLToPath } from 'node:url'

/* Le dossier de ce fichier : `__dirname` n'existe pas dans un module ES. */
const ICI = fileURLToPath(new URL('.', import.meta.url))
const OUT = path.resolve(ICI, '../docs/vitrine')

/* La graine de toujours, celle de la planche-contact et des maquettes. */
const GRAINE = 7314

/* La galerie : dix familles, les cinq groupes représentés, une palette
   différente à chaque fois. Le format est celui d'un téléphone (1179 × 2556),
   rendu directement à la taille du thumbnail : le motif ne dépend pas de la
   résolution, il n'y a rien à réduire. */
const GALERIE = [
  { famille: 'vagues', palette: 'lime' },
  { famille: 'demilunes', palette: 'soleil' },
  { famille: 'penrose', palette: 'menthe' },
  { famille: 'cubes', palette: 'ardoise' },
  { famille: 'kintsugi', palette: 'argile' },
  { famille: 'cernes', palette: 'corail' },
  { famille: 'moire', palette: 'encre' },
  { famille: 'dunes', palette: 'ciel' },
  { famille: 'torii', palette: 'nuit' },
  { famille: 'constellations', palette: 'orage' },
]

/* Les deux motifs mis en avant : l'un pour les formats, l'autre pour la
   version claire et la version sombre. */
const FORMATS = { famille: 'meandres', palette: 'nuit' }
const VERSIONS = { famille: 'sommets', palette: 'soleil' }

function ecrire(nom, dataUri) {
  const fichier = path.join(OUT, nom)
  fs.writeFileSync(fichier, Buffer.from(dataUri.split(',')[1], 'base64'))
  const poids = fs.statSync(fichier).size
  console.log(`${nom}  ${(poids / 1024).toFixed(0)} Ko`)
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const { srv, port } = await ouvrir()
  const browser = await launch()
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } })
  await page.goto(`http://127.0.0.1:${port}/app?l=fr`, { waitUntil: 'networkidle' })
  await poser(page)

  const peindre = (motif, W, H, type, sombre = false) =>
    page.evaluate(({ motif, W, H, type, sombre, graine }) => {
      const c = document.createElement('canvas')
      c.width = W; c.height = H
      const g = c.getContext('2d', { alpha: false })
      window.MOTEUR.dessiner(g, W, H, { densite: 1, graine, ...motif }, { sombre })
      return c.toDataURL(type)
    }, { motif, W, H, type, sombre, graine: GRAINE })

  /* La galerie : 360 × 780, le rapport d'un téléphone. */
  for (const motif of GALERIE) {
    ecrire(`${motif.famille}.png`, await peindre(motif, 360, 780))
  }

  /* Les formats : le même motif, à demi-résolution de téléphone pour le poids,
     en PNG, en WebP et en SVG. Le SVG sort du pinceau qui note, comme dans
     l'application, voile compris. */
  ecrire('formats.png', await peindre(FORMATS, 590, 1278, 'image/png'))
  ecrire('formats.webp', await peindre(FORMATS, 590, 1278, 'image/webp'))
  const svg = await page.evaluate(({ motif, graine }) => {
    const rendu = window.MOTEUR.svgDuMotif({ densite: 1, graine, ...motif }, 590, 1278, true)
    return rendu.texte
  }, { motif: FORMATS, graine: GRAINE })
  const fichierSVG = path.join(OUT, 'formats.svg')
  fs.writeFileSync(fichierSVG, svg)
  console.log(`formats.svg  ${(fs.statSync(fichierSVG).size / 1024).toFixed(0)} Ko`)

  /* La version claire et la version sombre du même motif : l'ombre est brûlée
     dans le fichier, comme au téléchargement. */
  ecrire('version-claire.png', await peindre(VERSIONS, 480, 1040))
  ecrire('version-sombre.png', await peindre(VERSIONS, 480, 1040, 'image/png', true))

  await browser.close(); srv.close()
})()
