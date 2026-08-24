// SPDX-License-Identifier: AGPL-3.0-only

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Motif } from '../lib/moteur'
import {
  ajouter, basculer, ecrire, effacer, identique, lire, versEntree, type Entree,
} from '../lib/historique'

/**
 * Le temps qu'un motif doit rester à l'écran avant d'entrer dans l'historique.
 *
 * Sans ce délai, parcourir les trente-sept familles au doigt remplirait la liste
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
  epingler: () => void
  oublier: () => void
} {
  const [liste, setListe] = useState<Entree[]>(lire)

  /* Le motif en cours, lu par `epingler` sans entrer dans ses dépendances :
     un rappel qui change d'identité à chaque réglage refait le rendu de la
     carte entière, donc des dix vignettes. */
  const courant = useRef(motif)
  useEffect(() => {
    courant.current = motif
  }, [motif])

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

  /**
   * Épingle ou désépingle le motif en cours.
   *
   * Il n'a pas à attendre les deux secondes et demie : épingler est un geste,
   * pas un passage, et faire répondre « pas encore » à un bouton qu'on vient
   * d'appuyer serait le pire des deux mondes. Le motif entre donc dans la
   * liste au moment de l'épingle s'il n'y était pas.
   */
  const epingler = useCallback(() => {
    setListe((precedente) => {
      const entree = versEntree(courant.current)
      const base = precedente.some((autre) => identique(autre, entree))
        ? precedente
        : (ajouter(precedente, entree) as Entree[])
      const suivante = basculer(base, entree)
      if (suivante === precedente) return precedente
      ecrire(suivante)
      return suivante as Entree[]
    })
  }, [])

  const oublier = useCallback(() => {
    effacer()
    setListe([])
  }, [])

  return { liste, epingler, oublier }
}
