// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest'
import { DICTIONNAIRES, remplir, textes } from './index'
import { fr } from './fr'
import { en } from './en'

type Noeud = Record<string, unknown>

function chemins(objet: Noeud, prefixe = ''): string[] {
  return Object.entries(objet).flatMap(([cle, valeur]) => {
    const chemin = prefixe ? `${prefixe}.${cle}` : cle
    return valeur !== null && typeof valeur === 'object' && !Array.isArray(valeur)
      ? chemins(valeur as Noeud, chemin)
      : [chemin]
  })
}

function valeur(objet: Noeud, chemin: string): unknown {
  return chemin.split('.').reduce<unknown>((courant, cle) => (courant as Noeud)?.[cle], objet)
}

/** Les jetons `{nom}` d'un libellé, en ordre stable. */
function jetons(texte: string): string[] {
  return [...texte.matchAll(/\{(\w+)\}/g)].map((trouve) => trouve[1]).sort()
}

describe('parité des dictionnaires', () => {
  it('donne les mêmes clés dans les deux langues', () => {
    expect(chemins(en).sort()).toEqual(chemins(fr).sort())
  })

  it('ne laisse aucun libellé vide', () => {
    for (const [langue, dictionnaire] of Object.entries(DICTIONNAIRES)) {
      for (const chemin of chemins(dictionnaire as unknown as Noeud)) {
        const contenu = valeur(dictionnaire as unknown as Noeud, chemin)
        if (Array.isArray(contenu)) {
          expect(contenu.length, `${langue}.${chemin}`).toBeGreaterThan(0)
          for (const entree of contenu) expect(String(entree).trim()).not.toBe('')
        } else {
          expect(String(contenu).trim(), `${langue}.${chemin}`).not.toBe('')
        }
      }
    }
  })

  it('garde les mêmes jetons de remplacement de part et d’autre', () => {
    /* Un jeton perdu à la traduction, et le libellé annonce « {mpx} Mpx ». */
    for (const chemin of chemins(fr)) {
      const cote = valeur(fr, chemin)
      const autre = valeur(en as unknown as Noeud, chemin)
      if (typeof cote === 'string' && typeof autre === 'string') {
        expect(jetons(autre), chemin).toEqual(jetons(cote))
      }
    }
  })

  it('garde les listes de la maquette à la même longueur', () => {
    expect(en.maquette.applications).toHaveLength(fr.maquette.applications.length)
    expect(en.maquette.bureau).toHaveLength(fr.maquette.bureau.length)
    expect(en.maquette.dock).toHaveLength(fr.maquette.dock.length)
    expect(en.maquette.menu).toHaveLength(fr.maquette.menu.length)
  })

  it('fournit assez d’icônes pour la grille la plus dense', () => {
    /* Vingt-quatre : la tablette, six colonnes sur quatre rangées. */
    expect(fr.maquette.applications.length).toBeGreaterThanOrEqual(24)
    expect(fr.maquette.dock.length).toBeGreaterThanOrEqual(6)
  })
})

describe('choix de la langue', () => {
  it('rend le dictionnaire demandé', () => {
    expect(textes('fr')).toBe(fr)
    expect(textes('en')).toBe(en)
  })
})

describe('remplissage des jetons', () => {
  it('remplace ce qu’il connaît et laisse le reste intact', () => {
    expect(remplir('{a} et {b}', { a: 'ceci', b: 'cela' })).toBe('ceci et cela')
    expect(remplir('{a} et {b}', { a: 'ceci' })).toBe('ceci et {b}')
  })

  it('ne va pas chercher dans le prototype', () => {
    expect(remplir('{toString}', {})).toBe('{toString}')
  })
})

describe('promesses de l’interface', () => {
  it('dit ce que le cache contient vraiment', () => {
    /* Le Service Worker met bien quelque chose en cache : les fichiers de
       l'application. La phrase de confidentialité doit le dire, sinon elle
       promet plus que le produit ne tient. */
    expect(fr.partage.confidentialite).toMatch(/fichiers de l’application/)
    expect(en.partage.confidentialite).toMatch(/application’s own files/)
  })

  it('ne promet pas un stockage nul sans le qualifier', () => {
    expect(fr.partage.confidentialite).toMatch(/aucune donnée enregistrée/)
    expect(en.partage.confidentialite).toMatch(/nothing stored/)
  })
})
