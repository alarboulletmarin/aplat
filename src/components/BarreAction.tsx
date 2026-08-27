// SPDX-License-Identifier: AGPL-3.0-only

import { useRef, type ReactNode } from 'react'
import { decimal, nombre, poids } from '../lib/format'
import type { EchecExport, Format } from '../lib/export'
import type { Langue } from '../lib/moteur'
import type { Proto } from '../lib/proto'
import type { Resolution } from '../lib/resolution'
import { remplir, type Textes } from '../i18n'
import { FeuilleModale } from './FeuilleModale'

export type Phase = 'repos' | 'calcul' | 'faite' | 'erreur'
/* Les échecs de l'encodeur, plus celui que la barre détecte avant lui. */
export type Echec = EchecExport | 'trop'

export interface Fichier {
  largeur: number
  hauteur: number
  octets: number
  format: Format
  /** Trois pour l'export multi-appareils, un partout ailleurs. */
  nombre: number
  /** Le fichier prêt pour la feuille de partage native, quand elle le prend. */
  photos: File | null
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
  voilePeint,
  sombre,
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
  onFermerNote,
  onPhotos,
  proto = null,
  studio,
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
  /** Le voile est demandé, et la sonde a effectivement eu à le poser. */
  voilePeint: boolean
  /** La version sombre est choisie : le fichier porte l'aplat de la version. */
  sombre: boolean
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
  onFermerNote: () => void
  /** Ouvre la feuille de partage native avec le fichier de la carte. */
  onPhotos: () => void
  /** Le banc d'essai des sorties (`lib/proto.ts`) : null hors prototype. */
  proto?: Proto
  /** Le contenu du studio d'export, fourni par App sous `?proto=studio`. */
  studio?: ReactNode
}) {
  const T = textes.barre
  const calcul = phase === 'calcul'

  /* Échap referme le dépli et rend le focus à son déclencheur : la feuille
     n'est pas un piège à focus, mais sans ce chemin de sortie le clavier
     devait retraverser les cinq sorties pour revenir à la rangée. */
  const boutonFormats = useRef<HTMLButtonElement>(null)
  const surEchap = (evenement: React.KeyboardEvent<HTMLDivElement>) => {
    if (evenement.key !== 'Escape' || !formats) return
    onFormats()
    boutonFormats.current?.focus()
  }

  /* Le glissement qui retire la note de succès. Un seul doigt, vers le bas,
     le sens dans lequel une carte posée en bas de l'écran peut partir. Le
     bouton Fermer et la minuterie font le même travail sans geste : le
     glissement est un raccourci, jamais le seul chemin. La carte suit le
     doigt pendant le geste, c'est de la manipulation directe et non une
     animation, donc rien à retenir pour `prefers-reduced-motion`. */
  const glisse = useRef<{ depart: number; pointeur: number } | null>(null)
  const SEUIL_GLISSE = 48

  const prendreNote = (evenement: React.PointerEvent<HTMLDivElement>) => {
    if ((evenement.target as HTMLElement).closest('button')) return
    glisse.current = { depart: evenement.clientY, pointeur: evenement.pointerId }
    evenement.currentTarget.setPointerCapture(evenement.pointerId)
  }
  const suivreNote = (evenement: React.PointerEvent<HTMLDivElement>) => {
    if (!glisse.current || evenement.pointerId !== glisse.current.pointeur) return
    const descente = Math.max(0, evenement.clientY - glisse.current.depart)
    evenement.currentTarget.style.transform = descente ? `translateY(${descente}px)` : ''
    evenement.currentTarget.style.opacity = descente ? String(Math.max(0.2, 1 - descente / 160)) : ''
  }
  const relacherNote = (evenement: React.PointerEvent<HTMLDivElement>, abandonne: boolean) => {
    if (!glisse.current || evenement.pointerId !== glisse.current.pointeur) return
    const descente = evenement.clientY - glisse.current.depart
    glisse.current = null
    evenement.currentTarget.style.transform = ''
    evenement.currentTarget.style.opacity = ''
    if (!abandonne && descente > SEUIL_GLISSE) onFermerNote()
  }

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
    <div className="barre" ref={cadre} onKeyDown={surEchap}>
      <div className="barre-live" aria-live="polite">
        {/* La proposition de mise à jour monte dans la région live, déjà en
            place et vide au chargement : une région insérée déjà remplie
            n'est pas annoncée de façon fiable. */}
        {children}
        {phase === 'faite' && !vide && fichier && (
          <div
            className="note note-faite"
            id="note-faite"
            onPointerDown={prendreNote}
            onPointerMove={suivreNote}
            onPointerUp={(evenement) => relacherNote(evenement, false)}
            onPointerCancel={(evenement) => relacherNote(evenement, true)}
          >
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
              {/* Le dernier mètre vers la pellicule. Quand la feuille de
                  partage native prend le fichier, l'astuce en prose devient
                  un bouton qui fait la chose au lieu de la décrire ; sinon
                  la phrase reste, et décrit le chemin réel. */}
              {fichier.photos ? (
                <button
                  type="button"
                  id="note-photos"
                  className="note-reessayer note-photos"
                  onClick={onPhotos}
                >
                  {T.photos}
                </button>
              ) : (
                <p className="note-h">{T.astuce}</p>
              )}
            </div>
            <button
              type="button"
              id="note-fermer"
              className="note-fermer"
              onClick={onFermerNote}
            >
              {T.fermer}
            </button>
          </div>
        )}

        {phase === 'erreur' && (
          <div className="note note-erreur" id="note-erreur">
            <span className="note-erreur-i" aria-hidden="true" />
            <div className="note-txt">
              <p className="note-t">{T.erreurTitre}</p>
              <p className="note-d" id="note-erreur-message">{message}</p>
            </div>
            {/* Réessayer relance un PNG : c'est le bon repli pour un format
                refusé ou un presse-papiers fermé. Quand c'est la résolution
                qui dépasse, le même essai produirait le même échec : le
                bouton se tait, la phrase dit déjà quoi baisser. */}
            {echec !== 'trop' && (
              <button
                type="button"
                id="btn-reessayer"
                className="note-reessayer"
                onClick={() => onExporter('png')}
              >
                {T.reessayer}
              </button>
            )}
          </div>
        )}

        {/* Deux états qui ne changeaient qu'un libellé hors région live : le
            début du rendu et la copie de l'image. Chacun monte ici dans son
            propre nœud, invisible à l'œil, pour être dit sans effacer une
            note déjà en train de l'être. */}
        {calcul && <p className="vh">{T.rendu}</p>}
        {copiee && <p className="vh">{T.copiee}</p>}
      </div>

      <div className="actions">
        <button
          type="button"
          id="btn-surprise"
          className="btn-graine btn-compact"
          aria-keyshortcuts="s"
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
          aria-keyshortcuts="v"
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
        {proto === 'trio' ? (
          /* La variante trio du banc d'essai : plus de paire, le primaire
             ouvre la feuille et la feuille fait tout. Le PNG courant passe
             de un geste à deux, c'est exactement ce que ce banc mesure. */
          <button
            type="button"
            id="btn-export"
            ref={boutonFormats}
            className="btn-export"
            disabled={vide}
            aria-disabled={calcul}
            aria-busy={calcul}
            aria-haspopup="dialog"
            aria-expanded={formats}
            aria-controls="feuille-modale"
            title={T.formatsTitre}
            onClick={onFormats}
          >
            <span className="ico-descendre" aria-hidden="true">
              <i />
              <b />
            </span>
            <span id="cta-libelle">{calcul ? T.rendu : textes.studio.titre}</span>
          </button>
        ) : (
          <div className="btn-paire">
            <button
              type="button"
              id="btn-export"
              className="btn-export"
              aria-keyshortcuts="t"
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
              ref={boutonFormats}
              className="btn-formats"
              aria-expanded={formats}
              aria-controls={proto === null ? 'feuille-formats' : 'feuille-modale'}
              aria-haspopup={proto === null ? undefined : 'dialog'}
              aria-label={formats ? T.formatsFermer : T.formats}
              title={T.formatsTitre}
              onClick={onFormats}
            >
              <span className="ico-chevron" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {/* Le banc d'essai des sorties (`lib/proto.ts`) : sous `?proto=`, le
          dépli cède sa place à une feuille basse modale portée hors de la
          barre. Le choix d'une sortie referme la feuille avant d'agir : la
          carte de résultat vit dans la barre, derrière le voile. */}
      {proto === 'feuille' && (
        <FeuilleModale
          id="feuille-modale"
          titreId="feuille-modale-titre"
          titre={T.formats}
          ouverte={formats}
          onFermer={onFormats}
          retourFocus={boutonFormats}
        >
          <ul className="feuille-liste">
            {sorties.map((sortie) => (
              <li key={sortie.id}>
                <button
                  type="button"
                  id={sortie.id}
                  className="feuille-b"
                  disabled={vide}
                  aria-disabled={sortie.indisponible ? true : undefined}
                  onClick={
                    sortie.indisponible
                      ? undefined
                      : () => {
                          onFormats()
                          sortie.action()
                        }
                  }
                >
                  <span className="feuille-t">{sortie.titre}</span>
                  <span className="feuille-n">{sortie.indisponible ?? sortie.note}</span>
                </button>
              </li>
            ))}
          </ul>
        </FeuilleModale>
      )}
      {(proto === 'studio' || proto === 'trio') && (
        <FeuilleModale
          id="feuille-modale"
          titreId="feuille-modale-titre"
          titre={textes.studio.titre}
          ouverte={formats}
          grande
          onFermer={onFormats}
          retourFocus={boutonFormats}
        >
          {studio}
        </FeuilleModale>
      )}

      {/* Le dépli suit son déclencheur dans le document, pour que Tab y entre
          juste après lui. Il se montre pourtant au-dessus de la rangée : la
          barre est collée en bas de l'écran, et une liste qui pousserait vers
          le bas sortirait de la fenêtre. C'est `order`, dans composants.css,
          qui fait cet écart entre l'ordre lu et l'ordre vu. */}
      {proto === null && formats && (
        <div className="feuille" id="feuille-formats">
          <ul className="feuille-liste">
            {sorties.map((sortie) => (
              <li key={sortie.id}>
                {/* `aria-disabled` et non `disabled` : la ligne indisponible
                    garde sa raison affichée, et un focus qui ne peut pas s'y
                    poser ne peut pas la lire. Même raisonnement que le bouton
                    primaire pendant le rendu. `disabled` ne reste que pour
                    l'état vide, où toute la feuille est sans objet. */}
                <button
                  type="button"
                  id={sortie.id}
                  className="feuille-b"
                  disabled={vide}
                  aria-disabled={sortie.indisponible ? true : undefined}
                  onClick={sortie.indisponible ? undefined : sortie.action}
                >
                  <span className="feuille-t">{sortie.titre}</span>
                  <span className="feuille-n">{sortie.indisponible ?? sortie.note}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* La ligne du fichier. Elle n'est pas une note de bas de page : c'est la
          seule chose de l'écran qui dise ce que le fichier contient de plus
          que le motif choisi.

          Elle dit ce qui est peint, et non ce qui est demandé. La nuance a un
          cas courant : la version sombre descend sous le seuil que le voile
          vise, si bien que la sonde n'a plus de voile à poser. Écrire là « le
          voile est inclus dans le fichier » serait faux, et c'est exactement le
          genre de phrase que ce produit ne doit pas écrire.

          Les deux libellés du bouton sont posés l'un sur l'autre, et celui qui
          ne sert pas garde sa place sans se montrer : sa largeur est donc celle
          du plus long des deux, dans n'importe quelle langue, et le bouton ne
          se déplace pas sous le doigt qui vient de l'appuyer. La phrase, elle,
          prend toute la place qui reste, ce qui ancre le bouton au bord plutôt
          qu'à la fin du texte, dont la longueur change aussi. */}
      {proto !== 'trio' && (
      <p className="barre-voile" id="barre-voile">
        <span>
          {sombre ? `${T.versionSombre} ` : ''}
          {voile ? (voilePeint ? T.voileInclus : T.voileNul) : T.voileAbsent}
        </span>
        {/* Pas d'aria-pressed ici : le libellé décrit l'action à venir
            (« Retirer » ou « Remettre »), et un état pressé par-dessus disait
            l'inverse du mot lu. L'épingle d'Historique garde le sien parce
            qu'il suit son état, pressé quand c'est épinglé. L'attribut de
            donnée ne porte que le costume : l'état, c'est la phrase à côté
            qui le dit. */}
        <button
          type="button"
          id="btn-voile"
          className="btn-voile"
          data-voile={voile ? 'oui' : 'non'}
          title={T.voileTitre}
          onClick={onVoile}
        >
          <span className="btn-double">
            <span className="btn-double-l" data-actif={voile ? 'oui' : 'non'}>
              {T.voileRetirer}
            </span>
            <span className="btn-double-l" data-actif={voile ? 'non' : 'oui'}>
              {T.voileRemettre}
            </span>
          </span>
        </button>
      </p>
      )}
    </div>
  )
}
