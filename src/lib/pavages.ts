// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Le pavage savant : couvrir le plan sans jamais se répéter.
 *
 * Truchet et azulejos répètent leur tuile ; les losanges de Penrose ne le
 * peuvent pas, mathématiquement. L'oeil sent l'ordre, cherche la période et
 * ne la trouve pas : c'est ce qui rend le motif regardable des mois.
 *
 * Le pavage se construit par déflation : dix triangles d'or en soleil, puis
 * chaque génération subdivise les triangles selon les deux règles classiques
 * de P3. Aucun tirage dans la construction, qui est la même pour tout le
 * monde ; la graine ne choisit que les losanges d'accent, un sur quinze
 * environ, et le nombre de triangles ne dépend que de la densité. Les joints
 * ne sont pas dessinés : chaque triangle recule d'un demi-joint vers son
 * centre, et le fond de la palette affleure entre les tuiles, comme le
 * mortier d'un vitrail.
 */
import type { Alea, Densite, Pinceau } from './moteur'
import type { Point } from './trace'

export const IDS_PAVAGES = ['penrose'] as const

export type IdPavage = (typeof IDS_PAVAGES)[number]

export function estPavage(valeur: unknown): valeur is IdPavage {
  return IDS_PAVAGES.includes(valeur as IdPavage)
}

const PHI = (1 + Math.sqrt(5)) / 2

/** Un triangle d'or : sa moitié de losange fin (0) ou large (1). */
type Triangle = [0 | 1, Point, Point, Point]

function subdiviser(t: Triangle): Triangle[] {
  const [genre, a, b, c] = t
  if (genre === 0) {
    const p: Point = [a[0] + (b[0] - a[0]) / PHI, a[1] + (b[1] - a[1]) / PHI]
    return [
      [0, c, p, b],
      [1, p, c, a],
    ]
  }
  const q: Point = [b[0] + (a[0] - b[0]) / PHI, b[1] + (a[1] - b[1]) / PHI]
  const r: Point = [b[0] + (c[0] - b[0]) / PHI, b[1] + (c[1] - b[1]) / PHI]
  return [
    [1, r, c, a],
    [1, q, r, b],
    [0, r, q, a],
  ]
}

function penrose(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const cx = W / 2
  const cy = H / 2
  const rayon = Math.hypot(W, H) / 2 + unite * 0.05

  let triangles: Triangle[] = []
  for (let i = 0; i < 10; i += 1) {
    const a1 = ((2 * i - 1) * Math.PI) / 10
    const a2 = ((2 * i + 1) * Math.PI) / 10
    let b: Point = [cx + rayon * Math.cos(a1), cy + rayon * Math.sin(a1)]
    let c: Point = [cx + rayon * Math.cos(a2), cy + rayon * Math.sin(a2)]
    if (i % 2 === 0) [b, c] = [c, b]
    triangles.push([0, [cx, cy], b, c])
  }

  /* Trois, quatre ou cinq générations : à six, les losanges d'un téléphone
     descendent sous les quatre-vingts pixels et le motif cesse de se lire en
     aplats francs ; le fichier, lui, triple, puisque rien ne s'y répète.
     Le cran dense s'arrête donc là où le papier découpé se lit encore. */
  const generations = [3, 4, 5][densite]
  for (let g = 0; g < generations; g += 1) triangles = triangles.flatMap(subdiviser)

  const joint = unite * [0.016, 0.011, 0.007][densite]
  for (const [genre, a, b, c] of triangles) {
    /* L'accent se tire pour chaque triangle, dans le cadre ou pas : le
       compte de tirages ne doit pas dépendre du format. */
    const accent = genre === 0 && rnd() < 0.065
    const xs = [a[0], b[0], c[0]]
    const ys = [a[1], b[1], c[1]]
    if (Math.max(...xs) < 0 || Math.min(...xs) > W) continue
    if (Math.max(...ys) < 0 || Math.min(...ys) > H) continue

    const gx = (a[0] + b[0] + c[0]) / 3
    const gy = (a[1] + b[1] + c[1]) / 3
    ctx.fillStyle = accent ? C[1] : genre === 0 ? C[0] : C[2]
    ctx.beginPath()
    for (const [i, sommet] of [a, b, c].entries()) {
      const dx = gx - sommet[0]
      const dy = gy - sommet[1]
      const distance = Math.hypot(dx, dy) || 1
      const px = sommet[0] + (dx / distance) * joint
      const py = sommet[1] + (dy / distance) * joint
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
  }
}

export function peindrePavage(
  ctx: Pinceau, W: number, H: number, id: IdPavage,
  C: readonly string[], densite: Densite, rnd: Alea, unite: number,
): void {
  void id
  penrose(ctx, W, H, C, densite, rnd, unite)
}
