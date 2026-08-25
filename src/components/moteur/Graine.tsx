// SPDX-License-Identifier: AGPL-3.0-only

import { graineDeDessin, type Langue, type Motif } from '../../lib/moteur'
import { GRAINE_MAX, tirerGraine } from '../../lib/tirage'
import { nombre } from '../../lib/format'
import { remplir, type Textes } from '../../i18n'
import { Toile } from '../accueil/Toile'
import { TELEPHONE } from '../accueil/choix'
import { Etape } from './Etape'

/* Deux de chaque côté. Cinq vignettes tiennent sur un téléphone à 320 px sans
   descendre sous la cible de 44 px, et quatre voisines suffisent largement à
   faire voir que deux nombres qui se suivent ne donnent pas deux images qui se
   ressemblent. */
const PORTEE = 2

/** La graine décalée, ramenée dans les bornes que l'adresse accepte. */
function voisine(graine: number, ecart: number): number {
  return ((graine - 1 + ecart + GRAINE_MAX) % GRAINE_MAX) + 1
}

/**
 * Étape 02 : la graine.
 *
 * Cinq graines qui se suivent, cinq images étrangères les unes aux autres.
 * C'est la démonstration la plus courte de ce qu'est une graine : une adresse
 * dans un espace de cent mille images, pas un curseur d'humeur qu'on pousserait
 * vers plus ou moins de quelque chose. Une phrase l'aurait dit ; cinq vignettes
 * le montrent.
 *
 * La vignette du milieu est celle du motif de la page ; toucher une voisine
 * l'adopte, et la rangée se recentre dessus. Le bouton, lui, tire au sort, et
 * c'est exactement ce que fait « Variante » dans l'application.
 *
 * La ligne du bas donne la graine de dessin, celle que le moteur emploie
 * vraiment. Elle n'est pas un détail d'implémentation exhibé pour faire savant :
 * c'est elle qui explique pourquoi changer de famille ou de densité change
 * l'image à graine constante.
 */
export function Graine({
  langue,
  textes,
  motif,
  onChanger,
}: {
  langue: Langue
  textes: Textes
  motif: Motif
  onChanger: (partiel: Partial<Motif>) => void
}) {
  const M = textes.moteur
  const ecarts = [...Array(PORTEE * 2 + 1).keys()].map((i) => i - PORTEE)

  return (
    <Etape rang="02" cle="etape-deux" titre={M.etapes.deuxTitre} note={M.etapes.deuxNote}>
      <ul className="graines" aria-label={M.graine.voisines}>
        {ecarts.map((ecart) => {
          const graine = voisine(motif.graine, ecart)
          const ici = ecart === 0
          return (
            <li className={ici ? 'graine graine-ici' : 'graine'} key={ecart}>
              <button
                type="button"
                className="graine-bouton"
                aria-current={ici ? 'true' : undefined}
                aria-label={remplir(M.graine.voisine, { graine: String(graine) })}
                onClick={() => onChanger({ graine })}
              >
                <Toile
                  motif={{ ...motif, graine }}
                  resolution={TELEPHONE}
                  className="graine-toile"
                />
                <span className="graine-n">{graine}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="etape-pied">
        <p className="etape-lu">
          {remplir(M.graine.valeur, {
            graine: String(motif.graine),
            /* La graine est un identifiant, elle s'écrit nue, comme dans
               l'application. Le maximum, lui, est un compte : il prend ses
               séparateurs de milliers, comme les quatre chiffres de
               l'accueil. */
            max: nombre(GRAINE_MAX, langue),
          })}
        </p>
        <button
          type="button"
          className="commande-relance"
          onClick={() => onChanger({ graine: tirerGraine() })}
        >
          {M.graine.relancer}
        </button>
      </div>

      <p className="etape-note">
        {remplir(M.graine.dessin, {
          n: String(graineDeDessin(motif.famille, motif.densite, motif.graine)),
        })}
      </p>
      <p className="etape-note">{M.graine.sourdes}</p>
    </Etape>
  )
}
