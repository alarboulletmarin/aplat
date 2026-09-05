// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ces tests protègent : la place de l'heure est un recadrage et un
 * élagage, jamais une couche posée ni une teinte. Le pinceau enveloppé doit
 * laisser passer entière une forme qui tient sous la ligne, taire une forme
 * qui la dépasse, couper à la ligne la seule forme haute, et reconnaître la
 * base d'une famille pour la monter jusqu'en haut.
 *
 * Ce qu'ils ne couvrent pas : les pixels. Que la bande des chiffres soit d'un
 * seul ton sur les soixante-dix-neuf familles se vérifie sur un canevas, donc
 * dans un navigateur ; c'est `tools/e2e.mjs`, section 4 bis.
 */
import { describe, expect, it } from 'vitest'
import type { Pinceau } from './moteur'
import { BAS, CADRE, cadreDuMotif, elaguer, HAUTE } from './place'

/** Un pinceau qui ne peint rien et note ce qu'on lui demande de peindre. */
class Greffier implements Pinceau {
  fillStyle: string | CanvasGradient | CanvasPattern = '#000000'
  globalAlpha = 1
  globalCompositeOperation: GlobalCompositeOperation = 'source-over'
  /** Chaque remplissage, avec la boîte du chemin ou du rectangle qu'il a reçu. */
  pleins: { teinte: string; yMin: number; yMax: number }[] = []
  private ys: number[] = []

  save(): void { /* rien à noter */ }
  restore(): void { /* rien à noter */ }
  translate(): void { /* rien à noter */ }
  rotate(): void { /* rien à noter */ }
  scale(): void { /* rien à noter */ }
  setTransform(): void { /* rien à noter */ }
  beginPath(): void { this.ys = [] }
  closePath(): void { /* rien à noter */ }
  moveTo(_x: number, y: number): void { this.ys.push(y) }
  lineTo(_x: number, y: number): void { this.ys.push(y) }
  quadraticCurveTo(_cpx: number, _cpy: number, _x: number, y: number): void { this.ys.push(y) }
  arc(_x: number, y: number, rayon: number): void { this.ys.push(y - rayon, y + rayon) }
  arcTo(_x1: number, y1: number, _x2: number, y2: number): void { this.ys.push(y1, y2) }
  ellipse(_x: number, y: number, _rx: number, ry: number): void { this.ys.push(y - ry, y + ry) }
  fill(): void {
    this.pleins.push({
      teinte: String(this.fillStyle), yMin: Math.min(...this.ys), yMax: Math.max(...this.ys),
    })
  }
  fillRect(_x: number, y: number, _largeur: number, hauteur: number): void {
    this.pleins.push({ teinte: String(this.fillStyle), yMin: y, yMax: y + hauteur })
  }
}

const W = 500
const H = 1000
const ENCRE = '#102030'

function cercle(ctx: Pinceau, y: number, rayon = 20): void {
  ctx.fillStyle = ENCRE
  ctx.beginPath()
  ctx.arc(W / 2, y, rayon, 0, Math.PI * 2)
  ctx.fill()
}

describe('place de l’heure', () => {
  it('laisse le cadre entier à l’accueil et commence sous l’heure au verrouillage', () => {
    expect(cadreDuMotif(H, 'accueil')).toEqual({ haut: 0, hauteur: H })
    expect(cadreDuMotif(H, 'verrou')).toEqual({ haut: H * CADRE, hauteur: H - H * CADRE })
    /* Le cadre commence sous la bande des chiffres : c'est la garantie que la
       sonde mesure du sol. */
    expect(CADRE).toBeGreaterThan(BAS)
  })

  it('laisse passer entière une forme qui tient sous la ligne, et tait celle qui la dépasse', () => {
    const greffier = new Greffier()
    const pinceau = elaguer(greffier, W, H)
    cercle(pinceau, H * 0.15)
    cercle(pinceau, H * CADRE + 10, 20)
    cercle(pinceau, H * CADRE + 30, 20)
    cercle(pinceau, H * 0.8)
    /* Le premier passe au-dessus de la place, le deuxième la mord de dix
       pixels : ni l'un ni l'autre n'est peint, et aucun n'est coupé. Les deux
       autres tiennent dessous et passent tels quels, en coordonnées locales. */
    expect(greffier.pleins).toHaveLength(2)
    expect(greffier.pleins[0].yMin).toBeCloseTo(H * CADRE + 10, 5)
    expect(greffier.pleins[1].yMin).toBeCloseTo(H * 0.8 - 20, 5)
  })

  it('suit la transformation courante pour savoir où une forme tombe', () => {
    /* Le motif compose dans un cadre descendu : ce qu'il croit poser en haut
       de son cadre tombe en réalité sous la place de l'heure, et c'est cette
       hauteur-là qui compte. */
    const greffier = new Greffier()
    const pinceau = elaguer(greffier, W, H)
    pinceau.save()
    pinceau.translate(0, H * CADRE)
    cercle(pinceau, 20)
    cercle(pinceau, 10)
    pinceau.restore()
    cercle(pinceau, 20)
    expect(greffier.pleins).toHaveLength(1)
  })

  it('coupe à la ligne une forme haute, et seulement celle-là', () => {
    const greffier = new Greffier()
    const pinceau = elaguer(greffier, W, H)
    pinceau.fillStyle = ENCRE
    pinceau.beginPath()
    pinceau.moveTo(W * 0.4, H * 0.1)
    pinceau.lineTo(W * 0.5, H * 0.1)
    pinceau.lineTo(W * 0.5, H)
    pinceau.lineTo(W * 0.4, H)
    pinceau.closePath()
    pinceau.fill()
    /* La rayure est repeinte en coordonnées d'image, du bord de la ligne au
       bas ; rien d'elle ne monte au-dessus. */
    expect(greffier.pleins).toHaveLength(1)
    expect(greffier.pleins[0].yMin).toBeCloseTo(H * CADRE, 5)
    expect(greffier.pleins[0].yMax).toBeCloseTo(H, 5)
    /* Une forme qui dépasse mais n'est pas haute disparaît au lieu d'être
       coupée : une case coupée en deux n'est plus une case. */
    pinceau.fillRect(W * 0.4, H * CADRE - 10, W * 0.1, H * HAUTE - 20)
    expect(greffier.pleins).toHaveLength(1)
    /* Et le même rectangle, haut, se coupe comme la rayure. */
    pinceau.fillRect(W * 0.4, H * 0.1, W * 0.1, H * 0.9)
    expect(greffier.pleins).toHaveLength(2)
    expect(greffier.pleins[1].yMin).toBeCloseTo(H * CADRE, 5)
  })

  it('coupe aussi les formes courbes, aplaties pour la règle', () => {
    const greffier = new Greffier()
    const pinceau = elaguer(greffier, W, H)
    cercle(pinceau, H * 0.5, H * 0.3)
    expect(greffier.pleins).toHaveLength(1)
    expect(greffier.pleins[0].yMin).toBeCloseTo(H * CADRE, 5)
    expect(greffier.pleins[0].yMax).toBeCloseTo(H * 0.8, 1)
  })

  it('reconnaît la base d’une famille et la monte jusqu’en haut', () => {
    const greffier = new Greffier()
    const pinceau = elaguer(greffier, W, H)
    const { haut, hauteur } = cadreDuMotif(H, 'verrou')
    pinceau.save()
    pinceau.translate(0, haut)
    pinceau.fillStyle = ENCRE
    pinceau.fillRect(0, 0, W, hauteur)
    pinceau.restore()
    /* La base est peinte en coordonnées d'image, du bord haut au bas. */
    expect(greffier.pleins).toHaveLength(1)
    expect(greffier.pleins[0]).toEqual({ teinte: ENCRE, yMin: 0, yMax: H })
  })

  it('ne prend pas un rectangle ordinaire pour une base', () => {
    const greffier = new Greffier()
    const pinceau = elaguer(greffier, W, H)
    pinceau.fillStyle = ENCRE
    /* Une bande au-dessus de la place, une colonne qui ne touche pas les deux
       bords, un rectangle pleine largeur qui ne descend pas jusqu'en bas :
       aucun n'est une base. La bande disparaît, les deux autres sont coupés. */
    pinceau.fillRect(0, H * 0.1, W, H * 0.1)
    pinceau.fillRect(W * 0.2, 0, W * 0.6, H)
    pinceau.fillRect(0, 0, W, H * 0.6)
    expect(greffier.pleins).toHaveLength(2)
    for (const plein of greffier.pleins) expect(plein.yMin).toBeCloseTo(H * CADRE, 5)
  })
})
