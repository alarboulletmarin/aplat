// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ces tests protègent : que la boîte de l'appareil porte le rapport
 * d'aspect du fichier visé, bordure défalquée. C'est ce qui rend l'aperçu
 * concluant ; un écart de 1,5 % suffisait à mesurer la lisibilité d'une image
 * qui n'existait pas.
 *
 * Ce qu'ils ne couvrent pas : le rendu réel de la maquette, qui dépend de la
 * mise en page et se vérifie dans `tools/overflow.js`.
 */
import { describe, expect, it } from 'vitest'
import { BORDURE_APPAREIL, geometrieAppareil, hauteurScene, jetonsLibelle } from './geometrie'

const BOITE = { largeur: 340, hauteur: 420 }

describe('boîte de l’appareil', () => {
  it('porte le rapport d’aspect du fichier sur la boîte de bordure', () => {
    /* Le canevas est en inset:0 : c'est la boîte de bordure qui doit porter le
       rapport, sinon on mesure la lisibilité d'une image qui n'existe pas. */
    const g = geometrieAppareil(BOITE, { largeur: 1179, hauteur: 2556 }, 'telephone')!
    const bord = 2 * BORDURE_APPAREIL
    const rapport = (g.largeur - bord) / (g.hauteur - bord)
    expect(rapport).toBeCloseTo(1179 / 2556, 2)
  })

  it('tient dans la boîte, quel que soit le format', () => {
    for (const resolution of [
      { largeur: 1179, hauteur: 2556 },
      { largeur: 2560, hauteur: 1440 },
      { largeur: 2048, hauteur: 2732 },
      { largeur: 8000, hauteur: 16 },
    ]) {
      const g = geometrieAppareil(BOITE, resolution, 'telephone')!
      expect(g.hauteur).toBeLessThanOrEqual(Math.max(200, BOITE.hauteur))
    }
  })

  it('donne un module et des colonnes cohérents avec l’appareil', () => {
    const telephone = geometrieAppareil(BOITE, { largeur: 1179, hauteur: 2556 }, 'telephone')!
    const bureau = geometrieAppareil(BOITE, { largeur: 2560, hauteur: 1440 }, 'ordinateur')!
    expect(telephone.colonnes).toBe(4)
    expect(bureau.colonnes).toBe(6)
    expect(telephone.module).toBeCloseTo(Math.min(telephone.largeur, telephone.hauteur) / 100, 6)
  })

  it('ne rend rien tant qu’il n’y a pas de résolution', () => {
    expect(geometrieAppareil(BOITE, { largeur: 0, hauteur: 0 }, 'telephone')).toBeNull()
  })
})

describe('hauteur de la scène', () => {
  it('prend une part de l’écran, jamais tout', () => {
    for (const fenetre of [
      { largeur: 320, hauteur: 480 },
      { largeur: 390, hauteur: 844 },
      { largeur: 1440, hauteur: 900 },
      { largeur: 1920, hauteur: 2400 },
    ]) {
      expect(hauteurScene(fenetre)).toBeLessThan(fenetre.hauteur)
      expect(hauteurScene(fenetre)).toBeGreaterThanOrEqual(214)
    }
  })
})

describe('jetons de libellé', () => {
  it('inverse le couple libellé / fond selon la mesure', () => {
    expect(jetonsLibelle('clair')['--libelle']).toBe('#F7F3E6')
    expect(jetonsLibelle('clair')['--libelle-inv']).toBe('#17243F')
    expect(jetonsLibelle('sombre')['--libelle']).toBe('#17243F')
  })

  it('publie les huit opacités attendues par la maquette', () => {
    const jetons = jetonsLibelle('clair')
    for (const opacite of [14, 15, 16, 20, 24, 26, 28, 90]) {
      expect(jetons[`--l${opacite}`]).toBeTruthy()
    }
  })
})
