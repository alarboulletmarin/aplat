// SPDX-License-Identifier: AGPL-3.0-only

import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import { CHEMIN_ACCUEIL, CHEMIN_APP, CHEMIN_MOTEUR, redirection } from './lib/route'
import { Accueil, App, Moteur } from './pages'
import { Arrivee } from './components/Arrivee'
import { Repli } from './components/Repli'
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
   clignoter une page qui n'était pas celle qu'on demandait. C'est le seul
   endroit qui recharge encore le document, et c'est justifié, puisqu'il
   s'agit précisément de ne rien rendre de la page qu'on quitte. */
const ailleurs = redirection(window.location.pathname, window.location.search)
if (ailleurs) {
  window.location.replace(ailleurs)
}

const racine = document.getElementById('root')
if (!racine) {
  throw new Error('Élément racine introuvable.')
}

/* Une seule page est montée à la fois : les trois ne partagent ni état ni
   mise en page, et l'application reste l'écran unique décrit par les notes de
   conception. Ce qui change, c'est le prix du passage. Il était d'un
   chargement de document, avec son écran vide et son démarrage de React à
   zéro ; il est maintenant d'un rendu, et du morceau de la page visée, que
   les liens demandent d'avance au survol (`components/Lien.tsx`).

   `fallback={null}` reste : il ne sert plus qu'au tout premier affichage, où
   il n'y a rien à garder à l'écran et où la page porte déjà son fond par le
   script d'index.html. Passé celui-là, il ne se voit pas. React Router pousse
   ses changements d'adresse dans une transition, et React garde alors la page
   en place tant que la suivante n'est pas prête, au lieu de la remplacer par
   le vide, ce qui est exactement le clignotement qu'on cherchait à retirer. */
if (!ailleurs) {
  createRoot(racine).render(
    <StrictMode>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path={CHEMIN_ACCUEIL} element={<Accueil />} />
            <Route path={CHEMIN_APP} element={<App />} />
            <Route path={CHEMIN_MOTEUR} element={<Moteur />} />
            <Route path="*" element={<Repli />} />
          </Routes>
          {/* Après les routes, et à l'intérieur de la même frontière : ses
              effets tournent une fois la page arrivée montée, donc une fois
              son titre posé. */}
          <Arrivee />
        </Suspense>
      </BrowserRouter>
    </StrictMode>,
  )
}
