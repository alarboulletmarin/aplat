// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Génère les icônes PNG de la PWA sans dépendance : on rasterise quelques
 * formes simples puis on encode le PNG à la main via zlib.
 *
 * Motif : la marque d'Aplat, la même que `public/favicon.svg` — un losange
 * lime dans un carré navy, évidé d'un second losange, et le point corail au
 * centre. Trois aplats, aucun dégradé, aucune ombre : la direction artistique
 * tient dans 512 pixels comme dans une page.
 *
 * Usage : npm run icons
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SORTIE = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const NAVY = [0x17, 0x24, 0x3f]
const LIME = [0xdf, 0xf4, 0x78]
const CORAIL = [0xff, 0x66, 0x48]
const PAPIER = [0xf2, 0xed, 0xdd]

/** Canvas RGBA minimal, avec anticrénelage par sur-échantillonnage 3x3. */
function creerCanvas(largeur, hauteur = largeur) {
  const pixels = new Uint8Array(largeur * hauteur * 4)
  return {
    largeur,
    hauteur,
    pixels,
    remplir(couleur) {
      for (let i = 0; i < largeur * hauteur; i += 1) {
        pixels[i * 4] = couleur[0]
        pixels[i * 4 + 1] = couleur[1]
        pixels[i * 4 + 2] = couleur[2]
        pixels[i * 4 + 3] = 255
      }
    },
    /** Peint la zone où `dedans(x, y)` est vrai, bords lisses. */
    peindre(couleur, dedans) {
      const ECHANTILLONS = 3
      for (let y = 0; y < hauteur; y += 1) {
        for (let x = 0; x < largeur; x += 1) {
          let touches = 0
          for (let sy = 0; sy < ECHANTILLONS; sy += 1) {
            for (let sx = 0; sx < ECHANTILLONS; sx += 1) {
              if (dedans(x + (sx + 0.5) / ECHANTILLONS, y + (sy + 0.5) / ECHANTILLONS)) {
                touches += 1
              }
            }
          }
          if (touches === 0) continue
          const alpha = touches / (ECHANTILLONS * ECHANTILLONS)
          const decalage = (y * largeur + x) * 4
          for (let canal = 0; canal < 3; canal += 1) {
            pixels[decalage + canal] = Math.round(
              pixels[decalage + canal] * (1 - alpha) + couleur[canal] * alpha,
            )
          }
          pixels[decalage + 3] = Math.max(pixels[decalage + 3], Math.round(alpha * 255))
        }
      }
    },
  }
}

const disque = (cx, cy, r) => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r

/** Losange : un carré posé sur la pointe, comme dans la marque. */
const losange = (cx, cy, r) => (x, y) => Math.abs(x - cx) + Math.abs(y - cy) <= r

/** Rectangle à coins arrondis. */
const rectangleArrondi = (gauche, haut, largeur, hauteur, rayon) => (x, y) => {
  if (x < gauche || x > gauche + largeur || y < haut || y > haut + hauteur) return false
  const dx = Math.max(gauche + rayon - x, 0, x - (gauche + largeur - rayon))
  const dy = Math.max(haut + rayon - y, 0, y - (haut + hauteur - rayon))
  return dx * dx + dy * dy <= rayon * rayon
}

function crc32(tampon) {
  let crc = 0xffffffff
  for (const octet of tampon) {
    crc ^= octet
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function bloc(type, donnees) {
  const longueur = Buffer.alloc(4)
  longueur.writeUInt32BE(donnees.length)
  const corps = Buffer.concat([Buffer.from(type, 'ascii'), donnees])
  const controle = Buffer.alloc(4)
  controle.writeUInt32BE(crc32(corps))
  return Buffer.concat([longueur, corps, controle])
}

function encoderPNG(canvas) {
  const { largeur, hauteur, pixels } = canvas
  const ligne = largeur * 4
  // Chaque ligne est préfixée par son octet de filtre (0 = aucun).
  const brut = Buffer.alloc((ligne + 1) * hauteur)
  for (let y = 0; y < hauteur; y += 1) {
    brut[y * (ligne + 1)] = 0
    Buffer.from(pixels.buffer, y * ligne, ligne).copy(brut, y * (ligne + 1) + 1)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(largeur, 0)
  ihdr.writeUInt32BE(hauteur, 4)
  ihdr[8] = 8 // profondeur
  ihdr[9] = 6 // RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloc('IHDR', ihdr),
    bloc('IDAT', deflateSync(brut, { level: 9 })),
    bloc('IEND', Buffer.alloc(0)),
  ])
}

/**
 * @param taille taille en pixels
 * @param marge marge du fond, en fraction (0,14 = zone sûre des icônes maskables)
 */
function dessinerIcone(taille, marge = 0) {
  const canvas = creerCanvas(taille)
  const bord = taille * marge
  const boite = taille - bord * 2

  if (marge > 0) {
    // Icône maskable : le fond couvre toute la surface, le motif reste dans la
    // zone sûre — un masque rond ne doit jamais mordre dans le losange.
    canvas.remplir(NAVY)
  } else {
    canvas.remplir(PAPIER)
    canvas.peindre(NAVY, rectangleArrondi(0, 0, taille - 1, taille - 1, taille * 0.22))
  }

  const centre = bord + boite / 2
  canvas.peindre(LIME, losange(centre, centre, boite * 0.3125))
  canvas.peindre(NAVY, losange(centre, centre, boite * 0.1875))
  canvas.peindre(CORAIL, disque(centre, centre, boite * 0.078))

  return encoderPNG(canvas)
}

mkdirSync(SORTIE, { recursive: true })

const sorties = [
  ['icon-192.png', dessinerIcone(192)],
  ['icon-512.png', dessinerIcone(512)],
  ['icon-512-maskable.png', dessinerIcone(512, 0.14)],
  ['apple-touch-icon.png', dessinerIcone(180)],
]

for (const [nom, donnees] of sorties) {
  writeFileSync(join(SORTIE, nom), donnees)
  console.log(`${nom} (${(donnees.length / 1024).toFixed(1)} Ko)`)
}
