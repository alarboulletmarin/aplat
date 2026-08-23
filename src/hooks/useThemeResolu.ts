// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect, useState } from 'react'
import type { Theme } from '../lib/url'

const SOMBRE = '(prefers-color-scheme: dark)'

/**
 * Le thème effectivement appliqué, « clair » ou « sombre ».
 *
 * « Système » est un choix, pas un thème : il est résolu ici, et l'attribut
 * `data-theme` du document ne porte jamais que l'une des deux valeurs réelles.
 * Sans ça, la feuille de style devrait déclarer le sombre deux fois, une fois
 * pour le choix explicite et une fois sous `prefers-color-scheme`, et les deux
 * copies finiraient par diverger.
 */
export function useThemeResolu(choix: Theme): 'clair' | 'sombre' {
  const [systemeSombre, setSystemeSombre] = useState(
    () => window.matchMedia(SOMBRE).matches,
  )

  useEffect(() => {
    const requete = window.matchMedia(SOMBRE)
    const surChangement = (evenement: MediaQueryListEvent) =>
      setSystemeSombre(evenement.matches)
    requete.addEventListener('change', surChangement)
    return () => requete.removeEventListener('change', surChangement)
  }, [])

  if (choix === 'clair' || choix === 'sombre') return choix
  return systemeSombre ? 'sombre' : 'clair'
}
