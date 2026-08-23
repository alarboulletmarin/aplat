// SPDX-License-Identifier: AGPL-3.0-only

import { famille, palette, type Langue, type Motif } from '../lib/moteur'
import { identique, versEntree, versMotif, type Entree } from '../lib/historique'
import { remplir, type Textes } from '../i18n'
import { Vignette } from './Vignette'

/**
 * Les dix derniers motifs regardés, en vignettes, restaurés d'un appui.
 *
 * La seule mémoire de l'application, et elle est bornée : dix entrées, quatre
 * réglages chacune, un bouton pour tout effacer. Pas de flux, pas de « voir
 * plus », pas de date. On revient sur ses pas, on ne remonte pas une archive.
 *
 * Les vignettes ne sont pas enregistrées : le rendu est déterministe, le
 * moteur les redessine à partir des quatre réglages. C'est ce qui permet à
 * l'historique de peser deux cents octets.
 */
export function Historique({
  liste,
  courant,
  langue,
  textes,
  revision,
  onRestaurer,
  onOublier,
}: {
  liste: Entree[]
  courant: Motif
  langue: Langue
  textes: Textes
  revision: number
  onRestaurer: (motif: Motif) => void
  onOublier: () => void
}) {
  const T = textes.historique
  const enCours = versEntree(courant)

  const nommer = (entree: Entree) =>
    remplir(T.motif, {
      famille: famille(entree.m)?.[langue] ?? entree.m,
      palette: palette(entree.p)[langue],
      graine: String(entree.s),
    })

  return (
    <div className="carte" id="carte-historique">
      <div className="carte-titre">
        <h2 className="carte-h" id="h-historique">
          {T.titre}
        </h2>
        {liste.length > 0 && (
          <button type="button" id="btn-oublier" className="btn-oublier" onClick={onOublier}>
            {T.effacer}
          </button>
        )}
      </div>

      {liste.length === 0 ? (
        <p className="historique-vide">{T.vide}</p>
      ) : (
        <ul className="historique" id="liste-historique">
          {liste.map((entree) => {
            const nom = nommer(entree)
            const actuel = identique(entree, enCours)
            return (
              <li key={`${entree.m}|${entree.p}|${entree.d}|${entree.s}`}>
                {/* Le nom du motif est le nom accessible du bouton, et son
                    infobulle : la vignette dit lequel c'est à l'oeil, le texte
                    le dit partout ailleurs. */}
                <button
                  type="button"
                  className="opt historique-b"
                  data-historique={entree.m}
                  aria-current={actuel || undefined}
                  aria-label={nom}
                  title={nom}
                  onClick={() => onRestaurer(versMotif(entree))}
                >
                  <Vignette
                    famille={entree.m}
                    palette={entree.p}
                    densite={entree.d}
                    graine={entree.s}
                    revision={revision}
                  />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <p className="historique-n">{T.note}</p>
    </div>
  )
}
