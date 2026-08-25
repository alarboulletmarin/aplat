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
 */
import { describe, expect, it } from 'vitest'
import { couperDemiPlan, hachurer, polygone, tracerCercle, type Point } from './trace'
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
