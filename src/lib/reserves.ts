// SPDX-License-Identifier: AGPL-3.0-only

/**
 * La réserve : le motif est ce qu'on enlève.
 *
 * Le premier geste du moteur pose des formes sur un fond ; celui-ci perce un
 * aplat, et c'est ce qui est derrière qui regarde à travers. Le pinceau ne
 * découpe pas : la réserve se peint donc à l'envers, le panneau d'abord, puis
 * les ouvertures par-dessus, de la couleur de ce qu'elles laissent voir.
 * L'oeil lit un panneau percé ; le fichier ne contient que des aplats.
 *
 * Le claustra suit la discipline de la trame des lieux : sa grille dépend du
 * format, alors pas un seul tirage ne se fait dans la boucle des cellules.
 * Les fenêtres allumées sont tirées d'avance en fractions de la grille, et la
 * boucle ne fait que les reconnaître.
 */
import type { Alea, Densite, Pinceau } from './moteur'
import { duClairAuSombre } from './trace'

export const IDS_RESERVES = ['claustra', 'papel'] as const

export type IdReserve = (typeof IDS_RESERVES)[number]

export function estReserve(valeur: unknown): valeur is IdReserve {
  return IDS_RESERVES.includes(valeur as IdReserve)
}

/* ---------- claustra --------------------------------------------------------- */

/**
 * Un moucharabieh : un panneau sombre percé d'ouvertures en grille, arches et
 * quatre-feuilles en alternance, dont quelques-unes s'allument d'une teinte
 * vive, comme des fenêtres le soir. La densité règle la finesse du claustra ;
 * le nombre de fenêtres allumées, lui, ne bouge pas, parce qu'une lampe de
 * plus par cran de densité ferait un motif plus chargé, pas plus fin.
 */
function claustra(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const teintes = duClairAuSombre(C)
  const panneau = teintes[teintes.length - 1]
  const jour = teintes[0]
  const lampe = teintes[1]

  ctx.fillStyle = panneau
  ctx.fillRect(0, 0, W, H)

  const rangees = [7, 9, 12][densite]
  const cote = H / rangees
  const colonnes = Math.max(2, Math.round(W / cote))
  const marge = unite * 0.03

  /* Les lampes, tirées d'avance en fractions : la grille peut compter ce
     qu'elle veut, les mêmes coins s'allument. */
  const lampes = Array.from({ length: 5 }, () => [rnd(), rnd()] as const)
  const allumee = (gx: number, gy: number): boolean =>
    lampes.some(
      ([u, t]) => Math.floor(u * colonnes) === gx && Math.floor(t * rangees) === gy,
    )

  const cw = (W - 2 * marge) / colonnes
  const ch = (H - 2 * marge) / rangees
  const rayon = Math.min(cw, ch) * 0.3

  for (let gy = 0; gy < rangees; gy += 1) {
    for (let gx = 0; gx < colonnes; gx += 1) {
      const x = marge + (gx + 0.5) * cw
      const y = marge + (gy + 0.5) * ch
      ctx.fillStyle = allumee(gx, gy) ? lampe : jour
      if ((gx + gy) % 2 === 0) {
        /* Le quatre-feuilles : quatre disques en croix. */
        for (const [dx, dy] of [[-0.5, 0], [0.5, 0], [0, -0.5], [0, 0.5]]) {
          ctx.beginPath()
          ctx.arc(x + dx * rayon, y + dy * rayon, rayon * 0.52, 0, Math.PI * 2)
          ctx.fill()
        }
      } else {
        /* L'arche : un rectangle coiffé d'un demi-cercle. */
        ctx.beginPath()
        ctx.moveTo(x - rayon, y + rayon * 0.9)
        ctx.lineTo(x - rayon, y)
        ctx.arc(x, y, rayon, Math.PI, 0)
        ctx.lineTo(x + rayon, y + rayon * 0.9)
        ctx.closePath()
        ctx.fill()
      }
    }
  }
}

/* ---------- papel picado ----------------------------------------------------- */

/**
 * Le papier plié puis découpé : une rosace à six axes et son miroir, la
 * première symétrie stricte du catalogue. La feuille est le papier, la
 * couleur vive est ce qu'on voit à travers les découpes ; changer de graine,
 * c'est déplier un autre flocon.
 */
function papel(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const teintes = duClairAuSombre(C)
  const papier = teintes[0]
  const dessous = C[0] === papier ? C[1] : C[0]

  ctx.fillStyle = papier
  ctx.fillRect(0, 0, W, H)

  const cx = W / 2
  const cy = H / 2
  const AXES = 6

  /* Les coins : des éventails de la couleur du dessous, qui mordent la
     feuille comme les plis d'un papier qu'on a ouvert. */
  ctx.fillStyle = dessous
  for (const [qx, qy] of [[0, 0], [W, 0], [0, H], [W, H]]) {
    for (const [rayon, teinte] of [
      [unite * 0.16, dessous],
      [unite * 0.095, papier],
      [unite * 0.04, dessous],
    ] as const) {
      ctx.fillStyle = teinte
      ctx.beginPath()
      ctx.arc(qx, qy, rayon, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.fillStyle = dessous
  ctx.beginPath()
  ctx.arc(cx, cy, unite * 0.045, 0, Math.PI * 2)
  ctx.fill()

  const decoupes = [8, 11, 15][densite]
  for (let i = 0; i < decoupes; i += 1) {
    const rayon = unite * (0.085 + 0.052 * i) + rnd() * unite * 0.03
    const angle = rnd() * (Math.PI / AXES)
    const gabarit = Math.floor(rnd() * 4)
    /* Les découpes grandissent avec leur anneau : serrées et fines près du
       coeur, amples au bord, comme les plis d'un papier qu'on écarte. */
    const taille = unite * (0.016 + 0.03 * rnd()) * (0.55 + rayon / (unite * 0.55))
    const rotation = rnd() * Math.PI

    for (let k = 0; k < AXES; k += 1) {
      for (const miroir of [1, -1]) {
        const t = miroir * angle + (k * Math.PI * 2) / AXES
        const px = cx + rayon * Math.cos(t)
        const py = cy + rayon * Math.sin(t)
        ctx.save()
        ctx.translate(px, py)
        ctx.rotate(t + rotation * miroir)
        ctx.beginPath()
        if (gabarit === 0) {
          ctx.arc(0, 0, taille, 0, Math.PI * 2)
        } else if (gabarit === 1) {
          /* Le pétale : deux arcs en amande. */
          ctx.moveTo(0, -taille * 1.5)
          ctx.quadraticCurveTo(taille, 0, 0, taille * 1.5)
          ctx.quadraticCurveTo(-taille, 0, 0, -taille * 1.5)
          ctx.closePath()
        } else if (gabarit === 2) {
          ctx.moveTo(0, -taille * 1.3)
          ctx.lineTo(taille, taille)
          ctx.lineTo(-taille, taille)
          ctx.closePath()
        } else {
          /* Le croissant : un arc plein, creusé d'un arc plus large. */
          ctx.moveTo(-taille, 0)
          ctx.arc(0, 0, taille, Math.PI, 0)
          ctx.quadraticCurveTo(0, taille * 0.9, -taille, 0)
          ctx.closePath()
        }
        ctx.fill()
        ctx.restore()
      }
    }
  }
}

/* ---------- aiguillage ------------------------------------------------------- */

export function peindreReserve(
  ctx: Pinceau, W: number, H: number, id: IdReserve,
  C: readonly string[], densite: Densite, rnd: Alea, unite: number,
): void {
  if (id === 'claustra') claustra(ctx, W, H, C, densite, rnd, unite)
  else papel(ctx, W, H, C, densite, rnd, unite)
}
