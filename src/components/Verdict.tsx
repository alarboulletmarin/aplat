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
 * Il suit deux choses que l'aperçu ne dit pas de lui-même. Le voile, quand on
 * l'a retiré du fichier : le rapport est alors celui du motif nu, et le détail
 * le nomme autrement qu'un voile nul mesuré, parce que ce n'est pas la même
 * chose. Et le rideau clair/sombre : dès qu'il découvre du fond assombri, le
 * rapport devient celui de cette condition.
 */
export function Verdict({
  mesure,
  textes,
  langue,
  replie = false,
  assombri = false,
  voileRetire = false,
}: {
  mesure: Mesure | null
  textes: Textes
  langue: Langue
  /** La scène est repliée : le verdict tient sur une ligne, dépliable. */
  replie?: boolean
  /** Le rideau découvre du fond assombri : le rapport porte sur cette condition. */
  assombri?: boolean
  /** Le voile a été retiré du fichier, à la main. */
  voileRetire?: boolean
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
  const voile = voileRetire
    ? T.voileRetire
    : mesure.voile > 0.02
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
    </div>
  )
}
