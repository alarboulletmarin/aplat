// SPDX-License-Identifier: AGPL-3.0-only

/**
 * La grammaire : une plante n'est pas une forme, c'est une règle appliquée à
 * elle-même. Un axe porte des pennes, qui portent des pennes ; une branche se
 * dédouble, et chaque moitié recommence. Le moteur devient botaniste
 * d'espèces qui n'existent pas : une planche d'herbier par graine.
 *
 * Les récursions sont bornées par des profondeurs fixes : le nombre de
 * tirages et le nombre de formes se connaissent avant de dessiner, ce qui
 * tient à la fois la discipline du déterminisme et le plafond du vectoriel.
 */
import type { Alea, Densite, Pinceau } from './moteur'
import { duClairAuSombre, type Point, ruban } from './trace'

export const IDS_GRAMMAIRES = ['herbier'] as const

export type IdGrammaire = (typeof IDS_GRAMMAIRES)[number]

export function estGrammaire(valeur: unknown): valeur is IdGrammaire {
  return IDS_GRAMMAIRES.includes(valeur as IdGrammaire)
}

/**
 * La fougère : un axe qui s'incurve, des pennes en amandes alternées, de
 * moins en moins longues vers l'apex.
 */
function fougere(
  ctx: Pinceau, x0: number, y0: number, angle0: number, longueur: number,
  courbure: number, teinte: string, unite: number,
): void {
  const PENNES = 15
  let x = x0
  let y = y0
  let angle = angle0
  const axe: Point[] = [[x, y]]

  ctx.fillStyle = teinte
  for (let i = 0; i < PENNES; i += 1) {
    const t = i / PENNES
    const pas = (longueur / PENNES) * (1 - 0.25 * t)
    angle += courbure
    x += Math.cos(angle) * pas
    y += Math.sin(angle) * pas
    axe.push([x, y])
    if (i === 0) continue
    const portee = longueur * 0.3 * (1 - t) + unite * 0.016
    for (const sens of [-1, 1]) {
      const a = angle + sens * 1.05
      const fx = x + Math.cos(a) * portee
      const fy = y + Math.sin(a) * portee
      const nx = Math.cos(a + Math.PI / 2) * portee * 0.18
      const ny = Math.sin(a + Math.PI / 2) * portee * 0.18
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.quadraticCurveTo((x + fx) / 2 + nx, (y + fy) / 2 + ny, fx, fy)
      ctx.quadraticCurveTo((x + fx) / 2 - nx, (y + fy) / 2 - ny, x, y)
      ctx.closePath()
      ctx.fill()
    }
  }
  ruban(ctx, axe, unite * 0.011)
  ctx.fill()
}

/** L'algue : une dichotomie, chaque branche se dédouble jusqu'au bout. */
function algue(
  ctx: Pinceau, x: number, y: number, angle: number, longueur: number,
  profondeur: number, teinte: string, rnd: Alea, unite: number,
): void {
  const fx = x + Math.cos(angle) * longueur
  const fy = y + Math.sin(angle) * longueur
  ctx.fillStyle = teinte
  ruban(ctx, [[x, y], [fx, fy]], unite * (0.005 + 0.0035 * profondeur))
  ctx.fill()
  if (profondeur === 0) {
    ctx.beginPath()
    ctx.arc(fx, fy, unite * 0.011, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  const deviation = 0.38 + 0.14 * rnd()
  algue(ctx, fx, fy, angle - deviation, longueur * 0.78, profondeur - 1, teinte, rnd, unite)
  algue(ctx, fx, fy, angle + deviation, longueur * 0.78, profondeur - 1, teinte, rnd, unite)
}

/**
 * Une planche botanique en silhouettes : une grande fougère, une algue
 * dichotomique, et selon la densité une pousse retombante et une seconde
 * algue. Une pastille au pied de chaque plante, comme l'étiquette d'un
 * herbier. Changer de graine, c'est tourner la page.
 */
function herbier(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const teintes = duClairAuSombre(C)
  const sombre = teintes[teintes.length - 1]
  const pied = teintes[1]
  const pastille = (x: number, y: number): void => {
    ctx.fillStyle = pied
    ctx.beginPath()
    ctx.arc(x, y, unite * 0.016, 0, Math.PI * 2)
    ctx.fill()
  }

  const grandeX = W * (0.18 + 0.2 * rnd())
  const grandeY = H * (0.94 + 0.04 * rnd())
  fougere(
    ctx, grandeX, grandeY, -Math.PI / 2 + (rnd() - 0.5) * 0.3,
    unite * (1.3 + 0.3 * rnd()), 0.045, sombre, unite,
  )
  pastille(grandeX, grandeY)

  const algueX = W * (0.68 + 0.2 * rnd())
  const algueY = H * (0.96 + 0.02 * rnd())
  algue(
    ctx, algueX, algueY, -Math.PI / 2 + (rnd() - 0.5) * 0.4,
    unite * (0.2 + 0.05 * rnd()), 4, C[0], rnd, unite,
  )
  pastille(algueX, algueY)

  if (densite >= 1) {
    const hautX = W * (0.78 + 0.14 * rnd())
    const hautY = H * (0.06 + 0.12 * rnd())
    fougere(
      ctx, hautX, hautY, Math.PI / 2 + (rnd() - 0.5) * 0.7,
      unite * (0.5 + 0.15 * rnd()), -0.05, C[0], unite,
    )
    pastille(hautX, hautY)
  }

  if (densite === 2) {
    const petitX = W * (0.34 + 0.24 * rnd())
    const petitY = H * (0.4 + 0.16 * rnd())
    algue(
      ctx, petitX, petitY, -Math.PI / 2 + (rnd() - 0.5) * 0.5,
      unite * 0.13, 3, teintes[2], rnd, unite,
    )
    pastille(petitX, petitY)
  }
}

/* ---------- aiguillage ------------------------------------------------------- */

export function peindreGrammaire(
  ctx: Pinceau, W: number, H: number, id: IdGrammaire,
  C: readonly string[], densite: Densite, rnd: Alea, unite: number,
): void {
  void id
  herbier(ctx, W, H, C, densite, rnd, unite)
}
