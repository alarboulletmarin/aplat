// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect, useState, type RefObject } from 'react'

export interface Taille {
  largeur: number
  hauteur: number
}

/**
 * La taille rendue d'un élément, tenue à jour.
 *
 * Le canevas dessine en pixels d'appareil : il lui faut la mesure réelle de sa
 * boîte, pas la valeur demandée en CSS. Un `ResizeObserver` la donne à chaque
 * changement de mise en page — rotation, repli de la barre d'URL, arrivée des
 * polices — sans écouter `resize`, qui manque la moitié de ces cas.
 */
export function useTaille(cible: RefObject<Element | null>): Taille {
  const [taille, setTaille] = useState<Taille>({ largeur: 0, hauteur: 0 })

  useEffect(() => {
    const noeud = cible.current
    if (!noeud) return

    const relever = () => {
      const boite = noeud.getBoundingClientRect()
      setTaille((precedente) =>
        Math.abs(precedente.largeur - boite.width) < 0.5 &&
        Math.abs(precedente.hauteur - boite.height) < 0.5
          ? precedente
          : { largeur: boite.width, hauteur: boite.height },
      )
    }

    relever()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', relever)
      return () => window.removeEventListener('resize', relever)
    }
    const observateur = new ResizeObserver(relever)
    observateur.observe(noeud)
    return () => observateur.disconnect()
  }, [cible])

  return taille
}

/**
 * La fenêtre, sans amortissement : la hauteur de la scène en dépend, et un
 * retard s'y verrait comme un saut. Le repli de la barre d'URL sur téléphone
 * déclenche cet événement en rafale — d'où un état qui ne change que si la
 * valeur change vraiment.
 */
export function useTailleFenetre(): Taille {
  const [taille, setTaille] = useState<Taille>(() => ({
    largeur: typeof window === 'undefined' ? 390 : window.innerWidth,
    hauteur: typeof window === 'undefined' ? 844 : window.innerHeight,
  }))

  useEffect(() => {
    const relever = () =>
      setTaille((precedente) =>
        precedente.largeur === window.innerWidth && precedente.hauteur === window.innerHeight
          ? precedente
          : { largeur: window.innerWidth, hauteur: window.innerHeight },
      )
    relever()
    window.addEventListener('resize', relever)
    return () => window.removeEventListener('resize', relever)
  }, [])

  return taille
}
