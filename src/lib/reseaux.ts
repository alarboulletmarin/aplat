// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Le réseau : des noeuds, des arêtes, et les règles graphiques d'une carte.
 *
 * On ne remplit pas la surface, on la traverse. Le fond de la palette reste
 * largement majoritaire, ce qui est un cadeau fait aux icônes ; le motif est
 * un document, un plan de métro d'une ville qui n'existe pas ou une carte
 * d'un ciel qu'on n'a jamais vu, et chaque graine en lève un autre.
 *
 * Chaque ligne tire un nombre fixe de segments, écran ou pas : une marche qui
 * s'arrêterait au bord ferait dépendre le compte de tirages du rapport
 * d'aspect, et la sonde pourrait diverger du fichier sur un arrondi. Les
 * segments sortis du cadre ne coûtent que leur géométrie.
 */
import type { Alea, Densite, Pinceau } from './moteur'
import { duClairAuSombre, type Point, ruban } from './trace'

export const IDS_RESEAUX = ['metro', 'constellations'] as const

export type IdReseau = (typeof IDS_RESEAUX)[number]

export function estReseau(valeur: unknown): valeur is IdReseau {
  return IDS_RESEAUX.includes(valeur as IdReseau)
}

/* ---------- métro ------------------------------------------------------------ */

/**
 * Le plan d'un réseau fictif : des lignes qui marchent sur une grille, tout
 * droit ou à quarante-cinq degrés, des stations en pastilles, des
 * correspondances cerclées de sombre. On cherche malgré soi sa station.
 */
function metro(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const teintes = duClairAuSombre(C)
  const pastille = teintes[0]
  const lignes = [3, 4, 6][densite]
  const pas = unite * 0.11
  const trait = unite * 0.026
  const SEGMENTS = 22

  interface Arret {
    x: number
    y: number
    couleur: string
  }
  const arrets: Arret[] = []

  for (let l = 0; l < lignes; l += 1) {
    const couleur = C[l % C.length]
    const verticale = l % 2 === 0
    /* Le départ, posé sur la grille, juste hors du cadre. */
    let x = verticale ? pas * Math.round((rnd() * W) / pas) : -pas
    let y = verticale ? -pas : pas * Math.round((rnd() * H) / pas)
    let direction: Point = verticale ? [0, 1] : [1, 0]
    const points: Point[] = [[x, y]]

    for (let s = 0; s < SEGMENTS; s += 1) {
      const longueur = 1 + Math.floor(rnd() * 3)
      x += direction[0] * longueur * pas
      y += direction[1] * longueur * pas
      points.push([x, y])
      if (rnd() < 0.7 && x > 0 && x < W && y > 0 && y < H) {
        arrets.push({ x, y, couleur })
      }
      if (rnd() < 0.55) {
        const diagonale = rnd() < 0.5
        const sens = rnd() < 0.5 ? 1 : -1
        direction = verticale
          ? diagonale ? [sens, 1] : [0, 1]
          : diagonale ? [1, sens] : [1, 0]
      }
      /* La ligne qui déborde du plan est repliée vers lui : pas un tirage de
         plus, juste la composante fautive retournée, pour que le réseau
         reste dans la ville quel que soit le format. */
      if (x < -pas && direction[0] < 0) direction = [1, direction[1]]
      if (x > W + pas && direction[0] > 0) direction = [-1, direction[1]]
      if (y < -pas && direction[1] < 0) direction = [direction[0], 1]
      if (y > H + pas && direction[1] > 0) direction = [direction[0], -1]
      if (direction[0] === 0 && direction[1] === 0) direction = verticale ? [0, 1] : [1, 0]
    }

    ctx.fillStyle = couleur
    ruban(ctx, points, trait)
    ctx.fill()
  }

  /* Les stations par-dessus les lignes, puis quelques correspondances. */
  for (const arret of arrets) {
    ctx.fillStyle = arret.couleur
    ctx.beginPath()
    ctx.arc(arret.x, arret.y, trait * 0.92, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = pastille
    ctx.beginPath()
    ctx.arc(arret.x, arret.y, trait * 0.52, 0, Math.PI * 2)
    ctx.fill()
  }
  const correspondances = Math.min([1, 2, 3][densite], arrets.length)
  const sombre = teintes[teintes.length - 1]
  for (let c = 0; c < correspondances; c += 1) {
    const arret = arrets[Math.floor(rnd() * arrets.length)]
    if (!arret) continue
    ctx.fillStyle = sombre
    ctx.beginPath()
    ctx.arc(arret.x, arret.y, trait * 1.45, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = pastille
    ctx.beginPath()
    ctx.arc(arret.x, arret.y, trait * 0.85, 0, Math.PI * 2)
    ctx.fill()
  }
}

/* ---------- constellations --------------------------------------------------- */

/**
 * Une carte du ciel inventée : un semis d'étoiles, des figures reliées à la
 * règle en chaînes ouvertes, une lune en croissant. Les étoiles faibles
 * pâlissent par transparence, le fond du ciel étant celui de la palette,
 * quel qu'il soit.
 */
function constellations(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const teintes = duClairAuSombre(C)
  const etoiles = [60, 110, 170][densite]

  for (let e = 0; e < etoiles; e += 1) {
    const x = rnd() * W
    const y = rnd() * H
    const grosse = rnd() < 0.15
    const faible = rnd() < 0.5
    ctx.fillStyle = teintes[0]
    ctx.globalAlpha = faible ? 0.45 : 1
    ctx.beginPath()
    ctx.arc(x, y, unite * (grosse ? 0.0085 : 0.0045), 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  /* Les figures : des chaînes ouvertes qui serpentent vers la droite, comme
     sur les cartes anciennes, un noeud étoilé à chaque coude. */
  const figures = [2, 3, 4][densite]
  const trait = unite * 0.004
  for (let f = 0; f < figures; f += 1) {
    const departX = W * (0.05 + 0.4 * rnd())
    const departY = H * (0.08 + 0.8 * rnd())
    const portee = unite * (0.38 + 0.22 * rnd())
    const noeuds = 5 + Math.floor(rnd() * 3)
    const points: Point[] = [[departX, departY]]
    for (let k = 1; k < noeuds; k += 1) {
      const [px, py] = points[k - 1]
      points.push([
        px + (portee / noeuds) * (0.6 + 0.8 * rnd()),
        py + (rnd() - 0.5) * portee * 0.5,
      ])
    }
    ctx.fillStyle = teintes[2]
    for (let k = 1; k < points.length; k += 1) {
      ruban(ctx, [points[k - 1], points[k]], trait)
      ctx.fill()
    }
    ctx.fillStyle = teintes[1]
    for (const [px, py] of points) {
      const rayon = unite * 0.012
      ctx.beginPath()
      for (let b = 0; b < 8; b += 1) {
        const angle = (b / 8) * Math.PI * 2
        const r = b % 2 === 0 ? rayon : rayon * 0.38
        const sx = px + r * Math.cos(angle)
        const sy = py + r * Math.sin(angle)
        if (b === 0) ctx.moveTo(sx, sy)
        else ctx.lineTo(sx, sy)
      }
      ctx.closePath()
      ctx.fill()
    }
  }

  /* La lune : un disque, et l'ombre qui le croque. */
  const lx = W * (0.62 + 0.28 * rnd())
  const ly = H * (0.06 + 0.16 * rnd())
  const lr = unite * 0.072
  ctx.fillStyle = teintes[teintes.length - 1]
  ctx.beginPath()
  ctx.arc(lx, ly, lr, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = teintes[0]
  ctx.globalAlpha = 0.24
  ctx.beginPath()
  ctx.arc(lx, ly, lr, Math.PI * 0.5, Math.PI * 1.5)
  ctx.quadraticCurveTo(lx + lr * 0.55, ly, lx, ly - lr)
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 1
}

/* ---------- aiguillage ------------------------------------------------------- */

export function peindreReseau(
  ctx: Pinceau, W: number, H: number, id: IdReseau,
  C: readonly string[], densite: Densite, rnd: Alea, unite: number,
): void {
  if (id === 'metro') metro(ctx, W, H, C, densite, rnd, unite)
  else constellations(ctx, W, H, C, densite, rnd, unite)
}
