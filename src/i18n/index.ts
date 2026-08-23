// SPDX-License-Identifier: AGPL-3.0-only

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
