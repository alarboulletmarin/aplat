// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ces tests protègent : la promesse du produit, appliquée au second
 * geste du moteur. Une gravure tramée doit sortir identique pour une graine
 * donnée, à n'importe quelle résolution, sans quoi l'aperçu cesse d'être le
 * fichier ; et ses deux tons doivent être les bons quel que soit l'ordre des
 * teintes dans la palette, y compris une palette composée à la main.
 *
 * Le pinceau enregistreur ci-dessous ne connaît que ce que la trame emploie :
 * si `peindreLieu` se mettait à demander un arc ou une courbe, ces tests
 * casseraient à la compilation, et c'est voulu, la trame n'est faite que de
 * rectangles.
 */
import { describe, expect, it } from 'vitest'
import { estLieu, IDS_LIEUX, peindreLieu, tonsDeGravure } from './lieux'
import { alea, FAMILLES, graineDeDessin, type Pinceau } from './moteur'

interface Rectangle {
  fill: string
  x: number
  y: number
  l: number
  h: number
}

/** Un pinceau qui note les rectangles au lieu de les peindre. */
function enregistreur(): { ctx: Pinceau; rectangles: Rectangle[] } {
  const rectangles: Rectangle[] = []
  let fill = ''
  const ctx = {
    set fillStyle(valeur: string) {
      fill = valeur
    },
    get fillStyle() {
      return fill
    },
    fillRect(x: number, y: number, l: number, h: number) {
      rectangles.push({ fill, x, y, l, h })
    },
  } as unknown as Pinceau
  return { ctx, rectangles }
}

const C = ['#DFF478', '#92BAD5', '#17243F', '#FF6648'] as const

function graver(id: (typeof IDS_LIEUX)[number], W: number, H: number, graine = 7314) {
  const { ctx, rectangles } = enregistreur()
  peindreLieu(ctx, W, H, id, C, 1, alea(graineDeDessin(id, 1, graine)), Math.min(W, H))
  return rectangles
}

describe('liste des lieux', () => {
  it('range chaque lieu dans le catalogue, dans le groupe lieu', () => {
    for (const id of IDS_LIEUX) {
      const entree = FAMILLES.find((f) => f.id === id)
      expect(entree, id).toBeDefined()
      expect(entree?.groupe, id).toBe('lieu')
    }
  })

  it('ne reconnaît que les lieux, jamais une clé héritée', () => {
    expect(estLieu('acropole')).toBe(true)
    expect(estLieu('torii')).toBe(true)
    for (const valeur of ['vagues', 'constructor', '__proto__', '', 42, null]) {
      expect(estLieu(valeur), String(valeur)).toBe(false)
    }
  })
})

describe('les deux tons', () => {
  it('prend la teinte la plus claire pour le papier, la plus sombre pour l’encre', () => {
    expect(tonsDeGravure(C)).toEqual({ papier: '#DFF478', encre: '#17243F' })
    /* Nuit : pas de teinte sombre au catalogue, la gravure s'inverse. */
    expect(tonsDeGravure(['#788CE3', '#DFF478', '#92BAD5', '#F7F3E6']))
      .toEqual({ papier: '#F7F3E6', encre: '#788CE3' })
  })

  it('ne dépend pas de l’ordre des teintes', () => {
    const melange = [...C].reverse()
    expect(tonsDeGravure(melange)).toEqual(tonsDeGravure(C))
  })

  it('survit à une teinte illisible plutôt que de choisir n’importe quoi', () => {
    const tons = tonsDeGravure(['rebeccapurple', '#17243F', '#F7F3E6'])
    expect(tons.papier).toBe('#F7F3E6')
    expect(tons.encre).toBe('#17243F')
  })
})

describe('déterminisme de la gravure', () => {
  it('rend deux fois la même suite de rectangles pour une même graine', () => {
    for (const id of IDS_LIEUX) {
      expect(graver(id, 360, 780), id).toEqual(graver(id, 360, 780))
    }
  })

  it('change avec la graine', () => {
    expect(graver('acropole', 360, 780, 7314)).not.toEqual(graver('acropole', 360, 780, 7315))
  })

  it('ne dépend pas de la résolution : la même image, deux fois plus grande', () => {
    /* C'est la garantie centrale : la sonde mesure sur un petit canevas, la
       vignette dessine plus petit encore, et l'export sort en pleine
       résolution. Tous les trois doivent regarder la même gravure. */
    const petit = graver('phare', 360, 780)
    const grand = graver('phare', 720, 1560)
    expect(grand.length).toBe(petit.length)
    for (const [i, r] of petit.entries()) {
      expect(grand[i].fill).toBe(r.fill)
      /* Le doublement tombe sur des bornes arrondies : un pixel d'écart au
         plus, jamais une dérive. */
      expect(Math.abs(grand[i].x - r.x * 2), String(i)).toBeLessThanOrEqual(1)
      expect(Math.abs(grand[i].y - r.y * 2), String(i)).toBeLessThanOrEqual(1)
    }
  })

  it('reste dans le cadre, la feuille comprise', () => {
    for (const id of IDS_LIEUX) {
      for (const r of graver(id, 400, 700)) {
        expect(r.x, id).toBeGreaterThanOrEqual(0)
        expect(r.y, id).toBeGreaterThanOrEqual(0)
        expect(r.x + r.l, id).toBeLessThanOrEqual(400 + 1)
        expect(r.y + r.h, id).toBeLessThanOrEqual(700 + 1)
        expect(Number.isFinite(r.x + r.y + r.l + r.h), id).toBe(true)
      }
    }
  })

  it('pose la feuille de papier d’abord, puis n’encre jamais d’une autre teinte', () => {
    for (const id of IDS_LIEUX) {
      const rectangles = graver(id, 360, 780)
      expect(rectangles[0], id).toEqual({ fill: '#DFF478', x: 0, y: 0, l: 360, h: 780 })
      for (const r of rectangles.slice(1)) expect(r.fill, id).toBe('#17243F')
    }
  })
})
