// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ces tests protègent : une palette composée à la main est la deuxième
 * chose qu'Aplat écrit sur l'appareil, et la première qui voyage dans un lien.
 * Les deux chemins d'entrée sont hostiles par nature, un stockage se modifiant
 * à la main comme une barre d'adresse.
 *
 * Le point central est l'identifiant dérivé des couleurs. Il porte trois
 * garanties d'un coup : une palette modifiée ne peut pas hériter d'une mesure
 * de lisibilité calculée pour d'autres couleurs, la même composition faite deux
 * fois ne fait pas deux entrées, et un lien se vérifie tout seul puisque son
 * identifiant doit redonner ses couleurs.
 */
import { describe, expect, it } from 'vitest'
import { empreintePalette, enregistrerPalettes, estPalette, palette } from './moteur'
import {
  ajouter, analyser, composer, decoderTeintes, encoderTeintes, estCouleur,
  estPalettePerso, MAX_PALETTES, nettoyerNom, normaliserCouleur, paletteDeRequete,
  retirer, teintes, versPalette,
} from './palettes'

const LIME = composer('Ma marque', ['#F7F3E6', '#17243F', '#DFF478'])

describe('couleurs', () => {
  it('n’accepte que six chiffres hexadécimaux', () => {
    expect(estCouleur('#17243F')).toBe(true)
    expect(estCouleur('#17243f')).toBe(true)
    expect(estCouleur('17243F')).toBe(false)
    expect(estCouleur('#1724')).toBe(false)
    expect(estCouleur('rgb(1,2,3)')).toBe(false)
    expect(estCouleur(null)).toBe(false)
  })

  it('ramène toute saisie recevable à une seule forme', () => {
    for (const saisie of ['#17243f', '17243F', ' #17243F ', '#17243F']) {
      expect(normaliserCouleur(saisie)).toBe('#17243F')
    }
    expect(normaliserCouleur('#f0a')).toBe('#FF00AA')
    expect(normaliserCouleur('bleu')).toBe('')
  })

  it('range le fond en tête, comme le formulaire et comme le lien', () => {
    expect(teintes({ fond: '#000000', couleurs: ['#111111', '#222222'] })).toEqual([
      '#000000', '#111111', '#222222',
    ])
  })
})

describe('composition', () => {
  it('refuse hors des bornes plutôt que de rattraper', () => {
    expect(composer('a', ['#000000', '#111111'])).toBeNull()
    expect(composer('a', ['#000000', '#111111', '#222222'])).not.toBeNull()
    expect(
      composer('a', ['#000000', '#111111', '#222222', '#333333', '#444444', '#555555']),
    ).not.toBeNull()
    expect(
      composer('a', [
        '#000000', '#111111', '#222222', '#333333', '#444444', '#555555', '#666666',
      ]),
    ).toBeNull()
    expect(composer('a', ['#000000', '#111111', 'bleu'])).toBeNull()
  })

  it('nomme la palette par ses couleurs, quelle que soit leur casse', () => {
    const haut = composer('x', ['#F7F3E6', '#17243F', '#DFF478'])
    const bas = composer('y', ['#f7f3e6', '#17243f', '#dff478'])
    expect(haut?.id).toBe(bas?.id)
    expect(haut?.id).toBe(empreintePalette('#F7F3E6', ['#17243F', '#DFF478']))
  })

  it('change d’identifiant dès qu’une teinte change', () => {
    /* C'est ce qui empêche la mémoire de la sonde de rendre un voile calculé
       pour des couleurs qui ne sont plus là. */
    const avant = composer('x', ['#F7F3E6', '#17243F', '#DFF478'])
    const apres = composer('x', ['#F7F3E6', '#17243F', '#DFF479'])
    expect(avant?.id).not.toBe(apres?.id)
  })

  it('rogne le nom, sans caractère de contrôle ni blancs multiples', () => {
    expect(nettoyerNom('  ma   palette \n OLED  ')).toBe('ma palette OLED')
    expect(nettoyerNom('a'.repeat(60))).toHaveLength(24)
  })
})

describe('liste blanche du stockage', () => {
  it('refuse une entrée dont l’identifiant ne vient pas de ses couleurs', () => {
    const vraie = { ...LIME! }
    expect(estPalettePerso(vraie)).toBe(true)
    expect(estPalettePerso({ ...vraie, fond: '#000000' })).toBe(false)
    expect(estPalettePerso({ ...vraie, id: 'xdeadbeef' })).toBe(false)
  })

  it('refuse ce qui n’a pas la forme attendue', () => {
    expect(estPalettePerso(null)).toBe(false)
    expect(estPalettePerso({ id: 'x1', nom: 1, fond: '#000000', couleurs: [] })).toBe(false)
    expect(estPalettePerso({ ...LIME!, couleurs: ['#111111'] })).toBe(false)
  })

  it('relit une liste en écartant tout ce qui n’est pas recevable', () => {
    const brut = JSON.stringify([
      LIME,
      { id: 'xdeadbeef', nom: 'forgée', fond: '#000000', couleurs: ['#111111', '#222222'] },
      LIME,
      'texte',
      null,
    ])
    const liste = analyser(brut)
    expect(liste).toHaveLength(1)
    expect(liste[0].id).toBe(LIME!.id)
  })

  it('ne tombe pas devant un stockage abîmé', () => {
    expect(analyser(null)).toEqual([])
    expect(analyser('{')).toEqual([])
    expect(analyser('{"a":1}')).toEqual([])
  })

  it('borne la liste à douze, sans doublon', () => {
    let liste = analyser(null)
    for (let i = 0; i < 20; i += 1) {
      const teinte = `#0000${String(i).padStart(2, '0')}`
      const palette = composer(`p${i}`, ['#FFFFFF', '#000000', teinte])
      liste = ajouter(liste, palette!)
    }
    expect(liste).toHaveLength(MAX_PALETTES)
    expect(new Set(liste.map((p) => p.id)).size).toBe(MAX_PALETTES)
    /* La dernière composée est en tête : c'est celle qu'on vient de faire. */
    expect(liste[0].nom).toBe('p19')
  })

  it('remonte une palette recomposée à l’identique au lieu de la doubler', () => {
    const autre = composer('autre', ['#FFFFFF', '#000000', '#123456'])
    const liste = ajouter(ajouter([], LIME!), autre!)
    const encore = ajouter(liste, { ...LIME!, nom: 'renommée' })
    expect(encore).toHaveLength(2)
    expect(encore[0].nom).toBe('renommée')
  })

  it('retire par identifiant', () => {
    expect(retirer([LIME!], LIME!.id)).toEqual([])
    expect(retirer([LIME!], 'xautre')).toHaveLength(1)
  })
})

describe('l’adresse', () => {
  it('relit exactement les teintes qu’elle a écrites', () => {
    const ecrit = encoderTeintes(LIME!)
    expect(ecrit).toBe('F7F3E6-17243F-DFF478')
    expect(decoderTeintes(ecrit)).toEqual(teintes(LIME!))
  })

  it('refuse une suite de teintes hors bornes ou illisible', () => {
    expect(decoderTeintes(null)).toBeNull()
    expect(decoderTeintes('F7F3E6-17243F')).toBeNull()
    expect(decoderTeintes('F7F3E6-17243F-nope')).toBeNull()
    expect(decoderTeintes('01-02-03-04-05-06-07')).toBeNull()
  })

  it('n’accepte un lien que si l’identifiant redonne les couleurs', () => {
    const bon = `?p=${LIME!.id}&k=${encoderTeintes(LIME!)}`
    expect(paletteDeRequete(bon)?.id).toBe(LIME!.id)
    /* Une adresse forgée ne peut pas faire dire à un identifiant connu des
       couleurs qui ne sont pas les siennes. */
    expect(paletteDeRequete(`?p=${LIME!.id}&k=000000-111111-222222`)).toBeNull()
    expect(paletteDeRequete(`?p=lime&k=${encoderTeintes(LIME!)}`)).toBeNull()
    expect(paletteDeRequete(`?p=${LIME!.id}`)).toBeNull()
    expect(paletteDeRequete('')).toBeNull()
  })

  it('rend une palette reçue sans nom, et le moteur lui en donne un', () => {
    const recue = paletteDeRequete(`?p=${LIME!.id}&k=${encoderTeintes(LIME!)}`)
    expect(recue?.nom).toBe('')
    const pour = versPalette(recue!)
    expect(pour.fr).toBeTruthy()
    expect(pour.en).toBeTruthy()
    expect(pour.fr).not.toBe(pour.en)
  })
})

describe('registre du moteur', () => {
  it('rend une palette composée dessinable, et sa suppression la retire', () => {
    enregistrerPalettes([versPalette(LIME!)])
    expect(estPalette(LIME!.id)).toBe(true)
    expect(palette(LIME!.id as never).fond).toBe('#F7F3E6')
    enregistrerPalettes([])
    expect(estPalette(LIME!.id)).toBe(false)
    /* Une palette inconnue retombe sur la valeur par défaut, jamais sur une
       erreur : c'est la même règle que pour une adresse forgée. */
    expect(palette(LIME!.id as never).fr).toBe('Lime & crème')
  })

  it('refuse d’enregistrer sous un nom qui n’est pas celui d’une composée', () => {
    enregistrerPalettes([{ ...versPalette(LIME!), id: 'lime' }])
    expect(palette('lime').fr).toBe('Lime & crème')
    enregistrerPalettes([])
  })
})
