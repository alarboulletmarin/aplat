// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect, useState } from 'react'

/**
 * Les deux seuils du repli. L'écart entre eux n'est pas décoratif : avec un
 * seuil unique, le repli de la scène raccourcit le document, la position de
 * défilement retombe sous le seuil, la scène se déplie, le document rallonge,
 * et l'aperçu clignote. Quatre-vingt-quatre pixels d'écart valent plus que
 * n'en gagne un repli.
 */
const SEUIL_REPLI = 140
const SEUIL_DEPLI = 56

/**
 * Vrai dès que la page a défilé assez pour que l'aperçu se replie.
 *
 * L'écouteur est passif et ne fait qu'une comparaison : il ne rend que sur les
 * deux franchissements, pas à chaque pixel. La valeur est relevée une première
 * fois au montage, parce qu'un rechargement peut restaurer une position de
 * défilement.
 */
export function useDefilement(): boolean {
  const [defile, setDefile] = useState(false)

  useEffect(() => {
    let etat = false
    const relever = () => {
      const suivant = window.scrollY > (etat ? SEUIL_DEPLI : SEUIL_REPLI)
      if (suivant === etat) return
      etat = suivant
      setDefile(suivant)
    }
    relever()
    window.addEventListener('scroll', relever, { passive: true })
    return () => window.removeEventListener('scroll', relever)
  }, [])

  return defile
}
