// SPDX-License-Identifier: AGPL-3.0-only

import { useState, type CSSProperties } from 'react'
import type { Langue, Motif } from '../../lib/moteur'
import { ORDINATEUR, TABLETTE, TELEPHONE, type Resolution } from '../../lib/resolution'
import { decimal, nombre } from '../../lib/format'
import { remplir, type Textes } from '../../i18n'
import { Toile } from '../accueil/Toile'
import { Etape } from './Etape'

/* Les trois formats de référence, plus l'écran de la personne qui lit. Les
   mots viennent de « resolution », ceux du panneau de l'application : la page
   ne peut pas nommer une taille que l'outil ne propose pas. */
const FORMATS = [
  { cle: 'presetTelephone', resolution: TELEPHONE },
  { cle: 'presetTablette', resolution: TABLETTE },
  { cle: 'presetOrdinateur', resolution: ORDINATEUR },
] as const

/**
 * Étape 06 : l'aperçu est le fichier.
 *
 * Un seul canevas, dont la boîte prend le rapport d'aspect du format visé. La
 * forme change sous les yeux, ce qui est exactement le propos : rien n'est
 * agrandi, le motif est recalculé aux pixels demandés. Quatre canevas côte à
 * côte auraient dit la même chose en trois rendus de plus et sans montrer la
 * bascule.
 *
 * La sonde suit : `Toile` passe la résolution visée à `dessiner`, qui mesure
 * ce format-là et non la boîte. Le voile qu'on voit ici est donc celui du
 * fichier, à l'échelle près, comme dans l'application.
 */
export function Cadres({
  langue,
  textes,
  motif,
  detecte,
}: {
  langue: Langue
  textes: Textes
  motif: Motif
  /** L'écran de la personne qui lit, tel que l'application le détecterait. */
  detecte: Resolution
}) {
  const M = textes.moteur
  const C = M.cadres
  const [cadre, setCadre] = useState<Resolution>(detecte)

  const choix = [
    { cle: 'presetAppareil' as const, resolution: detecte, detecte: true },
    ...FORMATS.map((f) => ({ cle: f.cle, resolution: f.resolution, detecte: false })),
  ]
  const megapixels = (cadre.largeur * cadre.hauteur) / 1e6

  return (
    <Etape rang="06" cle="etape-six" titre={M.etapes.sixTitre} note={M.etapes.sixNote}>
      <div className="etape-paire">
        <div
          className="cadre"
          style={{ '--rapport': `${cadre.largeur} / ${cadre.hauteur}` } as CSSProperties}
        >
          <Toile motif={motif} resolution={cadre} className="cadre-toile" />
        </div>

        <div className="etape-commandes">
          <ul className="cadres">
            {choix.map((entree) => {
              const nom = textes.resolution[entree.cle]
              const ici =
                entree.resolution.largeur === cadre.largeur &&
                entree.resolution.hauteur === cadre.hauteur
              return (
                <li key={entree.cle}>
                  <button
                    type="button"
                    className={ici ? 'cadre-choix cadre-choix-ici' : 'cadre-choix'}
                    aria-current={ici ? 'true' : undefined}
                    title={remplir(C.choisir, { format: nom })}
                    onClick={() => setCadre(entree.resolution)}
                  >
                    {entree.detecte && <span className="pastille" aria-hidden="true" />}
                    <span className="cadre-mot">{nom}</span>
                    <span className="cadre-taille">
                      {remplir(C.taille, {
                        largeur: nombre(entree.resolution.largeur, langue),
                        hauteur: nombre(entree.resolution.hauteur, langue),
                      })}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <p className="etape-lu">{remplir(C.pixels, { n: decimal(megapixels, langue) })}</p>
          <p className="etape-note">{C.sorties}</p>
          <p className="etape-note">{C.vectoriel}</p>
        </div>
      </div>
    </Etape>
  )
}
