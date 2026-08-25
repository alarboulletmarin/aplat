// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ces tests protègent : le lien vers la source correspondante, que
 * l'AGPL exige et que rien d'autre ne vérifie. L'étiquette et le lien sont
 * affichés dans le pied de page sans passer par un dictionnaire, donc sans
 * jamais croiser un autre test.
 *
 * Chaque fonction a deux branches, et la seconde ne se produit que dans un
 * build fait depuis une archive, sans dépôt git : c'est précisément le cas
 * qu'on ne verra jamais en développement.
 */
import { describe, expect, it } from 'vitest'
import { COMMIT, etiquetteVersion, lienLicence, lienSource, VERSION } from './build'

describe('étiquette de version', () => {
  it('pose le commit entre parenthèses, en précision de la version', () => {
    expect(etiquetteVersion({ version: '0.1.0', commit: 'a637777' })).toBe('v0.1.0 (a637777)')
  })

  it('n’affiche que la version quand le commit manque', () => {
    /* Build depuis une archive : il n’y a pas de dépôt git, donc pas de
       commit. Une parenthèse vide ferait lire une valeur perdue. */
    expect(etiquetteVersion({ version: '0.1.0', commit: '' })).toBe('v0.1.0')
  })

  it('branche ses valeurs par défaut sur la version et le commit du build', () => {
    /* Sans ce cas, intervertir les deux valeurs par défaut laisserait tous les
       autres tests au vert, et le pied de page afficherait le commit à la
       place de la version. */
    expect(etiquetteVersion()).toBe(
      COMMIT ? `v${VERSION} (${COMMIT})` : `v${VERSION}`,
    )
    expect(etiquetteVersion()).toContain(VERSION)
  })
})

describe('lien vers la source', () => {
  it('pointe l’arbre du commit exact', () => {
    expect(lienSource({ commit: 'a637777' })).toBe(
      'https://github.com/alarboulletmarin/aplat/tree/a637777',
    )
  })

  it('retombe sur le dépôt quand le commit manque', () => {
    /* Depuis une archive, plus rien ne désigne la source correspondante. Le
       dépôt reste le meilleur lien possible, et surtout un lien vivant : un
       `/tree/` sans commit mènerait à une page d'erreur. */
    expect(lienSource({ commit: '' })).toBe('https://github.com/alarboulletmarin/aplat')
  })

  it('branche sa valeur par défaut sur le commit du build', () => {
    expect(lienSource()).toBe(
      COMMIT ? `https://github.com/alarboulletmarin/aplat/tree/${COMMIT}` : 'https://github.com/alarboulletmarin/aplat',
    )
  })
})

describe('lien vers la licence', () => {
  it('pointe le fichier LICENSE du commit exact', () => {
    expect(lienLicence({ commit: 'a637777' })).toBe(
      'https://github.com/alarboulletmarin/aplat/blob/a637777/LICENSE',
    )
  })

  it('retombe sur le dépôt quand le commit manque', () => {
    /* Même raison que pour la source : un `/blob/` sans commit mènerait à une
       page d'erreur, le dépôt montre le LICENSE dès sa page d'accueil. */
    expect(lienLicence({ commit: '' })).toBe('https://github.com/alarboulletmarin/aplat')
  })

  it('branche sa valeur par défaut sur le commit du build', () => {
    expect(lienLicence()).toBe(
      COMMIT ? `https://github.com/alarboulletmarin/aplat/blob/${COMMIT}/LICENSE` : 'https://github.com/alarboulletmarin/aplat',
    )
  })
})
