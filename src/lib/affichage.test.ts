// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ces tests protègent : la langue et le thème vivent sur l'appareil,
 * les liens d'avant gagnent pour un chargement, et rien ne s'écrit tant qu'on
 * ne choisit rien. Un stockage se modifie à la main comme une barre
 * d'adresse : ce qui en sort est traité avec la même défiance.
 */
import { afterEach, describe, expect, it } from 'vitest'
import pageIndex from '../../index.html?raw'
import {
  adresseNettoyee, CLE_LANGUE, CLE_THEME, langueParDefaut, lireAffichage,
  retenirLangue, retenirTheme,
} from './affichage'

/* Un stockage en mémoire, posé sur le `window` que le module lit. Les tests
   tournent sous Node : sans cet appel, `window` n'existe pas, ce qui est
   aussi un cas à couvrir, celui du stockage refusé. */
function poserStockage(initial: Record<string, string> = {}): Map<string, string> {
  const memoire = new Map(Object.entries(initial))
  ;(globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (cle: string) => memoire.get(cle) ?? null,
      setItem: (cle: string, valeur: string) => void memoire.set(cle, valeur),
      removeItem: (cle: string) => void memoire.delete(cle),
    },
  }
  return memoire
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window
})

describe('lecture au chargement', () => {
  it('retombe sur la langue du navigateur et sur « système »', () => {
    poserStockage()
    expect(lireAffichage('', 'fr-CA')).toEqual({ langue: 'fr', theme: 'systeme' })
    expect(lireAffichage('', 'en-GB')).toEqual({ langue: 'en', theme: 'systeme' })
    expect(lireAffichage('', 'de-DE')).toEqual({ langue: 'en', theme: 'systeme' })
    expect(langueParDefaut(undefined)).toBe('fr')
  })

  it('fait sans stockage du tout : un appareil qui le refuse garde ses défauts', () => {
    /* Pas de `poserStockage` : `window` n'existe pas, comme dans une
       navigation privée qui jette au premier accès. */
    expect(lireAffichage('', 'fr-FR')).toEqual({ langue: 'fr', theme: 'systeme' })
  })

  it('relit le choix retenu sur l’appareil', () => {
    poserStockage({ [CLE_LANGUE]: 'en', [CLE_THEME]: 'sombre' })
    expect(lireAffichage('', 'fr-FR')).toEqual({ langue: 'en', theme: 'sombre' })
  })

  it('laisse l’adresse gagner : les liens d’avant tiennent parole', () => {
    poserStockage({ [CLE_LANGUE]: 'en', [CLE_THEME]: 'sombre' })
    expect(lireAffichage('?l=fr&t=clair')).toEqual({ langue: 'fr', theme: 'clair' })
  })

  it('traite une valeur abîmée comme une valeur absente', () => {
    /* L'adresse forgée retombe sur le stockage, le stockage forgé sur les
       défauts : jamais une valeur inconnue ne traverse. */
    poserStockage({ [CLE_LANGUE]: 'en', [CLE_THEME]: 'sombre' })
    expect(lireAffichage('?l=zz&t=neon')).toEqual({ langue: 'en', theme: 'sombre' })
    poserStockage({ [CLE_LANGUE]: 'zz', [CLE_THEME]: 'neon' })
    expect(lireAffichage('', 'fr-FR')).toEqual({ langue: 'fr', theme: 'systeme' })
  })
})

describe('retenue du choix', () => {
  it('écrit la langue et le thème choisis', () => {
    const memoire = poserStockage()
    retenirLangue('en')
    retenirTheme('sombre')
    expect(memoire.get(CLE_LANGUE)).toBe('en')
    expect(memoire.get(CLE_THEME)).toBe('sombre')
  })

  it('efface le thème quand le choix revient à « système »', () => {
    /* L'absence de choix s'écrit par l'absence, dans le stockage comme
       avant dans l'adresse. */
    const memoire = poserStockage({ [CLE_THEME]: 'sombre' })
    retenirTheme('systeme')
    expect(memoire.has(CLE_THEME)).toBe(false)
  })

  it('ne lève jamais quand le stockage refuse', () => {
    ;(globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: () => {
          throw new Error('refusé')
        },
        setItem: () => {
          throw new Error('refusé')
        },
        removeItem: () => {
          throw new Error('refusé')
        },
      },
    }
    expect(lireAffichage('', 'fr-FR')).toEqual({ langue: 'fr', theme: 'systeme' })
    expect(() => retenirLangue('en')).not.toThrow()
    expect(() => retenirTheme('systeme')).not.toThrow()
  })
})

describe('le script d’index.html', () => {
  /* Ce que ce test protège : le script anti-éclair d'index.html relit les
     mêmes clés de stockage que ce module, écrites en dur parce qu'il court
     avant tout import. Une clé renommée ici sans lui casserait le thème de la
     première peinture, et aucun autre test ne le verrait. */
  it('relit les clés de ce module, littéralement', () => {
    expect(pageIndex).toContain(`'${CLE_THEME}'`)
    expect(pageIndex).toContain(`'${CLE_LANGUE}'`)
  })
})

describe('nettoyage de l’adresse', () => {
  it('ôte `l` et `t`, et rien d’autre', () => {
    expect(adresseNettoyee('/app', '?m=vagues&l=fr&s=7314&t=sombre')).toBe(
      '/app?m=vagues&s=7314',
    )
  })

  it('rend le chemin nu quand il ne restait que l’affichage', () => {
    expect(adresseNettoyee('/', '?l=fr&t=clair')).toBe('/')
  })

  it('ne touche pas à une adresse déjà propre', () => {
    /* `null` dit « rien à faire » : l'appelant n'appelle pas `replaceState`
       pour rien, et n'ajoute pas un « ? » vide à une adresse nue. */
    expect(adresseNettoyee('/', '')).toBeNull()
    expect(adresseNettoyee('/app', '?m=vagues&s=7314')).toBeNull()
  })
})
