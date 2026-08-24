// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect, useState } from 'react'

/**
 * Vrai quand la page doit calculer moins.
 *
 * Deux signaux, et ils disent la même chose de deux façons. `Save-Data` est une
 * demande explicite : « ménage ma connexion et mon appareil ». Le mouvement
 * réduit en est une autre, moins directe mais qui vient souvent des mêmes
 * réglages d'économie, et dont le respect ne coûte rien ici.
 *
 * Ce qu'ils changent : la page d'accueil aligne quinze rendus du moteur, et
 * chacun est un vrai dessin. À deux pixels par point sur un téléphone, cela
 * fait quatre fois plus de surface à peindre qu'à un. En économie, on descend à
 * un, et les toiles se peignent quand le fil principal est libre plutôt que
 * toutes à la première frame. La page montre exactement les mêmes motifs, un
 * peu moins finement, et sans pic à l'ouverture.
 *
 * L'application, elle, n'est pas concernée : un aperçu grossier y serait un
 * mensonge, puisque l'aperçu est le fichier.
 */
export function useEconomie(): boolean {
  const [economie, setEconomie] = useState(mesurer)

  useEffect(() => {
    const requete = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!requete?.addEventListener) return
    const relever = () => setEconomie(mesurer())
    requete.addEventListener('change', relever)
    return () => requete.removeEventListener('change', relever)
  }, [])

  return economie
}

interface Connexion {
  saveData?: boolean
}

function mesurer(): boolean {
  try {
    const connexion = (navigator as Navigator & { connection?: Connexion }).connection
    if (connexion?.saveData) return true
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  } catch {
    /* Navigateur sans `matchMedia` ni `connection` : on peint normalement. */
    return false
  }
}
