// SPDX-License-Identifier: AGPL-3.0-only

import {
  famille as trouverFamille, palette as trouverPalette,
  type Langue, type Motif,
} from '../../lib/moteur'
import { lienAppDuMotif } from '../../lib/url'
import { Lien } from '../Lien'
import { remplir, type Textes } from '../../i18n'

/**
 * La sortie : le motif construit, son adresse, et la porte.
 *
 * C'est le seul appel primaire de la page, et il est ici parce que c'est ici
 * que la démonstration s'achève : quelqu'un qui a déroulé six étapes a
 * fabriqué un motif, et le lui faire refaire dans l'application serait lui
 * faire perdre ce qu'il vient de comprendre.
 *
 * L'adresse est écrite en clair au-dessus du bouton. Ce n'est pas de la
 * décoration : la page vient d'expliquer que les quatre réglages font l'image,
 * et le lien le prouve en les portant, tous les quatre et rien d'autre.
 */
export function Sortie({
  langue,
  textes,
  motif,
}: {
  langue: Langue
  textes: Textes
  motif: Motif
}) {
  const A = textes.moteur.appel
  const lien = lienAppDuMotif(motif)

  return (
    <section className="appel moteur-appel" aria-labelledby="h-sortie">
      <div className="appel-mots">
        <h2 className="appel-titre" id="h-sortie">
          {A.titre}
        </h2>
        <p className="appel-p">{A.corps}</p>
        <p className="moteur-reglages">
          {remplir(A.reglages, {
            famille: trouverFamille(motif.famille)?.[langue] ?? motif.famille,
            palette: trouverPalette(motif.palette)[langue],
            densite: String(motif.densite),
            graine: String(motif.graine),
          })}
        </p>
        <p className="moteur-adresse">
          <span className="moteur-adresse-mot">{A.adresse}</span>
          <code>{lien}</code>
        </p>
      </div>
      <Lien className="appel-primaire appel-primaire-inverse" vers={lien}>
        <span className="ico-descendre" aria-hidden="true">
          <i />
          <b />
        </span>
        <span>{A.primaire}</span>
      </Lien>
    </section>
  )
}
