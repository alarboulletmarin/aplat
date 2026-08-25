// SPDX-License-Identifier: AGPL-3.0-only

import { useState, type CSSProperties } from 'react'
import {
  mesurer, niveau, sansVoile, RAYONS, SEUIL_AA,
  type Langue, type Motif,
} from '../../lib/moteur'
import { jetonsLibelle } from '../../lib/geometrie'
import { decimal } from '../../lib/format'
import { remplir, type Textes } from '../../i18n'
import { GroupeRadio, OptionRadio } from '../GroupeRadio'
import { Toile } from '../accueil/Toile'
import { TELEPHONE } from '../accueil/choix'
import { Etape } from './Etape'

/**
 * Étape 05 : la sonde de lisibilité.
 *
 * La page d'accueil montre déjà le voile, en deux images côte à côte et sans
 * un chiffre : c'est la démonstration de qui ne sait pas encore ce qu'est un
 * voile. Ici, la démonstration est celle des nombres, sur le motif que le
 * lecteur vient de composer : la luminance relevée, la couleur de libellé
 * retenue, la force du voile, le rapport obtenu, et le seuil qu'il franchit ou
 * non. Les deux ne se fusionnent pas, et ce paragraphe est là pour qu'on ne le
 * fasse pas plus tard.
 *
 * Les deux états partagent la même sonde, donc la même couleur de libellés :
 * seule la couche de voile change d'une image à l'autre. Sans quoi la
 * comparaison montrerait deux différences et n'en démontrerait aucune.
 *
 * Le mot du niveau est celui du verdict de l'application, pris dans le même
 * dictionnaire : le qualificatif affiché ne peut pas s'écarter du rapport
 * mesuré.
 */
export function Sonde({
  langue,
  textes,
  motif,
}: {
  langue: Langue
  textes: Textes
  motif: Motif
}) {
  const M = textes.moteur
  const S = M.sonde
  const [voile, setVoile] = useState(true)

  const brute = mesurer(
    motif.famille, motif.palette, motif.densite, motif.graine,
    TELEPHONE.largeur, TELEPHONE.hauteur,
  )
  const mesure = voile ? brute : sansVoile(brute)
  const jetons = jetonsLibelle(mesure.libelles) as CSSProperties
  const libelles = textes.maquette.applications.slice(0, 4)
  const mot = textes.lisibilite[niveau(mesure)]
  const couleur =
    mesure.libelles === 'clair' ? textes.lisibilite.libellesClairs : textes.lisibilite.libellesSombres

  return (
    <Etape rang="05" cle="etape-cinq" titre={M.etapes.cinqTitre} note={M.etapes.cinqNote}>
      <div className="etape-paire">
        <div className="sonde-boite" style={jetons}>
          <Toile
            motif={motif}
            resolution={TELEPHONE}
            voile={voile}
            className="sonde-toile"
          />
          <div className="sonde-grille" aria-hidden="true">
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
        </div>

        <div className="etape-commandes">
          <div className="commande">
            <h3 className="commande-titre" id="h-mot-voile">
              {textes.lisibilite.titre}
            </h3>
            <GroupeRadio id="mot-voile" etiquettes="h-mot-voile" className="commande-rangee">
              <OptionRadio
                choisi={!voile}
                onChoisir={() => setVoile(false)}
                className="opt opt-mot"
              >
                {S.sans}
              </OptionRadio>
              <OptionRadio
                choisi={voile}
                onChoisir={() => setVoile(true)}
                className="opt opt-mot"
              >
                {S.avec}
              </OptionRadio>
            </GroupeRadio>
          </div>

          <ul className="sonde-chiffres">
            <li>{remplir(S.luminance, { n: decimal(mesure.luminance, langue) })}</li>
            <li>{couleur}</li>
            <li>{remplir(S.force, { n: String(Math.round(mesure.voile * 100)) })}</li>
          </ul>

          <p className="sonde-verdict">
            {remplir(S.verdict, {
              niveau: mot,
              contraste: decimal(mesure.contraste, langue),
            })}
          </p>

          {/* La réglette situe le rapport par rapport au seuil AA. Elle est
              décorative et ne porte rien seule : le rapport et le seuil sont
              écrits en toutes lettres juste à côté. */}
          <div
            className="sonde-regle"
            aria-hidden="true"
            style={{
              '--part': String(Math.min(1, mesure.contraste / (SEUIL_AA * 2))),
            } as CSSProperties}
          >
            <span className="sonde-regle-barre" />
            <span className="sonde-regle-seuil" />
          </div>
          <p className="sonde-seuil">{S.seuil}</p>

          <p className="etape-note">{S.note}</p>
        </div>
      </div>
    </Etape>
  )
}
