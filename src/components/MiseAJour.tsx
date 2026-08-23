// SPDX-License-Identifier: AGPL-3.0-only

import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import type { Textes } from '../i18n'

/**
 * La note de mise à jour : DESIGN_SYSTEM.md, section 7.
 *
 * Une nouvelle version a été mise en cache par le Service Worker.
 *
 * L'utilisateur choisit le moment du rechargement : recharger sous ses doigts
 * ferait perdre le motif en cours. Le refus est proposé aussi franchement que
 * l'acceptation, sans compte à rebours ni urgence inventée.
 *
 * Le message « prête hors ligne » n'est volontairement pas affiché : c'est une
 * information sur l'application, pas sur le fond d'écran, et l'écran n'a pas
 * de canal de notification générique.
 */
export function MiseAJour({ textes }: { textes: Textes }) {
  const {
    needRefresh: [aBesoin, poserBesoin],
    updateServiceWorker,
  } = useRegisterSW()
  const [ecarte, setEcarte] = useState(false)

  if (!aBesoin || ecarte) return null

  return (
    <div className="note note-maj" role="status">
      <span className="note-maj-i" aria-hidden="true" />
      <div className="note-txt">
        <p className="note-t">{textes.miseAJour.texte}</p>
      </div>
      <div className="note-maj-actions">
        <button
          type="button"
          className="note-reessayer"
          onClick={() => {
            setEcarte(true)
            poserBesoin(false)
          }}
        >
          {textes.miseAJour.fermer}
        </button>
        <button
          type="button"
          className="note-reessayer note-maj-oui"
          onClick={() => void updateServiceWorker(true)}
        >
          {textes.miseAJour.action}
        </button>
      </div>
    </div>
  )
}
