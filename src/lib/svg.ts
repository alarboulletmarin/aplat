// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Le motif en vectoriel, quand il s'y prête.
 *
 * Un fond d'écran est une image de la taille de l'écran, et le PNG répond très
 * bien à ça. Le SVG répond à autre chose : un motif qu'on veut reprendre, poser
 * sur un autre format, ouvrir dans un outil de dessin. Il pèse aussi vingt fois
 * moins quand la famille est géométrique.
 *
 * Rien du moteur n'est recopié ici. `formes()` ne connaît qu'un pinceau, et ce
 * module en fournit un second, qui note les tracés au lieu de les peindre. Une
 * famille ajoutée au moteur est donc exportable en SVG le jour même, et une
 * primitive de tracé ajoutée sans être notée ici casse la compilation plutôt
 * que de sortir un fichier faux.
 *
 * Deux choses ne passent pas, et le produit le dit plutôt que de faire semblant.
 *
 * *Le grain.* Il est peint avec un motif d'image de bruit ; un SVG ne le porte
 * pas. Le fichier vectoriel est donc légèrement plus lisse que le PNG.
 *
 * *Les familles très peuplées.* Aucune ne l'est aujourd'hui : la plus dense du
 * catalogue, Mosaïque, compte moins de mille formes, et le nombre ne dépend pas
 * de la résolution puisque toutes les tailles se rapportent au petit côté. Le
 * plafond `ELEMENTS_MAX` est donc un garde-fou pour les familles à venir, pas
 * une limite qu'on rencontre : au-delà, le fichier deviendrait plus lourd que
 * le PNG qu'il remplace, et l'interface le dit avant qu'on clique plutôt
 * qu'après. Un test unitaire tient le catalogue sous ce plafond.
 *
 * Les coordonnées sont écrites déjà transformées : les courbes de Bézier sont
 * invariantes par transformation affine, et les arcs sont convertis en courbes
 * avant d'être posés. Une rotation ou une échelle n'a donc pas d'attribut à
 * elle, et le fichier n'a pas de pile de groupes à relire.
 */
import {
  mesurer, MOT_PAR_DEFAUT, palette, peindreOmbre,
  peindreFormes, peindreVoile,
  type Ecran, type Mesure, type Motif, type Pinceau,
} from './moteur'

/**
 * Le plafond de formes au-delà duquel le vectoriel n'a plus de sens.
 *
 * Vingt-quatre mille : à ce compte le fichier passe la dizaine de mégaoctets
 * tout en s'ouvrant mal, et le PNG redevient la bonne sortie. Le catalogue
 * actuel en est très loin, et c'est justement pourquoi le plafond est écrit :
 * une famille ajoutée un jour peut y arriver, et le produit doit alors le dire
 * plutôt que de livrer un fichier que personne ne sait ouvrir.
 */
export const ELEMENTS_MAX = 24000

export interface RenduSVG {
  texte: string
  elements: number
}

/* ---------- géométrie ------------------------------------------------------- */

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

function appliquer(m: Matrice, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
}

/**
 * Deux décimales. Le motif est calculé en pixels de fichier, et un centième de
 * pixel ne se voit sur aucun écran ; les garder tous doublerait le poids.
 */
function n2(valeur: number): string {
  const arrondi = Math.round(valeur * 100) / 100
  return Object.is(arrondi, -0) ? '0' : String(arrondi)
}

/**
 * Une couleur, ramenée à ce qu'un SVG lit partout : six chiffres hexadécimaux,
 * et l'opacité à part.
 *
 * Le voile est peint en `rgba()`, notation que les navigateurs acceptent dans
 * un attribut `fill` mais qui n'appartient pas au SVG 1.1 : un fichier ouvert
 * dans un outil de dessin y perdrait ses bandes. La composante alpha est donc
 * sortie dans `fill-opacity`, où elle est chez elle.
 */
export function couleurSVG(brut: string): { teinte: string; alpha: number } {
  const propre = brut.trim()
  const fonction = /^rgba?\(([^)]+)\)$/i.exec(propre)
  if (fonction) {
    const parts = fonction[1].split(',').map((morceau) => Number.parseFloat(morceau.trim()))
    const [r, v, b] = parts
    const a = parts.length > 3 && Number.isFinite(parts[3]) ? parts[3] : 1
    const deux = (canal: number) =>
      Math.max(0, Math.min(255, Math.round(canal || 0))).toString(16).padStart(2, '0')
    return { teinte: `#${deux(r)}${deux(v)}${deux(b)}`.toUpperCase(), alpha: a }
  }
  const court = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(propre)
  if (court) {
    return {
      teinte: `#${court[1]}${court[1]}${court[2]}${court[2]}${court[3]}${court[3]}`.toUpperCase(),
      alpha: 1,
    }
  }
  return { teinte: /^#[0-9a-f]{6}$/i.test(propre) ? propre.toUpperCase() : '#000000', alpha: 1 }
}

/** Les quatre caractères qui ne peuvent pas entrer tels quels dans un attribut. */
function echapper(texte: string): string {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/* ---------- le pinceau qui note --------------------------------------------- */

interface Etat {
  ctm: Matrice
  fill: string
  alpha: number
}

/**
 * Un pinceau qui écrit des chemins SVG au lieu de peindre des pixels.
 *
 * Il tient exactement le contrat `Pinceau` du moteur, sans rien de plus : ce
 * qu'il ne sait pas faire, le moteur ne le demande pas.
 */
class Notaire implements Pinceau {
  private etat: Etat = { ctm: IDENTITE, fill: '#000000', alpha: 1 }
  private pile: Etat[] = []
  private chemin: string[] = []
  /** Le dernier point posé, en coordonnées locales : `arc` en a besoin. */
  private ouvert = false
  private sorties: string[] = []
  private compte = 0

  globalCompositeOperation: GlobalCompositeOperation = 'source-over'

  get fillStyle(): string | CanvasGradient | CanvasPattern {
    return this.etat.fill
  }

  set fillStyle(valeur: string | CanvasGradient | CanvasPattern) {
    if (typeof valeur === 'string') this.etat.fill = valeur
  }

  get globalAlpha(): number {
    return this.etat.alpha
  }

  set globalAlpha(valeur: number) {
    this.etat.alpha = Math.max(0, Math.min(1, valeur))
  }

  save(): void {
    this.pile.push({ ...this.etat })
  }

  restore(): void {
    const precedent = this.pile.pop()
    if (precedent) this.etat = precedent
  }

  translate(x: number, y: number): void {
    this.etat.ctm = multiplier(this.etat.ctm, [1, 0, 0, 1, x, y])
  }

  rotate(angle: number): void {
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    this.etat.ctm = multiplier(this.etat.ctm, [c, s, -s, c, 0, 0])
  }

  scale(x: number, y: number): void {
    this.etat.ctm = multiplier(this.etat.ctm, [x, 0, 0, y, 0, 0])
  }

  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.etat.ctm = [a, b, c, d, e, f]
  }

  beginPath(): void {
    this.chemin = []
    this.ouvert = false
  }

  closePath(): void {
    if (this.ouvert) this.chemin.push('Z')
  }

  moveTo(x: number, y: number): void {
    const [px, py] = appliquer(this.etat.ctm, x, y)
    this.chemin.push(`M${n2(px)} ${n2(py)}`)
    this.ouvert = true
  }

  lineTo(x: number, y: number): void {
    if (!this.ouvert) {
      this.moveTo(x, y)
      return
    }
    const [px, py] = appliquer(this.etat.ctm, x, y)
    this.chemin.push(`L${n2(px)} ${n2(py)}`)
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    if (!this.ouvert) this.moveTo(cpx, cpy)
    const [ax, ay] = appliquer(this.etat.ctm, cpx, cpy)
    const [bx, by] = appliquer(this.etat.ctm, x, y)
    this.chemin.push(`Q${n2(ax)} ${n2(ay)} ${n2(bx)} ${n2(by)}`)
  }

  arc(
    x: number, y: number, rayon: number,
    depart: number, fin: number, antihoraire = false,
  ): void {
    this.ellipse(x, y, rayon, rayon, 0, depart, fin, antihoraire)
  }

  /**
   * L'arc d'ellipse, converti en courbes cubiques de quatre-vingt-dix degrés au
   * plus. C'est la conversion classique, et elle est exacte à un millième de
   * rayon près, très en dessous du centième de pixel qu'on écrit.
   */
  ellipse(
    x: number, y: number, rx: number, ry: number, rotation: number,
    depart: number, fin: number, antihoraire = false,
  ): void {
    const d0 = depart
    let d1 = fin
    if (antihoraire) {
      while (d1 > d0) d1 -= Math.PI * 2
      if (d0 - d1 > Math.PI * 2) d1 = d0 - Math.PI * 2
    } else {
      while (d1 < d0) d1 += Math.PI * 2
      if (d1 - d0 > Math.PI * 2) d1 = d0 + Math.PI * 2
    }

    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    const point = (angle: number): [number, number] => {
      const lx = rx * Math.cos(angle)
      const ly = ry * Math.sin(angle)
      return appliquer(this.etat.ctm, x + lx * cos - ly * sin, y + lx * sin + ly * cos)
    }
    const tangente = (angle: number): [number, number] => {
      const lx = -rx * Math.sin(angle)
      const ly = ry * Math.cos(angle)
      const m = this.etat.ctm
      const dx = lx * cos - ly * sin
      const dy = lx * sin + ly * cos
      return [m[0] * dx + m[2] * dy, m[1] * dx + m[3] * dy]
    }

    const debut = point(d0)
    if (this.ouvert) this.chemin.push(`L${n2(debut[0])} ${n2(debut[1])}`)
    else {
      this.chemin.push(`M${n2(debut[0])} ${n2(debut[1])}`)
      this.ouvert = true
    }

    const total = d1 - d0
    const segments = Math.max(1, Math.ceil(Math.abs(total) / (Math.PI / 2)))
    const pas = total / segments
    const k = (4 / 3) * Math.tan(pas / 4)
    let a = d0
    let courant = debut
    for (let i = 0; i < segments; i += 1) {
      const b = a + pas
      const suivant = point(b)
      const ta = tangente(a)
      const tb = tangente(b)
      const c1: [number, number] = [courant[0] + k * ta[0], courant[1] + k * ta[1]]
      const c2: [number, number] = [suivant[0] - k * tb[0], suivant[1] - k * tb[1]]
      this.chemin.push(
        `C${n2(c1[0])} ${n2(c1[1])} ${n2(c2[0])} ${n2(c2[1])} ${n2(suivant[0])} ${n2(suivant[1])}`,
      )
      a = b
      courant = suivant
    }
  }

  /**
   * L'arc tangent à deux segments, comme le contexte 2D le définit : depuis le
   * point courant vers (x1, y1), puis vers (x2, y2), arrondi au rayon donné.
   */
  arcTo(x1: number, y1: number, x2: number, y2: number, rayon: number): void {
    const courant = this.dernierPointLocal(x1, y1)
    const [x0, y0] = courant
    const a1 = Math.atan2(y0 - y1, x0 - x1)
    const a2 = Math.atan2(y2 - y1, x2 - x1)
    let ecart = a2 - a1
    while (ecart <= -Math.PI) ecart += Math.PI * 2
    while (ecart > Math.PI) ecart -= Math.PI * 2
    const demi = ecart / 2
    if (rayon <= 0 || Math.abs(Math.sin(demi)) < 1e-6) {
      this.lineTo(x1, y1)
      return
    }
    const distance = rayon / Math.abs(Math.tan(demi))
    const bissectrice = a1 + demi
    const centre = rayon / Math.abs(Math.sin(demi))
    const cx = x1 + Math.cos(bissectrice) * centre
    const cy = y1 + Math.sin(bissectrice) * centre
    const t1 = [x1 + Math.cos(a1) * distance, y1 + Math.sin(a1) * distance] as const
    const t2 = [x1 + Math.cos(a2) * distance, y1 + Math.sin(a2) * distance] as const
    this.lineTo(t1[0], t1[1])
    this.ellipse(
      cx, cy, rayon, rayon, 0,
      Math.atan2(t1[1] - cy, t1[0] - cx),
      Math.atan2(t2[1] - cy, t2[0] - cx),
      ecart < 0,
    )
  }

  roundRect(x: number, y: number, largeur: number, hauteur: number, rayon: number): void {
    const r = Math.max(0, Math.min(rayon, Math.min(largeur, hauteur) / 2))
    this.moveTo(x + r, y)
    this.lineTo(x + largeur - r, y)
    this.ellipse(x + largeur - r, y + r, r, r, 0, -Math.PI / 2, 0)
    this.lineTo(x + largeur, y + hauteur - r)
    this.ellipse(x + largeur - r, y + hauteur - r, r, r, 0, 0, Math.PI / 2)
    this.lineTo(x + r, y + hauteur)
    this.ellipse(x + r, y + hauteur - r, r, r, 0, Math.PI / 2, Math.PI)
    this.lineTo(x, y + r)
    this.ellipse(x + r, y + r, r, r, 0, Math.PI, Math.PI * 1.5)
    this.chemin.push('Z')
  }

  fill(regle?: CanvasFillRule): void {
    if (!this.chemin.length) return
    this.poser(this.chemin.join(''), regle === 'evenodd')
  }

  /**
   * Le rectangle plein ne touche pas au chemin courant, comme dans le contexte
   * 2D : c'est ce qui permet au fond et aux bandes du voile d'être posés au
   * milieu d'un tracé sans le rompre.
   */
  fillRect(x: number, y: number, largeur: number, hauteur: number): void {
    const coins: [number, number][] = [
      appliquer(this.etat.ctm, x, y),
      appliquer(this.etat.ctm, x + largeur, y),
      appliquer(this.etat.ctm, x + largeur, y + hauteur),
      appliquer(this.etat.ctm, x, y + hauteur),
    ]
    const d = coins
      .map((point, indice) => `${indice ? 'L' : 'M'}${n2(point[0])} ${n2(point[1])}`)
      .join('')
    this.poser(`${d}Z`, false)
  }

  /* --- sortie -------------------------------------------------------------- */

  private poser(d: string, pair: boolean): void {
    const { teinte, alpha: propre } = couleurSVG(this.etat.fill)
    const alpha = this.etat.alpha * propre
    if (alpha <= 0.0005) return
    const attributs = [
      `d="${d}"`,
      `fill="${teinte}"`,
      pair ? 'fill-rule="evenodd"' : '',
      alpha < 0.9995 ? `fill-opacity="${Math.round(alpha * 10000) / 10000}"` : '',
    ].filter(Boolean)
    this.sorties.push(`<path ${attributs.join(' ')}/>`)
    this.compte += 1
  }

  /**
   * Le dernier point du chemin, ramené en coordonnées locales. `arcTo` raisonne
   * en local alors que le chemin est déjà transformé ; sans cette inversion, un
   * arrondi posé sous une rotation partirait de travers. Faute de point courant,
   * le contexte 2D prend le premier sommet donné.
   */
  private dernierPointLocal(secours1: number, secours2: number): [number, number] {
    const derniere = [...this.chemin].reverse().find((c) => /^[MLCQ]/.test(c))
    if (!derniere) return [secours1, secours2]
    const nombres = derniere.slice(1).split(' ').map(Number)
    const x = nombres[nombres.length - 2]
    const y = nombres[nombres.length - 1]
    const m = this.etat.ctm
    const det = m[0] * m[3] - m[1] * m[2]
    if (!det) return [secours1, secours2]
    const dx = x - m[4]
    const dy = y - m[5]
    return [(dx * m[3] - dy * m[2]) / det, (dy * m[0] - dx * m[1]) / det]
  }

  get elements(): number {
    return this.compte
  }

  get corps(): string {
    return this.sorties.join('')
  }
}

/* ---------- le document ----------------------------------------------------- */

/**
 * Le motif entier en SVG : le fond, les formes, l'assombrissement de la version
 * sombre, le voile s'il est demandé.
 *
 * L'ordre des couches est celui du moteur, à ceci près que le grain n'y est
 * pas : un SVG ne porte pas de bruit sans image embarquée, qui pèserait plus
 * que le motif lui-même.
 */
export function svgDuMotif(
  motif: Motif, largeur: number, hauteur: number, voile: boolean, sombre = false,
  ecran: Ecran = 'accueil',
): RenduSVG {
  const P = palette(motif.palette)
  const notaire = new Notaire()

  notaire.fillStyle = P.fond
  notaire.fillRect(0, 0, largeur, hauteur)
  /* Le cadre et l'élagage de la place de l'heure, dans le même ordre que sur le
     canevas : un SVG qui les ignorerait ne serait pas le même fichier dans un
     autre format. */
  peindreFormes(
    notaire, largeur, hauteur, motif.famille, P, motif.densite, motif.graine,
    motif.mot ?? MOT_PAR_DEFAUT, ecran,
  )
  /* La sonde est appelée dans les deux cas, et non plus seulement quand le
     voile est demandé : c'est elle qui dose l'ombre de la version sombre, au
     même titre que le voile. Elle reste hors du chemin quand aucune des deux
     couches n'est demandée, parce qu'elle réclame un canevas, donc un
     navigateur, et que le document doit pouvoir se construire sans.

     Les deux couches passent par les mêmes fonctions que le canevas, si bien
     que le SVG est le même fichier dans un autre format, et non une
     approximation vectorielle de l'autre.

     L'arrêt sur couche de `dessiner()` n'a pas d'équivalent ici, et ce n'est
     pas un oubli à compléter par symétrie : le SVG est un fichier qu'on
     emporte, jamais une démonstration, et une sortie tronquée à mi-pile
     n'aurait aucun usage. */
  if (voile || sombre) {
    const mesure: Mesure = mesurer(
      motif.famille, motif.palette, motif.densite, motif.graine, largeur, hauteur, sombre,
      ecran, motif.mot ?? MOT_PAR_DEFAUT,
    )
    peindreOmbre(notaire, largeur, hauteur, mesure)
    if (voile) peindreVoile(notaire, largeur, hauteur, mesure)
  }

  const description =
    `Aplat, motif ${motif.famille}, palette ${motif.palette}, graine ${motif.graine}.` +
    ' Sans grain : le grain du PNG est une trame d’image, elle n’a pas d’équivalent vectoriel.'

  const texte =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${largeur}" height="${hauteur}"` +
    ` viewBox="0 0 ${largeur} ${hauteur}" shape-rendering="geometricPrecision">` +
    `<desc>${echapper(description)}</desc>` +
    notaire.corps +
    '</svg>'

  return { texte, elements: notaire.elements }
}

/**
 * La mémoire d'un seul rendu.
 *
 * Le panneau des formats demande deux fois la même chose : une fois pour savoir
 * si le SVG est possible, une fois pour le livrer. Sans cette mémoire, un motif
 * dense serait construit deux fois de suite, et le second passage se ferait
 * sous le doigt de la personne.
 */
let dernier: { cle: string; rendu: RenduSVG } | null = null

export function rendreSVG(
  motif: Motif, largeur: number, hauteur: number, voile: boolean, sombre = false,
  ecran: Ecran = 'accueil',
): RenduSVG {
  const cle = [
    motif.famille, motif.palette, motif.densite, motif.graine, largeur, hauteur, voile, sombre,
    ecran, motif.mot ?? MOT_PAR_DEFAUT,
  ].join('|')
  if (dernier && dernier.cle === cle) return dernier.rendu
  const rendu = svgDuMotif(motif, largeur, hauteur, voile, sombre, ecran)
  dernier = { cle, rendu }
  return rendu
}
