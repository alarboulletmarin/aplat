// SPDX-License-Identifier: AGPL-3.0-only

/**
 * La presse : ce qui arrive à l'image entre le dessin et le papier.
 *
 * Le moteur trace des aplats parfaits, et c'est ce qu'on lui demande. Une
 * presse, elle, n'est pas parfaite : l'encre ne couvre pas tout à fait, le
 * papier a un grain, et deux couches ne tombent jamais exactement l'une sur
 * l'autre. Ces trois accidents sont ce qui distingue une affiche sérigraphiée
 * d'un aplat vectoriel, et ce module les rejoue, quand on les demande.
 *
 * Quatre choix tiennent le reste.
 *
 * *Le grain se mesure sur le motif, pas sur l'appareil.* Le grain de papier du
 * tirage net est d'un pixel d'appareil, et c'est le bon choix pour lui : il ne
 * sert qu'à casser les marches du voile, et il doit rester invisible. Celui du
 * tirage tramé doit se voir : il se compte donc en parts du petit côté, comme
 * toutes les tailles du moteur. C'est ce qui fait que l'aperçu montre la
 * texture du fichier, et non une texture quatre fois plus fine que la sienne.
 *
 * *L'encre manque, elle ne s'ajoute pas.* Le mouchetis est de la couleur du
 * fond : c'est le papier qui reparaît sous une encre qui n'a pas couvert.
 * Moucheter de blanc aurait éclairci les palettes sombres et moucheter de noir
 * aurait terni les claires ; le fond, lui, est vrai pour les onze palettes
 * livrées comme pour celles qu'on compose, et il ne change rien là où il n'y a
 * pas d'encre à trouer.
 *
 * *Le hors repère est de la géométrie, pas une ombre portée.* Il ne floute
 * rien et ne dégrade rien : il imprime la couche des formes une seconde fois,
 * décalée, dans une encre de la palette. Il se dit donc en vectoriel comme sur
 * le canevas, et la sonde de lisibilité peut le mesurer, ce qu'une texture ne
 * demande pas.
 *
 * *Le décalage passe par le pinceau, jamais par le contexte.* Poser un
 * `translate` avant de peindre aurait marché sur l'accueil et pas sur le
 * verrouillage, dont l'élagueur repeint en coordonnées d'image après avoir
 * remis la transformation à l'identité : le décalage se serait perdu en
 * silence, sur un seul des deux écrans. Le pinceau décalé, lui, tient devant
 * les deux, et devant le notaire du SVG par surcroît.
 *
 * Le choix de l'encre de dessous n'est pas ici : c'est une question de palette,
 * il vit dans le moteur, avec la luminance qui le décide.
 */
import type { Pinceau } from './moteur'

/**
 * Les trois tirages.
 *
 * `net` est ce que le produit a toujours livré, et c'est lui que désigne une
 * adresse qui ne dit rien : un lien écrit avant ce réglage ouvre exactement le
 * fichier qu'il ouvrait. `trame` mouchette l'encre et pose le grain de papier. `decale`
 * ajoute la seconde couche hors repère, et il contient le tramé : on ne
 * déplace pas une couche sur une presse qui imprimerait parfaitement.
 */
export const TIRAGES = ['net', 'trame', 'decale'] as const

export type Tirage = (typeof TIRAGES)[number]

export function estTirage(valeur: unknown): valeur is Tirage {
  return TIRAGES.includes(valeur as Tirage)
}

/* ---------- les mesures du tirage -------------------------------------------- */

/**
 * Le côté d'une cellule de bruit, en parts du petit côté.
 *
 * Un trois-centième : quatre pixels sur un téléphone de 1179 de large. Le
 * nombre a été choisi en regardant, et la valeur d'avant disait pourquoi. À un
 * cinq-centième, la texture est là dans le fichier et disparaît dès que
 * l'image est réduite de moitié, ce qui en fait une texture qu'on ne peut ni
 * montrer dans un README ni juger dans une vignette. Plus gros, l'aplat
 * devient un damier et le motif passe derrière lui.
 */
const CELLULE = 1 / 320

/** Le côté de la tuile de bruit, en cellules. */
const CELLULES = 160

/**
 * La part moyenne des cellules où l'encre manque.
 *
 * Un dixième : regardé sur les onze palettes, c'est la valeur où la texture se
 * lit sans que l'aplat cesse d'être un aplat. Au double, les familles qui
 * couvrent toute la page se mettent à grésiller et les petites figures perdent
 * leur bord.
 */
export const MOUCHETIS = 0.1

/**
 * L'amplitude du grain de papier du tirage tramé, sur 255.
 *
 * Quatorze, contre trois pour le grain du tirage net. Le premier doit se voir,
 * le second doit rester invisible et ne casser que les marches du voile : ce
 * sont deux emplois, et donc deux nombres.
 */
const ALPHA_GRAIN = 14

/**
 * Le décalage du hors repère, en parts du petit côté.
 *
 * Vers le bas et vers la gauche, comme une feuille qui a glissé sous la
 * raclette. Vers la droite et vers le bas, l'oeil y aurait lu une ombre
 * portée, que le parti visuel du projet refuse ; vers la gauche, il y lit un
 * défaut d'impression, ce qui est exactement ce que c'est. Environ un centième
 * du petit côté : treize pixels vers le bas et neuf vers la gauche sur un
 * téléphone de 1179, assez pour se voir, assez peu pour que les formes
 * voisines se touchent encore.
 */
const DECALAGE_X = -0.008
const DECALAGE_Y = 0.011

/** Le côté d'une cellule, en pixels du fichier, jamais moins d'un. */
export function celluleDuTirage(unite: number): number {
  return Math.max(1, Math.round(unite * CELLULE))
}

/** De combien la seconde couche tombe à côté, en pixels du fichier. */
export function decalageDuTirage(unite: number): { x: number; y: number } {
  return { x: unite * DECALAGE_X, y: unite * DECALAGE_Y }
}

/* ---------- le bruit ---------------------------------------------------------- */

/**
 * La valeur de la cellule, entre 0 et 1, toujours la même.
 *
 * Une empreinte de position et non une suite tirée au sort : le grain est un
 * champ, on veut pouvoir demander une cellule sans avoir parcouru les
 * précédentes, et deux tuiles de tailles différentes doivent tomber sur le
 * même bruit. `alea` du moteur répond à l'autre besoin, celui du dessin, où
 * l'ordre des tirages est justement ce qui fait la forme.
 *
 * Le grain ne dépend pas de la graine du motif, et c'est voulu : c'est le
 * papier, pas le dessin. Deux motifs tirés sur la même presse sortent sur le
 * même papier.
 */
function bruit(x: number, y: number, sel: number): number {
  let h = Math.imul(x + 0x9e3779b9, 0x85ebca6b)
  h = Math.imul(h ^ (y + 0x165667b1), 0xc2b2ae35)
  h = Math.imul(h ^ sel, 0x27d4eb2f)
  h ^= h >>> 15
  return (h >>> 0) / 4294967296
}

/**
 * La part d'encre manquante à cet endroit-ci.
 *
 * Une seconde octave, huit fois plus large, module la première. Sans elle, le
 * mouchetis tombait à densité rigoureusement constante sur toute la page, et
 * cela ne ressemblait pas à de l'encre : une encre manque par plaques, elle
 * tient mieux ici et moins bien là. Le facteur va de 0,4 à 1,6, la moyenne
 * reste `MOUCHETIS`, et c'est ce qui permet à la sonde de continuer à corriger
 * sa luminance d'un seul nombre.
 */
function seuilDuMouchetis(x: number, y: number): number {
  return MOUCHETIS * (0.4 + 1.2 * bruit(x >> 3, y >> 3, 0x706c6171))
}

/** Les trois canaux d'une couleur `#rrggbb`, ou du noir si elle est illisible. */
function canaux(hex: string): [number, number, number] {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return [0, 0, 0]
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ]
}

/**
 * Une tuile de bruit, agrandie à la taille de cellule demandée.
 *
 * Elle est construite à une cellule par pixel, puis agrandie sans lissage :
 * le bruit reste le même quelle que soit la résolution du fichier, et seule sa
 * taille apparente change. Deux tuiles seulement vivent à la fois, une par
 * emploi, et chacune se refait quand la cellule ou la couleur change : c'est
 * assez pour l'aperçu, les vignettes et l'export, qui ne se croisent jamais
 * sur des tailles différentes plus de deux fois de suite.
 */
function tuile(
  cote: number, peindre: (donnees: Uint8ClampedArray, i: number, x: number, y: number) => void,
): HTMLCanvasElement | null {
  const petite = document.createElement('canvas')
  petite.width = CELLULES
  petite.height = CELLULES
  const pctx = petite.getContext('2d')
  if (!pctx) return null
  const image = pctx.createImageData(CELLULES, CELLULES)
  for (let y = 0; y < CELLULES; y += 1) {
    for (let x = 0; x < CELLULES; x += 1) {
      peindre(image.data, (y * CELLULES + x) * 4, x, y)
    }
  }
  pctx.putImageData(image, 0, 0)
  if (cote === 1) return petite

  const grande = document.createElement('canvas')
  grande.width = CELLULES * cote
  grande.height = CELLULES * cote
  const gctx = grande.getContext('2d')
  if (!gctx) return null
  gctx.imageSmoothingEnabled = false
  gctx.drawImage(petite, 0, 0, grande.width, grande.height)
  return grande
}

let mouchetis: { cle: string; toile: HTMLCanvasElement } | null = null

function tuileDeMouchetis(cote: number, couleur: string): HTMLCanvasElement | null {
  const cle = `${cote}|${couleur}`
  if (mouchetis?.cle === cle) return mouchetis.toile
  const [r, v, b] = canaux(couleur)
  const toile = tuile(cote, (d, i, x, y) => {
    if (bruit(x, y, 0x61706c74) >= seuilDuMouchetis(x, y)) return
    d[i] = r
    d[i + 1] = v
    d[i + 2] = b
    d[i + 3] = 255
  })
  if (toile) mouchetis = { cle, toile }
  return toile
}

let papier: { cote: number; toile: HTMLCanvasElement } | null = null

function tuileDePapier(cote: number): HTMLCanvasElement | null {
  if (papier?.cote === cote) return papier.toile
  const toile = tuile(cote, (d, i, x, y) => {
    const tirage = bruit(x, y, 0x70617069)
    if (tirage < 1 / 3) {
      d[i] = 255
      d[i + 1] = 255
      d[i + 2] = 255
      d[i + 3] = ALPHA_GRAIN
    } else if (tirage < 2 / 3) {
      d[i + 3] = ALPHA_GRAIN
    }
  })
  if (toile) papier = { cote, toile }
  return toile
}

/* ---------- les couches de la presse ------------------------------------------ */

type Ctx = CanvasRenderingContext2D

function etaler(ctx: Ctx, W: number, H: number, toile: HTMLCanvasElement | null): void {
  if (!toile) return
  const motif = ctx.createPattern(toile, 'repeat')
  if (!motif) return
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = motif
  ctx.fillRect(0, 0, W, H)
  ctx.restore()
}

/**
 * Le papier qui reparaît sous l'encre.
 *
 * Il se pose juste après les formes, et surtout avant l'ombre et le voile : les
 * deux assombrissent l'image entière, et le mouchetis doit être assombri avec
 * elle. Posé après, il aurait rendu au fond sa clarté d'avant le voile, une
 * cellule sur dix, en pleine bande de lisibilité.
 */
export function peindreMouchetis(
  ctx: Ctx, W: number, H: number, fond: string, unite: number,
): void {
  etaler(ctx, W, H, tuileDeMouchetis(celluleDuTirage(unite), fond))
}

/** Le grain du papier, celui qui se voit. Dernière couche, comme l'autre. */
export function peindreGrainDeTirage(ctx: Ctx, W: number, H: number, unite: number): void {
  etaler(ctx, W, H, tuileDePapier(celluleDuTirage(unite)))
}

/* ---------- le hors repère ---------------------------------------------------- */

/**
 * Le même pinceau, à côté.
 *
 * Tout est transmis tel quel, sauf `setTransform`, dont la translation reçoit
 * le décalage. C'est la seule façon de tenir devant l'élagueur du verrouillage,
 * qui remet la transformation à l'identité pour peindre en coordonnées
 * d'image : un `translate` posé avant lui aurait été effacé, et la seconde
 * couche serait tombée pile sur la première, c'est-à-dire nulle part.
 *
 * Le pinceau reçu est déjà décalé par son appelant, qui a posé le `translate`
 * initial : les deux vont ensemble, et `peindreDessous`, dans le moteur, le dit
 * de l'autre côté.
 */
class Decale implements Pinceau {
  /* Optionnel et branché dans le constructeur, comme chez l'élagueur : une
     méthode toujours présente aurait promis un rectangle arrondi que le
     pinceau du dessous ne sait pas tracer, et le repli le plus proche, un
     rectangle droit peint tout de suite, n'ouvre pas un chemin mais peint
     une forme, ce qui n'est pas la même chose du tout. */
  roundRect?: (x: number, y: number, largeur: number, hauteur: number, rayon: number) => void

  constructor(
    private readonly ctx: Pinceau,
    private readonly dx: number,
    private readonly dy: number,
  ) {
    const dessous = ctx.roundRect?.bind(ctx)
    if (dessous) this.roundRect = dessous
  }

  get fillStyle() { return this.ctx.fillStyle }
  set fillStyle(valeur) { this.ctx.fillStyle = valeur }
  get globalAlpha() { return this.ctx.globalAlpha }
  set globalAlpha(valeur) { this.ctx.globalAlpha = valeur }
  get globalCompositeOperation() { return this.ctx.globalCompositeOperation }
  set globalCompositeOperation(valeur) { this.ctx.globalCompositeOperation = valeur }

  save() { this.ctx.save() }
  restore() { this.ctx.restore() }
  translate(x: number, y: number) { this.ctx.translate(x, y) }
  rotate(angle: number) { this.ctx.rotate(angle) }
  scale(x: number, y: number) { this.ctx.scale(x, y) }

  setTransform(a: number, b: number, c: number, d: number, e: number, f: number) {
    this.ctx.setTransform(a, b, c, d, e + this.dx, f + this.dy)
  }

  beginPath() { this.ctx.beginPath() }
  closePath() { this.ctx.closePath() }
  moveTo(x: number, y: number) { this.ctx.moveTo(x, y) }
  lineTo(x: number, y: number) { this.ctx.lineTo(x, y) }
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number) {
    this.ctx.quadraticCurveTo(cpx, cpy, x, y)
  }
  arc(x: number, y: number, rayon: number, depart: number, fin: number, antihoraire?: boolean) {
    this.ctx.arc(x, y, rayon, depart, fin, antihoraire)
  }
  arcTo(x1: number, y1: number, x2: number, y2: number, rayon: number) {
    this.ctx.arcTo(x1, y1, x2, y2, rayon)
  }
  ellipse(
    x: number, y: number, rx: number, ry: number, rotation: number,
    depart: number, fin: number, antihoraire?: boolean,
  ) {
    this.ctx.ellipse(x, y, rx, ry, rotation, depart, fin, antihoraire)
  }
  fill(regle?: CanvasFillRule) { this.ctx.fill(regle) }
  fillRect(x: number, y: number, largeur: number, hauteur: number) {
    this.ctx.fillRect(x, y, largeur, hauteur)
  }
}

export function decaler(ctx: Pinceau, dx: number, dy: number): Pinceau {
  return new Decale(ctx, dx, dy)
}
