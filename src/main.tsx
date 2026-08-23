// SPDX-License-Identifier: AGPL-3.0-only

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { Accueil } from './components/accueil/Accueil'
import { redirection, route } from './lib/route'
// tokens.css d'abord : tout le reste s'y réfère.
import './styles/tokens.css'
import './styles/reset.css'
import './styles/base.css'
import './styles/composants.css'
import './styles/ecrans.css'
import './styles/accueil.css'

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
      {route(window.location.pathname) === 'app' ? <App /> : <Accueil />}
    </StrictMode>,
  )
}
