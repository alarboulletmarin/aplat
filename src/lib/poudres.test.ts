// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ces tests protègent : la poudre et les lames ne posent que l'encre
 * et le papier, un cadre plus haut ne change pas les grains déjà posés, et le
 * lin garde sa toile sous le plafond du SVG.
 *
 * Les grains sont tirés par leur position, jamais dans une boucle dont le
 * compte dépendrait du format : c'est la discipline de toutes les grilles du
 * moteur, et la seule chose qui rende le semis reproductible.
 */
import { describe, expect, it } from 'vitest'
import { estPoudre, IDS_POUDRES } from './poudres'
import { FAMILLES, PALETTES } from './moteur'
import { svgDuMotif } from './svg'

function chemins(famille: 'poudre' | 'lames' | 'lin', largeur: number, hauteur: number, densite: 0 | 1 | 2 = 1, graine = 7314, palette: keyof typeof PALETTES = 'orage') {
  const rendu = svgDuMotif({ famille, palette, densite, graine }, largeur, hauteur, false)
  return [...rendu.texte.matchAll(/<path d="([^"]*)" fill="([^"]*)"( fill-opacity="[^"]*")?/g)]
    .map((trouve) => ({ d: trouve[1], fill: trouve[2].toUpperCase(), opacite: trouve[3] ?? '' }))
    .slice(1)
}

describe('poudre, lames et lin', () => {
  it('sont des matières, et seulement elles passent par ce module', () => {
    for (const id of IDS_POUDRES) {
      expect(estPoudre(id)).toBe(true)
      expect(FAMILLES.find((f) => f.id === id)?.groupe).toBe('mat')
    }
    for (const id of ['constructor', '__proto__', null, 0, 'aurore']) expect(estPoudre(id)).toBe(false)
  })

  it.each(['poudre', 'lames'] as const)('%s ne pose que des couleurs pleines de la palette', (famille) => {
    for (const [palette, P] of Object.entries(PALETTES)) {
      const permises = new Set(P.couleurs.map((c) => c.toUpperCase()))
      const posees = chemins(famille, 360, 780, 1, 7314, palette as keyof typeof PALETTES)
      expect(posees.length, palette).toBeGreaterThan(0)
      for (const { fill, opacite } of posees) {
        expect(permises.has(fill), `${palette} ${fill}`).toBe(true)
        expect(opacite).toBe('')
      }
    }
  })

  it.each(IDS_POUDRES)('%s rend toujours la même image pour la même graine', (famille) => {
    expect(chemins(famille, 300, 650)).toEqual(chemins(famille, 300, 650))
    expect(chemins(famille, 300, 650, 1, 7315)).not.toEqual(chemins(famille, 300, 650))
  })

  it('ne change pas les grains du haut quand le cadre grandit vers le bas', () => {
    /* Les grains de la première rangée, lus dans les deux fichiers. */
    const rangee = (hauteur: number) => chemins('poudre', 300, hauteur)
      .flatMap(({ d, fill }) => [...d.matchAll(/M(-?[\d.]+) 0L/g)].map((m) => `${fill}@${m[1]}`))
      .sort()
    expect(rangee(900)).toEqual(rangee(650))
  })

  it('affine le grain quand la densité monte', () => {
    /* La densité change aussi la graine de dessin, donc le compte de grains
       ne dit rien : c'est la hauteur d'une rangée qu'on lit. */
    const rangee = (densite: 0 | 1 | 2) => {
      const hauteurs = chemins('poudre', 2000, 3000, densite)
        .flatMap(({ d }) => [...d.matchAll(/M[\d.]+ ([\d.]+)L[\d.]+ [\d.]+L[\d.]+ ([\d.]+)/g)]
          .map((m) => Number(m[2]) - Number(m[1])))
      return Math.max(...hauteurs)
    }
    expect(rangee(0)).toBeGreaterThan(rangee(1))
    expect(rangee(1)).toBeGreaterThan(rangee(2))
  })

  it('tisse le lin à faible opacité, par-dessus son dégradé', () => {
    const posees = chemins('lin', 360, 780)
    const fils = posees.filter(({ opacite }) => /fill-opacity="0\.(0[3-9]|1[0-4])"/.test(opacite))
    expect(fils.length).toBeGreaterThanOrEqual(4)
  })
})
