// SPDX-License-Identifier: AGPL-3.0-only

import type { ReactNode } from 'react'
import { Frise } from '../accueil/Frise'

/**
 * Le gabarit d'une étape : le rang, le titre, la note, la démonstration.
 *
 * Les six étapes sont dans le document, les unes sous les autres. Elles ne
 * défilent pas une à une derrière des flèches : ce serait un carrousel sous un
 * autre nom, ce que le design refuse, et ça cacherait à la lecture ce que la
 * page est censée expliquer.
 *
 * Le rang est `aria-hidden`, et le titre le double toujours. C'est la règle du
 * vocabulaire décoratif : un chiffre repère, il ne porte jamais une
 * information seule.
 *
 * La frise sépare les étapes comme elle sépare les sections de la
 * présentation. Le décalage change d'une étape à l'autre pour qu'aucune n'ait
 * la même entrée en matière, et les cinq hauteurs et sept couleurs de la frise
 * ne se répètent qu'au bout de trente-cinq arches, donc jamais dans l'une
 * d'elles.
 */
export function Etape({
  rang,
  cle,
  titre,
  note,
  children,
}: {
  /** Le numéro affiché, « 01 » à « 06 ». */
  rang: string
  /** Le fragment d'identifiant du titre, pour `aria-labelledby`. */
  cle: string
  titre: string
  note: string
  children: ReactNode
}) {
  return (
    <section className="etape" aria-labelledby={`h-${cle}`}>
      <div className="etape-tete">
        <span className="etape-n" aria-hidden="true">
          {rang}
        </span>
        <h2 className="section-titre" id={`h-${cle}`}>
          {titre}
        </h2>
        <p className="section-note">{note}</p>
      </div>
      <Frise decalage={Number(rang)} />
      <div className="etape-vue">{children}</div>
    </section>
  )
}
