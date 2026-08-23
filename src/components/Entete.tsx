// SPDX-License-Identifier: AGPL-3.0-only

import type { Textes } from '../i18n'

/**
 * L'en-tête : DESIGN_SYSTEM.md, section 2 (le parti visuel) et section 6
 * (gabarits).
 *
 * La marque, le mot, la résolution visée, et un filet fait de six barres de la
 * palette. La bande est collante : c'est la troisième couche épinglée de la
 * page, au-dessus de la scène et de la barre d'action, et sa hauteur est
 * publiée en `--bar` pour que la scène s'y accroche.
 *
 * La marque et le mot font un lien vers « / ». C'est la seule sortie de
 * l'application, et elle est là où tout le monde la cherche : un logo ramène à
 * la présentation, et personne n'a à retaper l'adresse pour y revenir.
 *
 * Le titre n'est plus le geste plein écran d'avant : à trente-trois pixels il
 * peut rester à l'écran en permanence, ce qu'une capitale de quatre-vingt-dix-
 * huit pixels ne pouvait pas. Le contraste entre la display condensée et la
 * grotesque neutre reste le seul geste typographique de la page.
 *
 * L'accroche et la mention sont rendues hors de la bande collante : elles se
 * lisent une fois, au départ, et n'ont rien à faire dans ce qui reste épinglé.
 */
export function Entete({
  cadre,
  textes,
  accueil,
  resolution,
}: {
  cadre: React.RefObject<HTMLElement | null>
  textes: Textes
  /** Le lien vers la présentation, langue et thème déjà posés. */
  accueil: string
  /** La résolution visée, déjà mise en forme, ou le mot qui dit qu'il n'y en a pas. */
  resolution: string
}) {
  return (
    <>
      <header className="entete" ref={cadre as React.RefObject<HTMLElement>}>
        <div className="entete-haut">
          {/* Le mot du titre nomme déjà le lien ; la mention cachée dit où il
              mène, parce que « Aplat » tout seul ne l'annonce pas. */}
          <a className="entete-marque" href={accueil}>
            <span className="marque" aria-hidden="true">
              <i />
              <b />
            </span>
            <h1 className="titre">{textes.entete.titre}</h1>
            <span className="vh">{textes.entete.accueil}</span>
          </a>
          <p className="entete-res" id="entete-res">
            {resolution}
          </p>
        </div>
        {/* Six barres et leur seuil : la silhouette d'un motif du générateur,
            réduite à treize pixels de haut. */}
        <div className="entete-filet" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </header>
      <div className="entete-pied">
        <p className="accroche">{textes.entete.accroche}</p>
        <p className="entete-mention">{textes.entete.mention}</p>
      </div>
    </>
  )
}
