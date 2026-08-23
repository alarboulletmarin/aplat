// SPDX-License-Identifier: AGPL-3.0-only

import { decimal } from '../lib/format'
import { niveau, type Langue, type Mesure } from '../lib/moteur'
import { remplir, type Textes } from '../i18n'

/**
 * Ce que la sonde a mesuré, dit en toutes lettres.
 *
 * Trois états, et aucune valeur de repli : une application qui promet de
 * mesurer la lisibilité n'affiche pas un chiffre qu'elle n'a pas mesuré. Le
 * niveau se lit à la forme du repère autant qu'au mot — disque plein, disque à
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
          <p className="verdict-t">{T.titre}</p>
          <p className="verdict-d">{T.attente}</p>
        </div>
      </div>
    )
  }

  const rang = niveau(mesure)
  const mot = rang === 'bonne' ? T.bonne : rang === 'correcte' ? T.correcte : T.faible
  const conseil =
    rang === 'bonne' ? T.conseilBonne : rang === 'correcte' ? T.conseilCorrecte : T.conseilFaible
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
        <p className="verdict-t">{`${T.titre} · ${mot}`}</p>
        <p className="verdict-d">
          {`${decimal(mesure.contraste, langue)}:1 · ${libelles} · ${voile} — ${conseil}`}
        </p>
      </div>
    </div>
  )
}
