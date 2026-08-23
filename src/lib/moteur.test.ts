// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ces tests protègent : la promesse centrale du produit, c'est-à-dire
 * qu'un quadruplet donné rend toujours la même image, à n'importe quelle
 * résolution. Si le déterminisme cède, un lien partagé ne montre plus le même
 * motif, et l'aperçu cesse d'être le fichier.
 *
 * Ils couvrent aussi les listes blanches, parce qu'un identifiant venu de l'URL
 * n'a jamais servi d'index, et le plafond du voile, parce qu'une marche de plus
 * d'un cran sur 255 se voit à l'oeil sur un aplat sombre.
 *
 * Ce qu'ils ne couvrent pas : le tracé lui-même. Vérifier des pixels demande un
 * canevas, donc un navigateur ; c'est le travail de `tools/`.
 */
import { describe, expect, it } from 'vitest'
import {
  alea, alphaDuVoile, empreinte, estDensite, estFamille, estPalette,
  FAMILLES, graineDeDessin, luminance, niveau, ORDRE_PALETTES, PALETTES, palette,
  SEUIL_AA, SEUIL_UI,
} from './moteur'

describe('aléatoire', () => {
  it('rend toujours la même suite pour une graine donnée', () => {
    const suite = (graine: number) => Array.from({ length: 8 }, alea(graine))
    expect(suite(7314)).toEqual(suite(7314))
    expect(suite(7314)).not.toEqual(suite(7315))
  })

  it('reste dans [0, 1[', () => {
    const tirer = alea(1)
    for (let i = 0; i < 5000; i += 1) {
      const valeur = tirer()
      expect(valeur).toBeGreaterThanOrEqual(0)
      expect(valeur).toBeLessThan(1)
    }
  })

  it('écarte les familles les unes des autres', () => {
    const empreintes = new Set(FAMILLES.map((f) => empreinte(f.id)))
    expect(empreintes.size).toBe(FAMILLES.length)
  })
})

describe('graine de dessin', () => {
  /* C'est la garantie centrale du produit : l'aperçu est le fichier. */
  it('ne dépend pas de la résolution', () => {
    expect(graineDeDessin('vagues', 1, 7314)).toBe(graineDeDessin('vagues', 1, 7314))
  })

  it('sépare les familles, les densités et les graines', () => {
    const valeurs = new Set([
      graineDeDessin('vagues', 1, 7314),
      graineDeDessin('blobs', 1, 7314),
      graineDeDessin('vagues', 2, 7314),
      graineDeDessin('vagues', 1, 7315),
    ])
    expect(valeurs.size).toBe(4)
  })

  it('reste un entier non signé sur 32 bits', () => {
    for (const graine of [1, 99999, 50000]) {
      const valeur = graineDeDessin('terrazzo', 2, graine)
      expect(Number.isInteger(valeur)).toBe(true)
      expect(valeur).toBeGreaterThanOrEqual(0)
      expect(valeur).toBeLessThanOrEqual(0xffffffff)
    }
  })
})

describe('données', () => {
  it('donne un identifiant unique à chaque famille', () => {
    expect(new Set(FAMILLES.map((f) => f.id)).size).toBe(FAMILLES.length)
  })

  it('range chaque palette dans l’ordre d’affichage, une seule fois', () => {
    expect([...ORDRE_PALETTES].sort()).toEqual(Object.keys(PALETTES).sort())
    expect(new Set(ORDRE_PALETTES).size).toBe(ORDRE_PALETTES.length)
  })

  it('donne à chaque palette un fond et quatre couleurs en hexadécimal', () => {
    for (const id of ORDRE_PALETTES) {
      const p = PALETTES[id]
      expect(p.fond).toMatch(/^#[0-9A-F]{6}$/i)
      expect(p.couleurs).toHaveLength(4)
      for (const couleur of p.couleurs) expect(couleur).toMatch(/^#[0-9A-F]{6}$/i)
    }
  })

  it('nomme chaque famille et chaque palette dans les deux langues', () => {
    for (const f of FAMILLES) {
      expect(f.fr.length).toBeGreaterThan(0)
      expect(f.en.length).toBeGreaterThan(0)
    }
    for (const id of ORDRE_PALETTES) {
      expect(PALETTES[id].fr.length).toBeGreaterThan(0)
      expect(PALETTES[id].en.length).toBeGreaterThan(0)
    }
  })
})

describe('listes blanches', () => {
  /* `PALETTES['constructor']` est « vrai » : un accès par index faisait lever
     le rendu tout entier, aperçu et vignettes compris. */
  it('refuse les clés héritées du prototype', () => {
    for (const cle of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      expect(estPalette(cle)).toBe(false)
      expect(estFamille(cle)).toBe(false)
    }
    expect(palette('constructor' as never)).toBe(PALETTES.lime)
  })

  it('n’accepte que les trois densités', () => {
    expect(estDensite(0)).toBe(true)
    expect(estDensite(2)).toBe(true)
    for (const valeur of [-1, 3, 1.5, NaN, '1', null, undefined]) {
      expect(estDensite(valeur)).toBe(false)
    }
  })
})

describe('luminance', () => {
  it('place le noir à 0 et le blanc à 1', () => {
    expect(luminance(0, 0, 0)).toBeCloseTo(0, 6)
    expect(luminance(255, 255, 255)).toBeCloseTo(1, 6)
  })

  it('classe le navy sous le crème', () => {
    expect(luminance(0x17, 0x24, 0x3f)).toBeLessThan(luminance(0xf7, 0xf3, 0xe6))
  })
})

describe('voile', () => {
  it('reste plafonné, même sur une force extrême', () => {
    for (const u of [0, 0.25, 0.5, 0.75, 1]) {
      expect(alphaDuVoile(u, 1)).toBeLessThanOrEqual(0.62)
    }
  })

  it('appuie davantage en bas qu’en haut, là où sont les libellés', () => {
    expect(alphaDuVoile(1, 0.3)).toBeGreaterThan(alphaDuVoile(0.2, 0.3))
  })

  it('ne peint rien quand la force est nulle', () => {
    expect(alphaDuVoile(0.5, 0)).toBe(0)
  })

  it('ne fait jamais de marche de plus d’un cran sur 255', () => {
    /* 320 bandes : c'est ce qui remplace le dégradé, dont le tramage
       pixel par pixel triplait le poids du PNG. */
    const force = 0.44
    let precedent = alphaDuVoile(0, force)
    for (let i = 1; i <= 320; i += 1) {
      const courant = alphaDuVoile(i / 320, force)
      expect(Math.abs(courant - precedent) * 255).toBeLessThan(1)
      precedent = courant
    }
  })
})

describe('niveau de lisibilité', () => {
  it('suit les seuils WCAG, sans arrondi complaisant', () => {
    expect(niveau({ libelles: 'clair', voile: 0, contraste: 4.5 })).toBe('bonne')
    expect(niveau({ libelles: 'clair', voile: 0, contraste: 4.49 })).toBe('juste')
    expect(niveau({ libelles: 'clair', voile: 0, contraste: 3 })).toBe('juste')
    expect(niveau({ libelles: 'clair', voile: 0, contraste: 2.99 })).toBe('insuffisante')
  })

  /* Le défaut que ce test tient fermé : le titre disait « correcte » pour
     3,5:1, un rapport pourtant sous le seuil AA du petit texte. Un mot qui
     rassure au-dessous du seuil vaut moins que pas de mot du tout. */
  it('ne dit « bonne » qu’au-dessus du seuil AA du petit texte', () => {
    for (const contraste of [1, 2.5, 2.99, 3, 3.5, 4.49]) {
      expect(niveau({ libelles: 'clair', voile: 0, contraste }), String(contraste))
        .not.toBe('bonne')
    }
    expect(SEUIL_AA).toBe(4.5)
    expect(SEUIL_UI).toBe(3)
  })
})
