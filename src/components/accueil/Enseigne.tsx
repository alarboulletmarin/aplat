// SPDX-License-Identifier: AGPL-3.0-only

import type { Langue } from '../../lib/moteur'
import type { Theme } from '../../lib/url'
import type { Textes } from '../../i18n'
import { Bascules } from './Bascules'

/**
 * L'enseigne : la marque, les deux bascules d'affichage, et l'entrée dans
 * l'application.
 *
 * Elle reste épinglée en haut. C'est la seule chose de la page qui ne défile
 * pas, et c'est voulu : quelqu'un convaincu au tiers de la page ne doit pas
 * avoir à remonter ou à descendre pour trouver la porte.
 */
export function Enseigne({
  langue,
  resolu,
  textes,
  lien,
  onLangue,
  onTheme,
}: {
  langue: Langue
  resolu: 'clair' | 'sombre'
  textes: Textes
  /** Le lien vers l'application, langue et thème déjà posés. */
  lien: string
  onLangue: (langue: Langue) => void
  onTheme: (theme: Theme) => void
}) {
  return (
    <header className="enseigne">
      <a className="enseigne-marque" href={lien}>
        <span className="marque marque-nav" aria-hidden="true">
          <i />
          <b />
        </span>
        <span className="enseigne-mot">{textes.entete.titre}</span>
      </a>

      <div className="enseigne-droite">
        <Bascules
          langue={langue}
          resolu={resolu}
          textes={textes}
          onLangue={onLangue}
          onTheme={onTheme}
        />
        <a className="enseigne-app" href={lien}>
          {textes.accueil.enseigne.ouvrir}
        </a>
      </div>
    </header>
  )
}
