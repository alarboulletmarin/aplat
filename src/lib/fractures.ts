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
 * Une frontière droite se voit, et elle date la surface : trois de ces
 * familles sont minérales parce qu'une médiatrice est minérale. Le lagon et
 * la floraison brisent la même surface avec des frontières courbes, et le
 * geste n'y est pourtant pas un autre : les germes se partagent toujours le
 * plan, mais le plan est gauchi sous eux avant qu'ils ne le mesurent. C'est
 * la seconde moitié du module, et elle est écrite plus bas.
 *
 * Les comptes de germes et de pièces sont fixés par la densité, jamais tirés
 * d'une boucle qui dépend du format : la discipline des lieux, appliquée à la
 * lettre pour que la sonde regarde la même scène que le fichier.
 */
import type { Alea, Densite, Pinceau } from './moteur'
import {
  anneau, bruiteur, capsule, duClairAuSombre, hacher, luminanceHex, melangeHex, polygone,
  type Point,
} from './trace'

export const IDS_FRACTURES = ['kintsugi', 'banquise', 'sashiko', 'lagon', 'floraison'] as const

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

/* ---------- la frontière courbe ---------------------------------------------- */

/**
 * Un germe : où il est, et comment il mesure.
 *
 * `etirement` vaut un pour un germe qui mesure rond, et sa cellule est alors
 * la cellule de Voronoï ordinaire. Au dessus, il mesure court dans la
 * direction `(cos, sin)` et normalement en travers : sa cellule s'allonge dans
 * cette direction, et c'est ce qui fait d'un pétale un doigt plutôt qu'une
 * pastille. La mesure reste une distance, donc les cellules pavent encore le
 * plan exactement, et le retrait s'y prend comme sur tout autre partage.
 */
interface Germe {
  point: Point
  cos: number
  sin: number
  etirement: number
}

/** Un germe qui mesure rond, celui dont le lagon se contente. */
function germeRond(point: Point): Germe {
  return { point, cos: 1, sin: 0, etirement: 1 }
}

/** La distance du point `(x, y)` au germe, dans la mesure de ce germe. */
function mesurer(germe: Germe, x: number, y: number): number {
  const dx = x - germe.point[0]
  const dy = y - germe.point[1]
  const long = (dx * germe.cos + dy * germe.sin) / germe.etirement
  const travers = -dx * germe.sin + dy * germe.cos
  return Math.sqrt(long * long + travers * travers)
}

/**
 * Le gradient de cette distance : de quel côté et à quelle vitesse elle monte.
 * Pour un germe rond, c'est le vecteur unitaire qui part du germe ; l'étirement
 * l'incline vers le travers, puisque la distance y monte plus vite.
 */
function pente(germe: Germe, x: number, y: number): [number, number] {
  const dx = x - germe.point[0]
  const dy = y - germe.point[1]
  const long = (dx * germe.cos + dy * germe.sin) / germe.etirement
  const travers = -dx * germe.sin + dy * germe.cos
  const distance = Math.sqrt(long * long + travers * travers)
  if (!(distance > 0)) return [0, 0]
  const a = long / (germe.etirement * distance)
  const b = travers / distance
  return [a * germe.cos - b * germe.sin, a * germe.sin + b * germe.cos]
}

/**
 * Le partage du plan sous un gauchissement.
 *
 * Le procédé tient en une phrase : les germes ne mesurent pas le point où l'on
 * est, ils mesurent celui où un bruit lisse l'a poussé. La frontière entre deux
 * pièces reste la médiatrice de leurs germes, mais on la regarde à travers une
 * vitre déformante, et elle arrive courbe. C'est ce qui sépare le lagon de la
 * banquise : la même fracture, une frontière que la main aurait pu tracer.
 *
 * Pousser le point plutôt que déplacer les germes est ce qui fait tenir
 * l'ensemble. Deux pièces voisines interrogent le même point, donc le même
 * point poussé : elles voient exactement la même frontière, et le chenal qui
 * les sépare garde sa largeur du début à la fin. Un bruit appliqué au contour
 * de chaque pièce, lui, aurait donné à chacune sa propre idée de la frontière,
 * et le chenal aurait bâillé ici pour se refermer trois centimètres plus loin.
 *
 * `recul` est ce qu'on vient chercher : la distance du point à la frontière la
 * plus proche. Elle ne se lit pas directement, elle se déduit. L'écart des deux
 * distances vaut zéro sur la frontière et croît à mesure qu'on s'en éloigne,
 * mais pas au même rythme partout : entre deux germes voisins il monte de deux
 * unités par unité parcourue, entre deux germes vus sous un angle étroit il ne
 * monte presque plus. Divisé par sa propre pente, il redevient une longueur, et
 * c'est cette longueur que le retrait compare.
 *
 * Sans cette division le motif tient encore, et il faut le dire : ce n'est pas
 * une correction sans laquelle rien ne marche, c'est une correction qui rend au
 * chenal le droit de se mesurer en pixels. Elle se voit surtout sur la
 * floraison, dont les pétales sont taillés entre des germes serrés autour d'un
 * coeur et vus sous un angle qui se referme à mesure qu'on s'éloigne : le
 * chenal y était plus large à la pointe qu'au coeur, l'écartement de ses
 * largeurs passant de deux fois et demie à deux fois tout juste. Sur le lagon,
 * dont les germes sont largement espacés et les frontières vues de face, la
 * division ne change presque rien.
 *
 * Elle est gardée parce qu'elle est ce qui permet d'écrire `chenal / 2` et
 * d'obtenir un demi chenal, quels que soient l'écartement des germes, leur
 * étirement et l'endroit de l'image. Sans elle, la même constante rendrait des
 * largeurs différentes selon la famille, et le réglage d'un chenal se ferait à
 * l'oeil, motif par motif.
 *
 * Aux rencontres à trois, la mesure ne regarde que les deux premières pièces,
 * donc la frontière la plus proche : le chenal ne s'y étrangle pas, il s'y
 * ouvre en patte d'oie, exactement comme le ferait un coup de ciseaux.
 */
interface Partage {
  germes: readonly Germe[]
  /** Le rang du germe le plus proche, et la distance à la frontière. */
  lire(x: number, y: number): { proche: number; recul: number }
}

function partager(
  germes: readonly Germe[], cle: number, longueur: number, ampleur: number,
): Partage {
  const versX = bruiteur(cle)
  const versY = bruiteur(cle + 1)
  return {
    germes,
    lire(x, y) {
      /* Les coordonnées du bruit sont des fractions de `longueur`, elle-même
         une fraction du petit côté : le gauchissement grandit avec l'image au
         lieu de se resserrer, et un motif rendu deux fois plus grand est le
         même motif. */
      const u = x / longueur
      const v = y / longueur
      const px = x + (versX(u, v) - 0.5) * ampleur
      const py = y + (versY(u + 4.5, v + 9.5) - 0.5) * ampleur
      let premier = Infinity
      let second = Infinity
      let proche = 0
      let suivant = 0
      for (let i = 0; i < germes.length; i += 1) {
        const distance = mesurer(germes[i], px, py)
        if (distance < premier) {
          second = premier
          suivant = proche
          premier = distance
          proche = i
        } else if (distance < second) {
          second = distance
          suivant = i
        }
      }
      if (!(second < Infinity)) return { proche, recul: Infinity }
      /* La pente de l'écart, en ce point : la différence des deux gradients.
         Les deux germes retenus sont connus, et leur gradient se recalcule pour
         moins cher qu'il ne se retiendrait dans la boucle. */
      const [ax, ay] = pente(germes[proche], px, py)
      const [bx, by] = pente(germes[suivant], px, py)
      const glissement = Math.hypot(bx - ax, by - ay)
      return { proche, recul: glissement > 0 ? (second - premier) / glissement : Infinity }
    },
  }
}

/**
 * Jusqu'où la pièce `i` va dans une direction donnée, son retrait déduit.
 *
 * La frontière n'a pas d'équation : on la cherche. Le rayon avance par pas
 * réguliers tant qu'il est chez lui, puis se raffine par dichotomie entre le
 * dernier pas dedans et le premier dehors. Douze coupes ramènent l'erreur sous
 * le millième du pas, très en dessous du centième de pixel où le vectoriel
 * écrit ses coordonnées.
 *
 * Le pas et la portée sont tous deux des longueurs de l'image, jamais des
 * comptes de pixels : c'est ce qui fait que la recherche rend le même rayon,
 * au facteur près, quelle que soit la résolution.
 */
function rayonPiece(
  partage: Partage, i: number, retrait: number, portee: number, pas: number,
  cos: number, sin: number, bord?: (x: number, y: number) => number,
): number {
  const g = partage.germes[i].point
  const chezSoi = (r: number): boolean => {
    const x = g[0] + cos * r
    const y = g[1] + sin * r
    if (bord && bord(x, y) <= retrait) return false
    const lu = partage.lire(x, y)
    return lu.proche === i && lu.recul > retrait
  }
  let dedans = 0
  let dehors = portee
  for (let r = pas; r <= portee; r += pas) {
    if (!chezSoi(r)) {
      dehors = r
      break
    }
    dedans = r
  }
  if (dehors >= portee && chezSoi(portee)) return portee
  for (let coupe = 0; coupe < 12; coupe += 1) {
    const milieu = (dedans + dehors) / 2
    if (chezSoi(milieu)) dedans = milieu
    else dehors = milieu
  }
  return dedans
}

/**
 * Le contour d'une pièce, relevé au rayon depuis son germe.
 *
 * Le relevé polaire suppose la pièce étoilée depuis son germe, ce qu'une
 * cellule de Voronoï est par construction et qu'un gauchissement mesuré lui
 * laisse. C'est la raison pour laquelle l'ampleur du bruit reste bien en
 * dessous de la taille d'une pièce : au delà, une frontière peut revenir sur
 * elle-même, le rayon n'en voit que la première rencontre, et la pièce perd le
 * repli sans que rien ne le signale.
 *
 * `bord` est une limite que la pièce ne franchit pas, donnée comme une distance
 * qui décroît vers elle. Elle n'a rien à voir avec le partage, et c'est
 * justement à quoi elle sert : une pièce peut alors s'arrêter avant d'avoir
 * rencontré sa voisine, et laisser voir le fond au lieu de le disputer. Le
 * retrait s'y applique comme sur une frontière ordinaire, si bien que deux
 * pièces arrêtées face à face laissent entre elles un chenal de la même
 * largeur que partout ailleurs.
 *
 * Une soixantaine de sommets suffit, et c'est voulu qu'il n'y en ait pas trois
 * cents : `anneau` fait passer la courbe par le milieu de chaque côté, donc
 * arrondit d'autant plus que les sommets sont espacés. Les angles s'émoussent,
 * les pointes s'adoucissent, et le chenal s'ouvre un peu aux rencontres à
 * trois. C'est le papier découpé, et c'est ce qu'on est venu chercher.
 */
function contourPiece(
  partage: Partage, i: number, retrait: number, portee: number, pas: number,
  sommets: number, bord?: (x: number, y: number) => number,
): Point[] {
  const g = partage.germes[i].point
  const points: Point[] = []
  for (let s = 0; s < sommets; s += 1) {
    const angle = (s / sommets) * Math.PI * 2
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const rayon = rayonPiece(partage, i, retrait, portee, pas, cos, sin, bord)
    points.push([g[0] + cos * rayon, g[1] + sin * rayon])
  }
  return points
}

/**
 * La même teinte, un ton en dessous, ou au dessus si elle est déjà sombre.
 *
 * Les deux images de référence posent deux valeurs d'un même bleu, et rien
 * d'autre : c'est ce qui donne au motif sa profondeur sans lui donner une
 * seconde couleur. Mélanger vers le noir suffit sur une palette claire et ne
 * suffit pas sur « Encre », où la teinte est déjà au bas de l'échelle et où le
 * ton sur ton disparaîtrait dans le fond. La luminance décide donc du sens, et
 * le ton reste lisible sur les onze palettes.
 */
function tonSurTon(teinte: string): string {
  return luminanceHex(teinte) > 0.18
    ? melangeHex(teinte, '#000000', 0.3)
    : melangeHex(teinte, '#FFFFFF', 0.24)
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

/**
 * La teinte qui portera la plus grande part de l'image.
 *
 * Elle se prend au milieu de l'échelle des luminances, jamais à ses deux
 * bouts, et c'est une précaution que ces deux familles sont seules à devoir
 * prendre : elles couvrent l'image d'une teinte unique, là où les autres en
 * mêlent quatre. Le bout clair de « Soleil » est un crème posé sur un fond de
 * sable, le bout sombre d'« Encre » un marine posé sur du bleu nuit ; une
 * famille qui en tire une forme de temps en temps ne risque rien, une famille
 * qui en peint l'image entière rend un fond d'écran vide une fois sur quatre.
 *
 * Les accents, eux, gardent le droit d'aller chercher les deux bouts : c'est
 * même leur emploi, et une fleur crème perdue dans un champ de bleu est
 * exactement ce qu'on veut voir.
 */
function dominanteDe(C: readonly string[], rnd: Alea): string {
  const echelle = duClairAuSombre(C)
  const dedans = Math.max(1, echelle.length - 2)
  return echelle[Math.min(echelle.length - 1, 1 + Math.floor(rnd() * dedans))]
}

/* ---------- lagon ------------------------------------------------------------ */

/**
 * De grandes dalles aux frontières courbes, et le fond qui court entre elles
 * comme l'eau entre des rochers plats.
 *
 * C'est la banquise regardée à travers la vitre déformante : mêmes germes sur
 * une grille secouée, chenal de largeur voisine, et une frontière que plus rien
 * ne rattache à une droite. Deux choses de plus les séparent, et il faut les
 * deux pour que ce ne soit pas la même famille en plus mou. La grille se compte
 * sur le format au lieu d'être fixée par la seule densité, si bien que les
 * dalles restent aussi larges que hautes sur un écran d'ordinateur comme sur
 * un téléphone. Et chaque dalle porte son propre ton en dessous : on lit deux
 * eaux superposées, là où la banquise donne un champ de plaques.
 *
 * Le ton sur ton n'est pas une forme de plus, c'est la dalle elle-même,
 * réduite vers un point décalé de son germe : elle vient donc toucher un bord
 * et se détache franchement de l'opposé, ce qu'aucune forme posée au hasard
 * dans la dalle ne saurait faire. C'est de là que vient l'impression d'une eau
 * claire qui découvre une eau sombre d'un seul côté.
 */
function lagon(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  /* La grille se compte sur le format, et les tirages se lisent dans une clé
     plutôt que dans une suite : une dalle de plus au bas de l'image ne doit
     pas repeindre celle du haut. C'est la discipline du carreau, et elle vaut
     ici pour la même raison, le compte de dalles dépendant de la hauteur. */
  const cle = Math.floor(rnd() * 0x7fffffff)
  const dominante = dominanteDe(C, rnd)
  const accents = C.filter((teinte) => teinte !== dominante)
  const vise = unite / [2.1, 3, 4.2][densite]
  const colonnes = Math.max(1, Math.round(W / vise))
  const rangees = Math.max(1, Math.round(H / vise))
  const largeur = W / colonnes
  const hauteur = H / rangees
  const maille = Math.min(largeur, hauteur)

  const germes: Germe[] = []
  const teintes: string[] = []
  const creux: number[] = []
  for (let gy = 0; gy < rangees; gy += 1) {
    for (let gx = 0; gx < colonnes; gx += 1) {
      const de = (rang: number) => hacher(gx, gy, cle + rang)
      germes.push(germeRond([
        (gx + 0.22 + 0.56 * de(1)) * largeur,
        (gy + 0.22 + 0.56 * de(2)) * hauteur,
      ]))
      /* Une teinte porte les deux tiers des dalles et les autres se partagent
         le reste, comme dans la floraison : deux valeurs d'une même couleur,
         c'est le motif ; quatre couleurs à parts égales, c'est un nuancier. */
      const tirage = de(3)
      teintes.push(tirage < 0.7 || accents.length === 0
        ? dominante
        : accents[Math.floor(de(5) * accents.length) % accents.length])
      creux.push(de(4))
    }
  }

  /* Le grain du gauchissement se mesure sur la dalle, pas sur l'image : une
     longueur d'onde de l'ordre du pas des germes donne une frontière qui ondule
     une fois ou deux par côté, ce qu'une main dessinerait. Plus court, elle
     frise ; plus long, elle redevient droite. L'ampleur reste à la moitié de
     cette longueur : au delà, le gauchissement replie la frontière sur
     elle-même, et le relevé polaire n'en voit que la première rencontre. */
  const partage = partager(germes, cle, maille * 0.68, maille * 0.34)

  const chenal = unite * 0.03
  const portee = maille * 2.4
  const pas = portee / 16

  for (let i = 0; i < germes.length; i += 1) {
    const contour = contourPiece(partage, i, chenal / 2, portee, pas, 56)
    ctx.fillStyle = teintes[i]
    anneau(ctx, contour)
    ctx.fill()

    /* La dalle rongée : le contour de la dalle, réduit vers un point qui n'est
       pas son germe. La réduction est affine, donc elle ne peut pas plisser le
       bord, et c'est la raison du procédé : ramener chaque sommet d'une part
       qui varie avec l'angle donnait des cassures partout où la dalle est
       longue, deux sommets voisins mais de rayons très différents ne bougeant
       pas de la même longueur.

       Le décentrement est ce qui fait tout le reste. Réduite vers son germe, la
       dalle rendait une dalle plus petite au milieu, et le motif se lisait
       comme un cerne. Décalée, la forme vient toucher un bord et se détache
       franchement de l'opposé : on lit deux eaux superposées, l'une découvrant
       l'autre d'un côté. */
    const g = germes[i].point
    const ecart = maille * 0.28
    const vers = creux[i] * Math.PI * 2
    const ancre: Point = [g[0] + Math.cos(vers) * ecart, g[1] + Math.sin(vers) * ecart]
    const part = 0.6
    /* Un sommet sur deux, et pas seulement pour aller plus vite : `anneau`
       arrondit à la mesure des côtés qu'on lui donne, et une forme réduite a
       des côtés réduits. Reprendre les cinquante six sommets rendait une
       dalle rongée aux angles deux fois plus vifs que ceux de la dalle qui la
       porte, ce qui se voit comme un pli. Un sur deux rend au bord intérieur
       la même douceur qu'au bord extérieur. */
    const dessous = contour
      .filter((_, s) => s % 2 === 0)
      .map(([x, y]): Point => [
        ancre[0] + (x - ancre[0]) * part,
        ancre[1] + (y - ancre[1]) * part,
      ])
    ctx.fillStyle = tonSurTon(teintes[i])
    anneau(ctx, dessous)
    ctx.fill()
  }
}

/* ---------- floraison -------------------------------------------------------- */

/**
 * Un champ de grandes fleurs découpées : les pétales se partagent la surface,
 * et ce qu'on prend pour un trait entre eux est le fond qui affleure.
 *
 * Un pétale n'est pas dessiné, c'est la cellule d'un germe. Chaque fleur pose
 * un germe par pétale, à mi chemin de son bord et couché dans l'axe, et le
 * partage fait le reste : un pétale s'arrête là où commence le suivant, celui
 * de sa fleur comme celui de la fleur d'à côté. Deux fleurs voisines
 * s'engrènent donc doigt contre doigt, ce que les images de référence montrent
 * partout et qu'un partage entre centres de fleurs ne sait pas faire. Ce
 * partage là, essayé d'abord, donnait à chaque fleur un territoire à elle
 * qu'elle découpait en quartiers : un agrume tranché, jamais une marguerite.
 *
 * Les germes mesurent long dans l'axe du pétale, ce qui allonge la cellule et
 * fait le doigt plutôt que la pastille ; le gauchissement lui donne ses bords
 * courbes.
 *
 * La rosette est bornée, et c'est ce qui la fait lire comme une fleur. Sans
 * borne, les pétales s'étirent jusqu'à rencontrer la fleur d'en face, les
 * fleurs se touchent toutes, et l'image devient une résille percée de coeurs
 * où plus aucune fleur ne se distingue. Chaque fleur porte donc son rayon, et
 * un pétale s'arrête là même si personne ne l'y attend. Les deux cas
 * cohabitent dans une même image : deux rosettes qui se chevauchent se
 * taillent l'une l'autre, deux rosettes éloignées laissent le fond entre
 * elles, et le chenal a la même largeur dans les deux cas.
 *
 * Le coeur est posé en dernier, par dessus la rencontre des pétales : c'est un
 * papier de plus, et il cache la couture plutôt que de s'y ajuster. Au centre
 * d'une fleur, huit cellules se rejoignent et le chenal y devient une étoile
 * que rien ne referme ; le coeur est ce qui la referme.
 */
function floraison(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  /* La grille se mesure au petit côté et se compte sur le format, comme celle
     d'un carreau : c'est ce qui garde les fleurs rondes. Une grille au compte
     fixé par la seule densité impose son propre rapport de côtés, et sur un
     écran de téléphone les cellules devenaient deux fois plus hautes que
     larges ; les pétales du haut et du bas s'allongeaient d'autant, et la
     rosette qu'on voulait lire se défaisait.

     Le compte dépend donc du format, et aucun tirage n'a le droit d'être fait
     dans la boucle : une image d'une rangée de plus décalerait toute la suite,
     et la première fleur changerait de couleur. Chaque fleur interroge une clé
     par ses propres coordonnées de grille, comme le fait le carreau. */
  const cle = Math.floor(rnd() * 0x7fffffff)
  const echelle = duClairAuSombre(C)
  const dominante = echelle.indexOf(dominanteDe(C, rnd))
  const vise = unite / [1.5, 2.2, 2.7][densite]
  const colonnes = Math.max(1, Math.round(W / vise))
  const rangees = Math.max(1, Math.round(H / vise))
  const largeur = W / colonnes
  const hauteur = H / rangees

  /* La fleur se mesure sur la maille obtenue, jamais sur celle qu'on visait.
     L'arrondi du compte de colonnes peut écarter les deux d'un tiers, et une
     rosette taillée pour la maille visée déborde alors largement sur sa
     voisine : les pétales s'engrènent au point qu'on ne distingue plus une
     fleur, et l'image redevient une résille percée de coeurs. */
  const maille = Math.min(largeur, hauteur)

  /* Les fleurs d'abord, en entier : chacune sait son centre, ses pétales et sa
     teinte avant qu'un seul germe ne soit posé. Les germes viennent ensuite,
     tous ensemble, parce qu'un pétale ne se découpe pas contre les pétales de
     sa fleur seulement, mais contre ceux de la fleur d'à côté. */
  const fleurs = []
  for (let gy = 0; gy < rangees; gy += 1) {
    for (let gx = 0; gx < colonnes; gx += 1) {
      const de = (rang: number) => hacher(gx, gy, cle + rang)
      fleurs.push({
        centre: [
          (gx + 0.34 + 0.32 * de(1)) * largeur,
          (gy + 0.34 + 0.32 * de(2)) * hauteur,
        ] as Point,
        petales: 6 + Math.floor(de(3) * 3),
        depart: de(4) * Math.PI * 2,
        /* Une teinte domine, les autres ne font que passer. C'est ce qui
           distingue un champ de fleurs d'un catalogue de fleurs : les images de
           référence n'en portent qu'une, et quatre teintes réparties également
           donnaient une page d'échantillons où plus rien ne se lisait comme un
           pré. */
        rang: de(5) < 0.74 ? dominante : Math.floor(de(6) * echelle.length),
        coeur: maille * (0.11 + 0.035 * de(7)),
        aplati: 0.58 + 0.24 * de(8),
        penchant: de(9) * Math.PI,
        rayon: maille * (0.56 + 0.14 * de(10)),
      })
    }
  }

  /* Un germe par pétale, et le rayon de sa fleur avec lui : les germes de
     toutes les fleurs entrent dans un seul partage, sans quoi elles ne
     s'engrèneraient pas. */
  const germes: Germe[] = []
  const rangs: number[] = []
  const bords: ((x: number, y: number) => number)[] = []
  for (const fleur of fleurs) {
    const { centre, rayon } = fleur
    const bord = (x: number, y: number) => rayon - Math.hypot(x - centre[0], y - centre[1])
    for (let j = 0; j < fleur.petales; j += 1) {
      const angle = fleur.depart + (j / fleur.petales) * Math.PI * 2
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const distance = maille * 0.33
      germes.push({
        point: [fleur.centre[0] + cos * distance, fleur.centre[1] + sin * distance],
        cos,
        sin,
        etirement: 1.3,
      })
      rangs.push(fleur.rang)
      bords.push(bord)
    }
  }

  const partage = partager(germes, cle, maille * 0.5, maille * 0.26)
  const chenal = unite * 0.018

  /* La portée n'est pas la diagonale, et c'est ici qu'elle se gagne.
     Les coeurs couvrent l'image sur une grille de pas `maille`, et le plus
     mal loti d'entre eux est à un pas et demi du coin qu'il a charge de
     couvrir : aucun pétale n'a jamais à s'allonger au delà, même au bord du
     cadre où plus rien ne le taille. Chercher jusqu'à la diagonale revenait à
     parcourir dix fois cette distance sur chaque rayon de chaque pétale, pour
     un motif identique, et faisait de cette famille la plus lente du
     catalogue. */
  const portee = maille * 1.5
  const pas = portee / 16

  for (let i = 0; i < germes.length; i += 1) {
    ctx.fillStyle = echelle[rangs[i]]
    anneau(ctx, contourPiece(partage, i, chenal / 2, portee, pas, 38, bords[i]))
    ctx.fill()
  }

  /* Les coeurs par dessus, une fois tous les pétales posés.
     Ils sont posés en dernier pour la même raison qu'ils sont posés tout court :
     au centre d'une fleur, huit cellules se rejoignent, et le chenal y devient
     une étoile que rien ne referme. Le coeur est le papier qu'on colle par
     dessus cette couture, et un ovale plutôt qu'un rond, comme sur les deux
     images de référence. */
  for (const fleur of fleurs) {
    /* Le coeur prend son accent au milieu de l'échelle, pour la raison qui
       vaut déjà pour la dominante et une raison de plus. Le bout clair de
       l'échelle est presque toujours la teinte la plus proche du fond, donc du
       chenal : un coeur clair posé au point où huit chenaux se rejoignent ne se
       lit plus comme un coeur, il agrandit l'étoile. Les deux images de
       référence le disent d'ailleurs sans détour, leurs coeurs sont un jaune et
       un orange, jamais un blanc. */
    const accents = echelle.slice(1, -1).filter((teinte) => teinte !== echelle[fleur.rang])
    ctx.fillStyle = accents.length > 0
      ? accents[fleur.rang % accents.length]
      : echelle[echelle.length - 1]
    ctx.beginPath()
    ctx.ellipse(fleur.centre[0], fleur.centre[1], fleur.coeur, fleur.coeur * fleur.aplati,
      fleur.penchant, 0, Math.PI * 2)
    ctx.fill()
  }
}

/* ---------- aiguillage ------------------------------------------------------- */

export function peindreFracture(
  ctx: Pinceau, W: number, H: number, id: IdFracture,
  C: readonly string[], densite: Densite, rnd: Alea, unite: number,
): void {
  if (id === 'kintsugi') kintsugi(ctx, W, H, C, densite, rnd, unite)
  else if (id === 'banquise') banquise(ctx, W, H, C, densite, rnd, unite)
  else if (id === 'lagon') lagon(ctx, W, H, C, densite, rnd, unite)
  else if (id === 'floraison') floraison(ctx, W, H, C, densite, rnd, unite)
  else sashiko(ctx, W, H, C, densite, rnd, unite)
}
