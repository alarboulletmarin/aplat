// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ces tests protègent : la seule chose qu'Aplat écrit sur l'appareil.
 * Une liste bornée à dix, sans doublon, faite de quatre réglages par entrée et
 * de rien d'autre. Un stockage se modifie à la main comme une barre d'adresse ;
 * ce qui en sort est traité avec la même défiance.
 */
import { describe, expect, it } from 'vitest'
import { ajouter, analyser, estEntree, identique, MAX, versEntree, versMotif, type Entree } from './historique'

const A: Entree = { m: 'vagues', p: 'lime', d: 1, s: 7314 }
const B: Entree = { m: 'blobs', p: 'nuit', d: 2, s: 42 }

describe('aller et retour', () => {
  it('ne perd rien entre le motif et l’entrée', () => {
    const motif = { famille: 'terrazzo', palette: 'corail', densite: 0, graine: 999 } as const
    expect(versMotif(versEntree(motif))).toEqual(motif)
  })
})

describe('recevabilité d’une entrée', () => {
  it('accepte une entrée complète et valide', () => {
    expect(estEntree(A)).toBe(true)
  })

  it('refuse ce qui vient d’ailleurs', () => {
    for (const valeur of [
      null, undefined, 42, 'vagues', [], {},
      { ...A, m: 'inconnue' },
      { ...A, p: 'constructor' },
      { ...A, d: 3 },
      { ...A, d: '1' },
      { ...A, s: 0 },
      { ...A, s: -1 },
      { ...A, s: 1.5 },
      { ...A, s: 100000 },
      { ...A, s: NaN },
      { m: 'vagues', p: 'lime', d: 1 },
    ]) {
      expect(estEntree(valeur), JSON.stringify(valeur)).toBe(false)
    }
  })
})

describe('relecture du stockage', () => {
  it('rend une liste vide sur du vide, du bruit ou une forme inattendue', () => {
    for (const brut of [null, '', 'pas du json', '{"m":"vagues"}', '42', 'null']) {
      expect(analyser(brut), String(brut)).toEqual([])
    }
  })

  it('écarte les entrées invalides et garde les bonnes, dans l’ordre', () => {
    const brut = JSON.stringify([A, { m: 'inconnue' }, B, 7])
    expect(analyser(brut)).toEqual([A, B])
  })

  it('ne garde d’une entrée que les quatre réglages', () => {
    /* Un champ glissé dans le stockage à la main ne doit pas ressortir dans
       l'application : on recopie, on ne relaie pas. */
    const brut = JSON.stringify([{ ...A, vu: 12, quand: 'hier', url: 'https://exemple' }])
    expect(Object.keys(analyser(brut)[0]).sort()).toEqual(['d', 'm', 'p', 's'])
  })

  it('déduplique et plafonne à dix, quoi qu’il y ait dans le stockage', () => {
    const beaucoup = Array.from({ length: 40 }, (_, i) => ({ ...A, s: i + 1 }))
    expect(analyser(JSON.stringify([...beaucoup, A, A]))).toHaveLength(MAX)
    expect(analyser(JSON.stringify([A, A, A]))).toEqual([A])
  })
})

describe('ajout', () => {
  it('met la nouvelle entrée en tête', () => {
    expect(ajouter([A], B)).toEqual([B, A])
  })

  it('rend la liste telle quelle quand l’entrée y est déjà en tête', () => {
    const liste = [A, B]
    expect(ajouter(liste, { ...A })).toBe(liste)
  })

  it('remonte une entrée déjà vue au lieu de la doubler', () => {
    expect(ajouter([B, A], A)).toEqual([A, B])
  })

  it('ne dépasse jamais dix, et c’est la plus ancienne qui tombe', () => {
    let liste: readonly Entree[] = []
    for (let i = 1; i <= 15; i += 1) liste = ajouter(liste, { ...A, s: i })
    expect(liste).toHaveLength(MAX)
    expect(liste[0].s).toBe(15)
    expect(liste[MAX - 1].s).toBe(6)
  })
})

describe('identité', () => {
  it('compare les quatre réglages, et rien de plus', () => {
    expect(identique(A, { ...A })).toBe(true)
    expect(identique(A, { ...A, s: A.s + 1 })).toBe(false)
    expect(identique(A, { ...A, d: 2 })).toBe(false)
  })
})
