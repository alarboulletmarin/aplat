// SPDX-License-Identifier: AGPL-3.0-only

import { useState, type CSSProperties } from 'react'
import { mesurer, RAYONS } from '../../lib/moteur'
import { jetonsLibelle } from '../../lib/geometrie'
import { tirerGraine } from '../../lib/tirage'
import type { Textes } from '../../i18n'
import { Toile } from './Toile'
import { TELEPHONE, VOILE } from './choix'

/**
 * Les trois choses qu'Aplat fait autrement, dont une se démontre.
 *
 * Le voile de lisibilité ne se raconte pas : deux rendus du même motif, la
 * même grille de libellés dessus, et l'un des deux se lit. C'est le seul
 * endroit du produit où le voile est visible en tant que tel, puisque partout
 * ailleurs il est déjà là.
 *
 * Les deux vignettes partagent la même sonde, donc la même couleur de
 * libellés : seule la couche de voile change d'une image à l'autre. Sans quoi
 * la comparaison montrerait deux différences et n'en démontrerait aucune.
 *
 * Les deux sont cliquables, comme le reste de la page, mais elles ne tirent
 * qu'une graine : la famille et la palette restent celles du choix arrêté. La
 * démonstration porte sur Vagues et Lime & crème parce que c'est là que le
 * voile travaille le plus, et un tirage libre l'aurait parfois posée sur un
 * couple où il ne sert à rien, c'est-à-dire sur une paire d'images identiques.
 */
export function Promesses({ textes }: { textes: Textes }) {
  const P = textes.accueil.promesses
  const [graine, setGraine] = useState(VOILE.graine)
  const motif = { ...VOILE, graine }
  const mesure = mesurer(
    motif.famille, motif.palette, motif.densite, motif.graine,
    TELEPHONE.largeur, TELEPHONE.hauteur,
  )
  const jetons = jetonsLibelle(mesure.libelles) as CSSProperties
  const libelles = textes.maquette.applications.slice(0, 4)

  const cote = (voile: boolean, mot: string) => (
    <figure className="voile-cote">
      <div className={`voile-boite${voile ? ' voile-boite-active' : ''}`} style={jetons}>
        <Toile
          motif={motif}
          resolution={TELEPHONE}
          voile={voile}
          className="voile-toile"
        />
        <div className="voile-grille" aria-hidden="true">
          {libelles.map((libelle, indice) => (
            <span className="voile-app" key={libelle}>
              <span
                className="voile-app-i"
                style={{ borderRadius: RAYONS[indice % RAYONS.length] }}
              />
              <span className="voile-app-t">{libelle}</span>
            </span>
          ))}
        </div>
        <button
          type="button"
          className="appareil-declic"
          aria-label={P.changer}
          onClick={() => setGraine(tirerGraine())}
        />
      </div>
      <figcaption className={`voile-mot${voile ? ' voile-mot-actif' : ''}`}>{mot}</figcaption>
    </figure>
  )

  /* La section n'a pas de titre, donc pas de nom accessible : ce n'est pas une
     région à atteindre, ce sont trois notes en marge de ce qui précède. */
  return (
    <section className="promesses">
      <div className="promesse">
        <span className="promesse-n" aria-hidden="true">
          01
        </span>
        <h3 className="promesse-t">{P.unTitre}</h3>
        <p className="promesse-p">{P.unCorps}</p>
      </div>

      <div className="promesse">
        <span className="promesse-n promesse-n-deux" aria-hidden="true">
          02
        </span>
        <h3 className="promesse-t">{P.deuxTitre}</h3>
        <p className="promesse-p">{P.deuxCorps}</p>
      </div>

      <div className="promesse">
        <span className="promesse-n promesse-n-trois" aria-hidden="true">
          03
        </span>
        <h3 className="promesse-t">{P.troisTitre}</h3>
        <p className="promesse-p">{P.troisCorps}</p>
        <div className="voile-paire">
          {cote(false, P.sansVoile)}
          {cote(true, P.avecVoile)}
        </div>
      </div>
    </section>
  )
}
