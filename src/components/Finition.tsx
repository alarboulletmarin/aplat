// SPDX-License-Identifier: AGPL-3.0-only

import type { ReactNode } from 'react'
import type { Textes } from '../i18n'
import { Arche } from './Arche'

/**
 * La finition : version, tirage et écran, repliés sous une seule ligne.
 *
 * Le panneau portait dix cartes de même poids, et trois seulement décident de
 * l'image qu'on est venu chercher : la famille, la palette, la densité. Les
 * trois autres sont des réglages du fichier qu'on touche rarement, et qu'on
 * revoit une fois le motif trouvé. Elles restent dans le panneau, et non dans
 * la feuille d'export : elles changent l'aperçu, et la feuille le recouvre.
 * Un réglage qu'on ne peut pas juger en le faisant est un réglage à l'aveugle.
 *
 * Repliée, la section dit son contenu en une ligne (« Claire, Net, Accueil ») :
 * rien n'est caché sans que ce qu'elle contient soit lisible. Elle s'ouvre
 * d'elle-même quand le motif sort des valeurs d'origine, un lien partagé avec
 * une version sombre ne doit pas cacher qu'il en porte une.
 *
 * Un bouton et une région masquée plutôt qu'un `<details>` : c'est le geste du
 * verdict replié, et l'identifiant visé par `aria-controls` existe avant le
 * dépli.
 */
export function Finition({
  ouverte,
  resume,
  textes,
  onBascule,
  children,
}: {
  ouverte: boolean
  /** Les trois choix en cours, déjà mis en mots. */
  resume: string
  textes: Textes
  onBascule: () => void
  children: ReactNode
}) {
  return (
    <div className="bento finition">
      <h2 className="carte-h finition-h" id="h-finition">
        <button
          type="button"
          id="finition-bascule"
          className="finition-bascule"
          aria-expanded={ouverte}
          aria-controls="finition-corps"
          onClick={onBascule}
        >
          <Arche />
          <span className="finition-t">{textes.reglages.finition}</span>
          <span className="finition-r">{resume}</span>
          <span className="finition-chevron" aria-hidden="true" />
        </button>
      </h2>
      <div className="finition-corps" id="finition-corps" hidden={!ouverte}>
        {children}
      </div>
    </div>
  )
}
