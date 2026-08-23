// SPDX-License-Identifier: AGPL-3.0-only

import { etiquetteVersion, lienSource } from '../lib/build'
import type { Textes } from '../i18n'

/**
 * La version, et le lien vers la source exacte de ce build.
 *
 * Ce n'est pas de la décoration : l'AGPL demande que quiconque utilise le
 * logiciel puisse obtenir la source *correspondante*. Un lien vers la branche
 * principale ne la désigne pas — le commit, si.
 */
export function Pied({ textes }: { textes: Textes }) {
  return (
    <footer className="pied">
      <span className="pied-version">{etiquetteVersion()}</span>
      <a href={lienSource()} rel="noopener noreferrer" target="_blank">
        {textes.pied.source}
      </a>
      <span>{textes.pied.licence}</span>
    </footer>
  )
}
