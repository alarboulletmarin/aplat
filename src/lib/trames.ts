// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Deux gestes de trame : la grille déformée, et l'interférence.
 *
 * Le drapé prend le motif le plus sage qui soit, des bandes régulières, et le
 * déforme par un champ continu : l'oeil voit un tissu tendu là où il n'y a
 * que deux tons plats. Le moiré superpose deux trames régulières et peint la
 * figure d'interférence qu'aucune des deux ne contient, calculée point par
 * point, jamais obtenue par transparence.
 *
 * Le champ du drapé est une fonction pure de (x, y), aux phases près, tirées
 * une fois ; celui du moiré se juge cellule par cellule sur une grille
 * rapportée au petit côté, la discipline exacte de la trame des lieux. Dans
 * les deux cas, rien n'est tiré dans une boucle dont le compte dépendrait du
 * format.
 */
import type { Alea, Densite, Pinceau } from './moteur'
import { peindreChampSeuille } from './trace'

export const IDS_TRAMES = ['drape', 'moire'] as const

export type IdTrame = (typeof IDS_TRAMES)[number]

export function estTrame(valeur: unknown): valeur is IdTrame {
  return IDS_TRAMES.includes(valeur as IdTrame)
}

/* ---------- drapé ------------------------------------------------------------ */

/**
 * Des bandes verticales qui se compriment, dévient et respirent selon le
 * champ ; une bande d'accent de loin en loin, comme un fil tiré. Les deux
 * bords d'une bande se déplacent chacun selon leur abscisse, si bien que la
 * bande s'amincit là où le champ se resserre : c'est ça, le volume.
 */
function drape(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const bandes = [10, 14, 20][densite]
  const pas = unite / bandes
  const phase1 = rnd() * Math.PI * 2
  const phase2 = rnd() * Math.PI * 2
  const phase3 = rnd() * Math.PI * 2
  const ampleur = pas * (1 + 0.4 * rnd())
  const accent = Math.floor(rnd() * 7)

  const houle = (x: number, y: number): number =>
    ampleur *
    Math.sin((y / unite) * 7 + phase1 + 1.4 * Math.sin((x / unite) * 3.2 + phase2)) *
    (0.35 + 0.65 * Math.sin((y / unite) * 2.6 + (x / unite) * 2.3 + phase3))

  const colonnes = Math.ceil(W / pas) + 4
  const CRANS = 56
  for (let i = -2; i < colonnes; i += 1) {
    const x0 = i * pas
    const x1 = x0 + pas * 0.58
    ctx.fillStyle = ((i % 7) + 7) % 7 === accent ? C[2] : C[0]
    ctx.beginPath()
    for (let k = 0; k <= CRANS; k += 1) {
      const y = (k / CRANS) * (H + 2 * pas) - pas
      const x = x0 + houle(x0, y)
      if (k === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    for (let k = CRANS; k >= 0; k -= 1) {
      const y = (k / CRANS) * (H + 2 * pas) - pas
      ctx.lineTo(x1 + houle(x1, y), y)
    }
    ctx.closePath()
    ctx.fill()
  }
}

/* ---------- moiré ------------------------------------------------------------ */

/**
 * Deux systèmes d'anneaux presque concentriques : leurs franges dessinent les
 * hyperboles des physiciens, l'expérience des deux fentes en fond d'écran.
 * Deux centres et une fréquence, tirés de la graine : trois nombres, une
 * infinité de figures.
 */
function moire(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  void unite
  const finesse = [64, 84, 110][densite]
  const portrait = H >= W
  const rapport = Math.round(((portrait ? H / W : W / H) + Number.EPSILON) * 1000) / 1000
  const colonnes = portrait ? finesse : Math.round(finesse * rapport)
  const rangees = portrait ? Math.round(finesse * rapport) : finesse

  const c1x = colonnes * (0.22 + 0.3 * rnd())
  const c1y = rangees * (0.24 + 0.3 * rnd())
  const c2x = colonnes * (0.5 + 0.3 * rnd())
  const c2y = rangees * (0.45 + 0.32 * rnd())
  const frequence = (Math.PI * 2) / (8.4 + 3.4 * rnd())

  const champ = new Float32Array(colonnes * rangees)
  for (let r = 0; r < rangees; r += 1) {
    for (let c = 0; c < colonnes; c += 1) {
      const d1 = Math.hypot(c - c1x, r - c1y)
      const d2 = Math.hypot(c - c2x, r - c2y)
      champ[r * colonnes + c] = Math.cos(frequence * d1) + Math.cos(frequence * d2)
    }
  }

  ctx.fillStyle = C[0]
  peindreChampSeuille(ctx, champ, colonnes, rangees, 0.75, W / colonnes, 0.68, H / rangees)
}

/* ---------- aiguillage ------------------------------------------------------- */

export function peindreTrame(
  ctx: Pinceau, W: number, H: number, id: IdTrame,
  C: readonly string[], densite: Densite, rnd: Alea, unite: number,
): void {
  if (id === 'drape') drape(ctx, W, H, C, densite, rnd, unite)
  else moire(ctx, W, H, C, densite, rnd, unite)
}
