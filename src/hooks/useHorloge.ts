// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect, useMemo, useState } from 'react'
import { heure, locale } from '../lib/format'
import type { Langue } from '../lib/moteur'

export interface Instant {
  heure: string
  quantieme: string
  jour: string
  mois: string
}

function formater(date: Date, langue: Langue): Instant {
  return {
    heure: heure(date, langue),
    quantieme: String(date.getDate()),
    jour: date.toLocaleDateString(locale(langue), { weekday: 'long' }),
    mois: date.toLocaleDateString(locale(langue), { month: 'long' }),
  }
}

/**
 * L'heure de la maquette.
 *
 * L'état ne garde qu'une date ; le formatage se fait au rendu. Changer de
 * langue ne demande donc aucun effet, et l'horloge n'a qu'une seule raison de
 * battre : le temps qui passe.
 *
 * Elle se met en veille quand l'onglet passe en arrière-plan. Une horloge
 * factice n'a aucune raison de réveiller un téléphone toutes les vingt
 * secondes, et au retour elle rattrape son retard d'un coup. Le quantième suit
 * la même date que l'heure : à minuit, l'heure changeait et la date restait
 * celle de la veille.
 */
export function useHorloge(langue: Langue): Instant {
  const [maintenant, setMaintenant] = useState(() => new Date())

  useEffect(() => {
    let minuterie: ReturnType<typeof setInterval> | undefined

    const battre = () => setMaintenant(new Date())
    const demarrer = () => {
      if (minuterie) clearInterval(minuterie)
      minuterie = setInterval(battre, 20000)
    }
    const surVisibilite = () => {
      if (document.hidden) {
        if (minuterie) clearInterval(minuterie)
        minuterie = undefined
      } else {
        battre()
        demarrer()
      }
    }

    /* Pas de battement au montage : l'état porte déjà l'heure qu'il est. */
    demarrer()
    document.addEventListener('visibilitychange', surVisibilite)
    return () => {
      if (minuterie) clearInterval(minuterie)
      document.removeEventListener('visibilitychange', surVisibilite)
    }
  }, [])

  return useMemo(() => formater(maintenant, langue), [maintenant, langue])
}
