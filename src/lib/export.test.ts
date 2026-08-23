// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest'
import { nomFichier } from './export'

describe('nom du fichier', () => {
  it('porte tout ce qui a produit l’image', () => {
    expect(
      nomFichier({ famille: 'terrazzo', palette: 'orage', densite: 2, graine: 4242 }, 1179, 2556),
    ).toBe('aplat-terrazzo-orage-4242-1179x2556.png')
  })

  it('ne contient rien qu’un système de fichiers refuserait', () => {
    const nom = nomFichier(
      { famille: 'decoupes', palette: 'ardoise', densite: 0, graine: 1 },
      8000,
      8000,
    )
    expect(nom).toMatch(/^[a-z0-9-]+\.png$/)
  })
})
