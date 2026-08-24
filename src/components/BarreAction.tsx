// SPDX-License-Identifier: AGPL-3.0-only

import { decimal, nombre, poids } from '../lib/format'
import type { Format } from '../lib/export'
import type { Langue } from '../lib/moteur'
import type { Resolution } from '../lib/resolution'
import { remplir, type Textes } from '../i18n'

export type Phase = 'repos' | 'calcul' | 'faite' | 'erreur'
export type Echec = 'trop' | 'capacite' | 'generale' | 'formatRefuse' | 'presse' | 'svgDense'

export interface Fichier {
  largeur: number
  hauteur: number
  octets: number
  format: Format
  /** Trois pour l'export multi-appareils, un partout ailleurs. */
  nombre: number
}

/**
 * Les boutons d'action : DESIGN_SYSTEM.md, section 7. Les notes de résultat :
 * section 8.
 *
 * Un seul appel primaire par écran : télécharger. Il ne partage sa place avec
 * rien, et c'est ce qui décide de la forme de la rangée.
 *
 * Les deux tirages au sort sont maintenant côte à côte, ici, parce qu'ils
 * répondent à la même question et qu'on ne sait pas laquelle on veut avant de
 * voir : « Variante » redessine le même motif avec une autre graine,
 * « Surprends-moi » tire aussi une famille et une palette. Les séparer, l'un
 * dans la barre et l'autre à mille pixels plus bas dans le panneau, revenait à
 * cacher la moitié du geste. Sous 420 px, les deux perdent leur mot et gardent
 * leur pictogramme : le libellé reste dans leur nom accessible, la place revient
 * à « Télécharger », qui ne s'élide ni ne se coupe jamais.
 *
 * Les autres sorties sont derrière un dépli attaché au primaire, et non à côté
 * de lui. Un PNG doublé, un WebP, un SVG et le presse-papiers sont quatre
 * façons de finir la même tâche : elles n'ont pas à disputer sa place à celle
 * qui la finit dans neuf cas sur dix.
 *
 * Sous le tout, une ligne dit si le voile de lisibilité est dans le fichier, et
 * un interrupteur l'enlève. Elle est là parce que l'aperçu ne pouvait pas le
 * dire : le voile y est déjà peint, et personne ne compare une image à une
 * image qu'il n'a pas vue.
 */
export function BarreAction({
  cadre,
  children,
  phase,
  echec,
  fichier,
  resolution,
  vide,
  voile,
  langue,
  textes,
  formats,
  svgPossible,
  webpPossible,
  copiee,
  onSurprise,
  onGraine,
  onExporter,
  onCopier,
  onTrois,
  onFormats,
  onVoile,
}: {
  cadre: React.RefObject<HTMLDivElement | null>
  /** La proposition de mise à jour, quand il y en a une. */
  children?: React.ReactNode
  phase: Phase
  echec: Echec | null
  fichier: Fichier | null
  resolution: Resolution
  vide: boolean
  voile: boolean
  langue: Langue
  textes: Textes
  /** Le dépli des autres formats est ouvert. */
  formats: boolean
  /** Le motif tient dans un SVG utile. */
  svgPossible: boolean
  webpPossible: boolean
  copiee: boolean
  onSurprise: () => void
  onGraine: () => void
  onExporter: (format: Format) => void
  onCopier: () => void
  onTrois: () => void
  onFormats: () => void
  onVoile: () => void
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
        : echec === 'formatRefuse'
          ? T.erreurFormat
          : echec === 'presse'
            ? T.erreurPresse
            : echec === 'svgDense'
              ? T.erreurSvg
              : T.erreurGenerale

  const nomFormat: Record<Format, string> = {
    png: 'PNG',
    png2x: 'PNG',
    webp: 'WebP',
    svg: 'SVG',
  }

  const sorties: {
    id: string
    format: Format | null
    titre: string
    note: string
    indisponible: string | null
    action: () => void
  }[] = [
    {
      id: 'format-png2x',
      format: 'png2x',
      titre: T.formatPng2x,
      note: T.formatPng2xNote,
      indisponible: null,
      action: () => onExporter('png2x'),
    },
    {
      id: 'format-webp',
      format: 'webp',
      titre: T.formatWebp,
      note: T.formatWebpNote,
      indisponible: webpPossible ? null : T.erreurFormat,
      action: () => onExporter('webp'),
    },
    {
      id: 'format-svg',
      format: 'svg',
      titre: T.formatSvg,
      note: T.formatSvgNote,
      indisponible: svgPossible ? null : T.formatSvgDense,
      action: () => onExporter('svg'),
    },
    {
      id: 'format-trois',
      format: null,
      titre: T.formatTrois,
      note: T.formatTroisNote,
      indisponible: null,
      action: onTrois,
    },
    {
      id: 'format-copie',
      format: null,
      titre: copiee ? T.copiee : T.formatCopie,
      note: T.formatCopieNote,
      indisponible: null,
      action: onCopier,
    },
  ]

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
              <p className="note-t">
                {fichier.nombre > 1 ? T.enregistresTrois : T.enregistre}
              </p>
              <p className="note-m" id="note-meta">
                {fichier.nombre > 1
                  ? remplir(T.metaTrois, {
                      poids: poids(fichier.octets, langue, T.ko, T.mo),
                    })
                  : `${nombre(fichier.largeur, langue)}\u00a0×\u00a0${nombre(fichier.hauteur, langue)}\u00a0px, ${nomFormat[fichier.format]}, ${poids(fichier.octets, langue, T.ko, T.mo)}`}
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
            <button
              type="button"
              id="btn-reessayer"
              className="note-reessayer"
              onClick={() => onExporter('png')}
            >
              {T.reessayer}
            </button>
          </div>
        )}
      </div>

      {/* Le dépli est au-dessus de la rangée et non dessous : la barre est
          collée en bas de l'écran, et une liste qui pousserait vers le bas
          sortirait de la fenêtre. */}
      {formats && (
        <div className="feuille" id="feuille-formats">
          <ul className="feuille-liste">
            {sorties.map((sortie) => (
              <li key={sortie.id}>
                <button
                  type="button"
                  id={sortie.id}
                  className="feuille-b"
                  disabled={Boolean(sortie.indisponible) || vide}
                  onClick={sortie.action}
                >
                  <span className="feuille-t">{sortie.titre}</span>
                  <span className="feuille-n">{sortie.indisponible ?? sortie.note}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="actions">
        <button
          type="button"
          id="btn-surprise"
          className="btn-graine btn-compact"
          title={T.surpriseTitre}
          onClick={onSurprise}
        >
          <span className="ico-etincelle" aria-hidden="true" />
          <span className="btn-t">{T.surprise}</span>
        </button>
        <button
          type="button"
          id="btn-graine"
          className="btn-graine btn-compact"
          title={T.nouveauTitre}
          onClick={onGraine}
        >
          <span className="ico-encore" aria-hidden="true">
            <i />
            <b />
          </span>
          <span className="btn-t">{T.nouveau}</span>
        </button>
        {/* Pendant le rendu, `disabled` retirerait le focus du bouton et le
            renverrait au début du document, obligeant à tout reparcourir.
            `aria-disabled` le neutralise sans le rendre infocusable, et
            l'export refuse de repartir de lui-même. `disabled` ne reste que
            pour l'état vide, où le bouton n'a rien à faire dans le parcours. */}
        <div className="btn-paire">
          <button
            type="button"
            id="btn-export"
            className="btn-export"
            disabled={vide}
            aria-disabled={calcul}
            aria-busy={calcul}
            onClick={() => onExporter('png')}
          >
            <span className="ico-descendre" aria-hidden="true">
              <i />
              <b />
            </span>
            <span id="cta-libelle">{calcul ? T.rendu : T.telecharger}</span>
          </button>
          <button
            type="button"
            id="btn-formats"
            className="btn-formats"
            aria-expanded={formats}
            aria-controls="feuille-formats"
            aria-label={formats ? T.formatsFermer : T.formats}
            title={T.formatsTitre}
            onClick={onFormats}
          >
            <span className="ico-chevron" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* La ligne du voile. Elle n'est pas une note de bas de page : c'est la
          seule chose de l'écran qui dise ce que le fichier contient de plus
          que le motif choisi. */}
      <p className="barre-voile" id="barre-voile">
        <span>{voile ? T.voileInclus : T.voileAbsent}</span>
        <button
          type="button"
          id="btn-voile"
          className="btn-voile"
          aria-pressed={!voile}
          title={T.voileTitre}
          onClick={onVoile}
        >
          {voile ? T.voileRetirer : T.voileRemettre}
        </button>
      </p>
    </div>
  )
}
