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
import {
  BORDURE_APPAREIL, geometrieAppareil, hauteurScene, hauteurVignette, jetonsLibelle,
  PAYSAGE_COURT, paysageCourt,
} from './geometrie'

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

  it('ne reconnaît le paysage court que couché et bas', () => {
    expect(paysageCourt({ largeur: 844, hauteur: 390 })).toBe(true)
    expect(paysageCourt({ largeur: 1180, hauteur: 550 })).toBe(true)
    expect(paysageCourt({ largeur: 390, hauteur: 844 })).toBe(false)
    expect(paysageCourt({ largeur: 1440, hauteur: 900 })).toBe(false)
    expect(paysageCourt({ largeur: 1440, hauteur: PAYSAGE_COURT + 1 })).toBe(false)
  })

  /* Le défaut que ce test tient fermé : en paysage, la scène gardait son
     plancher de 300 px, et le bas du téléphone comme le verdict passaient sous
     la barre d'action. La réserve doit suffire à la barre compacte (56 px),
     au verdict et aux marges de la scène, plus l'en-tête collant sous lequel
     la scène commence. */
  it('laisse la place de la barre et du verdict en paysage court', () => {
    for (const fenetre of [
      { largeur: 844, hauteur: 390 },
      { largeur: 932, hauteur: 430 },
      { largeur: 1180, hauteur: 550 },
      { largeur: 740, hauteur: 360 },
    ]) {
      const reste = fenetre.hauteur - hauteurScene(fenetre)
      expect(reste, `${fenetre.largeur}x${fenetre.hauteur}`).toBeGreaterThanOrEqual(198)
    }
  })

  it('ne touche pas aux fenêtres debout ni aux grands écrans', () => {
    expect(hauteurScene({ largeur: 390, hauteur: 844 })).toBe(338)
    expect(hauteurScene({ largeur: 1440, hauteur: 900 })).toBe(558)
    expect(hauteurScene({ largeur: 834, hauteur: 1112 })).toBe(600)
  })
})

describe('hauteur de la vignette', () => {
  /* La part est descendue de 22 à 18 % le jour où la barre a gagné sa ligne du
     voile : la place se reprend là où elle sert le moins, et une vignette de
     silhouette la supporte mieux qu'une grille de familles. */
  it('reste entre 98 et 156 px, proportionnée à la fenêtre', () => {
    expect(hauteurVignette({ largeur: 390, hauteur: 844 })).toBe(152)
    expect(hauteurVignette({ largeur: 320, hauteur: 568 })).toBe(102)
    expect(hauteurVignette({ largeur: 300, hauteur: 400 })).toBe(98)
    expect(hauteurVignette({ largeur: 430, hauteur: 1200 })).toBe(156)
  })

  it('rend au moins la moitié de l’écran aux grilles, sur un téléphone', () => {
    /* La recette : sur iPhone en portrait, une fois défilé, il doit rester au
       moins 55 % de la hauteur pour les motifs. La scène repliée vaut la
       vignette, ses marges (32 px) et le verdict d'une ligne (57 px) ; la
       barre d'action en vaut 138 depuis qu'elle porte la ligne du voile. */
    const fenetre = { largeur: 390, hauteur: 844 }
    const scene = hauteurVignette(fenetre) + 32 + 57
    const libre = (fenetre.hauteur - scene - 138) / fenetre.hauteur
    expect(libre).toBeGreaterThan(0.55)
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
