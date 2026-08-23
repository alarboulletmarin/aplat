// SPDX-License-Identifier: AGPL-3.0-only

import { useLayoutEffect, useRef, useState, type RefObject } from 'react'

/**
 * Combien d'éléments tiennent dans le cadre.
 *
 * La grille d'icônes est dimensionnée en modules `--mu`, eux-mêmes calés sur le
 * petit côté de l'appareil. Un écran large — tablette en 4:3, ordinateur en
 * 16:9 — est proportionnellement moins haut qu'un téléphone : la grille
 * complète débordait alors par le bas et emportait le dock et la barre de
 * recherche hors du cadre. On retire des rangées jusqu'à ce que tout tienne,
 * pour que la zone basse du fond d'écran reste jugeable elle aussi.
 *
 * `signature` remet le compte à plein dès que la géométrie ou la langue
 * changent : sans ça, un cadre redevenu grand resterait amputé.
 */
export function useAjustement(
  cadre: RefObject<HTMLElement | null>,
  pas: number,
  total: number,
  signature: string,
): number {
  const [nombre, setNombre] = useState(total)
  const derniere = useRef(signature)

  useLayoutEffect(() => {
    if (derniere.current !== signature) {
      derniere.current = signature
      setNombre(total)
      return
    }
    const boite = cadre.current
    if (!boite) return
    if (boite.scrollHeight > boite.clientHeight + 1 && nombre > pas) {
      setNombre((n) => Math.max(pas, n - pas))
    }
  })

  return Math.min(nombre, total)
}
