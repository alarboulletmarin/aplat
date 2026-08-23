// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect, type RefObject } from 'react'

/**
 * Publie la hauteur des deux couches collantes en variables CSS, pour que la
 * réserve de défilement les suive. Sous 760 px seule la scène est collante ;
 * au-delà elle passe dans sa colonne et ne recouvre plus rien.
 */
export function useHauteursCollantes(
  scene: RefObject<HTMLElement | null>,
  barre: RefObject<HTMLElement | null>,
  revision: unknown,
): void {
  useEffect(() => {
    const poser = () => {
      const style = document.documentElement.style
      const etroit = window.innerWidth < 760
      style.setProperty('--scene-h', `${etroit ? (scene.current?.offsetHeight ?? 0) : 0}px`)
      style.setProperty('--barre-h', `${barre.current?.offsetHeight ?? 0}px`)
    }
    poser()
    window.addEventListener('resize', poser)
    return () => window.removeEventListener('resize', poser)
  }, [scene, barre, revision])
}
