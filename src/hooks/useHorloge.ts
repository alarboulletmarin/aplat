// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect, useState } from 'react'
import { heure, locale } from '../lib/format'
import type { Langue } from '../lib/moteur'

export interface Instant {
  heure: string
  quantieme: string
  jour: string
  mois: string
}

function instant(langue: Langue): Instant {
  const maintenant = new Date()
  return {
    heure: heure(maintenant, langue),
    quantieme: String(maintenant.getDate()),
    jour: maintenant.toLocaleDateString(locale(langue), { weekday: 'long' }),
    mois: maintenant.toLocaleDateString(locale(langue), { month: 'long' }),
  }
}

/**
 * L'heure de la maquette.
 *
 * Elle se met en veille quand l'onglet passe en arrière-plan — une horloge
 * factice n'a aucune raison de réveiller un téléphone toutes les vingt
 * secondes. Elle surveille aussi le quantième : à minuit, l'heure changeait
 * mais la date restait celle de la veille.
 */
export function useHorloge(langue: Langue): Instant {
  const [valeur, setValeur] = useState<Instant>(() => instant(langue))

  useEffect(() => {
    setValeur(instant(langue))
    let minuterie: ReturnType<typeof setInterval> | undefined

    const battre = () => setValeur(instant(langue))
    const demarrer = () => {
      if (minuterie) clearInterval(minuterie)
      battre()
      minuterie = setInterval(battre, 20000)
    }
    const surVisibilite = () => {
      if (document.hidden) {
        if (minuterie) clearInterval(minuterie)
        minuterie = undefined
      } else {
        demarrer()
      }
    }

    demarrer()
    document.addEventListener('visibilitychange', surVisibilite)
    return () => {
      if (minuterie) clearInterval(minuterie)
      document.removeEventListener('visibilitychange', surVisibilite)
    }
  }, [langue])

  return valeur
}
