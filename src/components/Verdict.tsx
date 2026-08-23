// SPDX-License-Identifier: AGPL-3.0-only

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
 */
export function Verdict({
  mesure,
  textes,
  langue,
}: {
  mesure: Mesure | null
  textes: Textes
  langue: Langue
}) {
  const T = textes.lisibilite

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
  const conseil = T[CONSEILS[rang]]
  const voile =
    mesure.voile > 0.02
      ? remplir(T.voile, { n: String(Math.round(mesure.voile * 100)) })
      : T.sansVoile
  const libelles = mesure.libelles === 'clair' ? T.libellesClairs : T.libellesSombres

  return (
    <div className="verdict" aria-live="polite">
      <span className="verdict-i" aria-hidden="true">
        <span className={`verdict-${rang}`} />
      </span>
      <div className="verdict-txt">
        <p className="verdict-t" id="verdict-titre">
          {remplir(T.titreNiveau, { niveau: mot })}
        </p>
        <p className="verdict-d" id="verdict-detail">
          {remplir(T.detail, {
            contraste: decimal(mesure.contraste, langue),
            libelles,
            voile,
            conseil,
          })}
        </p>
      </div>
    </div>
  )
}
