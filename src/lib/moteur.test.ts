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
  CIBLE_SOMBRE, forceSombre, luminanceAssombrie, OMBRE_MAX, sansVoile,
  FAMILLES, graineDeDessin, luminance, melange, niveau, ORDRE_PALETTES, PALETTES, palette,
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

  /* Le panneau construit ses grilles en filtrant `FAMILLES` sur le groupe :
     une famille dont le groupe ne serait aucun des cinq disparaîtrait de
     l'interface sans erreur, et personne ne s'en apercevrait avant de la
     chercher. Les cinq grilles doivent couvrir la liste entière. */
  it('range chaque famille dans l’un des cinq groupes, et aucun n’est vide', () => {
    const groupes = ['abs', 'mat', 'pay', 'lieu', 'fig'] as const
    const comptes = groupes.map((g) => FAMILLES.filter((f) => f.groupe === g).length)
    expect(comptes.reduce((somme, n) => somme + n, 0)).toBe(FAMILLES.length)
    for (const [indice, compte] of comptes.entries()) {
      expect(compte, groupes[indice]).toBeGreaterThan(0)
    }
  })

  /* Les cinq grilles se suivent dans le panneau, dans cet ordre. Une famille
     rangée hors de son bloc sauterait de place à l'écran sans que rien ne le
     signale : le parcours clavier d'un groupe passerait par une vignette
     affichée dans un autre. */
  it('garde les cinq groupes d’un seul tenant, abstraits, matières, paysages, lieux puis figures', () => {
    const ordre = FAMILLES.map((f) => f.groupe)
    const rang = ['abs', 'mat', 'pay', 'lieu', 'fig']
    expect(ordre).toEqual([...ordre].sort(
      (a, b) => rang.indexOf(a) - rang.indexOf(b),
    ))
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

describe('mélange de teintes', () => {
  /* Les rampes de Terrasses et de Strates passent par ici, et leur sortie va
     droit dans un attribut `fill` : six chiffres hexadécimaux, rien d'autre. */
  it('rend les bornes telles quelles, en majuscules', () => {
    expect(melange('#17243f', '#F7F3E6', 0)).toBe('#17243F')
    expect(melange('#17243f', '#f7f3e6', 1)).toBe('#F7F3E6')
  })

  it('mélange canal par canal, à mi-chemin', () => {
    expect(melange('#000000', '#FFFFFF', 0.5)).toBe('#808080')
    expect(melange('#FF0000', '#00FF00', 0.5)).toBe('#808000')
  })

  it('borne la position plutôt que d’extrapoler', () => {
    expect(melange('#102030', '#405060', -1)).toBe('#102030')
    expect(melange('#102030', '#405060', 2)).toBe('#405060')
  })

  it('rend la première teinte plutôt qu’un attribut illisible', () => {
    expect(melange('#17243F', 'rebeccapurple', 0.5)).toBe('#17243F')
    expect(melange('', '#17243F', 0.5)).toBe('')
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

describe('version sombre', () => {
  /* Ce que ces tests protègent est le défaut qui a fait recommencer la
     fonction. L'assombrissement était d'abord une opacité fixe posée avant le
     voile ; le voile de la version claire visait déjà 0,17 et y arrivait, si
     bien que les deux versions ressortaient de la même clarté, et deux
     palettes sur onze ressortaient même plus claires en « sombre ». Une
     version sombre qui n'est pas plus sombre n'est pas une version.

     La cible corrige cela par construction : elle est sous celle du voile, donc
     hors de sa portée. `tools/e2e.mjs` mesure ensuite l'image réelle et le
     fichier téléchargé ; ici on éprouve le calcul. */
  it('amène n’importe quelle luminance sur la cible', () => {
    for (const L of [0.05, 0.12, 0.24, 0.4, 0.62, 0.88, 1]) {
      const apres = luminanceAssombrie(L, forceSombre(L))
      expect(apres, String(L)).toBeCloseTo(CIBLE_SOMBRE, 6)
    }
  })

  it('descend toujours sous le seuil que le voile vise', () => {
    /* 0,17 est la cible du voile pour des libellés clairs. La version sombre
       doit passer dessous, sans quoi le voile la rattraperait et les deux
       versions se ressembleraient, ce qui est exactement ce qui s'était
       passé. */
    expect(CIBLE_SOMBRE).toBeLessThan(0.17)
  })

  it('ne cherche pas à éclaircir un motif déjà sous la cible', () => {
    /* Un aplat noir ne sait pas éclaircir. Rendre une force négative
       produirait une opacité illégale, et un motif déjà sombre n'a rien à y
       gagner. */
    for (const L of [0, 0.01, CIBLE_SOMBRE]) {
      expect(forceSombre(L), String(L)).toBe(0)
    }
  })

  it('reste bornée, même sur un fond blanc', () => {
    for (const L of [0.9, 1, 4]) {
      const force = forceSombre(L)
      expect(force, String(L)).toBeGreaterThan(0)
      expect(force, String(L)).toBeLessThanOrEqual(OMBRE_MAX)
    }
  })

  it('assombrit d’autant plus que le motif est clair', () => {
    let precedent = 0
    for (const L of [0.1, 0.2, 0.4, 0.6, 0.8]) {
      const force = forceSombre(L)
      expect(force, String(L)).toBeGreaterThan(precedent)
      precedent = force
    }
  })

  it('rend la version sombre lisible par construction', () => {
    /* À la cible, des libellés clairs donnent 1,05 / (0,05 + 0,05), soit
       10,5:1. C'est très au-dessus du seuil AA, et ça vaut pour toutes les
       familles et toutes les palettes : la version sombre n'a pas de mauvais
       cas. */
    expect(CIBLE_SOMBRE).toBeLessThan(0.5)
    expect(1.05 / (CIBLE_SOMBRE + 0.05)).toBeGreaterThan(4.5)
  })

  it('suit la formule du canal, pas une approximation', () => {
    /* Un aplat noir à l'opacité `a` multiplie chaque canal sRGB par `1 - a` ;
       la luminance relative passe par la puissance 2,4 de la linéarisation.
       Le chiffre est écrit en clair à côté de la formule : si l'exposant
       changeait un jour sans raison, ce test le dirait. */
    expect(luminanceAssombrie(1, 0.4)).toBeCloseTo(0.6 ** 2.4, 12)
    expect(luminanceAssombrie(1, 0.4)).toBeCloseTo(0.2935, 4)
  })

  it('refuse de rendre une luminance négative', () => {
    expect(luminanceAssombrie(-0.3, 0.4)).toBe(0)
  })
})

describe('niveau de lisibilité', () => {
  it('suit les seuils WCAG, sans arrondi complaisant', () => {
    expect(niveau({ libelles: 'clair', voile: 0, ombre: 0, luminance: 0.4, contraste: 4.5 })).toBe('bonne')
    expect(niveau({ libelles: 'clair', voile: 0, ombre: 0, luminance: 0.4, contraste: 4.49 })).toBe('juste')
    expect(niveau({ libelles: 'clair', voile: 0, ombre: 0, luminance: 0.4, contraste: 3 })).toBe('juste')
    expect(niveau({ libelles: 'clair', voile: 0, ombre: 0, luminance: 0.4, contraste: 2.99 })).toBe('insuffisante')
  })

  /* Le défaut que ce test tient fermé : le titre disait « correcte » pour
     3,5:1, un rapport pourtant sous le seuil AA du petit texte. Un mot qui
     rassure au-dessous du seuil vaut moins que pas de mot du tout. */
  it('ne dit « bonne » qu’au-dessus du seuil AA du petit texte', () => {
    for (const contraste of [1, 2.5, 2.99, 3, 3.5, 4.49]) {
      expect(niveau({ libelles: 'clair', voile: 0, ombre: 0, luminance: 0.4, contraste }), String(contraste))
        .not.toBe('bonne')
    }
    expect(SEUIL_AA).toBe(4.5)
    expect(SEUIL_UI).toBe(3)
  })
})

/**
 * Le voile est devenu facultatif : quelqu'un qui le retire reçoit une image
 * plus claire que celle que la sonde a jugée, et le verdict doit porter sur ce
 * fichier-là. C'est la luminance gardée dans la mesure qui le permet.
 */
describe('voile retiré', () => {
  it('recalcule le rapport sur la luminance d’avant voile', () => {
    const L = 0.62
    const clair = sansVoile({ libelles: 'clair', voile: 0.3, ombre: 0, contraste: 4.2, luminance: L })
    expect(clair.voile).toBe(0)
    expect(clair.contraste).toBeCloseTo(1.05 / (L + 0.05), 6)
    const fonce = sansVoile({ libelles: 'sombre', voile: 0.2, ombre: 0, contraste: 9, luminance: L })
    expect(fonce.contraste).toBeCloseTo((L + 0.05) / 0.068, 6)
  })

  it('rend un fond clair moins lisible sous des libellés clairs', () => {
    /* Le sens de la variation est ce qui compte : le voile pousse le fond vers
       la couleur de libellé la plus sûre, donc le retirer fait toujours perdre
       du contraste. */
    const avec = { libelles: 'clair' as const, voile: 0.4, ombre: 0, contraste: 4.9, luminance: 0.7 }
    expect(sansVoile(avec).contraste).toBeLessThan(avec.contraste)
  })

  it('ne touche à rien quand la sonde n’a posé aucun voile', () => {
    const mesure = { libelles: 'clair' as const, voile: 0, ombre: 0, contraste: 6, luminance: 0.1 }
    expect(sansVoile(mesure)).toBe(mesure)
  })

  it('ne change ni la couleur de libellé ni la luminance mesurée', () => {
    const mesure = { libelles: 'sombre' as const, voile: 0.31, ombre: 0, contraste: 7, luminance: 0.5 }
    const nu = sansVoile(mesure)
    expect(nu.libelles).toBe(mesure.libelles)
    expect(nu.luminance).toBe(mesure.luminance)
  })
})
