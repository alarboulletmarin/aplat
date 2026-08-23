// SPDX-License-Identifier: AGPL-3.0-only

import type { Langue } from '../../lib/moteur'
import type { Resolution } from '../../lib/resolution'
import { nombre } from '../../lib/format'
import type { Textes } from '../../i18n'
import { Appareil } from './Appareil'
import { Frise } from './Frise'
import { BUREAU, FORMATS, ORDINATEUR } from './choix'

/** « 2 560 × 1 440 px », dans les chiffres de la langue. */
function format(resolution: Resolution, langue: Langue): string {
  return `${nombre(resolution.largeur, langue)}\u00a0×\u00a0${nombre(resolution.hauteur, langue)}\u00a0px`
}

/**
 * Le même moteur, sur un écran couché.
 *
 * La section existe pour une raison précise : un fond d'écran d'ordinateur ne
 * se juge pas sur une maquette de téléphone. Les icônes sont ailleurs, la
 * barre de menus mange le haut de l'image, et le motif y est vu deux fois plus
 * large que haut.
 *
 * La résolution détectée est annoncée en premier, avant les trois formats de
 * référence. C'est une mesure vraie, faite sur l'appareil qui lit la page, et
 * elle dit mieux que n'importe quelle phrase que rien n'est à saisir.
 */
export function Ecrans({
  langue,
  textes,
  detecte,
}: {
  langue: Langue
  textes: Textes
  /** L'écran de la personne qui lit, tel que l'application le détecterait. */
  detecte: Resolution
}) {
  return (
    <section className="ecrans" aria-labelledby="h-ecrans">
      <div className="section-tete">
        <h2 className="section-titre" id="h-ecrans">
          {textes.accueil.ecrans.titre}
        </h2>
        <p className="section-note">{textes.accueil.ecrans.note}</p>
      </div>
      <Frise decalage={4} />

      <Appareil
        motif={BUREAU}
        resolution={ORDINATEUR}
        bureau
        langue={langue}
        textes={textes}
        className="appareil-bureau"
      />

      <ul className="formats">
        <li className="format format-detecte">
          <span className="pastille" aria-hidden="true" />
          <span>{format(detecte, langue)}</span>
          <span className="format-mot">{textes.resolution.detectee}</span>
        </li>
        {FORMATS.map((entree) => (
          <li className="format" key={entree.cle}>
            <span>{format(entree.resolution, langue)}</span>
            <span className="format-mot">{textes.resolution[entree.cle]}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
