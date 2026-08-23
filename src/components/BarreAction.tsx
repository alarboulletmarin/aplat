// SPDX-License-Identifier: AGPL-3.0-only

import { decimal, nombre, poids } from '../lib/format'
import type { Langue } from '../lib/moteur'
import type { Resolution } from '../lib/resolution'
import { remplir, type Textes } from '../i18n'

export type Phase = 'repos' | 'calcul' | 'faite' | 'erreur'
export type Echec = 'trop' | 'capacite' | 'generale'

export interface Fichier {
  largeur: number
  hauteur: number
  octets: number
}

/**
 * Les boutons d'action : DESIGN_SYSTEM.md, section 7. Les notes de résultat :
 * section 8.
 *
 * Un seul appel primaire par écran : télécharger.
 *
 * Le bouton secondaire tire une nouvelle graine : le même motif, redessiné
 * autrement. Il ne change ni la famille ni la palette, et son libellé le dit
 * en un mot, « Variante » ; c'est « Surprends-moi », dans le panneau, qui
 * change tout. Il cède la place au primaire quand la largeur manque : mieux
 * vaut le secondaire tronqué que « Télécharger » coupé en deux.
 */
export function BarreAction({
  cadre,
  children,
  phase,
  echec,
  fichier,
  resolution,
  vide,
  langue,
  textes,
  onGraine,
  onExporter,
}: {
  cadre: React.RefObject<HTMLDivElement | null>
  /** La proposition de mise à jour, quand il y en a une. */
  children?: React.ReactNode
  phase: Phase
  echec: Echec | null
  fichier: Fichier | null
  resolution: Resolution
  vide: boolean
  langue: Langue
  textes: Textes
  onGraine: () => void
  onExporter: () => void
}) {
  const T = textes.barre
  const calcul = phase === 'calcul'

  const message =
    echec === 'trop'
      ? remplir(T.erreurTrop, {
          mpx: decimal((resolution.largeur * resolution.hauteur) / 1e6, langue),
        })
      : echec === 'capacite'
        ? T.erreurCapacite
        : T.erreurGenerale

  return (
    <div className="barre" ref={cadre}>
      {children}
      <div className="barre-live" aria-live="polite">
        {phase === 'faite' && !vide && fichier && (
          <div className="note note-faite" id="note-faite">
            <span className="note-faite-i" aria-hidden="true">
              <i />
              <b />
            </span>
            <div className="note-txt">
              <p className="note-t">{T.enregistre}</p>
              <p className="note-m" id="note-meta">
                {`${nombre(fichier.largeur, langue)}\u00a0×\u00a0${nombre(fichier.hauteur, langue)}\u00a0px, PNG, ${poids(fichier.octets, langue, T.ko, T.mo)}`}
              </p>
              <p className="note-h">{T.astuce}</p>
            </div>
          </div>
        )}

        {phase === 'erreur' && (
          <div className="note note-erreur" id="note-erreur">
            <span className="note-erreur-i" aria-hidden="true" />
            <div className="note-txt">
              <p className="note-t">{T.erreurTitre}</p>
              <p className="note-d" id="note-erreur-message">{message}</p>
            </div>
            <button type="button" id="btn-reessayer" className="note-reessayer" onClick={onExporter}>
              {T.reessayer}
            </button>
          </div>
        )}
      </div>

      <div className="actions">
        <button
          type="button"
          id="btn-graine"
          className="btn-graine"
          title={T.nouveauTitre}
          onClick={onGraine}
        >
          <span className="ico-encore" aria-hidden="true">
            <i />
            <b />
          </span>
          <span>{T.nouveau}</span>
        </button>
        {/* Pendant le rendu, `disabled` retirerait le focus du bouton et le
            renverrait au début du document, obligeant à tout reparcourir.
            `aria-disabled` le neutralise sans le rendre infocusable, et
            l'export refuse de repartir de lui-même. `disabled` ne reste que
            pour l'état vide, où le bouton n'a rien à faire dans le parcours. */}
        <button
          type="button"
          id="btn-export"
          className="btn-export"
          disabled={vide}
          aria-disabled={calcul}
          aria-busy={calcul}
          onClick={onExporter}
        >
          <span className="ico-descendre" aria-hidden="true">
            <i />
            <b />
          </span>
          <span id="cta-libelle">{calcul ? T.rendu : T.telecharger}</span>
        </button>
      </div>
    </div>
  )
}
