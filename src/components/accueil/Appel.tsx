// SPDX-License-Identifier: AGPL-3.0-only

import type { Textes } from '../../i18n'
import { Lien } from '../Lien'
import { PiedDocument } from './PiedDocument'

/**
 * Le bas de la page : l'appel, puis le pied.
 *
 * C'est le même appel qu'en haut, pas un second : quelqu'un qui a lu la page
 * entière est arrivé au bout du défilement, et faire remonter jusqu'à
 * l'enseigne pour trouver la porte serait une friction gratuite. Le libellé
 * est mot pour mot celui du héros, parce que ce n'est pas une autre offre.
 *
 * Le pied lui-même est partagé avec la page du mécanisme (`PiedDocument`) :
 * il porte les mentions de l'AGPL et de la LCEN, et deux exemplaires de ces
 * lignes seraient un exemplaire de trop le jour où il faut les corriger.
 */
export function Appel({
  textes,
  lien,
  moteur,
}: {
  textes: Textes
  lien: string
  /** Le lien vers la page du mécanisme, posé au pied. */
  moteur: string
}) {
  const A = textes.accueil

  return (
    <>
      <section className="appel" aria-labelledby="h-appel">
        <div className="appel-mots">
          <h2 className="appel-titre" id="h-appel">
            {A.appel.titre}
          </h2>
          <p className="appel-p">{A.appel.corps}</p>
        </div>
        <Lien className="appel-primaire appel-primaire-inverse" vers={lien}>
          <span className="ico-descendre" aria-hidden="true">
            <i />
            <b />
          </span>
          <span>{A.heros.primaire}</span>
        </Lien>
      </section>

      <PiedDocument textes={textes} mention={A.pied.mention} moteur={moteur} />
    </>
  )
}
