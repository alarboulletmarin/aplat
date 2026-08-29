// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ces tests protègent : les deux outils de tracé que le pinceau ne sait
 * pas faire tout seul, la découpe et les hachures.
 *
 * Le pinceau du moteur ne connaît ni le trait ni le détourage. Une bande de
 * hachures doit donc arriver déjà taillée à la forme qui la porte, et c'est
 * `couperDemiPlan` qui la taille. Une découpe fausse ne lève rien et ne
 * remplit rien de visiblement faux : elle laisse simplement une bande déborder
 * d'une case sur sa voisine, ce que seule une capture montre. Ces tests le
 * disent avant.
 *
 * `hachurer` est éprouvé par ce qu'il pose plutôt que par ce qu'il calcule :
 * un pinceau qui note les polygones suffit à vérifier que rien ne sort du
 * contour et que le compte des bandes suit le pas demandé.
 *
 * S'y ajoute l'éclairage, sur lequel tout le relief repose. Une face plus
 * claire que celle qui la surplombe retourne le volume comme un masque creux,
 * et rien dans le dessin ne le signale : c'est la monotonie qu'il faut tenir,
 * et le fait que les deux bouts restent hors de la palette, sans quoi une
 * teinte déjà claire ne s'éclaircirait plus.
 *
 * Et la fonte, enfin, venue de la mesure le jour où le dossard s'est mis à
 * écrire des nombres lui aussi. C'est le seul endroit du moteur où une donnée
 * saisie à la main devient un dessin : une case oubliée ne lève rien et fait
 * afficher `20` à la place de `26`.
 */
import { describe, expect, it } from 'vitest'
import {
  couperDemiPlan, eclairage, GLYPHES, hachurer, luminanceHex, polygone, tracerCercle,
  type Point,
} from './trace'
import type { Pinceau } from './moteur'

const CARRE: Point[] = [[0, 0], [10, 0], [10, 10], [0, 10]]

/** Un pinceau qui note les sommets de chaque forme remplie. */
function enregistreur(): { ctx: Pinceau; formes: Point[][] } {
  const formes: Point[][] = []
  let courant: Point[] = []
  const ctx = {
    fillStyle: '#000000',
    beginPath() {
      courant = []
    },
    moveTo(x: number, y: number) {
      courant.push([x, y])
    },
    lineTo(x: number, y: number) {
      courant.push([x, y])
    },
    arc() {
      /* Le cercle n'ajoute pas de sommet : ces tests portent sur les
         polygones, et une conversion d'arc appartient à `svg.ts`. */
    },
    closePath() {},
    fill() {
      if (courant.length) formes.push(courant)
      courant = []
    },
  } as unknown as Pinceau
  return { ctx, formes }
}

describe('découpe par un demi-plan', () => {
  it('laisse intact un polygone entièrement du bon côté', () => {
    expect(couperDemiPlan(CARRE, 1, 0, 20)).toEqual(CARRE)
  })

  it('ne rend rien d’un polygone entièrement du mauvais côté', () => {
    expect(couperDemiPlan(CARRE, 1, 0, -1)).toEqual([])
  })

  it('coupe droit, et referme sur la coupe', () => {
    const moitie = couperDemiPlan(CARRE, 1, 0, 4)
    expect(moitie).toEqual([[0, 0], [4, 0], [4, 10], [0, 10]])
  })

  it('coupe en biais, et ne garde que le triangle du coin', () => {
    /* Une coupe qui tombe pile sur un sommet le rend deux fois, une fois comme
       sommet gardé et une fois comme intersection. C'est sans effet sur le
       remplissage, et le test porte donc sur la forme et non sur sa notation. */
    const coin = couperDemiPlan(CARRE, 1, 1, 10)
    const distincts = coin.filter(
      (p, i) => i === 0 || p[0] !== coin[i - 1][0] || p[1] !== coin[i - 1][1],
    )
    expect(distincts).toEqual([[0, 0], [10, 0], [0, 10]])
    for (const [x, y] of coin) expect(x + y).toBeLessThanOrEqual(10 + 1e-9)
  })

  it('enchaîne deux découpes en une bande', () => {
    const bande = couperDemiPlan(couperDemiPlan(CARRE, 1, 0, 7), -1, 0, -3)
    const xs = bande.map((p) => p[0])
    expect(Math.min(...xs)).toBeCloseTo(3, 9)
    expect(Math.max(...xs)).toBeCloseTo(7, 9)
  })
})

describe('hachures', () => {
  it('ne pose jamais un sommet hors du contour', () => {
    const { ctx, formes } = enregistreur()
    hachurer(ctx, CARRE, Math.PI / 4, 2)
    expect(formes.length).toBeGreaterThan(2)
    for (const forme of formes) {
      for (const [x, y] of forme) {
        expect(x).toBeGreaterThanOrEqual(-1e-9)
        expect(x).toBeLessThanOrEqual(10 + 1e-9)
        expect(y).toBeGreaterThanOrEqual(-1e-9)
        expect(y).toBeLessThanOrEqual(10 + 1e-9)
      }
    }
  })

  it('serre les bandes quand le pas diminue', () => {
    const large = enregistreur()
    const serre = enregistreur()
    hachurer(large.ctx, CARRE, 0, 4)
    hachurer(serre.ctx, CARRE, 0, 1)
    expect(serre.formes.length).toBeGreaterThan(large.formes.length)
  })

  it('garde la même phase pour deux contours voisins', () => {
    /* C'est la raison d'être du calage sur la normale plutôt que sur le coin
       de la forme : deux cases voisines hachurées du même angle continuent la
       même série au lieu de se décaler d'une demi-bande. */
    const gauche = enregistreur()
    const droite = enregistreur()
    const decale = CARRE.map(([x, y]) => [x + 10, y] as Point)
    hachurer(gauche.ctx, CARRE, 0, 2)
    hachurer(droite.ctx, decale, 0, 2)
    const abscisses = (formes: Point[][]) => formes.map((f) => Math.min(...f.map((p) => p[0])))
    expect(abscisses(droite.formes)).toEqual(abscisses(gauche.formes).map((x) => x + 10))
  })

  it('ne pose rien plutôt que de boucler sans fin sur un pas nul', () => {
    const { ctx, formes } = enregistreur()
    hachurer(ctx, CARRE, 0, 0)
    hachurer(ctx, CARRE, 0, -3)
    hachurer(ctx, [[0, 0], [1, 1]], 0, 1)
    expect(formes).toEqual([])
  })
})

describe('chemins ouverts', () => {
  it('ouvre le chemin même quand la découpe n’a rien laissé', () => {
    /* Sans ce `beginPath()`, un `fill()` qui suit repeindrait la forme d'avant
       au lieu de ne rien peindre : c'est le seul défaut que cette fonction
       puisse produire, et il est invisible sans capture. */
    const { ctx, formes } = enregistreur()
    polygone(ctx, [[1, 1], [2, 2], [3, 3]])
    polygone(ctx, [])
    ctx.fill()
    expect(formes).toEqual([])
  })

  it('pose le crayon avant l’arc plutôt que de traîner un segment', () => {
    const { ctx, formes } = enregistreur()
    ctx.beginPath()
    ctx.moveTo(50, 50)
    ctx.fill()
    ctx.beginPath()
    tracerCercle(ctx, 3, 4, 5)
    ctx.fill()
    expect(formes[1]).toEqual([[8, 4]])
  })
})

describe('éclairage', () => {
  const C = ['#DFF478', '#92BAD5', '#17243F', '#FF6648'] as const

  it('éclaircit vers le haut, assombrit vers le bas, sans jamais s’inverser', () => {
    const eclairer = eclairage(C)
    for (const base of C) {
      let precedent = -1
      for (const niveau of [-1, -0.6, -0.2, 0, 0.2, 0.6, 1]) {
        const valeur = luminanceHex(eclairer(base, niveau))
        expect(valeur, `${base} à ${niveau}`).toBeGreaterThan(precedent)
        precedent = valeur
      }
    }
  })

  it('rend la teinte intacte au niveau zéro', () => {
    expect(eclairage(C)('#17243F', 0)).toBe('#17243F')
  })

  it('éclaircit encore la plus claire, assombrit encore la plus sombre', () => {
    /* C'est la raison pour laquelle le jour et l'ombre sont pris hors de la
       palette. Bornés à ses deux teintes extrêmes, une face déjà de cette
       teinte n'aurait plus de marge, et le volume s'y aplatirait. */
    const eclairer = eclairage(C)
    expect(luminanceHex(eclairer('#DFF478', 0.5))).toBeGreaterThan(luminanceHex('#DFF478'))
    expect(luminanceHex(eclairer('#17243F', -0.5))).toBeLessThan(luminanceHex('#17243F'))
  })

  it('borne le niveau plutôt que d’extrapoler', () => {
    const eclairer = eclairage(C)
    expect(eclairer('#FF6648', 4)).toBe(eclairer('#FF6648', 1))
    expect(eclairer('#FF6648', -4)).toBe(eclairer('#FF6648', -1))
  })

  it('ne rend que des teintes hexadécimales, prêtes pour un attribut', () => {
    const eclairer = eclairage(C)
    for (const niveau of [-1, -0.37, 0, 0.37, 1]) {
      for (const base of C) expect(eclairer(base, niveau)).toMatch(/^#[0-9A-F]{6}$/)
    }
  })

  it('survit à une palette d’une seule teinte', () => {
    const eclairer = eclairage(['#4E9B7C'])
    expect(luminanceHex(eclairer('#4E9B7C', 0.6)))
      .toBeGreaterThan(luminanceHex(eclairer('#4E9B7C', -0.6)))
  })
})

describe('la fonte des chiffres', () => {
  /* La table est relue case par case. C'est le seul endroit du moteur où une
     donnée saisie à la main devient un dessin, et une rangée trop courte, un
     caractère de trop ou deux chiffres au même dessin ne lèvent rien : ils
     font seulement afficher un autre nombre que celui qui est demandé. */
  it('donne à chaque glyphe cinq rangées de trois cases, pleines ou vides', () => {
    for (const [caractere, glyphe] of Object.entries(GLYPHES)) {
      expect(glyphe, caractere).toHaveLength(5)
      for (const [rang, rangee] of glyphe.entries()) {
        expect(rangee, `${caractere} rangée ${rang}`).toMatch(/^[01]{3}$/)
      }
    }
  })

  it('sait les dix chiffres, et leur donne dix dessins différents', () => {
    for (const chiffre of '0123456789') {
      expect(Object.keys(GLYPHES), chiffre).toContain(chiffre)
    }
    const dessins = [...'0123456789'].map((c) => GLYPHES[c].join('/'))
    expect(new Set(dessins).size, 'deux chiffres au même dessin').toBe(10)
  })

  it('ne laisse aucun glyphe vide, ni aucun tout plein', () => {
    /* Un glyphe vide s'efface, un glyphe plein fait un pavé : dans les deux
       cas la graduation perd son nombre sans que rien ne le signale. */
    for (const [caractere, glyphe] of Object.entries(GLYPHES)) {
      const cases = glyphe.join('')
      expect(cases.includes('1'), caractere).toBe(true)
      expect(cases.includes('0'), caractere).toBe(true)
    }
  })

  it('garde le degré au-dessus de la ligne des chiffres', () => {
    /* Le degré est un exposant : il occupe les rangées hautes et laisse les
       deux dernières vides, sans quoi il se lirait comme un zéro. */
    const degre = GLYPHES['°']
    expect(degre).toBeDefined()
    expect(degre.slice(3).join('')).toBe('000000')
  })
})
