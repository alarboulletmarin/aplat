// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect, useState, type RefObject } from 'react'

/**
 * Vrai quand l'élément approche du champ de vision.
 *
 * Sert aux trente-sept vignettes de famille : sur un téléphone il y en a six
 * ou sept à l'écran, pas trente-sept, et chacune est un rendu complet du
 * moteur.
 * Sans navigateur qui sache observer, on répond « oui », car mieux vaut
 * dessiner pour rien qu'afficher des cases vides.
 */
export function useVisible(
  cible: RefObject<Element | null>,
  marge = '200px 0px',
): boolean {
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const noeud = cible.current
    if (!noeud || typeof IntersectionObserver === 'undefined') return
    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const entree of entrees) setVisible(entree.isIntersecting)
      },
      { rootMargin: marge },
    )
    observateur.observe(noeud)
    return () => observateur.disconnect()
  }, [cible, marge])

  return visible
}
