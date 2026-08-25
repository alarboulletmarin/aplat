// SPDX-License-Identifier: AGPL-3.0-only

/**
 * La chimie : le premier geste du moteur où le motif n'est pas dessiné.
 *
 * Deux substances se disputent la surface, une réaction-diffusion de
 * Gray-Scott, et on gèle la partie à un instant choisi. Les taches d'un
 * pelage et les circonvolutions d'un corail sortent des mêmes quatre
 * nombres ; la densité règle le temps de culture, pas un compte de formes.
 *
 * Le déterminisme demande ici plus que partout ailleurs : la simulation
 * entière dépend de sa grille, donc une cellule de plus donnerait une autre
 * image, pas une image un peu différente. La grille est rapportée au petit
 * côté avec un compte fixe par densité, le grand côté s'en déduit par le
 * rapport d'aspect arrondi, et le semis initial passe par le bruit de
 * valeur : la sonde de lisibilité, qui rend au même rapport, cultive
 * exactement la même boîte.
 *
 * Cultiver coûte cher, alors le champ est mis en mémoire par motif : la
 * sonde, l'aperçu et les exports du même quadruplet partagent une seule
 * culture. Le premier regard sur une famille de ce geste paie la pousse ;
 * les suivants ne paient que la peinture.
 */
import type { Alea, Densite, Pinceau } from './moteur'
import { hacher, peindreChampSeuille } from './trace'

export const IDS_CHIMIE = ['pelage', 'madrepore'] as const

export type IdChimie = (typeof IDS_CHIMIE)[number]

export function estChimie(valeur: unknown): valeur is IdChimie {
  return IDS_CHIMIE.includes(valeur as IdChimie)
}

/**
 * Cellules sur le petit côté de la grille de culture : c'est elle qui fixe
 * l'échelle des taches, puisque la réaction a sa longueur d'onde propre,
 * comptée en cellules. La peinture se fait sur une grille deux fois plus
 * fine, après quelques itérations de raffinage qui lissent les bords : la
 * pousse coûte le gros du temps sur un quart des cellules.
 */
const FINESSE: readonly [number, number, number] = [40, 52, 60]

/** Les itérations de culture puis de raffinage, par densité. */
const ITERATIONS: readonly [number, number, number] = [500, 550, 600]
const RAFFINAGE: readonly [number, number, number] = [90, 100, 110]

/**
 * Les recettes. F nourrit, K retire : autour de (0.030, 0.062) la substance
 * se fige en taches qui se repoussent ; autour de (0.029, 0.057) elle file
 * en rubans qui serpentent.
 */
const RECETTES: Record<IdChimie, { F: number; K: number }> = {
  pelage: { F: 0.03, K: 0.062 },
  madrepore: { F: 0.029, K: 0.057 },
}

/* ---------- culture ---------------------------------------------------------- */

/*
 * Les diffusions règlent l'échelle du motif, en cellules : les moitiés des
 * valeurs classiques donnent des structures de sept à dix cellules, ce qui
 * fait tenir un motif riche sur une grille qu'un tapotement peut payer. Au
 * raffinage, la grille double : les diffusions y remontent d'autant, pour
 * que les structures doublées restent à leur équilibre et que les cent
 * itérations ne fassent que lisser leurs bords.
 */
const DIFFUSION = [0.08, 0.04] as const
const DIFFUSION_RAFFINAGE = [0.25, 0.125] as const

/**
 * L'espacement du semis, en cellules. En dessous d'une douzaine de cellules,
 * les graines se disputent la substance nourricière et la culture entière
 * s'éteint : c'est le paramètre qui a demandé un banc d'essai.
 */
const PAS_SEMIS = 13

/* En doubles, pas en simples : le moteur JavaScript calcule de toute façon
   en double, et des tableaux en simple précision lui font payer une
   conversion à chaque lecture et chaque écriture de la boucle chaude. */
function evoluer(
  U: Float64Array, V: Float64Array, colonnes: number, rangees: number,
  F: number, K: number, iterations: number, DU: number, DV: number,
): [Float64Array, Float64Array] {
  const retrait = F + K
  let U2: Float64Array = new Float64Array(U.length)
  let V2: Float64Array = new Float64Array(V.length)

  /* Des alias constants par tour : sans eux, les tableaux échangés à chaque
     itération vivent dans le contexte de la fonction, et chaque accès de la
     boucle chaude repasse par lui au lieu d'un registre. Les deux colonnes
     de bord paient leur tour du tore dans le même corps de boucle, par un
     indice replié calculé au vol : deux cellules sur toute une rangée. */
  for (let tour = 0; tour < iterations; tour += 1) {
    const uA = U
    const vA = V
    const uB = U2
    const vB = V2
    for (let r = 0; r < rangees; r += 1) {
      const haut = ((r - 1 + rangees) % rangees) * colonnes
      const bas = ((r + 1) % rangees) * colonnes
      const ici = r * colonnes
      for (let c = 0; c < colonnes; c += 1) {
        const i = ici + c
        const g = c === 0 ? ici + colonnes - 1 : i - 1
        const d = c === colonnes - 1 ? ici : i + 1
        const u = uA[i]
        const v = vA[i]
        const lu = uA[haut + c] + uA[bas + c] + uA[g] + uA[d] - 4 * u
        const lv = vA[haut + c] + vA[bas + c] + vA[g] + vA[d] - 4 * v
        const reaction = u * v * v
        uB[i] = u + DU * lu - reaction + F * (1 - u)
        vB[i] = v + DV * lv + reaction - retrait * v
      }
    }
    U = uB
    V = vB
    U2 = uA
    V2 = vA
  }
  return [U, V]
}

/** Le champ doublé, interpolé bilinéairement, tore compris. */
function doubler(champ: Float64Array, colonnes: number, rangees: number): Float64Array {
  const fin = new Float64Array(colonnes * rangees * 4)
  const C2 = colonnes * 2
  for (let r = 0; r < rangees * 2; r += 1) {
    const y = (r + 0.5) / 2 - 0.5
    const r0 = Math.floor(y)
    const fy = y - r0
    const ra = ((r0 % rangees) + rangees) % rangees
    const rb = (ra + 1) % rangees
    for (let c = 0; c < C2; c += 1) {
      const x = (c + 0.5) / 2 - 0.5
      const c0 = Math.floor(x)
      const fx = x - c0
      const ca = ((c0 % colonnes) + colonnes) % colonnes
      const cb = (ca + 1) % colonnes
      const a = champ[ra * colonnes + ca]
      const b = champ[ra * colonnes + cb]
      const d = champ[rb * colonnes + ca]
      const e = champ[rb * colonnes + cb]
      fin[r * C2 + c] = a + (b - a) * fx + (d - a) * fy + (a - b - d + e) * fx * fy
    }
  }
  return fin
}

function cultiver(
  colonnes: number, rangees: number, F: number, K: number,
  iterations: number, raffinage: number, graineSemis: number,
): Float64Array {
  let U: Float64Array = new Float64Array(colonnes * rangees).fill(1)
  let V: Float64Array = new Float64Array(colonnes * rangees)

  /* Le semis : une graine de trois cellules sur trois par case d'une grille
     au pas critique, secouée par le bruit de valeur. Un semis au hasard
     ferait des paquets serrés, et les paquets serrés s'éteignent. */
  const colonnesSemis = Math.max(1, Math.round(colonnes / PAS_SEMIS))
  const rangeesSemis = Math.max(1, Math.round(rangees / PAS_SEMIS))
  for (let sy = 0; sy < rangeesSemis; sy += 1) {
    for (let sx = 0; sx < colonnesSemis; sx += 1) {
      const s = sy * colonnesSemis + sx
      const cx = Math.min(
        colonnes - 2,
        1 + Math.floor((sx + 0.15 + 0.7 * hacher(s, 1, graineSemis)) * (colonnes / colonnesSemis)),
      )
      const cy = Math.min(
        rangees - 2,
        1 + Math.floor((sy + 0.15 + 0.7 * hacher(s, 2, graineSemis)) * (rangees / rangeesSemis)),
      )
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          V[(cy + dy) * colonnes + cx + dx] = 1
        }
      }
    }
  }

  ;[U, V] = evoluer(U, V, colonnes, rangees, F, K, iterations, DIFFUSION[0], DIFFUSION[1])
  const [, fin] = evoluer(
    doubler(U, colonnes, rangees), doubler(V, colonnes, rangees),
    colonnes * 2, rangees * 2, F, K, raffinage,
    DIFFUSION_RAFFINAGE[0], DIFFUSION_RAFFINAGE[1],
  )
  return fin
}

/* ---------- mémoire ---------------------------------------------------------- */

/**
 * Une culture par motif regardé, quelques-unes d'avance. La sonde et le rendu
 * demandent la même dans la même seconde ; l'historique en redemande une
 * ancienne. Au-delà, on recultive : c'est une seconde de calcul, pas un état
 * qu'on perd.
 */
const cultures = new Map<string, Float64Array>()
const CULTURES_MAX = 12

function culture(
  id: IdChimie, densite: Densite, graineSemis: number, colonnes: number, rangees: number,
): Float64Array {
  const cle = `${id}|${densite}|${graineSemis}|${colonnes}x${rangees}`
  const connue = cultures.get(cle)
  if (connue) return connue
  const { F, K } = RECETTES[id]
  const champ = cultiver(
    colonnes, rangees, F, K, ITERATIONS[densite], RAFFINAGE[densite], graineSemis,
  )
  if (cultures.size >= CULTURES_MAX) {
    const premiere = cultures.keys().next().value
    if (premiere !== undefined) cultures.delete(premiere)
  }
  cultures.set(cle, champ)
  return champ
}

/* ---------- aiguillage ------------------------------------------------------- */

export function peindreChimie(
  ctx: Pinceau, W: number, H: number, id: IdChimie,
  C: readonly string[], densite: Densite, rnd: Alea, unite: number,
): void {
  void unite
  /* Un seul tirage, et tout le reste en découle par le bruit de valeur. */
  const graineSemis = Math.floor(rnd() * 0xffffffff)

  const finesse = FINESSE[densite]
  const portrait = H >= W
  const rapport = Math.round(((portrait ? H / W : W / H) + Number.EPSILON) * 1000) / 1000
  const colonnes = portrait ? finesse : Math.round(finesse * rapport)
  const rangees = portrait ? Math.round(finesse * rapport) : finesse

  const champ = culture(id, densite, graineSemis, colonnes, rangees)

  /* La culture rend sa grille doublée : la peinture suit. */
  ctx.fillStyle = C[0]
  peindreChampSeuille(
    ctx, champ, colonnes * 2, rangees * 2, 0.2,
    W / (colonnes * 2), id === 'pelage' ? 0.78 : 0.72, H / (rangees * 2),
  )
}
