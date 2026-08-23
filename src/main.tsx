// SPDX-License-Identifier: AGPL-3.0-only

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
// tokens.css d'abord : tout le reste s'y réfère.
import './styles/tokens.css'
import './styles/reset.css'
import './styles/base.css'
import './styles/composants.css'
import './styles/ecrans.css'

const racine = document.getElementById('root')
if (!racine) {
  throw new Error('Élément racine introuvable.')
}

createRoot(racine).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
