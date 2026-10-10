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
 * Le sablier tend des filets autour de deux lobes sombres qui entrent par
 * les bords, et laisse leur pli dire où le fond s'éclaire.
 *
 * Le champ du drapé est une fonction pure de (x, y), aux phases près, tirées
 * une fois ; celui du moiré se juge cellule par cellule sur une grille
 * rapportée au petit côté, la discipline exacte de la trame des lieux. Dans
 * les deux cas, rien n'est tiré dans une boucle dont le compte dépendrait du
 * format.
 */
import type { Alea, Densite, Pinceau } from './moteur'
import {
  bruiteur, duClairAuSombre, lisse, melangeHex, peindreChampSeuille, type Point, rampe,
  ruban,
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

/** Une teinte hexadécimale en teinte, saturation, luminosité. */
function versTsl(hex: string): [number, number, number] {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

/** Le chemin inverse, vers une teinte hexadécimale. */
function depuisTsl(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const canal = (n: number) => {
    const v = l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
    return Math.round(v * 255).toString(16).padStart(2, '0')
  }
  return `#${canal(0)}${canal(8)}${canal(4)}`.toUpperCase()
}

/* ---------- sablier ---------------------------------------------------------- */

/**
 * Un tunnel de filets : deux lobes sombres qui entrent par les bords, et des
 * fils tendus autour d'eux.
 *
 * Chaque lobe a un noyau, une demi-droite couchée qui vient du bord de
 * l'image et s'arrête avant le milieu. La distance à ce noyau se mesure dans une norme un
 * peu plus carrée que l'euclidienne : ses lignes de niveau sont des courbes
 * parallèles au noyau, horizontales au-dessus, debout à côté, horizontales
 * dessous, avec des coins larges et francs. Les deux familles se raccordent
 * par le champ g = dG / (dG + dD), nul sur le noyau de gauche, un sur celui de
 * droite : près d'un lobe ses lignes sont les parallèles à son noyau, au
 * milieu elles sont droites, et vers le haut et le bas elles s'écartent en
 * éventail. Ce sont elles, les filets, régulièrement espacés au col.
 *
 * La lumière sort du même champ. Le noyau est un creux noir ; une bande
 * éclairée l'entoure à quelque distance, comme le bord d'un tunnel qui prend
 * le jour ; le milieu reste en demi-teinte. Comme la lumière ne dépend que de
 * g, elle est la même tout le long d'un filet, et chaque filet en tire son
 * éclat : il brille dans la bande, il se perd près du creux.
 *
 * Deux humeurs, tirées par la graine. La nuit reste dans la couleur la plus
 * sombre de la palette, presque monochrome. La nacre part de la plus claire,
 * et des voiles irisés, très dilués, longent le bord des lobes comme le reflet
 * changeant d'une coquille.
 *
 * Le fond n'est pas un dégradé : chaque champ est seuillé en paliers serrés,
 * un aplat chacun, dont le bord est interpolé entre deux échantillons d'une
 * même rangée. Le grain casse ce qui reste de marche. Tous les tirages sont
 * faits avant les boucles ; les filets sont suivis pas à pas le long de leur
 * ligne de niveau, à un pas rapporté à `unite`.
 */
function sablier(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const filets = [56, 76, 100][densite]
  /* Les deux noyaux : où ils s'arrêtent, à quelle hauteur ils entrent.
     Jamais tout à fait symétriques. */
  const pointeG = W * (0.14 + 0.1 * rnd())
  const pointeD = W * (0.76 + 0.1 * rnd())
  const hauteurG = H * (0.44 + 0.12 * rnd())
  const hauteurD = H * (0.44 + 0.12 * rnd())
  /* Le noyau n'a pas d'épaisseur : c'est une demi-droite, et les filets les
     plus profonds sont des épingles qui la serrent. La distance est étirée
     en hauteur, un peu plus sur un écran debout : le tunnel y prend la
     hauteur au lieu de laisser des éventails vides en haut et en bas. */
  const debout = 1 + 0.9 * Math.max(0, H / W - 1)
  const etireG = debout * (1 + 0.5 * rnd())
  const etireD = debout * (1 + 0.5 * rnd())
  const NORME = 2.6
  const nuit = rnd() < 0.5
  const cote_lumiere = (rnd() - 0.5) * 0.5
  const bruit = bruiteur(Math.floor(rnd() * 1e9))

  /* La distance à un noyau, dans la norme un peu carrée. Le noyau de gauche
     regarde vers la droite, celui de droite vers la gauche. */
  const distance = (x: number, y: number, pointe: number, hauteur: number, etire: number,
    sens: 1 | -1): number => {
    const dx = Math.max(0, (x - pointe) * sens)
    const dy = Math.abs(y - hauteur) / etire
    return dx === 0 || dy === 0 ? dx + dy : (dx ** NORME + dy ** NORME) ** (1 / NORME)
  }
  const champ = (x: number, y: number): number => {
    const g = distance(x, y, pointeG, hauteurG, etireG, 1)
    const d = distance(x, y, pointeD, hauteurD, etireD, -1)
    return g + d === 0 ? 0.5 : g / (g + d)
  }
  /* L'ombre du creux, sans bord : elle monte à l'approche d'un noyau, et
     les filets qui s'y emboîtent s'y perdent. De 0 loin des lobes à 1 sur un
     noyau. */
  const portee_ombre = unite * 0.24
  const creux = (x: number, y: number): number => {
    const g = distance(x, y, pointeG, hauteurG, etireG, 1) / portee_ombre
    const d = distance(x, y, pointeD, hauteurD, etireD, -1) / portee_ombre
    return Math.exp(-(Math.min(g, d) ** 2))
  }
  /* La lumière d'un filet, de 0 à 1, selon sa place entre les deux lobes. */
  const eclat = (g: number): number => {
    const e = 2 * Math.min(g, 1 - g)
    const cote = 1 + cote_lumiere * (g < 0.5 ? 1 : -1) * Math.min(1, Math.abs(g - 0.5) * 8)
    return Math.max(0, Math.min(1, (0.1 + 0.7 * Math.exp(-(((e - 0.34) / 0.24) ** 2)) + 0.22 * e) * cote))
  }

  /* La palette est d'abord éteinte : un satin n'a pas la couleur franche
     d'un aplat, il a une couleur et son gris. */
  const eteindre = (teinte: string, part: number): string => {
    const canal = (i: number) => Number.parseInt(teinte.slice(1 + i * 2, 3 + i * 2), 16)
    const gris = Math.round((canal(0) + canal(1) + canal(2)) / 3).toString(16).padStart(2, '0')
    return melangeHex(teinte, `#${gris}${gris}${gris}`, part)
  }
  /* La teinte tournée de `degres` autour du cercle chromatique, à
     saturation `saturation`, luminosité gardée. */
  const tourner = (teinte: string, degres: number, saturation: number): string => {
    const [h, , l] = versTsl(teinte)
    return depuisTsl((h + degres) % 360, saturation, l)
  }
  const teintes = duClairAuSombre(C)
  const clair = eteindre(teintes[0], nuit ? 0.3 : 0.55)
  const sombre = eteindre(teintes[teintes.length - 1], 0.35)
  const milieu = eteindre(teintes[1] ?? clair, 0.25)
  const noir = '#000000'
  const etapes = nuit
    ? [
        melangeHex(sombre, noir, 0.78), melangeHex(sombre, noir, 0.6),
        melangeHex(sombre, noir, 0.4), melangeHex(sombre, noir, 0.18), sombre,
        melangeHex(sombre, milieu, 0.14), melangeHex(sombre, clair, 0.26),
      ]
    : (() => {
        const papier = melangeHex(clair, sombre, 0.24)
        return [
          melangeHex(papier, sombre, 0.5), melangeHex(papier, sombre, 0.32),
          melangeHex(papier, sombre, 0.14), papier, melangeHex(papier, clair, 0.45),
          melangeHex(papier, clair, 0.8),
        ]
      })()
  const encre = nuit ? melangeHex(sombre, clair, 0.66) : melangeHex(teintes[0], '#FFFFFF', 0.75)

  /* Les champs du fond, échantillonnés en colonnes larges et en rangées
     fines : le bord d'un palier est interpolé entre deux échantillons d'une
     même rangée, si bien que seule la hauteur de rangée pourrait faire marche. */
  const colonnes = 96
  const cote = W / (colonnes - 1)
  const hauteur = unite / 180
  const rangees = Math.ceil(H / hauteur)
  const lumiere = new Float32Array(colonnes * rangees)
  const REFLETS = 6
  const reflets = Array.from({ length: REFLETS }, () => new Float32Array(colonnes * rangees))
  const tour = rnd() * REFLETS
  for (let r = 0; r < rangees; r += 1) {
    for (let c = 0; c < colonnes; c += 1) {
      const i = r * colonnes + c
      const x = cote * c
      const y = hauteur * (r + 0.5)
      const g = champ(x, y)
      /* La moire du satin, lue le long des filets. */
      const moire = bruit(g * 9 + 3.1, (y / unite) * 0.8 + 7.7) - 0.5
      lumiere[i] = Math.max(0, Math.min(1,
        0.04 + 0.9 * eclat(g) * (1 - 0.92 * creux(x, y)) + 0.06 * moire))

      if (nuit) continue
      /* La nacre : un voile qui longe le bord des lobes et traîne un peu
         partout, et dont la teinte tourne lentement d'un endroit à l'autre.
         Chaque reflet ne prend que sa part du tour. */
      const e = 2 * Math.min(g, 1 - g)
      const voile = (0.8 * Math.exp(-(((e - 0.2) / 0.16) ** 2))
        + 0.3 * bruit(x / unite * 1.1 + 11.3, y / unite * 1.1 + 2.9)) * (1 - 0.7 * creux(x, y))
      const teinte = (tour + e * 7 + (y / unite) * 1.3
        + 2.2 * bruit(x / unite * 0.9 + 21.7, y / unite * 0.9 + 5.3)) % REFLETS
      for (let j = 0; j < REFLETS; j += 1) {
        const ecartTeinte = Math.min(Math.abs(teinte - j), REFLETS - Math.abs(teinte - j))
        reflets[j][i] = voile * Math.max(0, 1 - ecartTeinte / 1.2)
      }
    }
  }

  /* Une nappe : un champ seuillé, un seul chemin, un rectangle par traversée
     de rangée, un peu plus haut que la rangée pour qu'aucun fil de fond ne
     passe entre deux. */
  const nappe = (valeurs: Float32Array, seuil: number): void => {
    ctx.beginPath()
    for (let r = 0; r < rangees; r += 1) {
      const ligne = r * colonnes
      const y0 = r * hauteur - hauteur * 0.1
      const y1 = (r + 1) * hauteur + hauteur * 0.1
      /* Où la rangée franchit le seuil entre deux échantillons. */
      const franchit = (c: number): number => {
        const g = valeurs[ligne + c - 1]
        const d = valeurs[ligne + c]
        return cote * (c - 1 + (seuil - g) / (d - g))
      }
      let debut = valeurs[ligne] > seuil ? 0 : -1
      for (let c = 1; c <= colonnes; c += 1) {
        const plein = c < colonnes && valeurs[ligne + c] > seuil
        if (plein && debut < 0) debut = franchit(c)
        if (!plein && debut >= 0) {
          const fin = c < colonnes ? franchit(c) : W
          ctx.moveTo(debut, y0)
          ctx.lineTo(fin, y0)
          ctx.lineTo(fin, y1)
          ctx.lineTo(debut, y1)
          ctx.closePath()
          debut = -1
        }
      }
    }
    ctx.fill()
  }

  const PALIERS = 64
  ctx.fillStyle = rampe(etapes, 0)
  ctx.fillRect(0, 0, W, H)
  for (let k = 1; k < PALIERS; k += 1) {
    ctx.fillStyle = rampe(etapes, (k + 0.5) / PALIERS)
    nappe(lumiere, k / PALIERS)
  }

  /* Les reflets se posent en voiles fins empilés : chaque palier franchi
     ajoute un peu de la teinte, et le bord du voile se perd dans le papier. */
  if (!nuit) {
    const papier = rampe(etapes, 0.5)
    const VOILES = 10
    ctx.globalAlpha = 0.04
    for (let j = 0; j < REFLETS; j += 1) {
      ctx.fillStyle = tourner(papier, (j * 360) / REFLETS, 0.6)
      for (let k = 1; k <= VOILES; k += 1) nappe(reflets[j], k / (VOILES + 1))
    }
    ctx.globalAlpha = 1
  }

  /* Les filets : chacun est une ligne de niveau de g, suivie pas à pas dans
     les deux sens depuis le col, et ramenée sur son niveau à chaque pas. Ils
     partent régulièrement espacés de la rangée qui joint les deux pointes. */
  const pas = W / filets
  const largeur = pointeD - pointeG
  const yCol = (hauteurG + hauteurD) / 2
  const marge = unite * 0.05
  const segment = unite * 0.004
  const h = unite * 1e-3
  const epaisseurFilet = W * 0.0016
  const suivre = (niveau: number, x0: number, sens: 1 | -1): Point[] => {
    const points: Point[] = []
    let x = x0
    let y = yCol
    for (let garde = 0; garde < 20000; garde += 1) {
      points.push([x, y])
      if (x < -marge || x > W + marge || y < -marge || y > H + marge) break
      /* Un filet qui fait le tour de son noyau sans sortir se referme. */
      if (garde > 40 && Math.hypot(x - x0, y - yCol) < segment * 1.5) break
      const gx = (champ(x + h, y) - champ(x - h, y)) / (2 * h)
      const gy = (champ(x, y + h) - champ(x, y - h)) / (2 * h)
      const n = Math.hypot(gx, gy) || 1
      /* Le long de la ligne : perpendiculaire au gradient, vers le haut ou
         vers le bas selon `sens`. */
      let tx = -gy / n
      let ty = gx / n
      if (ty * sens < 0 || (garde === 0 && ty === 0)) {
        tx = -tx
        ty = -ty
      }
      const precedent = points.length > 1 ? points[points.length - 2] : null
      if (precedent && (x - precedent[0]) * tx + (y - precedent[1]) * ty < 0 && garde > 0) {
        tx = -tx
        ty = -ty
      }
      x += tx * segment
      y += ty * segment
      /* Retour sur le niveau, un pas de Newton. */
      const ecart = champ(x, y) - niveau
      const gx2 = (champ(x + h, y) - champ(x - h, y)) / (2 * h)
      const gy2 = (champ(x, y + h) - champ(x, y - h)) / (2 * h)
      const n2 = gx2 * gx2 + gy2 * gy2
      if (n2 > 0) {
        x -= (ecart * gx2) / n2
        y -= (ecart * gy2) / n2
      }
    }
    return points
  }
  ctx.fillStyle = encre
  for (let k = 0; (k + 0.5) * pas < largeur; k += 1) {
    const x0 = pointeG + (k + 0.5) * pas
    const niveau = champ(x0, yCol)
    const points = [...suivre(niveau, x0, -1).reverse(), ...suivre(niveau, x0, 1).slice(1)]
    ctx.globalAlpha = nuit ? 0.06 + 0.66 * eclat(niveau) : 0.3 + 0.65 * eclat(niveau)
    ruban(ctx, points, epaisseurFilet)
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
