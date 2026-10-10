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
 * L'aurore prend la même grille et la fait porter une couleur qui coule : un
 * champ lisse dit, en chaque point, quelle couleur de la palette passe et
 * combien de papier elle couvre, et chaque cellule en tire un point.
 *
 * Le sablier pince une famille de filets parallèles autour d'une gorge, sur
 * un fond qui fond d'une couleur à l'autre par paliers serrés.
 *
 * Le champ du drapé est une fonction pure de (x, y), aux phases près, tirées
 * une fois ; celui du moiré se juge cellule par cellule sur une grille
 * rapportée au petit côté, la discipline exacte de la trame des lieux. Dans
 * les deux cas, rien n'est tiré dans une boucle dont le compte dépendrait du
 * format.
 */
import type { Alea, Densite, Pinceau } from './moteur'
import {
  bruiteur, duClairAuSombre, lisse, peindreChampSeuille, type Point, rampe, ruban,
} from './trace'

export const IDS_TRAMES = ['drape', 'moire', 'aurore', 'sablier'] as const

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

/* ---------- aurore ----------------------------------------------------------- */

/** La matrice de Bayer d'ordre quatre, seuils de 0 à 15. */
const BAYER: readonly (readonly number[])[] = [
  [0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5],
]

/**
 * Une nappe de couleur qui coule, tramée en points.
 *
 * Deux champs lisses, tous deux pliés par le même gauchissement : l'un place
 * chaque cellule sur la rampe des couleurs de la palette, l'autre dit combien
 * de papier elle couvre. Là où le second s'éteint, la cellule reste au fond ;
 * là où il est plein, les points se touchent et la nappe se lit d'un seul
 * tenant ; entre les deux, ils maigrissent, et c'est la trame des imprimeurs.
 *
 * Il n'y a aucun dégradé. Entre deux couleurs voisines de la rampe, la cellule
 * choisit l'une ou l'autre par un seuil de Bayer, si bien que la teinte
 * intermédiaire est faite de points des deux couleurs et que le fichier ne
 * contient que des couleurs de la palette. C'est aussi ce qui le garde exact
 * dans le SVG.
 *
 * Les champs se lisent en coordonnées de l'image rapportées à `unite`, et la
 * grille est rapportée à la largeur : rien n'est tiré dans une boucle dont le
 * compte dépendrait du format, la graine ne fabrique qu'une clé.
 */
function aurore(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const colonnes = [40, 58, 84][densite]
  const s = W / colonnes
  const rangees = Math.ceil(H / s) + 1

  const cle = Math.floor(rnd() * 1e9)
  const bruit = bruiteur(cle)
  const angle = rnd() * Math.PI * 2
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const frequence = 1.3 + 0.9 * rnd()
  const torsion = 0.9 + 0.7 * rnd()
  const cx = 0.2 + 0.6 * rnd()
  const cy = 0.2 + 0.6 * rnd()
  const n = C.length

  const piles: number[][] = Array.from({ length: n }, () => [])
  for (let r = 0; r < rangees; r += 1) {
    for (let c = 0; c < colonnes; c += 1) {
      const x = s * (c + 0.5)
      const y = s * (r + 0.5)
      const u = x / unite
      const v = y / unite

      /* Le même gauchissement pour les deux champs, en deux passes : la
         seconde plie ce que la première a déjà plié, et c'est elle qui fait
         les épingles et les nappes qui se recouvrent. */
      const a = bruit(u * 1.1, v * 1.1) - 0.5
      const b = bruit(u * 1.1 + 31.7, v * 1.1 + 12.3) - 0.5
      const pu = u + torsion * a
      const pv = v + torsion * b
      const a2 = bruit(pu * 2.1 + 7.1, pv * 2.1 + 3.9) - 0.5
      const b2 = bruit(pu * 2.1 + 19.4, pv * 2.1 + 27.2) - 0.5
      const qu = pu + 0.45 * torsion * a2
      const qv = pv + 0.45 * torsion * b2

      /* La rampe : une onde triangulaire le long de la direction de la
         nappe, qui monte de la première couleur à la dernière et redescend. */
      const phase = (qu * dx + qv * dy) * frequence
      const tri = Math.abs((((phase % 2) + 2) % 2) - 1)
      const position = lisse(tri) * (n - 1)
      const bas = Math.min(n - 2, Math.floor(position))
      const seuil = (BAYER[r % 4][c % 4] + 0.5) / 16
      const teinte = position - bas > seuil ? bas + 1 : bas

      /* La couverture : une masse, pas un semis. Le bruit la creuse, une
         chute radiale autour d'un centre tiré l'empêche de couvrir partout. */
      const chute = 0.95 - Math.hypot(x / W - cx, ((y / H - cy) * H) / W) * 0.5
      const masse = chute + (bruit(qu * 0.8 + 5.5, qv * 0.8 + 1.5) - 0.5) * 1.1
      const couvre = lisse(Math.max(0, Math.min(1, (masse - 0.3) / 0.3)))
      const rayon = s * 0.62 * couvre
      if (rayon < s * 0.07) continue

      piles[teinte].push(x, y, rayon)
    }
  }

  /* Un chemin par couleur, pas un par point : le canevas s'en sert mieux, et
     le SVG y gagne en poids. */
  for (let i = 0; i < n; i += 1) {
    const pile = piles[i]
    if (!pile.length) continue
    ctx.fillStyle = C[i]
    ctx.beginPath()
    for (let k = 0; k < pile.length; k += 3) {
      ctx.moveTo(pile[k] + pile[k + 2], pile[k + 1])
      ctx.arc(pile[k], pile[k + 1], pile[k + 2], 0, Math.PI * 2)
    }
    ctx.fill()
  }
}

/* ---------- sablier ---------------------------------------------------------- */

/**
 * Des filets qui se pincent autour d'une gorge, sur une nappe sans arête.
 *
 * Chaque filet est la courbe p = c (1 + k (cosh(q / s) - 1)) dans le repère de
 * la gorge, légèrement incliné : droit au milieu, il s'ouvre vers les bords en
 * haut et en bas, d'autant plus vite qu'il partait loin de l'axe. Les filets
 * sont régulièrement espacés au col, et c'est leur seul espacement régulier :
 * l'oeil lit un volume, un tube vu de face, là où il n'y a que des traits.
 *
 * Le fond est le seul de la liste à vouloir de la douceur. Il n'est pas un
 * dégradé : un champ lisse, rapporté au même repère que les filets, est
 * seuillé en paliers serrés, chacun un aplat pris sur la rampe de la palette,
 * du plus sombre au plus clair. Deux masses sombres de part et d'autre du col,
 * une veine claire le long de l'axe ; le grain casse les marches qui restent.
 *
 * Tous les tirages sont faits avant les boucles ; le pas d'échantillonnage
 * des filets est rapporté à `unite`, jamais à la résolution.
 */
function sablier(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const filets = [18, 26, 36][densite]
  const cx = W * (0.42 + 0.16 * rnd())
  const cy = H * (0.4 + 0.2 * rnd())
  const inclinaison = (rnd() - 0.5) * 0.24
  const cos = Math.cos(inclinaison)
  const sin = Math.sin(inclinaison)
  /* Le pincement n'est pas le même en haut et en bas : une gorge parfaitement
     symétrique se lit comme un schéma. */
  const sHaut = unite * (0.26 + 0.12 * rnd())
  const sBas = unite * (0.26 + 0.12 * rnd())
  const evasement = 0.7 + 0.5 * rnd()
  const lobe = 0.62 + 0.22 * rnd()
  const bruit = bruiteur(Math.floor(rnd() * 1e9))

  /* Du repère de la gorge (p en travers, q le long de l'axe) à l'image. */
  const versImage = (p: number, q: number): Point => [cx + p * cos - q * sin, cy + p * sin + q * cos]

  /* La nappe ne parcourt pas toute la palette : une moitié de la rampe,
     sombre ou claire selon la graine, pour que le fond reste un fond et que
     les filets portent le dessin. */
  const teintes = duClairAuSombre(C).reverse()
  const sombre = rnd() < 0.5
  const depart = sombre ? 0 : 0.42
  const etendue = 0.5

  /* La nappe. Le champ se lit en unités du petit côté, dans le repère de la
     gorge, pour que les masses suivent les filets quand la gorge penche. Il
     est échantillonné en colonnes larges et en rangées fines : le bord d'un
     palier est interpolé entre deux échantillons d'une même rangée, si bien
     que seule la hauteur de rangée peut faire marche. */
  const colonnes = 64
  const cote = W / (colonnes - 1)
  const hauteur = unite / 160
  const rangees = Math.ceil(H / hauteur)
  const champ = new Float32Array(colonnes * rangees)
  for (let r = 0; r < rangees; r += 1) {
    for (let c = 0; c < colonnes; c += 1) {
      const dx = cote * c - cx
      const dy = hauteur * (r + 0.5) - cy
      const p = (dx * cos + dy * sin) / unite
      const q = (-dx * sin + dy * cos) / unite
      const masses = Math.exp(-(((Math.abs(p) - lobe) / 0.36) ** 2) - (q / 0.5) ** 2)
      const veine = Math.exp(-((p / 0.22) ** 2)) * (0.6 + 0.4 * (1 - Math.exp(-((q / 0.55) ** 2))))
      const houle = bruit(p * 1.4 + 3.1, q * 1.4 + 7.7) - 0.5
      champ[r * colonnes + c] = Math.max(0, Math.min(1, 0.55 + 0.32 * veine - 0.5 * masses + 0.25 * houle))
    }
  }

  /* Chaque palier est un seul chemin, un rectangle par traversée de rangée,
     un peu plus haut que la rangée pour qu'aucun fil de fond ne passe entre
     deux. Les paliers se peignent du plus bas au plus haut, chacun
     recouvrant ce qui le dépasse. */
  const PALIERS = 32
  ctx.fillStyle = rampe(teintes, depart)
  ctx.fillRect(0, 0, W, H)
  for (let k = 1; k < PALIERS; k += 1) {
    const seuil = k / PALIERS
    ctx.fillStyle = rampe(teintes, depart + etendue * (k + 0.5) / PALIERS)
    ctx.beginPath()
    for (let r = 0; r < rangees; r += 1) {
      const ligne = r * colonnes
      const y0 = r * hauteur - hauteur * 0.1
      const y1 = (r + 1) * hauteur + hauteur * 0.1
      /* Où la rangée franchit le seuil entre deux échantillons. */
      const franchit = (c: number): number => {
        const a = champ[ligne + c - 1]
        const b = champ[ligne + c]
        return cote * (c - 1 + (seuil - a) / (b - a))
      }
      let debut = champ[ligne] > seuil ? 0 : -1
      for (let c = 1; c < colonnes; c += 1) {
        const plein = champ[ligne + c] > seuil
        if (plein && debut < 0) debut = franchit(c)
        if (!plein && debut >= 0) {
          const fin = franchit(c)
          ctx.moveTo(debut, y0)
          ctx.lineTo(fin, y0)
          ctx.lineTo(fin, y1)
          ctx.lineTo(debut, y1)
          ctx.closePath()
          debut = -1
        }
      }
      if (debut >= 0) {
        ctx.moveTo(debut, y0)
        ctx.lineTo(W, y0)
        ctx.lineTo(W, y1)
        ctx.lineTo(debut, y1)
        ctx.closePath()
      }
    }
    ctx.fill()
  }

  /* Les filets, du plus clair de la palette. Au-delà de `portee`, plus rien
     n'est dans l'image, quelle que soit l'inclinaison. */
  const portee = Math.hypot(W, H)
  const pas = unite / filets
  const N = Math.ceil(portee / pas)
  const segment = unite * 0.01
  const epaisseur = unite * 0.0026
  ctx.fillStyle = teintes[teintes.length - 1]
  for (let i = -N; i <= N; i += 1) {
    const c0 = i * pas
    const moitie = (signe: 1 | -1): Point[] => {
      const s = signe > 0 ? sBas : sHaut
      const points: Point[] = []
      let q = 0
      for (let garde = 0; garde < 4000; garde += 1) {
        const p = c0 * (1 + evasement * (Math.cosh(q / s) - 1))
        points.push(versImage(p, signe * q))
        if (Math.abs(p) > portee || q > portee) break
        const pente = (c0 * evasement * Math.sinh(q / s)) / s
        q += segment / Math.sqrt(1 + pente * pente)
      }
      return points
    }
    const points = [...moitie(-1).reverse(), ...moitie(1).slice(1)]
    /* Les filets loin de l'axe s'effacent un peu : la lumière tient au col. */
    ctx.globalAlpha = 0.45 + 0.4 * Math.exp(-((c0 / unite) ** 2))
    ruban(ctx, points, epaisseur)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

/* ---------- aiguillage ------------------------------------------------------- */

export function peindreTrame(
  ctx: Pinceau, W: number, H: number, id: IdTrame,
  C: readonly string[], densite: Densite, rnd: Alea, unite: number,
): void {
  if (id === 'drape') drape(ctx, W, H, C, densite, rnd, unite)
  else if (id === 'moire') moire(ctx, W, H, C, densite, rnd, unite)
  else if (id === 'aurore') aurore(ctx, W, H, C, densite, rnd, unite)
  else sablier(ctx, W, H, C, densite, rnd, unite)
}
