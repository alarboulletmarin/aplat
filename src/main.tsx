// SPDX-License-Identifier: AGPL-3.0-only

import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { redirection, route } from './lib/route'
// tokens.css d'abord : tout le reste s'y réfère.
import './styles/tokens.css'
import './styles/reset.css'
import './styles/base.css'
import './styles/composants.css'
import './styles/ecrans.css'
import './styles/accueil.css'

/* En différé : une seule des deux pages est montée, et l'import paresseux
   coupe le paquet en deux, si bien qu'ouvrir la présentation ne télécharge pas
   l'application, ni l'inverse.

   La règle ci-dessous veille au rafraîchissement à chaud des fichiers de
   composants ; ce fichier est l'entrée, il ne se rafraîchit qu'en entier. */
/* eslint-disable react-refresh/only-export-components */
const App = lazy(() => import('./App').then((m) => ({ default: m.App })))
const Accueil = lazy(() =>
  import('./components/accueil/Accueil').then((m) => ({ default: m.Accueil })),
)
/* eslint-enable react-refresh/only-export-components */

/* Les liens partagés du temps où l'application vivait à la racine portent un
   motif que quelqu'un a voulu transmettre. Ils sont reconduits sous « /app »
   avant tout rendu : monter la présentation puis sauter ailleurs ferait
   clignoter une page qui n'était pas celle qu'on demandait. */
const ailleurs = redirection(window.location.pathname, window.location.search)
if (ailleurs) {
  window.location.replace(ailleurs)
}

const racine = document.getElementById('root')
if (!racine) {
  throw new Error('Élément racine introuvable.')
}

/* Une seule page est montée, jamais les deux : elles ne partagent ni état ni
   mise en page, et un aller-retour entre elles est un chargement de document.
   C'est ce qui garde l'application telle qu'elle était, un écran unique. */
if (!ailleurs) {
  createRoot(racine).render(
    <StrictMode>
      {/* Rien pendant le chargement du morceau : la page porte déjà son fond
          par le script d'index.html, un squelette ne ferait que clignoter. */}
      <Suspense fallback={null}>
        {route(window.location.pathname) === 'app' ? <App /> : <Accueil />}
      </Suspense>
    </StrictMode>,
  )
}
