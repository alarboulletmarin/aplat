// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect, useRef } from 'react'
import type { Textes } from '../i18n'
import { Arche } from './Arche'

/**
 * Le partage du motif.
 *
 * L'URL est la seule mémoire de l'application : ce bouton copie l'état complet.
 * Rien d'autre ne quitte l'appareil, et rien n'y est écrit.
 *
 * La langue et le thème étaient ici, ils sont dans le pied de page. Ils ne
 * changent rien au fichier téléchargé, et le panneau ne contient que ce qui
 * agit sur lui.
 */
export function Partage({
  lien,
  copie,
  echecCopie,
  graine,
  textes,
  onCopier,
}: {
  lien: string
  copie: boolean
  echecCopie: boolean
  graine: number
  textes: Textes
  onCopier: () => void
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

  return (
    <div className="partage" aria-labelledby="h-partage">
      <h2 className="carte-h" id="h-partage" style={{ marginBottom: 0 }}>
        <Arche />
        <span>{textes.partage.titre}</span>
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
          : `${textes.partage.note} ${textes.partage.graine}\u00a0${graine}`}
        {/* Le succ\u00e8s s'ajoute \u00e0 la r\u00e9gion live dans un n\u0153ud invisible : le
            libell\u00e9 du bouton change d\u00e9j\u00e0 sous les yeux, mais un changement de
            libell\u00e9 hors r\u00e9gion live reste muet au lecteur d'\u00e9cran. */}
        {copie && <span className="vh">{textes.partage.copie}</span>}
      </p>

      {echecCopie && (
        <label className="partage-repli">
          <span className="vh">{textes.partage.copier}</span>
          <input type="text" id="partage-lien" ref={champ} value={lien} readOnly spellCheck={false} autoComplete="off" />
        </label>
      )}

      <p className="partage-p">{textes.partage.confidentialite}</p>
    </div>
  )
}
