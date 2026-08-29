// SPDX-License-Identifier: AGPL-3.0-only

import { lazy } from 'react'
import type { Route } from './lib/route'

/**
 * Les trois documents, chargés à la demande, et de quoi les demander avant
 * qu'on en ait besoin.
 *
 * Le découpage du paquet part d'ici : ouvrir la présentation ne télécharge ni
 * l'application ni l'explication, et réciproquement. C'est ce qui rendait le
 * passage d'un document à l'autre coûteux tant que ce passage était un
 * chargement de document ; ce ne l'est plus, mais le morceau visé reste à
 * chercher, et le chercher au moment du clic se voit encore.
 *
 * D'où `precharger()`, que les liens appellent au survol et à la prise de
 * focus : le morceau part avant le clic, et le clic n'a plus qu'à rendre.
 * Le service worker précache tous les scripts (`vite.config.ts`), donc dès la
 * deuxième visite il n'y a même plus de réseau à attendre.
 *
 * Les trois imports dynamiques ne sont écrits qu'une fois. `lazy()` et
 * `precharger()` tirent le même appel, donc le même morceau, et la promesse
 * qu'un préchargement a déjà résolue est celle que `lazy()` retrouve : deux
 * listes séparées auraient fini par se désaccorder, et le préchargement aurait
 * silencieusement téléchargé à côté.
 */

const chargerAccueil = () => import('./components/accueil/Accueil')
const chargerApp = () => import('./App')
const chargerMoteur = () => import('./components/moteur/Moteur')

export const Accueil = lazy(() => chargerAccueil().then((m) => ({ default: m.Accueil })))
export const App = lazy(() => chargerApp().then((m) => ({ default: m.App })))
export const Moteur = lazy(() => chargerMoteur().then((m) => ({ default: m.Moteur })))

const MORCEAUX: Record<Route, () => Promise<unknown>> = {
  accueil: chargerAccueil,
  app: chargerApp,
  moteur: chargerMoteur,
}

/**
 * Demande le morceau d'un document sans l'afficher.
 *
 * L'échec est avalé, et c'est voulu : un préchargement est un pari, pas une
 * promesse. Hors ligne devant un morceau que le précache n'a pas, le pari est
 * perdu sans que personne n'ait rien demandé, et une promesse rejetée que
 * personne n'attend salit la console pour rien. Si le clic vient quand même,
 * `lazy()` refait la tentative, et c'est elle qui a le droit d'échouer, à
 * l'endroit où l'échec se voit.
 */
export function precharger(page: Route): void {
  void MORCEAUX[page]().catch(() => {})
}
