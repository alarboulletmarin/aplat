// SPDX-License-Identifier: AGPL-3.0-only

import { useRef, type KeyboardEvent } from 'react'
import { famille, palette, type Langue, type Motif } from '../lib/moteur'
import { identique, versEntree, versMotif, type Entree } from '../lib/historique'
import { remplir, type Textes } from '../i18n'
import { Arche } from './Arche'
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
 *
 * Un seul arrêt de tabulation pour les dix, les flèches déplacent le focus :
 * c'est la même règle que les groupes de réglage, et pour la même raison. Dix
 * arrêts de plus dans une page qui en compte quatorze, ce serait doubler le
 * parcours clavier pour un raccourci. Les flèches ne restaurent rien ici,
 * contrairement aux puces de choix : ce ne sont pas des options d'un même
 * réglage, mais dix actions distinctes.
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
  const cadre = useRef<HTMLDivElement>(null)
  const enCours = versEntree(courant)
  const courantIndex = liste.findIndex((entree) => identique(entree, enCours))
  const porteEntree = courantIndex < 0 ? 0 : courantIndex

  const surTouche = (evenement: KeyboardEvent<HTMLDivElement>) => {
    const deplacements = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End']
    if (!deplacements.includes(evenement.key)) return
    const groupe = cadre.current
    if (!groupe) return
    const boutons = Array.from(groupe.querySelectorAll<HTMLButtonElement>('button'))
    const courantFocus = boutons.indexOf(document.activeElement as HTMLButtonElement)
    if (courantFocus < 0) return
    evenement.preventDefault()
    const suivant =
      evenement.key === 'Home'
        ? 0
        : evenement.key === 'End'
          ? boutons.length - 1
          : evenement.key === 'ArrowRight' || evenement.key === 'ArrowDown'
            ? (courantFocus + 1) % boutons.length
            : (courantFocus - 1 + boutons.length) % boutons.length
    boutons[suivant].focus()
  }

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
          <Arche />
          <span>{T.titre}</span>
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
        <div
          className="historique"
          id="liste-historique"
          ref={cadre}
          role="toolbar"
          aria-labelledby="h-historique"
          aria-orientation="horizontal"
          onKeyDown={surTouche}
        >
          {liste.map((entree, indice) => {
            const nom = nommer(entree)
            const actuel = identique(entree, enCours)
            return (
              /* Le nom du motif est le nom accessible du bouton, et son
                 infobulle : la vignette dit lequel c'est à l'oeil, le texte le
                 dit partout ailleurs. */
              <button
                key={`${entree.m}|${entree.p}|${entree.d}|${entree.s}`}
                type="button"
                className="opt historique-b"
                data-historique={entree.m}
                tabIndex={indice === porteEntree ? 0 : -1}
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
            )
          })}
        </div>
      )}

      <p className="historique-n">{T.note}</p>
    </div>
  )
}
