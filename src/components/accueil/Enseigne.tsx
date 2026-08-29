// SPDX-License-Identifier: AGPL-3.0-only

import type { Langue } from '../../lib/moteur'
import { Lien } from '../Lien'
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
 *
 * La marque ramène ici, sur « / », et non dans l'outil : un logo ramène chez
 * soi, et la porte est déjà là, nommée, à droite. C'est le même geste que dans
 * l'application, où la marque est la seule sortie.
 */
export function Enseigne({
  langue,
  resolu,
  textes,
  accueil,
  lien,
  onLangue,
  onTheme,
}: {
  langue: Langue
  resolu: 'clair' | 'sombre'
  textes: Textes
  /** Le lien vers la présentation elle-même, langue et thème déjà posés. */
  accueil: string
  /** Le lien vers l'application, langue et thème déjà posés. */
  lien: string
  onLangue: (langue: Langue) => void
  onTheme: (theme: Theme) => void
}) {
  return (
    <header className="enseigne">
      <Lien className="enseigne-marque" vers={accueil}>
        <span className="marque" aria-hidden="true">
          <i />
          <b />
        </span>
        <span className="enseigne-mot">{textes.entete.titre}</span>
      </Lien>

      <div className="enseigne-droite">
        <Bascules
          langue={langue}
          resolu={resolu}
          textes={textes}
          onLangue={onLangue}
          onTheme={onTheme}
        />
        <Lien className="enseigne-app" vers={lien}>
          {textes.accueil.enseigne.ouvrir}
        </Lien>
      </div>
    </header>
  )
}
