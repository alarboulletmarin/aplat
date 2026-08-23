// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Le choix du dictionnaire, et le remplissage des jetons.
 *
 * Deux fonctions, pas une bibliothèque : deux langues connues à la compilation
 * ne demandent ni détection, ni chargement différé, ni pluriels. Le français
 * fait foi et l'anglais en tire son type, si bien qu'une clé manquante
 * n'atteint jamais l'exécution.
 */
import type { Langue } from '../lib/moteur'
import { fr, type Textes } from './fr'
import { en } from './en'

export type { Textes }

export const DICTIONNAIRES: Record<Langue, Textes> = { fr, en }

export function textes(langue: Langue): Textes {
  return DICTIONNAIRES[langue] ?? fr
}

/** Remplace les jetons `{nom}` d'un libellé. */
export function remplir(gabarit: string, valeurs: Record<string, string>): string {
  return gabarit.replace(/\{(\w+)\}/g, (entier, cle: string) =>
    Object.prototype.hasOwnProperty.call(valeurs, cle) ? valeurs[cle] : entier,
  )
}
