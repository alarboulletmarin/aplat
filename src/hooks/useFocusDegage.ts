// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect } from 'react'

/**
 * Ramène l'élément qui vient de prendre le focus dans la bande libre, entre la
 * scène collante et la barre d'action.
 *
 * Sans ça, un élément atteint au clavier se colle au bord de la fenêtre,
 * c'est-à-dire sous l'une des deux couches, et son anneau de focus disparaît
 * (WCAG 2.2, 2.4.11). Les déclarations `scroll-padding` restent (elles servent
 * aux ancres et aux navigateurs qui les respectent), mais ni le défilement
 * déclenché par le focus ni `scrollIntoView` ne les appliquent aujourd'hui :
 * la correction fiable se fait ici.
 *
 * Les trois couches collantes sont écartées : ce qu'elles contiennent est
 * DANS une couche, jamais dessous, et défiler ne l'en dégagerait pas d'un
 * pixel. L'en-tête les a rejointes le jour où sa marque est devenue un lien :
 * sans cette sortie, un retour au clavier sur la marque faisait sauter la page
 * de la hauteur de la bande, pour rien.
 */
export function useFocusDegage(): void {
  useEffect(() => {
    const surFocus = (evenement: FocusEvent) => {
      const cible = evenement.target
      if (!(cible instanceof HTMLElement)) return
      if (cible.closest('.barre') || cible.closest('.scene') || cible.closest('.entete')) {
        return /* dans une couche collante, pas dessous */
      }

      const style = getComputedStyle(document.documentElement)
      const hautReserve = Number.parseFloat(style.scrollPaddingTop) || 0
      const basReserve = Number.parseFloat(style.scrollPaddingBottom) || 0
      const fenetre = window.innerHeight
      const boite = cible.getBoundingClientRect()
      if (boite.height > fenetre - hautReserve - basReserve) return /* trop grand */

      if (boite.top < hautReserve) window.scrollBy(0, boite.top - hautReserve)
      else if (boite.bottom > fenetre - basReserve) {
        window.scrollBy(0, boite.bottom - (fenetre - basReserve))
      }
    }

    document.addEventListener('focusin', surFocus)
    return () => document.removeEventListener('focusin', surFocus)
  }, [])
}
