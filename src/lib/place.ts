// SPDX-License-Identifier: AGPL-3.0-only

/**
 * La place de l'heure : ce que l'écran de verrouillage demande au motif.
 *
 * Sur un écran de verrouillage, l'heure occupe le tiers haut. iOS y pose une
 * ligne de date, des chiffres qui prennent la largeur, puis une rangée de
 * widgets ; Android une horloge sur deux lignes, plus grande encore. Les fonds
 * d'écran qui marchent sur les deux ont la même construction : le sujet vit
 * dans les deux tiers bas, et le tiers haut est un espace calme qui appartient
 * à l'image. Un ciel, le fond nu. C'est un vide de composition, pas un élément
 * ajouté.
 *
 * Quatre essais ont précédé celui-ci, et il faut les nommer pour ne pas y
 * revenir. Recouvrir le haut d'un aplat de fond : une rature, on lit deux
 * morceaux empilés. Arrêter le motif sur une lisière propre à chaque geste :
 * mieux dessiné, mais une coupure encore. Poser une grande forme du motif là où
 * tombent les chiffres : le bandeau qu'on croyait éviter, un pavé d'une teinte
 * tirée au sort collé sur l'image. Teinter vers le fond les formes proches du
 * haut : un dégradé, et ce produit n'en peint pas.
 *
 * Ici le tiers haut est laissé libre, et le motif s'y arrête de la seule façon
 * qui lui appartienne : par ses propres formes, entières.
 *
 * Le cadre, d'abord : le motif compose pour la surface qui commence sous
 * l'heure, comme il aurait composé pour le cadre entier. Aucune famille ne
 * connaît sa taille, chacune remplit ce qu'on lui donne. Les vagues posent
 * leur première houle sous la place de l'heure et le fond devient leur ciel,
 * sans couture ; un pavage y range des rangées entières.
 *
 * L'élagage, ensuite. Aucune forme n'est teintée ni coupée en deux : une forme
 * est là ou n'est pas là. Une forme dont le haut passerait au-dessus de la
 * ligne du cadre n'est pas peinte, et celles qui restent sont peintes telles
 * quelles. Le bord du motif est donc fait des formes elles-mêmes, des cases
 * entières, des fleurs entières, des plaques entières, et il suit la géométrie
 * de chaque geste sans qu'on ait rien à lui dessiner.
 *
 * Deux exceptions, et elles se justifient. Une forme haute, une rayure, un
 * anneau, un ruban, ne peut pas être retirée sans trouer le motif : elle est
 * coupée à la ligne, et c'est le seul trait droit que la place de l'heure
 * s'autorise, celui d'un horizon. Et la base d'une famille, cet aplat qui
 * couvre tout son cadre, est le sol sur lequel ses formes se lisent : elle
 * monte jusqu'au bord haut, et l'heure se pose sur elle.
 *
 * Tout cela se fait sans que les familles en sachent rien : le pinceau qu'on
 * leur tend est enveloppé, et c'est l'enveloppe qui élague.
 */
import type { Ecran, Pinceau } from './moteur'
import type { Point } from './trace'

/**
 * La bande où tombent les chiffres, en parts de la hauteur.
 *
 * iOS pose une ligne de date au-dessus de l'heure et une rangée de widgets
 * dessous ; Android une horloge sur deux lignes qui descend plus bas encore.
 * `HAUT` part juste sous la barre d'état, `BAS` passe sous les widgets. La
 * sonde mesure entre ces deux bornes.
 */
export const HAUT = 0.075
export const BAS = 0.315

/**
 * Où commence le cadre laissé au motif, en part de la hauteur : la ligne
 * au-dessus de laquelle rien n'est peint. Un cheveu sous `BAS`, pour que les
 * widgets d'iOS ne touchent pas la première rangée du motif.
 */
export const CADRE = 0.33

/**
 * À partir de quelle hauteur, en part de l'image, une forme est dite haute et
 * se coupe au lieu de disparaître. Un quart : au-delà, la retirer laisserait
 * un trou plus grand que la place de l'heure elle-même.
 */
export const HAUTE = 0.25

/**
 * Le cadre laissé au motif : l'image entière sur un accueil, ce qui commence
 * sous la place de l'heure sur un verrouillage.
 *
 * Des parts exactes de `H`, jamais des pixels arrondis : une image rendue deux
 * fois plus grande donne un cadre deux fois plus grand, au bit près, et la
 * vignette montre donc le fichier.
 */
export function cadreDuMotif(H: number, ecran: Ecran): { haut: number; hauteur: number } {
  const haut = ecran === 'verrou' ? H * CADRE : 0
  return { haut, hauteur: H - haut }
}

/* ---------- le pinceau qui élague -------------------------------------------- */

type Matrice = readonly [number, number, number, number, number, number]

const IDENTITE: Matrice = [1, 0, 0, 1, 0, 0]

/** `m` puis `n`, dans l'ordre du contexte 2D : la nouvelle vient à droite. */
function multiplier(m: Matrice, n: Matrice): Matrice {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ]
}

function appliquer(m: Matrice, x: number, y: number): Point {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
}

/**
 * Ce qu'un polygone garde sous une horizontale : la coupe de Sutherland et
 * Hodgman, pour le seul demi-plan dont la place de l'heure ait besoin.
 */
function couper(points: readonly Point[], y: number): Point[] {
  const sortie: Point[] = []
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i]
    const q = points[(i + 1) % points.length]
    const pIn = p[1] >= y
    const qIn = q[1] >= y
    if (pIn) sortie.push(p)
    if (pIn !== qIn) {
      const t = (y - p[1]) / (q[1] - p[1])
      sortie.push([p[0] + (q[0] - p[0]) * t, y])
    }
  }
  return sortie
}

/**
 * Un pinceau posé sur un autre, qui ne laisse passer que les formes qui
 * tiennent sous la ligne.
 *
 * Il suit la transformation courante lui-même, plutôt que de la demander au
 * pinceau du dessous : le canevas sait la donner, le Notaire du SVG la garde
 * pour lui, et le contrat `Pinceau` n'a pas à grandir pour ça. Le suivi est
 * celui du Notaire, à l'identique.
 *
 * De chaque chemin il retient les points, déjà transformés, et le plus haut et
 * le plus bas d'entre eux. Le haut décide : sous la ligne, la forme passe telle
 * quelle, le pinceau du dessous ayant déjà reçu son tracé ; au-dessus, elle ne
 * passe pas. Une forme haute qui traverse la ligne est la seule qu'on coupe,
 * et pour que la règle puisse couper, les arcs et les courbes sont aplatis en
 * segments au passage, pour la coupe seulement : ce qui passe entier reste la
 * courbe que la famille a tracée.
 *
 * La base d'une famille, ce rectangle qui couvre tout son cadre d'un seul
 * aplat, est reconnue au passage et montée jusqu'au bord haut de l'image.
 */
class Elagueur implements Pinceau {
  private ctm: Matrice = IDENTITE
  private pile: Matrice[] = []
  private yMin = Infinity
  private yMax = -Infinity
  /** Les sous-chemins du chemin courant, en coordonnées d'image. */
  private contours: Point[][] = []
  roundRect?: (x: number, y: number, largeur: number, hauteur: number, rayon: number) => void
  private readonly ctx: Pinceau
  private readonly W: number
  private readonly H: number

  constructor(ctx: Pinceau, W: number, H: number) {
    this.ctx = ctx
    this.W = W
    this.H = H
    const dessous = ctx.roundRect?.bind(ctx)
    if (dessous) {
      /* Le rectangle arrondi ouvre son propre sous-chemin, comme sur le canevas,
         et ses quatre coins sont aplatis comme des arcs. */
      this.roundRect = (x, y, largeur, hauteur, rayon) => {
        const r = Math.max(0, Math.min(rayon, largeur / 2, hauteur / 2))
        this.contours.push([])
        this.arcAplati(x + largeur - r, y + r, r, r, 0, -Math.PI / 2, 0)
        this.arcAplati(x + largeur - r, y + hauteur - r, r, r, 0, 0, Math.PI / 2)
        this.arcAplati(x + r, y + hauteur - r, r, r, 0, Math.PI / 2, Math.PI)
        this.arcAplati(x + r, y + r, r, r, 0, Math.PI, Math.PI * 1.5)
        dessous(x, y, largeur, hauteur, rayon)
      }
    }
  }

  get fillStyle(): string | CanvasGradient | CanvasPattern {
    return this.ctx.fillStyle
  }

  set fillStyle(valeur: string | CanvasGradient | CanvasPattern) {
    this.ctx.fillStyle = valeur
  }

  get globalAlpha(): number {
    return this.ctx.globalAlpha
  }

  set globalAlpha(valeur: number) {
    this.ctx.globalAlpha = valeur
  }

  get globalCompositeOperation(): GlobalCompositeOperation {
    return this.ctx.globalCompositeOperation
  }

  set globalCompositeOperation(valeur: GlobalCompositeOperation) {
    this.ctx.globalCompositeOperation = valeur
  }

  save(): void {
    this.pile.push(this.ctm)
    this.ctx.save()
  }

  restore(): void {
    const precedente = this.pile.pop()
    if (precedente) this.ctm = precedente
    this.ctx.restore()
  }

  translate(x: number, y: number): void {
    this.ctm = multiplier(this.ctm, [1, 0, 0, 1, x, y])
    this.ctx.translate(x, y)
  }

  rotate(angle: number): void {
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    this.ctm = multiplier(this.ctm, [c, s, -s, c, 0, 0])
    this.ctx.rotate(angle)
  }

  scale(x: number, y: number): void {
    this.ctm = multiplier(this.ctm, [x, 0, 0, y, 0, 0])
    this.ctx.scale(x, y)
  }

  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.ctm = [a, b, c, d, e, f]
    this.ctx.setTransform(a, b, c, d, e, f)
  }

  beginPath(): void {
    this.yMin = Infinity
    this.yMax = -Infinity
    this.contours = []
    this.ctx.beginPath()
  }

  closePath(): void {
    this.ctx.closePath()
  }

  moveTo(x: number, y: number): void {
    this.contours.push([])
    this.poser(appliquer(this.ctm, x, y))
    this.ctx.moveTo(x, y)
  }

  lineTo(x: number, y: number): void {
    this.poser(appliquer(this.ctm, x, y))
    this.ctx.lineTo(x, y)
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    /* La courbe est aplatie en douze segments pour la coupe, dans l'image
       directement : une transformation affine commute avec la courbe. */
    const courant = this.contours[this.contours.length - 1]
    const p0 = courant?.[courant.length - 1] ?? appliquer(this.ctm, cpx, cpy)
    const c = appliquer(this.ctm, cpx, cpy)
    const p1 = appliquer(this.ctm, x, y)
    for (let i = 1; i <= 12; i += 1) {
      const t = i / 12
      const u = 1 - t
      this.poser([
        u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0],
        u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1],
      ])
    }
    this.ctx.quadraticCurveTo(cpx, cpy, x, y)
  }

  arc(
    x: number, y: number, rayon: number,
    depart: number, fin: number, antihoraire?: boolean,
  ): void {
    this.arcAplati(x, y, rayon, rayon, 0, depart, fin, antihoraire)
    this.ctx.arc(x, y, rayon, depart, fin, antihoraire)
  }

  arcTo(x1: number, y1: number, x2: number, y2: number, rayon: number): void {
    /* L'arc tangent est le seul tracé qu'on n'aplatit pas : personne ne fait
       une forme haute avec lui, et ses deux points suffisent à savoir où il
       tombe. */
    this.poser(appliquer(this.ctm, x1, y1))
    this.poser(appliquer(this.ctm, x2, y2))
    this.ctx.arcTo(x1, y1, x2, y2, rayon)
  }

  ellipse(
    x: number, y: number, rx: number, ry: number, rotation: number,
    depart: number, fin: number, antihoraire?: boolean,
  ): void {
    this.arcAplati(x, y, rx, ry, rotation, depart, fin, antihoraire)
    this.ctx.ellipse(x, y, rx, ry, rotation, depart, fin, antihoraire)
  }

  fill(regle?: CanvasFillRule): void {
    const sort = this.sort()
    if (sort === 'entiere') this.ctx.fill(regle)
    else if (sort === 'coupee') this.peindreCoupe(this.contours, regle)
  }

  fillRect(x: number, y: number, largeur: number, hauteur: number): void {
    const coins: Point[] = [
      appliquer(this.ctm, x, y),
      appliquer(this.ctm, x + largeur, y),
      appliquer(this.ctm, x + largeur, y + hauteur),
      appliquer(this.ctm, x, y + hauteur),
    ]
    const xs = coins.map((p) => p[0])
    const ys = coins.map((p) => p[1])
    const gauche = Math.min(...xs)
    const droite = Math.max(...xs)
    this.yMin = Math.min(...ys)
    this.yMax = Math.max(...ys)

    /* La base d'une famille : un aplat droit qui couvre tout son cadre, du
       haut de la place de l'heure au bas de l'image et d'un bord à l'autre. On
       la reconnaît à cela seul, et c'est suffisant : rien d'autre dans le
       catalogue ne couvre autant d'un seul rectangle. Elle monte jusqu'au bord
       haut, en coordonnées d'image. */
    const aligne = this.ctm[1] === 0 && this.ctm[2] === 0
    const couvreTout = gauche <= 0.5 && droite >= this.W - 0.5
      && this.yMin <= this.H * CADRE + 0.5 && this.yMax >= this.H - 0.5
    if (aligne && couvreTout) {
      this.ctx.save()
      this.ctx.setTransform(1, 0, 0, 1, 0, 0)
      this.ctx.fillRect(gauche, 0, droite - gauche, this.yMax)
      this.ctx.restore()
      return
    }

    const sort = this.sort()
    if (sort === 'entiere') this.ctx.fillRect(x, y, largeur, hauteur)
    else if (sort === 'coupee') this.peindreCoupe([coins])
  }

  /**
   * Ce qu'il advient de la forme courante : entière si son haut tient sous la
   * ligne, coupée si elle est haute, absente sinon. Le demi-pixel de tolérance
   * est pour la première rangée du cadre, dont le haut est la ligne même.
   */
  private sort(): 'entiere' | 'coupee' | 'absente' {
    const ligne = this.H * CADRE
    if (!(this.yMax > this.yMin)) return 'absente'
    if (this.yMin >= ligne - 0.5) return 'entiere'
    if (this.yMax - this.yMin >= this.H * HAUTE) return 'coupee'
    return 'absente'
  }

  /**
   * La forme coupée à la ligne, peinte en coordonnées d'image. Les sous-chemins
   * sont peints d'un seul trait, avec la règle demandée : un anneau coupé garde
   * son trou.
   */
  private peindreCoupe(contours: readonly (readonly Point[])[], regle?: CanvasFillRule): void {
    const morceaux = contours
      .map((c) => couper(c, this.H * CADRE))
      .filter((c) => c.length >= 3)
    if (morceaux.length === 0) return
    this.ctx.save()
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.beginPath()
    for (const morceau of morceaux) {
      this.ctx.moveTo(morceau[0][0], morceau[0][1])
      for (let i = 1; i < morceau.length; i += 1) this.ctx.lineTo(morceau[i][0], morceau[i][1])
      this.ctx.closePath()
    }
    this.ctx.fill(regle)
    this.ctx.restore()
  }

  /**
   * L'arc en segments, avec les règles du canevas : le sens est celui demandé,
   * jamais plus d'un tour, et le premier point se joint au tracé en cours. Le
   * nombre de segments suit le rayon dans l'image, un tous les quatre pixels
   * environ, huit au moins : un anneau coupé n'a pas à montrer ses facettes.
   */
  private arcAplati(
    x: number, y: number, rx: number, ry: number, rotation: number,
    depart: number, fin: number, antihoraire?: boolean,
  ): void {
    let balayage = fin - depart
    if (antihoraire && balayage > 0) balayage -= Math.PI * 2
    if (!antihoraire && balayage < 0) balayage += Math.PI * 2
    balayage = Math.max(-Math.PI * 2, Math.min(Math.PI * 2, balayage))
    const echelle = Math.hypot(this.ctm[0], this.ctm[1])
    const n = Math.max(8, Math.ceil((Math.abs(balayage) * Math.max(rx, ry) * echelle) / 4))
    const cr = Math.cos(rotation)
    const sr = Math.sin(rotation)
    for (let i = 0; i <= n; i += 1) {
      const a = depart + (balayage * i) / n
      const ex = rx * Math.cos(a)
      const ey = ry * Math.sin(a)
      this.poser(appliquer(this.ctm, x + ex * cr - ey * sr, y + ex * sr + ey * cr))
    }
  }

  /** Un point d'image ajouté au tracé en cours, qu'il faut ouvrir s'il n'existe pas. */
  private poser(p: Point): void {
    if (p[1] < this.yMin) this.yMin = p[1]
    if (p[1] > this.yMax) this.yMax = p[1]
    if (this.contours.length === 0) this.contours.push([p])
    else this.contours[this.contours.length - 1].push(p)
  }
}

/**
 * Le pinceau à tendre au motif sur un écran de verrouillage : celui du dessous,
 * enveloppé pour que rien ne monte dans la place de l'heure.
 */
export function elaguer(ctx: Pinceau, W: number, H: number): Pinceau {
  return new Elagueur(ctx, W, H)
}
