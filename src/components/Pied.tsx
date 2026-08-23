// SPDX-License-Identifier: AGPL-3.0-only

import { etiquetteVersion, lienSource } from '../lib/build'
import type { Langue } from '../lib/moteur'
import type { Theme } from '../lib/url'
import type { Textes } from '../i18n'
import { GroupeRadio, OptionRadio } from './GroupeRadio'

/**
 * Le pied : les réglages de l'application, la version, et le lien vers la
 * source exacte de ce build.
 *
 * La langue et le thème sont ici, et non dans le panneau, parce qu'ils ne
 * changent rien au fichier téléchargé. La règle qui en résulte se tient en une
 * phrase : tout ce qui est dans le panneau agit sur l'image, rien d'autre. Un
 * thème sombre ne s'exporte pas, une langue non plus.
 *
 * Le lien vers la source n'est pas de la décoration : l'AGPL demande que
 * quiconque utilise le logiciel puisse obtenir la source *correspondante*. Un
 * lien vers la branche principale ne la désigne pas ; le commit, si.
 */
export function Pied({
  langue,
  theme,
  textes,
  onLangue,
  onTheme,
}: {
  langue: Langue
  theme: Theme
  textes: Textes
  onLangue: (langue: Langue) => void
  onTheme: (theme: Theme) => void
}) {
  const themes: { id: Theme; libelle: string }[] = [
    { id: 'clair', libelle: textes.preferences.clair },
    { id: 'sombre', libelle: textes.preferences.sombre },
    { id: 'systeme', libelle: textes.preferences.systeme },
  ]

  return (
    <footer className="pied">
      <div className="prefs">
        <div>
          <h2 id="h-langue">{textes.preferences.langue}</h2>
          <GroupeRadio id="liste-langue" etiquettes="h-langue" className="prefs-rangee">
            {(
              [
                { id: 'fr' as Langue, libelle: 'Français' },
                { id: 'en' as Langue, libelle: 'English' },
              ]
            ).map((l) => (
              <OptionRadio
                key={l.id}
                choisi={l.id === langue}
                onChoisir={() => onLangue(l.id)}
                className="opt opt-langue"
                data-langue={l.id}
                lang={l.id}
              >
                {l.libelle}
              </OptionRadio>
            ))}
          </GroupeRadio>
        </div>
        <div>
          <h2 id="h-theme">{textes.preferences.theme}</h2>
          <GroupeRadio id="liste-theme" etiquettes="h-theme" className="prefs-rangee">
            {themes.map((t) => (
              <OptionRadio
                key={t.id}
                choisi={t.id === theme}
                onChoisir={() => onTheme(t.id)}
                className="opt opt-theme"
                data-theme={t.id}
                titre={t.libelle}
              >
                <i aria-hidden="true" />
                <span>{t.libelle}</span>
              </OptionRadio>
            ))}
          </GroupeRadio>
        </div>
      </div>

      <div className="pied-meta">
        <span className="pied-version">{etiquetteVersion()}</span>
        <a href={lienSource()} rel="noopener noreferrer" target="_blank">
          {textes.pied.source}
        </a>
        <span>{textes.pied.licence}</span>
      </div>
    </footer>
  )
}
