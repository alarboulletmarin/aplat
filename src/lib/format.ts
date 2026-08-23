// SPDX-License-Identifier: AGPL-3.0-only

import type { Langue } from './moteur'

const LOCALES: Record<Langue, string> = { fr: 'fr-FR', en: 'en-US' }

export function locale(langue: Langue): string {
  return LOCALES[langue]
}

/** Un entier avec ses séparateurs de milliers : 2 556, pas 2556. */
export function nombre(valeur: number, langue: Langue): string {
  return valeur.toLocaleString(LOCALES[langue])
}

/** Une décimale, virgule en français. */
export function decimal(valeur: number, langue: Langue): string {
  const texte = valeur.toFixed(1)
  return langue === 'fr' ? texte.replace('.', ',') : texte
}

/**
 * Le poids du fichier. Sous le mégaoctet on affiche des kilooctets : « 262 Ko »
 * dit ce que « 0,3 Mo » cache, et le poids fait partie du résultat.
 */
export function poids(
  octets: number, langue: Langue, uniteKo: string, uniteMo: string,
): string {
  return octets < 1048576
    ? `${nombre(Math.round(octets / 1024), langue)} ${uniteKo}`
    : `${decimal(octets / 1048576, langue)} ${uniteMo}`
}

/** L'heure de la maquette, au format de la langue affichée. */
export function heure(date: Date, langue: Langue): string {
  return date.toLocaleTimeString(LOCALES[langue], { hour: '2-digit', minute: '2-digit' })
}
