// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest'
import { chiffres, depuisSaisie, horsBornes, RES_MAX, RES_MIN, typeAppareil } from './resolution'

describe('saisie de résolution', () => {
  it('accepte une valeur dans les bornes', () => {
    expect(depuisSaisie('1179', '2556')).toEqual({ largeur: 1179, hauteur: 2556 })
  })

  it('annule une valeur trop petite plutôt que de la remonter', () => {
    /* Hors d'un <form>, le navigateur n'applique pas min="16" : une borne
       « > 0 » laissait exporter une image de 5 px. */
    expect(depuisSaisie('5', '2556').largeur).toBe(0)
    expect(depuisSaisie('', '').largeur).toBe(0)
    expect(depuisSaisie('abc', 'abc').hauteur).toBe(0)
  })

  it('plafonne une valeur trop grande', () => {
    expect(depuisSaisie('99999', '99999')).toEqual({ largeur: RES_MAX, hauteur: RES_MAX })
  })

  it('signale une saisie hors bornes, mais pas un champ vide', () => {
    expect(horsBornes('')).toBe(false)
    expect(horsBornes('1')).toBe(true)
    expect(horsBornes(String(RES_MIN))).toBe(false)
    expect(horsBornes(String(RES_MAX))).toBe(false)
    expect(horsBornes(String(RES_MAX + 1))).toBe(true)
  })
})

describe('frappe', () => {
  it('ne garde que des chiffres, quatre au plus', () => {
    expect(chiffres('1a2b3c4d5e')).toBe('1234')
    expect(chiffres('-12')).toBe('12')
    expect(chiffres('1 179')).toBe('1179')
  })

  it('borne vers le haut dès la frappe', () => {
    /* Sinon le champ affichait 9999, la carte 8 000, l'URL r=8000 et le
       fichier 8000 px — quatre vérités pour une seule valeur. */
    expect(chiffres('9999')).toBe(String(RES_MAX))
  })

  it('laisse passer une valeur basse en cours de frappe', () => {
    /* On passe forcément par « 1 » pour écrire « 1179 » : la borne basse est
       signalée, pas appliquée à la frappe. */
    expect(chiffres('1')).toBe('1')
  })
})

describe('type d’appareil', () => {
  it('classe un grand téléphone comme un téléphone', () => {
    /* Un seuil sur le petit côté classait un iPhone 15 Pro Max en tablette :
       largeur de scène, colonnes de la maquette et libellé tous faux. */
    expect(typeAppareil(1290, 2796)).toBe('telephone')
    expect(typeAppareil(1179, 2556)).toBe('telephone')
  })

  it('classe une tablette en portrait sur son rapport d’aspect', () => {
    expect(typeAppareil(2048, 2732)).toBe('tablette')
  })

  it('distingue paysage étroit et vrai écran d’ordinateur', () => {
    expect(typeAppareil(2560, 1440)).toBe('ordinateur')
    expect(typeAppareil(1024, 600)).toBe('tablette')
  })

  it('retombe sur le téléphone quand il n’y a rien à classer', () => {
    expect(typeAppareil(0, 0)).toBe('telephone')
  })
})
