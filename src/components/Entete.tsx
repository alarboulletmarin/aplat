// SPDX-License-Identifier: AGPL-3.0-only

import type { Textes } from '../i18n'

/**
 * Le titre, en display très grasse et condensée, presque collée ; l'accroche
 * en grotesque neutre juste dessous. Le contraste entre les deux est ce qui
 * donne le ton — c'est le seul geste typographique de la page.
 */
export function Entete({ textes }: { textes: Textes }) {
  return (
    <header>
      <div className="entete-haut">
        <h1 className="titre">{textes.entete.titre}</h1>
        <span className="entete-arche" aria-hidden="true" />
      </div>
      <div className="entete-filet" aria-hidden="true" />
      <div className="entete-pied">
        <p className="accroche">{textes.entete.accroche}</p>
      </div>
    </header>
  )
}
