// SPDX-License-Identifier: AGPL-3.0-only

import { useRef, type KeyboardEvent } from 'react'
import { famille, palette, type Langue, type Motif } from '../lib/moteur'
import {
  epingles, identique, MAX_EPINGLES, versEntree, versMotif, type Entree,
} from '../lib/historique'
import { remplir, type Textes } from '../i18n'
import { Arche } from './Arche'
import { Vignette } from './Vignette'

/**
 * Les dix derniers motifs regardés, en vignettes, restaurés d'un appui.
 *
 * La seule mémoire de motifs de l'application, et elle est bornée : dix
 * entrées, quatre réglages chacune, un bouton pour tout effacer. Pas de flux,
 * pas de « voir plus », pas de date. On revient sur ses pas, on ne remonte pas
 * une archive.
 *
 * L'épingle est la seule chose que dix entrées ne savaient pas faire : garder
 * celle qu'on a aimée pendant qu'on en regarde dix autres. Elle ne change ni la
 * longueur de la liste ni sa nature ; six au plus, et les quatre places qui
 * restent suffisent à voir passer les motifs. Une liste qu'on épingle en entier
 * cesserait d'être un historique, et c'est exactement ce que le produit refuse.
 *
 * Elle porte sur le motif en cours, depuis un seul bouton en tête de carte, et
 * non sur chaque vignette. Deux raisons, et la première suffit : une épingle
 * par vignette ferait vingt cibles dans une carte qui en compte dix, à vingt
 * pixels de côté, là où le produit n'en accepte aucune sous quarante-quatre.
 * La seconde est que restaurer un motif est déjà un appui : épingler le
 * troisième de la liste en coûte deux, et on l'a vu en grand entre les deux.
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
  onEpingler,
  onOublier,
}: {
  liste: Entree[]
  courant: Motif
  langue: Langue
  textes: Textes
  revision: number
  onRestaurer: (motif: Motif) => void
  /** Épingle ou désépingle le motif en cours, en l'ajoutant s'il n'y est pas. */
  onEpingler: () => void
  onOublier: () => void
}) {
  const T = textes.historique
  const cadre = useRef<HTMLDivElement>(null)
  const enCours = versEntree(courant)
  const courantIndex = liste.findIndex((entree) => identique(entree, enCours))
  const porteEntree = courantIndex < 0 ? 0 : courantIndex
  const gardees = epingles(liste)
  const courantEpingle = courantIndex >= 0 && liste[courantIndex].f === 1
  /* Six prises, et le motif en cours n'en est pas : il n'y a plus de place.
     Celui qui est déjà épinglé garde toujours le droit de se retirer, sans
     quoi une liste pleine ne pourrait plus se vider. */
  const bloquee = gardees >= MAX_EPINGLES && !courantEpingle

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

  const nommer = (entree: Entree) => {
    const motif = remplir(T.motif, {
      famille: famille(entree.m)?.[langue] ?? entree.m,
      palette: palette(entree.p)[langue],
      graine: String(entree.s),
    })
    return entree.f === 1 ? `${motif}. ${T.epingle}` : motif
  }

  const etiquetteEpingle = remplir(courantEpingle ? T.desepingler : T.epingler, {
    motif: remplir(T.motif, {
      famille: famille(courant.famille)?.[langue] ?? courant.famille,
      palette: palette(courant.palette)[langue],
      graine: String(courant.graine),
    }),
  })

  return (
    <div className="carte" id="carte-historique">
      <div className="carte-titre">
        <h2 className="carte-h" id="h-historique">
          <Arche />
          <span>{T.titre}</span>
        </h2>
        {/* « Effacer » vient avant l'épingle dans le document, et la rangée
            est calée à droite : l'épingle est donc le dernier élément, et son
            bord ne bouge pas. C'est ce qui compte ici, car « Effacer »
            n'apparaît qu'une fois la liste non vide, c'est-à-dire souvent à
            l'instant même où l'on épingle le premier motif : sans cet ordre,
            le bouton s'échappait de quatre-vingts pixels sous le doigt. */}
        <div className="carte-titre-actions">
          {liste.length > 0 && (
            <button type="button" id="btn-oublier" className="btn-oublier" onClick={onOublier}>
              {T.effacer}
            </button>
          )}
          <button
            type="button"
            id="btn-epingler"
            className="btn-oublier btn-epingler"
            aria-pressed={courantEpingle}
            aria-disabled={bloquee}
            aria-label={etiquetteEpingle}
            title={bloquee ? T.pleines : etiquetteEpingle}
            onClick={() => {
              if (!bloquee) onEpingler()
            }}
          >
            <span className="ico-epingle" aria-hidden="true">
              <i />
              <b />
            </span>
            {/* Les deux mots occupent la même cellule : le bouton fait la
                largeur du plus long, et il ne rétrécit pas sous le doigt qui
                vient de l'appuyer. Le nom accessible, lui, vient de
                `aria-label`, qui nomme le motif en entier. */}
            <span className="btn-double" aria-hidden="true">
              <span className="btn-double-l" data-actif={courantEpingle ? 'oui' : 'non'}>
                {T.epingle}
              </span>
              <span className="btn-double-l" data-actif={courantEpingle ? 'non' : 'oui'}>
                {T.epinglerCourt}
              </span>
            </span>
          </button>
        </div>
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
                 dit partout ailleurs. L'épingle se voit à la coche posée sur
                 le coin, et s'entend dans le nom. */
              <button
                key={`${entree.m}|${entree.p}|${entree.d}|${entree.s}`}
                type="button"
                className="opt historique-b"
                data-historique={entree.m}
                data-epingle={entree.f === 1 ? '1' : undefined}
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
                {entree.f === 1 && (
                  <span className="historique-p" aria-hidden="true">
                    <i />
                    <b />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      <p className="historique-n">{bloquee ? T.pleines : T.note}</p>
    </div>
  )
}
