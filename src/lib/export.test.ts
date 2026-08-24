// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ce test protège : le nom du fichier porte tout ce qui a produit
 * l'image. Il n'y a ni bibliothèque, ni compte, ni historique ; retrouver un
 * motif six mois plus tard, c'est relire son nom de fichier.
 *
 * Ce qu'il ne couvre pas : l'encodage lui-même et la détection du canevas noir,
 * qui demandent un canevas. `tools/e2e.js` télécharge un vrai PNG et en lit
 * l'en-tête.
 */
import { describe, expect, it } from 'vitest'
import { nomFichier } from './export'

describe('nom du fichier', () => {
  it('porte tout ce qui a produit l’image', () => {
    expect(
      nomFichier({ famille: 'terrazzo', palette: 'orage', densite: 2, graine: 4242 }, 1179, 2556),
    ).toBe('aplat-terrazzo-orage-4242-1179x2556.png')
  })

  it('distingue la version sombre, que la pellicule ne distinguerait pas', () => {
    /* Même motif, même graine, même format : sans le mot, les deux fichiers se
       rangeraient l'un sur l'autre. */
    const motif = { famille: 'vagues' as const, palette: 'lime' as const, densite: 1 as const, graine: 7314 }
    expect(nomFichier(motif, 1179, 2556, { sombre: true }))
      .toBe('aplat-vagues-lime-7314-1179x2556-sombre.png')
    expect(nomFichier(motif, 1179, 2556, { sombre: true, voile: false }))
      .toBe('aplat-vagues-lime-7314-1179x2556-sombre-sansvoile.png')
    expect(nomFichier(motif, 1179, 2556, { sombre: false }))
      .toBe(nomFichier(motif, 1179, 2556))
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
