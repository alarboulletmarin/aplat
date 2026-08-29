// SPDX-License-Identifier: AGPL-3.0-only

import { useLocation } from 'react-router'
import { route } from '../lib/route'
import { Accueil, App, Moteur } from '../pages'

/**
 * Ce que sert une adresse qui n'est aucun des trois chemins écrits.
 *
 * `route()` garde le dernier mot sur le chemin. Il tolère la casse et les
 * barres obliques en trop (« /App/ », « /moteur// »), et ses tests tiennent
 * cette tolérance depuis la version à deux documents : la table de routage de
 * `main.tsx` ne connaît que les trois adresses canoniques, celles que les
 * liens écrivent, et tout ce qui s'en écarte passe par ici plutôt que de se
 * perdre.
 *
 * Le reste retombe sur la présentation, parce qu'une adresse inventée doit
 * montrer le produit plutôt qu'une page d'erreur. C'est déjà ce que faisait la
 * version à deux documents.
 */
export function Repli() {
  const page = route(useLocation().pathname)
  return page === 'app' ? <App /> : page === 'moteur' ? <Moteur /> : <Accueil />
}
