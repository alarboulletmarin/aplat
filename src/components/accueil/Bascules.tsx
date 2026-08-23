// SPDX-License-Identifier: AGPL-3.0-only

import type { Langue } from '../../lib/moteur'
import type { Theme } from '../../lib/url'
import type { Textes } from '../../i18n'

/**
 * Les deux réglages d'affichage de la page d'accueil : la langue et le thème.
 *
 * Dans l'application ils vivent au pied de page, en trois puces radio chacun,
 * parce qu'on y arrive déjà décidé et qu'ils n'agissent pas sur le fichier
 * téléchargé. Ici c'est l'inverse : quelqu'un qui arrive sur une page dans une
 * langue qu'il ne lit pas doit trouver la bascule avant le premier paragraphe,
 * pas après le dernier. Elles sont donc dans l'enseigne, qui reste épinglée.
 *
 * Ce sont des boutons, pas des groupes radio : deux états, et l'un des deux
 * est toujours celui qu'on quitte. Chacun montre donc ce qu'un appui donnera,
 * jamais l'état où l'on est. Un bouton marqué « Sombre » sur fond clair ne dit
 * pas s'il annonce le thème actuel ou celui qui vient ; « Passer au thème
 * sombre » le dit, et c'est le nom accessible entier.
 *
 * Le thème ne se règle qu'en clair ou en sombre : « système » reste dans le
 * pied de page de l'application, là où trois choix ont la place de tenir. Une
 * bascule à trois positions n'est plus une bascule.
 */
export function Bascules({
  langue,
  resolu,
  textes,
  onLangue,
  onTheme,
}: {
  langue: Langue
  /** Le thème effectivement appliqué : c'est de lui qu'on part. */
  resolu: 'clair' | 'sombre'
  textes: Textes
  onLangue: (langue: Langue) => void
  onTheme: (theme: Theme) => void
}) {
  const B = textes.accueil.bascule
  const cibleTheme: Theme = resolu === 'sombre' ? 'clair' : 'sombre'
  const versTheme = resolu === 'sombre' ? B.versClair : B.versSombre
  const motTheme = resolu === 'sombre' ? textes.preferences.clair : textes.preferences.sombre
  const cibleLangue: Langue = langue === 'fr' ? 'en' : 'fr'

  return (
    <div className="bascules">
      {/* Le nom accessible commence par le code visible : une commande vocale
          « clique sur EN » doit atteindre le bouton qui porte ce mot. */}
      <button
        type="button"
        className="bascule bascule-langue"
        lang={B.langueCible}
        title={B.langueVers}
        aria-label={`${B.langueCode}. ${B.langueVers}`}
        onClick={() => onLangue(cibleLangue)}
      >
        {B.langueCode}
      </button>

      {/* Le disque dit le thème visé par son remplissage, plein pour le clair,
          vide pour le sombre : la même forme que les puces du pied de page, et
          elle se lit en niveaux de gris. Le mot l'accompagne dès qu'il y a la
          place ; en dessous, le nom accessible le porte seul. */}
      <button
        type="button"
        className="bascule bascule-theme"
        data-vers={cibleTheme}
        title={versTheme}
        aria-label={versTheme}
        onClick={() => onTheme(cibleTheme)}
      >
        <i aria-hidden="true" />
        <span className="bascule-mot">{motTheme}</span>
      </button>
    </div>
  )
}
