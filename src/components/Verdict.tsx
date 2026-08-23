// SPDX-License-Identifier: AGPL-3.0-only

import { useState } from 'react'
import { decimal } from '../lib/format'
import { niveau, type Langue, type Mesure, type Niveau } from '../lib/moteur'
import { remplir, type Textes } from '../i18n'

/**
 * Le conseil qui accompagne chaque bande. La table est indexée par le niveau
 * lui-même : un mot et un conseil ne peuvent pas se retrouver sur des bandes
 * différentes, ce qui était exactement le défaut d'avant.
 */
const CONSEILS = {
  bonne: 'conseilBonne',
  juste: 'conseilJuste',
  insuffisante: 'conseilInsuffisante',
} as const satisfies Record<Niveau, keyof Textes['lisibilite']>

/**
 * Le verdict de lisibilité : DESIGN_SYSTEM.md, section 8 (les états) et
 * section 9 (jamais la couleur seule).
 *
 * Ce que la sonde a mesuré, dit en toutes lettres.
 *
 * Trois états, et aucune valeur de repli : une application qui promet de
 * mesurer la lisibilité n'affiche pas un chiffre qu'elle n'a pas mesuré. Le
 * niveau se lit à la forme du repère autant qu'au mot : disque plein, disque à
 * moitié, triangle.
 *
 * Replié, il tient sur une ligne : la forme, le mot de la bande et le rapport.
 * Le détail n'est pas perdu, il est à un appui, et le même identifiant le
 * porte dans les deux formes. Ce qui compte pendant qu'on choisit un motif,
 * c'est le verdict ; le reste attend d'être demandé.
 *
 * La bascule « Assombri » est ici, au bout de la même rangée, parce que c'est
 * le verdict qu'elle change : un thème sombre assombrit le fond d'écran, et la
 * lisibilité des libellés en dépend. Elle disparaît quand l'aperçu est replié
 * en vignette, faute de place et faute d'objet : replié, on parcourt les
 * motifs ; déplié, on les juge.
 */
export function Verdict({
  mesure,
  textes,
  langue,
  replie = false,
  bascule = false,
  assombri = false,
  onAssombrir,
}: {
  mesure: Mesure | null
  textes: Textes
  langue: Langue
  /** La scène est repliée : le verdict tient sur une ligne, dépliable. */
  replie?: boolean
  /** L'aperçu est replié en vignette : la bascule d'assombrissement s'efface. */
  bascule?: boolean
  assombri?: boolean
  onAssombrir?: () => void
}) {
  const T = textes.lisibilite
  const [ouvert, setOuvert] = useState(false)

  if (!mesure) {
    return (
      <div className="verdict" aria-live="polite">
        <span className="verdict-i" aria-hidden="true" />
        <div className="verdict-txt">
          <p className="verdict-t" id="verdict-titre">{T.titre}</p>
          <p className="verdict-d" id="verdict-detail">{T.attente}</p>
        </div>
      </div>
    )
  }

  const rang = niveau(mesure)
  const mot = T[rang]
  const contraste = decimal(mesure.contraste, langue)
  const voile =
    mesure.voile > 0.02
      ? remplir(T.voile, { n: String(Math.round(mesure.voile * 100)) })
      : T.sansVoile
  const libelles = mesure.libelles === 'clair' ? T.libellesClairs : T.libellesSombres
  const detail = `${remplir(T.detail, {
    contraste,
    libelles,
    voile,
    conseil: T[CONSEILS[rang]],
  })}${assombri ? ` ${T.assombriNote}` : ''}`
  const forme = (
    <span className="verdict-i" aria-hidden="true">
      <span className={`verdict-${rang}`} />
    </span>
  )
  const bouton = bascule && onAssombrir ? (
    <button
      type="button"
      id="btn-assombri"
      className="btn-assombri"
      aria-pressed={assombri}
      title={T.assombriTitre}
      onClick={onAssombrir}
    >
      <span className="ico-lune" aria-hidden="true" />
      <span>{T.assombri}</span>
    </button>
  ) : null

  if (replie) {
    return (
      <div className="verdict verdict-replie" aria-live="polite">
        <button
          type="button"
          id="verdict-bascule"
          className="verdict-bascule"
          aria-expanded={ouvert}
          aria-controls="verdict-detail"
          onClick={() => setOuvert((precedent) => !precedent)}
        >
          {forme}
          <span className="verdict-t" id="verdict-titre">
            {remplir(T.resume, { niveau: mot, contraste })}
          </span>
          <span className="verdict-chevron" aria-hidden="true" />
        </button>
        {bouton}
        {/* `hidden` plutôt qu'un rendu conditionnel : l'identifiant que
            désigne `aria-controls` doit exister avant le dépli, et le détail
            reste lisible aux vérifications comme aux recherches de la page. */}
        <p className="verdict-d" id="verdict-detail" hidden={!ouvert}>
          {detail}
        </p>
      </div>
    )
  }

  return (
    <div className="verdict" aria-live="polite">
      {forme}
      <div className="verdict-txt">
        <p className="verdict-t" id="verdict-titre">
          {remplir(T.titreNiveau, { niveau: mot })}
        </p>
        <p className="verdict-d" id="verdict-detail">
          {detail}
        </p>
      </div>
      {bouton}
    </div>
  )
}
