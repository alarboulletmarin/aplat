/* Extrait les contours d'Anton et les écrit en données, une fois pour toutes.
 *
 * Pourquoi une génération plutôt qu'une lecture au vol. Le moteur ne sait pas
 * écrire : `Pinceau` n'a pas de `fillText`, et lui en donner un obligerait le
 * vectoriel à embarquer une police ou à en nommer une que le destinataire n'a
 * peut-être pas. Dans les deux cas le fichier cesse d'être ce qu'on a vu, ce
 * que le produit promet de ne jamais faire.
 *
 * Lire la police au vol demanderait un analyseur de fonte dans le paquet
 * livré, or l'application n'a que React pour dépendance et ça n'est pas
 * négociable. La lecture se fait donc ici, hors livraison : `wawoff2` détend le
 * woff2, `opentype.js` en sort les contours, et le résultat part dans un
 * fichier de données que le moteur importe comme n'importe quel tableau. Les
 * deux paquets sont des dépendances de développement, au même titre que
 * Playwright, et rien n'en arrive chez les gens.
 *
 * Sur la licence. Anton est sous SIL Open Font License 1.1, qui autorise la
 * redistribution et l'incorporation ; le dépôt embarque déjà le fichier woff2
 * et le texte de la licence dans `public/polices/`, et `generate-notices.mjs`
 * la fait figurer dans THIRD-PARTY.txt. Les contours écrits ici sont une forme
 * de plus de la même fonte, couverte par la même licence, et le fichier généré
 * le rappelle en tête.
 *
 * Sur le repère. Une lettre sort dans une boîte dont la hauteur 1 est la
 * hauteur de capitale, l'origine en haut à gauche et l'axe des `y` vers le bas,
 * comme partout ailleurs dans le moteur. Anton donne l'inverse, l'origine sur
 * la ligne de pied et les `y` vers le haut : la conversion est la seule chose
 * que ce script décide.
 *
 *   npm run alphabet
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { decompress } from 'wawoff2'
import opentype from 'opentype.js'

const ICI = fileURLToPath(new URL('.', import.meta.url))
const RACINE = path.resolve(ICI, '..')
const SOURCE = path.join(RACINE, 'public', 'polices', 'anton-latin.woff2')
const SOURCE_ETENDUE = path.join(RACINE, 'public', 'polices', 'anton-latin-ext.woff2')
const SORTIE = path.join(RACINE, 'src', 'lib', 'anton.ts')

/* Ce que l'affiche sait écrire. Les capitales seulement : une affiche de
   titrage n'emploie pas de bas de casse, et chaque glyphe retenu pèse dans le
   paquet livré. Les accents sont ceux du français, sans quoi VOILÀ s'écrirait
   VOIL. */
const CARACTERES = [
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  ...'0123456789',
  ...'ÀÂÄÇÉÈÊËÎÏÔÖÙÛÜ',
  ...'!?.,:;\'"-&+/()',
  ' ',
]

/* La finesse du contour, en parts de la hauteur de capitale. Une lettre
   d'affiche fait dans les deux cents pixels de haut ; à ce seuil, la corde la
   plus longue d'une courbe s'écarte de moins d'un demi-pixel de l'arc, ce qui
   ne se voit pas, et un seuil plus fin ne fait que grossir le fichier. */
const FINESSE = 0.0025

/** Le point d'une quadratique, puis d'une cubique, au paramètre `t`. */
function quadratique(p0, p1, p2, t) {
  const u = 1 - t
  return [
    u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
  ]
}

function cubique(p0, p1, p2, p3, t) {
  const u = 1 - t
  return [
    u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
    u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1],
  ]
}

/**
 * Le nombre de segments d'une courbe, tiré de la longueur de son polygone de
 * contrôle : une courbe longue en reçoit plus qu'une courbe courte, ce qui
 * répartit les points là où ils servent au lieu d'en poser autant partout.
 */
function segments(points, finesse) {
  let longueur = 0
  for (let i = 1; i < points.length; i += 1) {
    longueur += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
  }
  return Math.max(2, Math.min(24, Math.ceil(Math.sqrt(longueur / finesse) / 2)))
}

/** Les contours d'un glyphe, aplatis en polylignes fermées. */
function contours(chemin, echelle, hauteur) {
  const sortie = []
  let courant = null
  let curseur = [0, 0]
  const vers = (x, y) => [x / hauteur, (y + hauteur) / hauteur] .map((v) => v)
  void echelle

  const pousser = (p) => {
    const dernier = courant[courant.length - 1]
    if (!dernier || Math.abs(dernier[0] - p[0]) > 1e-9 || Math.abs(dernier[1] - p[1]) > 1e-9) {
      courant.push(p)
    }
  }

  for (const c of chemin.commands) {
    if (c.type === 'M') {
      if (courant && courant.length > 2) sortie.push(courant)
      courant = []
      curseur = [c.x, c.y]
      pousser(vers(c.x, c.y))
    } else if (c.type === 'L') {
      curseur = [c.x, c.y]
      pousser(vers(c.x, c.y))
    } else if (c.type === 'Q') {
      const p0 = curseur
      const p1 = [c.x1, c.y1]
      const p2 = [c.x, c.y]
      const n = segments([p0, p1, p2], FINESSE * hauteur)
      for (let i = 1; i <= n; i += 1) {
        const p = quadratique(p0, p1, p2, i / n)
        pousser(vers(p[0], p[1]))
      }
      curseur = p2
    } else if (c.type === 'C') {
      const p0 = curseur
      const p1 = [c.x1, c.y1]
      const p2 = [c.x2, c.y2]
      const p3 = [c.x, c.y]
      const n = segments([p0, p1, p2, p3], FINESSE * hauteur)
      for (let i = 1; i <= n; i += 1) {
        const p = cubique(p0, p1, p2, p3, i / n)
        pousser(vers(p[0], p[1]))
      }
      curseur = p3
    } else if (c.type === 'Z') {
      if (courant && courant.length > 2) sortie.push(courant)
      courant = null
    }
  }
  if (courant && courant.length > 2) sortie.push(courant)
  return sortie
}

const polices = [SOURCE, SOURCE_ETENDUE].filter((f) => fs.existsSync(f))
if (!polices.length) {
  console.error('Anton introuvable dans public/polices/.')
  process.exit(1)
}

const fontes = []
for (const fichier of polices) {
  const ttf = await decompress(fs.readFileSync(fichier))
  fontes.push(opentype.parse(Uint8Array.from(ttf).buffer))
}

/* La hauteur de capitale, lue dans la table OS/2 quand elle y est, mesurée sur
   le H sinon. C'est elle qui vaut 1 dans le repère du moteur : caler sur le
   corps ou sur l'ascendante donnerait des lettres plus petites que la boîte,
   et un titre qui ne touche pas ses bords. */
const EM = 1000
const capHauteur = (() => {
  const os2 = fontes[0].tables.os2
  if (os2 && os2.sCapHeight > 0) return (os2.sCapHeight / fontes[0].unitsPerEm) * EM
  const chemin = fontes[0].charToGlyph('H').getPath(0, 0, EM)
  return -Math.min(...chemin.commands.filter((c) => c.y !== undefined).map((c) => c.y))
})()

const lignes = []
let points = 0
for (const caractere of CARACTERES) {
  const fonte = fontes.find((f) => f.charToGlyph(caractere).index > 0)
  if (!fonte) {
    console.warn('absent de la fonte, ignoré :', caractere)
    continue
  }
  const glyphe = fonte.charToGlyph(caractere)
  const echelle = EM / fonte.unitsPerEm
  const chasse = (glyphe.advanceWidth * echelle) / capHauteur
  const dessin = contours(glyphe.getPath(0, 0, EM), echelle, capHauteur)
  points += dessin.reduce((n, c) => n + c.length, 0)
  const plats = dessin
    .map((c) => c.flatMap((p) => p.map((v) => Number(v.toFixed(4)))).join(','))
    .map((c) => `[${c}]`)
    .join(',')
  const cle = /^[A-Z0-9]$/.test(caractere) ? caractere : JSON.stringify(caractere)
  lignes.push(`  ${cle}: { chasse: ${chasse.toFixed(4)}, contours: [${plats}] },`)
}

const texte = `// SPDX-License-Identifier: AGPL-3.0-only
/* Fichier généré par scripts/generate-alphabet.mjs. Ne pas modifier à la main.
 *
 * Contours d'Anton, sous SIL Open Font License 1.1 comme la fonte dont ils
 * sortent. Le texte de la licence voyage dans public/polices/OFL-Anton.txt et
 * dans THIRD-PARTY.txt.
 *
 * Repère : la hauteur de capitale vaut 1, l'origine est en haut à gauche et les
 * ${'`y`'} descendent, comme partout dans le moteur. ${'`chasse`'} est l'avance de la
 * lettre dans le même repère. Chaque contour est une polyligne fermée, écrite
 * à plat, et une lettre en compte plusieurs dès qu'elle a un compteur : ils se
 * remplissent ensemble, à la règle paire et impaire.
 */

export interface GlypheAnton {
  chasse: number
  contours: readonly (readonly number[])[]
}

export const ANTON: Readonly<Record<string, GlypheAnton>> = {
${lignes.join('\n')}
}
`

fs.writeFileSync(SORTIE, texte)
const ko = (texte.length / 1024).toFixed(1)
console.log(`src/lib/anton.ts : ${lignes.length} glyphes, ${points} points, ${ko} Ko`)
