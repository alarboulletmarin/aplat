// SPDX-License-Identifier: AGPL-3.0-only

import { etiquetteVersion, lienSource } from '../../lib/build'
import type { Textes } from '../../i18n'
import { Soutien } from '../Soutien'

/**
 * Le bas de la page : l'appel, puis le pied.
 *
 * C'est le même appel qu'en haut, pas un second : quelqu'un qui a lu la page
 * entière est arrivé au bout du défilement, et faire remonter jusqu'à
 * l'enseigne pour trouver la porte serait une friction gratuite. Le libellé
 * est mot pour mot celui du héros, parce que ce n'est pas une autre offre.
 *
 * Le lien vers la source n'est pas de la décoration : l'AGPL demande que
 * quiconque utilise le logiciel puisse obtenir la source correspondante, et un
 * lien vers la branche principale ne la désigne pas. Le commit, si.
 */
export function Appel({ textes, lien }: { textes: Textes; lien: string }) {
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
        <a className="appel-primaire appel-primaire-inverse" href={lien}>
          <span className="ico-descendre" aria-hidden="true">
            <i />
            <b />
          </span>
          <span>{A.heros.primaire}</span>
        </a>
      </section>

      <footer className="accueil-pied">
        <span>{textes.entete.mention}</span>
        <span className="accueil-pied-meta">
          <span>{etiquetteVersion()}</span>
          <a href={lienSource()} rel="noopener noreferrer" target="_blank">
            {textes.pied.source}
          </a>
          <span>{textes.pied.licence}</span>
          <Soutien textes={textes} />
        </span>
        <span>{A.pied.mention}</span>
      </footer>
    </>
  )
}
