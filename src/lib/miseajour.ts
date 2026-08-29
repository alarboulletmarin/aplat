// SPDX-License-Identifier: AGPL-3.0-only

import { useCallback, useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'

/**
 * L'enregistrement du service worker, et l'attente d'une version prête.
 *
 * C'est une affaire de document, pas de composant, et cette distinction
 * n'était pas visible tant que l'application n'était montée qu'une fois par
 * chargement de page. Elle l'est devenue le jour où passer d'un document à
 * l'autre a cessé de recharger : `useRegisterSW()`, le crochet fourni par le
 * greffon, enregistre à chaque montage et n'a rien à défaire au démontage,
 * si bien qu'un aller-retour entre la présentation et l'application laissait
 * derrière lui un client Workbox de plus, avec ses écouteurs. Trois par
 * passage, dans un onglet qu'on garde ouvert toute la journée.
 *
 * L'enregistrement a donc lieu ici, une fois, au premier import de ce module,
 * et il ne se refait jamais. Ce qui change, c'est seulement la réponse à la
 * question « une version attend-elle ? », que les composants lisent par
 * `useMiseAJour()`.
 *
 * `registerType: 'prompt'` (voir `vite.config.ts`) : le rechargement est
 * proposé, jamais imposé. Recharger sous les doigts de quelqu'un lui ferait
 * perdre le motif en cours.
 */

let attend = false
const abonnes = new Set<() => void>()

function annoncer(valeur: boolean) {
  if (attend === valeur) return
  attend = valeur
  for (const prevenir of abonnes) prevenir()
}

/* L'enregistrement lui-même, au premier import. `appliquer()` demande au
   service worker en attente de prendre la main ; c'est lui qui recharge la
   page ensuite, et non nous. */
const appliquer = registerSW({
  immediate: true,
  onNeedRefresh: () => annoncer(true),
})

function abonner(prevenir: () => void) {
  abonnes.add(prevenir)
  return () => {
    abonnes.delete(prevenir)
  }
}

/**
 * Une version attend-elle, et que faire d'elle.
 *
 * `ecarter()` referme la note sans rien appliquer : la version attendra le
 * prochain chargement, ce qui est exactement ce que « Plus tard » promet.
 */
export function useMiseAJour(): {
  attend: boolean
  appliquer: () => void
  ecarter: () => void
} {
  const valeur = useSyncExternalStore(
    abonner,
    () => attend,
    /* Rendu hors navigateur : aucune version n'attend, il n'y a pas de
       service worker pour en poser une. */
    () => false,
  )

  return {
    attend: valeur,
    appliquer: useCallback(() => void appliquer(true), []),
    ecarter: useCallback(() => annoncer(false), []),
  }
}
