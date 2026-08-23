// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect, type RefObject } from 'react'

/**
 * Publie la hauteur des trois couches collantes en variables CSS, pour que la
 * réserve de défilement les suive.
 *
 * `--bar` est la hauteur de l'en-tête, épinglé à toute largeur : la scène s'y
 * accroche (`top: var(--bar)`), et la réserve de défilement la compte toujours.
 * `--scene-h` ne vaut la hauteur de la scène que sous 360 px, la seule largeur
 * où la page est encore sur une colonne et où l'aperçu recouvre donc les
 * réglages. Dès 360 px il est dans sa colonne, à côté d'eux, et ne recouvre
 * plus rien. Le seuil est le même que celui de `.colonnes` dans `ecrans.css`.
 */
export function useHauteursCollantes(
  entete: RefObject<HTMLElement | null>,
  scene: RefObject<HTMLElement | null>,
  barre: RefObject<HTMLElement | null>,
  revision: unknown,
): void {
  useEffect(() => {
    const poser = () => {
      const style = document.documentElement.style
      const etroit = window.innerWidth < 360
      style.setProperty('--bar', `${entete.current?.offsetHeight ?? 0}px`)
      style.setProperty('--scene-h', `${etroit ? (scene.current?.offsetHeight ?? 0) : 0}px`)
      style.setProperty('--barre-h', `${barre.current?.offsetHeight ?? 0}px`)
    }
    poser()
    /* La scène se replie avec une transition : sa hauteur d'arrivée n'est
       connue qu'une fois celle-ci finie. On mesure donc deux fois, sans quoi
       la réserve de défilement reste celle de l'état précédent. */
    const differe = setTimeout(poser, 300)
    window.addEventListener('resize', poser)
    return () => {
      clearTimeout(differe)
      window.removeEventListener('resize', poser)
    }
  }, [entete, scene, barre, revision])
}
