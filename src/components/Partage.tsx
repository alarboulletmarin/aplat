// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect, useRef } from 'react'
import type { Langue } from '../lib/moteur'
import type { Theme } from '../lib/url'
import type { Textes } from '../i18n'
import { GroupeRadio, OptionRadio } from './GroupeRadio'

/**
 * Le partage, et les deux préférences qui n'appartiennent pas au motif.
 *
 * L'URL est la seule mémoire de l'application : ce bouton copie l'état complet.
 * Rien d'autre ne quitte l'appareil, et rien n'y est écrit.
 */
export function Partage({
  lien,
  copie,
  echecCopie,
  langue,
  theme,
  graine,
  textes,
  onCopier,
  onLangue,
  onTheme,
}: {
  lien: string
  copie: boolean
  echecCopie: boolean
  langue: Langue
  theme: Theme
  graine: number
  textes: Textes
  onCopier: () => void
  onLangue: (langue: Langue) => void
  onTheme: (theme: Theme) => void
}) {
  const bouton = useRef<HTMLButtonElement>(null)
  const champ = useRef<HTMLInputElement>(null)
  const echecPrecedent = useRef(echecCopie)

  useEffect(() => {
    if (echecCopie && !echecPrecedent.current) {
      champ.current?.focus()
      champ.current?.select()
    } else if (!echecCopie && echecPrecedent.current) {
      /* Le champ vient d'être retiré : sans ça le navigateur renvoie le focus
         au document, et l'utilisateur au clavier repart du haut de la page. */
      if (document.activeElement === document.body) bouton.current?.focus()
    }
    echecPrecedent.current = echecCopie
  }, [echecCopie])

  const themes: { id: Theme; libelle: string }[] = [
    { id: 'clair', libelle: textes.preferences.clair },
    { id: 'sombre', libelle: textes.preferences.sombre },
    { id: 'systeme', libelle: textes.preferences.systeme },
  ]

  return (
    <div className="partage" aria-labelledby="h-partage">
      <h2 className="carte-h" id="h-partage" style={{ marginBottom: 0 }}>
        {textes.partage.titre}
      </h2>

      <button type="button" id="partage-bouton" className="partage-b" ref={bouton} onClick={onCopier}>
        <span className="ico-lien" aria-hidden="true">
          <i />
          <i />
        </span>
        <span id="partage-libelle">{copie ? textes.partage.copie : textes.partage.copier}</span>
      </button>

      {/* Le même rappel ne peut pas servir de succès et d'échec : un refus de
          permission afficherait « Lien copié » alors que rien n'a été copié. */}
      <p className="partage-n" id="partage-note" aria-live="polite">
        {echecCopie
          ? textes.partage.echec
          : `${textes.partage.note} ${textes.partage.graine} ${graine}`}
      </p>

      {echecCopie && (
        <label className="partage-repli">
          <span className="vh">{textes.partage.copier}</span>
          <input type="text" id="partage-lien" ref={champ} value={lien} readOnly spellCheck={false} autoComplete="off" />
        </label>
      )}

      <p className="partage-p">{textes.partage.confidentialite}</p>

      <div className="prefs">
        <div>
          <h3 id="h-langue">{textes.preferences.langue}</h3>
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
          <h3 id="h-theme">{textes.preferences.theme}</h3>
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
    </div>
  )
}
