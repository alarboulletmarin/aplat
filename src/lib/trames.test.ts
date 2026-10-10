// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ces tests protègent : l'aurore ne contient que des couleurs de la
 * palette, et une image plus haute ne change pas ce qui a déjà été dessiné.
 *
 * La première est la promesse de la famille. Elle montre une nappe qui a l'air
 * d'un dégradé, et elle n'en est pas un : entre deux teintes voisines, chaque
 * point choisit l'une ou l'autre. Une teinte mélangée entrerait dans le SVG et
 * ferait mentir l'aperçu sur les couleurs de la palette.
 *
 * La seconde est la discipline de toutes les grilles du moteur : rien n'est
 * tiré dans la boucle des cellules, donc la première rangée ne dépend pas du
 * nombre de rangées. Les tests passent par le pinceau qui note, celui de
 * `svg.ts`, sans navigateur.
 */
import { describe, expect, it } from 'vitest'
import { estTrame, IDS_TRAMES } from './trames'
import { FAMILLES, PALETTES } from './moteur'
import { svgDuMotif } from './svg'

const PALETTE = 'orage'
const MOTIF = { famille: 'aurore', palette: PALETTE, densite: 1, graine: 7314 } as const

function chemins(largeur: number, hauteur: number, densite: 0 | 1 | 2 = 1, graine = 7314) {
  const rendu = svgDuMotif({ ...MOTIF, densite, graine }, largeur, hauteur, false)
  return [...rendu.texte.matchAll(/<path d="([^"]*)" fill="([^"]*)"/g)]
    .map((trouve) => ({ d: trouve[1], fill: trouve[2].toUpperCase() }))
    /* La première est l'aplat de fond, posé avant le motif. */
    .slice(1)
}

describe('aurore', () => {
  it('est une trame, rangée chez les matières', () => {
    expect(IDS_TRAMES).toContain('aurore')
    expect(estTrame('aurore')).toBe(true)
    expect(FAMILLES.find((f) => f.id === 'aurore')?.groupe).toBe('mat')
  })

  it('ne pose que des couleurs de la palette', () => {
    const permises = new Set(PALETTES[PALETTE].couleurs.map((c) => c.toUpperCase()))
    const posees = chemins(400, 880)
    expect(posees.length).toBeGreaterThan(0)
    for (const { fill } of posees) expect(permises.has(fill), fill).toBe(true)
  })

  it('rend toujours la même image pour la même graine', () => {
    expect(chemins(400, 880)).toEqual(chemins(400, 880))
    expect(chemins(400, 880, 1, 7315)).not.toEqual(chemins(400, 880))
  })

  it('pose plus de points quand la densité monte', () => {
    const points = (densite: 0 | 1 | 2) =>
      chemins(400, 880, densite).reduce((somme, { d }) => somme + (d.match(/M/g) ?? []).length, 0)
    expect(points(0)).toBeLessThan(points(1))
    expect(points(1)).toBeLessThan(points(2))
  })

  it('groupe les points par couleur : un chemin par teinte, au plus', () => {
    expect(chemins(400, 880).length).toBeLessThanOrEqual(PALETTES[PALETTE].couleurs.length)
  })
})

describe('sablier', () => {
  const SABLIER = { famille: 'sablier', palette: 'ardoise', densite: 1, graine: 4242 } as const
  const rendu = (largeur: number, hauteur: number, densite: 0 | 1 | 2 = 1, graine = 4242) =>
    svgDuMotif({ ...SABLIER, densite, graine }, largeur, hauteur, false).texte

  it('est une trame, rangée chez les matières', () => {
    expect(IDS_TRAMES).toContain('sablier')
    expect(estTrame('sablier')).toBe(true)
    expect(FAMILLES.find((f) => f.id === 'sablier')?.groupe).toBe('mat')
  })

  it('rend toujours la même image pour la même graine', () => {
    expect(rendu(400, 880)).toBe(rendu(400, 880))
    expect(rendu(400, 880, 1, 4243)).not.toBe(rendu(400, 880))
  })

  it('tend plus de filets quand la densité monte', () => {
    /* Les filets sont les seuls chemins posés avec une opacité. */
    const filets = (densite: 0 | 1 | 2) => (rendu(400, 880, densite).match(/fill-opacity/g) ?? []).length
    expect(filets(0)).toBeLessThan(filets(1))
    expect(filets(1)).toBeLessThan(filets(2))
  })

  it('peint la nappe en un chemin par palier, pas en une forme par cellule', () => {
    expect((rendu(1290, 2796).match(/<path /g) ?? []).length).toBeLessThan(400)
  })
})
