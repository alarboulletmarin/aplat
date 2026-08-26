// SPDX-License-Identifier: AGPL-3.0-only

/**
 * La fracture : partitionner le plan, puis peindre les morceaux.
 *
 * Le motif n'est plus une collection de formes posées sur un fond : c'est une
 * surface entière qui se brise, et tout l'intérêt se loge dans les jointures.
 * Le kintsugi peint d'abord la couleur des fissures, puis pose ses pièces
 * par-dessus en les rétrécissant d'un demi-trait : la jointure n'est jamais
 * dessinée, elle affleure. La banquise fait pareil avec plus d'eau entre les
 * plaques, et le boro coud des pièces de tissu au lieu de briser une laque.
 *
 * Le diagramme de Voronoï se calcule par découpe de demi-plans : la cellule
 * d'un germe est l'intersection des moitiés de plan qui le regardent, chacune
 * bordée par la médiatrice vers un autre germe. Pour rétrécir une cellule à
 * bords parallèles, on ne la met pas à l'échelle, ce qui épaissirait les
 * fissures aux pointes : on recule chaque médiatrice d'un demi-trait vers le
 * germe, et l'épaisseur de la fissure est constante partout.
 *
 * Les comptes de germes et de pièces sont fixés par la densité, jamais tirés
 * d'une boucle qui dépend du format : la discipline des lieux, appliquée à la
 * lettre pour que la sonde regarde la même scène que le fichier.
 */
import type { Alea, Densite, Pinceau } from './moteur'
import { anneau, capsule, duClairAuSombre, melangeHex, polygone, type Point } from './trace'

export const IDS_FRACTURES = ['kintsugi', 'banquise', 'sashiko'] as const

export type IdFracture = (typeof IDS_FRACTURES)[number]

export function estFracture(valeur: unknown): valeur is IdFracture {
  return IDS_FRACTURES.includes(valeur as IdFracture)
}

/* ---------- voronoï ---------------------------------------------------------- */

/**
 * La cellule du germe `i`, reculée de `retrait` : le rectangle de l'image,
 * découpé par chaque médiatrice déplacée vers le germe. Un retrait nul rend
 * le diagramme exact.
 */
function cellule(
  germes: readonly Point[], i: number, W: number, H: number, retrait: number,
): Point[] {
  let poly: Point[] = [[0, 0], [W, 0], [W, H], [0, H]]
  const g = germes[i]
  for (let j = 0; j < germes.length; j += 1) {
    if (j === i || !poly.length) continue
    const autre = germes[j]
    const dx = autre[0] - g[0]
    const dy = autre[1] - g[1]
    const distance = Math.hypot(dx, dy) || 1
    const mx = (g[0] + autre[0]) / 2 - (dx / distance) * retrait
    const my = (g[1] + autre[1]) / 2 - (dy / distance) * retrait
    const dedans = (p: Point) => (p[0] - mx) * dx + (p[1] - my) * dy <= 0
    const garde: Point[] = []
    for (let k = 0; k < poly.length; k += 1) {
      const a = poly[k]
      const b = poly[(k + 1) % poly.length]
      const da = dedans(a)
      if (da) garde.push(a)
      if (da !== dedans(b)) {
        const t =
          ((mx - a[0]) * dx + (my - a[1]) * dy) /
          ((b[0] - a[0]) * dx + (b[1] - a[1]) * dy)
        garde.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
      }
    }
    poly = garde
  }
  return poly
}

/* ---------- kintsugi --------------------------------------------------------- */

/**
 * Un aplat sombre brisé, réparé de la teinte la plus vive : la première
 * famille du catalogue où l'accent n'est pas une forme mais une jointure.
 * Les pièces sont un camaïeu de la teinte la plus sombre de la palette, la
 * fissure est la plus claire, et la feuille est entièrement recouverte.
 */
function kintsugi(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const teintes = duClairAuSombre(C)
  const or = teintes[0]
  const base = teintes[teintes.length - 1]
  const tons = [
    melangeHex(base, '#000000', 0.68),
    melangeHex(base, '#000000', 0.48),
    melangeHex(base, '#000000', 0.26),
    melangeHex(melangeHex(base, teintes[2], 0.25), '#000000', 0.5),
  ]

  ctx.fillStyle = or
  ctx.fillRect(0, 0, W, H)

  const germes: Point[] = []
  const compte = [8, 13, 19][densite]
  for (let i = 0; i < compte; i += 1) germes.push([rnd() * W, rnd() * H])
  const trait = unite * 0.014

  for (let i = 0; i < germes.length; i += 1) {
    const piece = cellule(germes, i, W, H, trait / 2)
    if (piece.length < 3) continue
    ctx.fillStyle = tons[i % tons.length]
    polygone(ctx, piece)
    ctx.fill()
  }
}

/* ---------- banquise --------------------------------------------------------- */

/**
 * Des plaques aux coins doux, et l'eau qui respire entre elles : l'eau est le
 * fond de la palette, jamais repeint. Les germes viennent d'une grille
 * secouée, pour des plaques d'un pas régulier mais jamais aligné.
 */
function banquise(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const teintes = duClairAuSombre(C)
  const [colonnes, rangees] = [[3, 5], [4, 6], [5, 8]][densite]
  const germes: Point[] = []
  for (let gy = 0; gy < rangees; gy += 1) {
    for (let gx = 0; gx < colonnes; gx += 1) {
      germes.push([
        ((gx + 0.2 + 0.6 * rnd()) * W) / colonnes,
        ((gy + 0.2 + 0.6 * rnd()) * H) / rangees,
      ])
    }
  }
  const eau = unite * 0.016
  for (let i = 0; i < germes.length; i += 1) {
    const tirage = rnd()
    const piece = cellule(germes, i, W, H, eau)
    if (piece.length < 3) continue
    ctx.fillStyle = tirage < 0.78 ? teintes[0] : tirage < 0.92 ? teintes[1] : teintes[2]
    anneau(ctx, piece)
    ctx.fill()
  }
}

/* ---------- boro ------------------------------------------------------------- */

/**
 * Le patchwork japonais : des pièces d'indigo rapportées, colonne par
 * colonne, et les reprises laissées visibles, le sashiko, en points de
 * couture clairs. La fracture cousue plutôt que réparée d'or.
 *
 * Les largeurs de colonnes et les hauteurs de pièces sont des parts tirées
 * puis normalisées : le compte de tirages est fixé par la densité, et la
 * somme retombe exactement sur les bords de l'image. Les points de couture,
 * eux, se posent sans tirage dans leurs boucles : un point de plus ou de
 * moins à un bord arrondi ne décale rien.
 */
function sashiko(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const teintes = duClairAuSombre(C)
  const sombre = teintes[teintes.length - 1]
  const fil = teintes[0]
  const tons = [
    melangeHex(sombre, '#000000', 0.28),
    sombre,
    melangeHex(sombre, teintes[2], 0.4),
    melangeHex(sombre, teintes[1], 0.3),
    melangeHex(sombre, teintes[2], 0.65),
  ]

  const colonnes = [3, 4, 6][densite]
  const rangees = [4, 6, 8][densite]

  /* Des parts tirées puis normalisées : les bords tombent juste. */
  const parts = (compte: number): number[] => {
    const brutes = Array.from({ length: compte }, () => 0.5 + rnd())
    const somme = brutes.reduce((a, b) => a + b, 0)
    return brutes.map((part) => part / somme)
  }

  const largeurs = parts(colonnes)
  const point = unite * 0.006
  const pas = unite * 0.024

  let x = 0
  for (let colonne = 0; colonne < colonnes; colonne += 1) {
    const largeur = largeurs[colonne] * W
    const hauteurs = parts(rangees)
    let y = 0
    for (let rangee = 0; rangee < rangees; rangee += 1) {
      const hauteur = hauteurs[rangee] * H
      const rare = rnd()
      ctx.fillStyle =
        rare < 0.06 ? melangeHex(fil, sombre, 0.12) : tons[Math.floor(rnd() * tons.length)]
      ctx.fillRect(x, y, largeur + 1, hauteur + 1)

      /* Le sashiko : des rangées de points, dans un sens tiré par pièce. */
      const vertical = rnd() < 0.3
      const ecart = pas * (1 + rnd())
      const marge = pas * 0.6
      ctx.fillStyle = fil
      if (vertical) {
        for (let sx = x + marge; sx < x + largeur - marge / 2; sx += ecart) {
          for (let sy = y + marge; sy < y + hauteur - marge / 2; sy += pas) {
            capsule(ctx, sx - point / 2, sy, point, pas * 0.55)
            ctx.fill()
          }
        }
      } else {
        for (let sy = y + marge; sy < y + hauteur - marge / 2; sy += ecart) {
          for (let sx = x + marge; sx < x + largeur - marge / 2; sx += pas) {
            capsule(ctx, sx, sy - point / 2, pas * 0.55, point)
            ctx.fill()
          }
        }
      }
      y += hauteur
    }
    x += largeur
  }
}

/* ---------- aiguillage ------------------------------------------------------- */

export function peindreFracture(
  ctx: Pinceau, W: number, H: number, id: IdFracture,
  C: readonly string[], densite: Densite, rnd: Alea, unite: number,
): void {
  if (id === 'kintsugi') kintsugi(ctx, W, H, C, densite, rnd, unite)
  else if (id === 'banquise') banquise(ctx, W, H, C, densite, rnd, unite)
  else sashiko(ctx, W, H, C, densite, rnd, unite)
}
