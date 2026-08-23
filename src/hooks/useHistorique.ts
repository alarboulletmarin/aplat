// SPDX-License-Identifier: AGPL-3.0-only

import { useCallback, useEffect, useState } from 'react'
import type { Motif } from '../lib/moteur'
import { ajouter, ecrire, effacer, lire, versEntree, type Entree } from '../lib/historique'

/**
 * Le temps qu'un motif doit rester à l'écran avant d'entrer dans l'historique.
 *
 * Sans ce délai, parcourir les trente-deux familles au doigt remplirait la liste
 * de dix motifs traversés en deux secondes, et pousserait dehors celui qu'on
 * cherchait à retrouver. Deux secondes et demie séparent « je fais défiler »
 * de « je regarde ».
 */
export const DELAI = 2500

/**
 * L'historique des motifs regardés, tenu à jour.
 *
 * Rien n'est écrit tant que le motif n'a pas tenu l'écran ; rien n'est réécrit
 * quand il est déjà en tête. Un motif restauré ne remonte donc pas la liste à
 * chaque clic, il y est déjà.
 */
export function useHistorique(motif: Motif): {
  liste: Entree[]
  oublier: () => void
} {
  const [liste, setListe] = useState<Entree[]>(lire)

  useEffect(() => {
    const minuterie = setTimeout(() => {
      setListe((precedente) => {
        const suivante = ajouter(precedente, versEntree(motif))
        if (suivante === precedente) return precedente
        ecrire(suivante)
        return suivante as Entree[]
      })
    }, DELAI)
    return () => clearTimeout(minuterie)
  }, [motif])

  const oublier = useCallback(() => {
    effacer()
    setListe([])
  }, [])

  return { liste, oublier }
}
