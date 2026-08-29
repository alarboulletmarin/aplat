// SPDX-License-Identifier: AGPL-3.0-only

import { useMiseAJour } from '../lib/miseajour'
import type { Textes } from '../i18n'

/**
 * La note de mise à jour : DESIGN_SYSTEM.md, section 7.
 *
 * Une nouvelle version a été mise en cache par le Service Worker.
 *
 * L'utilisateur choisit le moment du rechargement : recharger sous ses doigts
 * ferait perdre le motif en cours. Le refus est proposé aussi franchement que
 * l'acceptation, sans compte à rebours ni urgence inventée.
 *
 * Le message « prête hors ligne » n'est volontairement pas affiché : c'est une
 * information sur l'application, pas sur le fond d'écran, et l'écran n'a pas
 * de canal de notification générique.
 *
 * L'enregistrement du service worker, lui, ne vit pas ici : il est fait une
 * fois pour le document (`lib/miseajour.ts`). Ce composant est démonté à
 * chaque sortie de l'application, et refaire l'enregistrement à chaque retour
 * laisserait un client de plus derrière soi.
 */
export function MiseAJour({ textes }: { textes: Textes }) {
  const { attend, appliquer, ecarter } = useMiseAJour()

  if (!attend) return null

  /* Pas de `role="status"` ici : la note monte dans `.barre-live`, région déjà
     en place et vide au chargement, qui annonce ce qui s'y ajoute. Une région
     live insérée déjà remplie n'est pas annoncée de façon fiable, et deux
     régions imbriquées feraient dire la phrase deux fois. */
  return (
    <div className="note note-maj">
      <span className="note-maj-i" aria-hidden="true">
        <i />
        <b />
      </span>
      <div className="note-txt">
        <p className="note-t">{textes.miseAJour.texte}</p>
      </div>
      <div className="note-maj-actions">
        <button type="button" className="note-reessayer" onClick={ecarter}>
          {textes.miseAJour.fermer}
        </button>
        <button type="button" className="note-reessayer note-maj-oui" onClick={appliquer}>
          {textes.miseAJour.action}
        </button>
      </div>
    </div>
  )
}
