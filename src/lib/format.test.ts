// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ces tests protègent : un nombre écrit à la française dans une
 * interface anglaise, ou l'inverse. Ces défauts ne cassent rien et ne se voient
 * qu'en basculant de langue, c'est-à-dire presque jamais.
 *
 * Le passage des kilooctets aux mégaoctets est ici parce que le poids du
 * fichier fait partie du résultat annoncé : « 262 Ko » dit ce que « 0,3 Mo »
 * cache.
 */
import { describe, expect, it } from 'vitest'
import { decimal, heure, nombre, poids } from './format'

describe('nombres', () => {
  it('sépare les milliers selon la langue', () => {
    expect(nombre(2556, 'en')).toBe('2,556')
    expect(nombre(2556, 'fr')).toMatch(/^2.556$/)
  })

  it('met une virgule décimale en français', () => {
    expect(decimal(4.53, 'fr')).toBe('4,5')
    expect(decimal(4.53, 'en')).toBe('4.5')
  })
})

describe('poids du fichier', () => {
  it('passe en kilooctets sous le mégaoctet', () => {
    /* « 262 Ko » dit ce que « 0,3 Mo » cache, et le poids fait partie du
       résultat annoncé. */
    expect(poids(268288, 'fr', 'Ko', 'Mo')).toBe('262 Ko')
  })

  it('passe en mégaoctets au-delà', () => {
    expect(poids(1572864, 'fr', 'Ko', 'Mo')).toBe('1,5 Mo')
    expect(poids(1572864, 'en', 'kB', 'MB')).toBe('1.5 MB')
  })
})

describe('heure', () => {
  it('suit le format de la langue affichée', () => {
    const midiPile = new Date(2026, 0, 1, 13, 5)
    expect(heure(midiPile, 'fr')).toMatch(/13/)
    expect(heure(midiPile, 'en')).toMatch(/1:05/)
  })
})
