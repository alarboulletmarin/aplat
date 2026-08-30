/* Le banc de tournage, partagé par tous les films.
 *
 * Il n'a aucune opinion sur ce qu'il filme. Il ouvre le build servi, injecte
 * le moteur du produit et la feuille de style livrée, appelle `preparer()` une
 * fois pour tous les rendus coûteux, puis demande `etat(i)` image par image et
 * pousse chaque image dans l'encodeur par un tube.
 *
 * Aucune transition CSS, aucune animation CSS, dans aucun film : `etat(i)`
 * pose ce qu'il faut voir à l'image `i`, et la même image rend deux fois le
 * même pixel. C'est ce qui rend les exports reproductibles.
 *
 * Chaque film publie son conducteur dans `.social/<nom>.json`, partition
 * comprise. La bande son se construit sur ce fichier et ne peut donc pas
 * dériver de l'image.
 *
 * `CHROMIUM_EXE` désigne un Chromium présent, `FFMPEG_EXE` un encodeur H.264 :
 * celui que Playwright embarque est réduit au WebM, qu'Instagram refuse.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch } from './pw.mjs'
import { poser } from './banc.mjs'
import { ouvrir } from './serveur.mjs'

const ICI = fileURLToPath(new URL('.', import.meta.url))
export const RACINE = path.resolve(ICI, '..')
export const SORTIE = path.resolve(RACINE, '.social')
export const LARGEUR = 1080
export const HAUTEUR = 1920
export const IPS = 30
/* Quinze images par temps : tous les films sont calés sur 120 BPM, et leurs
   plans tombent sur un temps. */
export const TEMPS = 15

export const echapper = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/* La feuille de style est lue dans le document livré, jamais devinée : le
   build en émet plusieurs, et prendre la première par ordre alphabétique
   donnait une page sans remise à zéro ni composants. */
export function feuilleLivree() {
  const html = fs.readFileSync(path.join(RACINE, 'dist', 'index.html'), 'utf8')
  const declaree = html.match(/href="([^"]+\.css)"/)
  if (!declaree) throw new Error('aucune feuille de style déclarée dans dist/index.html')
  return declaree[1]
}

export function styles(...fichiers) {
  return fichiers.map((f) => fs.readFileSync(path.join(ICI, f), 'utf8')).join('\n')
}

/* L'encodeur H.264, ouvert sur un tube. Les images n'atteignent jamais le
   disque : elles passent de la capture à ffmpeg directement. */
export function encodeurH264(fichier) {
  const nom = process.env.FFMPEG_EXE || 'ffmpeg'
  const ff = spawn(nom, [
    '-y', '-f', 'image2pipe', '-framerate', String(IPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '19',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', fichier,
  ], { stdio: ['pipe', 'ignore', 'pipe'] })
  let plainte = ''
  ff.stderr.on('data', (d) => { plainte += d.toString() })
  ff.on('error', () => {
    console.error(
      `\nEncodeur introuvable : « ${nom} ».\n` +
      'Installe FFmpeg, ou désigne-le par FFMPEG_EXE. Celui que Playwright\n' +
      'embarque ne sait faire que du WebM, qu’Instagram refuse.',
    )
    process.exit(1)
  })
  return {
    ecrire: (b) => new Promise((r) => (ff.stdin.write(b) ? r() : ff.stdin.once('drain', r))),
    finir: async () => {
      ff.stdin.end()
      await new Promise((r) => ff.on('close', r))
      if (!fs.existsSync(fichier)) {
        console.error('\nl’encodage a échoué :\n' + plainte.split('\n').slice(-12).join('\n'))
        process.exit(1)
      }
    },
  }
}

/* Tourner un film.
 *
 *   nom        le fichier produit, sans extension
 *   corps      le corps du document, sous la feuille du produit
 *   feuilles   les feuilles de style du film
 *   images     les images à rendre, dans l'ordre de sortie
 *   preparer   exécuté dans la page, une fois, retourne le relevé
 *   etat       exécuté dans la page, une fois par image
 *   arguments_ ce que `preparer` et `etat` reçoivent en plus de `i`
 *   conducteur construit à partir du relevé, publié en JSON
 */
export async function tourner({
  nom, corps, feuilles, images, preparer, etat, arguments_ = {}, conducteur, dire,
}) {
  fs.mkdirSync(SORTIE, { recursive: true })
  const encodeur = process.env.FFMPEG_EXE || 'ffmpeg'
  const feuille = feuilleLivree()

  const { srv, port } = await ouvrir()
  const browser = await launch()
  const ctx = await browser.newContext({
    viewport: { width: LARGEUR, height: HAUTEUR },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    locale: 'fr-FR',
  })
  const page = await ctx.newPage()
  const erreurs = []
  page.on('pageerror', (err) => erreurs.push(err.message))

  const document_ = `<!doctype html>
<html lang="fr" data-theme="clair">
<head>
<meta charset="utf-8">
<title>Aplat, ${echapper(nom)}</title>
<link rel="stylesheet" href="${feuille}">
<style>${styles(...feuilles)}</style>
</head>
<body>${corps}</body>
</html>`

  await page.route('**/film.html', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: document_ }))
  await page.goto(`http://127.0.0.1:${port}/film.html`, { waitUntil: 'networkidle' })
  await poser(page)
  await page.evaluate(() => document.fonts.ready)

  const releve = await page.evaluate(preparer, arguments_)
  if (dire) dire(releve)

  const fichier = path.join(SORTIE, `${nom}.mp4`)
  const ff = spawn(encodeur, [
    '-y', '-f', 'image2pipe', '-framerate', String(IPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '19',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', fichier,
  ], { stdio: ['pipe', 'ignore', 'pipe'] })

  let plainte = ''
  ff.stderr.on('data', (d) => { plainte += d.toString() })
  ff.on('error', () => {
    console.error(
      `\nEncodeur introuvable : « ${encodeur} ».\n` +
      'Installe FFmpeg, ou désigne-le par FFMPEG_EXE. Celui que Playwright\n' +
      'embarque ne sait faire que du WebM, qu’Instagram refuse.',
    )
    process.exit(1)
  })
  const ecrire = (b) =>
    new Promise((r) => (ff.stdin.write(b) ? r() : ff.stdin.once('drain', r)))

  const depart = Date.now()
  for (let k = 0; k < images.length; k += 1) {
    await page.evaluate(etat, { ...arguments_, i: images[k], releve })
    await ecrire(await page.screenshot({
      type: 'jpeg', quality: 96,
      clip: { x: 0, y: 0, width: LARGEUR, height: HAUTEUR },
    }))
    if (k % 60 === 0) process.stdout.write(`\r  ${Math.round((k / images.length) * 100)} %   `)
  }
  ff.stdin.end()
  await new Promise((r) => ff.on('close', r))
  await browser.close()
  srv.close()

  if (erreurs.length) console.log('\nerreurs de page :', erreurs.join(' | '))
  if (!fs.existsSync(fichier)) {
    console.error('\nl’encodage a échoué :\n' + plainte.split('\n').slice(-12).join('\n'))
    process.exit(1)
  }

  if (conducteur) {
    const c = conducteur(releve)
    fs.writeFileSync(path.join(SORTIE, `${nom}.json`), JSON.stringify(c, null, 2) + '\n')
  }
  console.log(
    `\n${path.relative(RACINE, fichier)} : ${images.length} images, ` +
    `${(images.length / IPS).toFixed(0)} s, ${(fs.statSync(fichier).size / 1048576).toFixed(1)} Mo, ` +
    `en ${Math.round((Date.now() - depart) / 1000)} s`,
  )
  return releve
}
