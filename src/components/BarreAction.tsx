// SPDX-License-Identifier: AGPL-3.0-only

import { useRef, type ReactNode } from 'react'
import { decimal, nombre, poids } from '../lib/format'
import type { EchecExport, Format } from '../lib/export'
import type { Langue } from '../lib/moteur'
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
 * Tout le reste de l'export tient dans le studio (`StudioExport`), une feuille
 * basse ouverte par la puce de synthèse sous le primaire. La puce dit le
 * fichier que « Télécharger » produira : taille, format, version, voile ; un
 * tap dessus ouvre la feuille qui le règle. C'est le pattern des exports
 * d'applis vidéo : le primaire fait la chose dans neuf cas sur dix, la
 * configuration complète est à un geste, et aucun bouton ne ment sur le sien.
 * La ligne du voile d'avant vivait ici pour la même raison que la puce :
 * l'aperçu ne peut pas dire ce qu'il contient déjà, il faut l'écrire.
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
  copiee,
  format,
  onSurprise,
  onGraine,
  onExporter,
  onReessayer,
  onFormats,
  onFermerNote,
  onPhotos,
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
  /** Le studio d'export est ouvert. */
  formats: boolean
  copiee: boolean
  /** Le format de la session : la puce l'écrit, Télécharger le produit. */
  format: Format
  onSurprise: () => void
  onGraine: () => void
  onExporter: (format: Format) => void
  /** Rejoue l'export après un échec, en PNG : les messages le promettent. */
  onReessayer: () => void
  /** Ouvre et referme le studio d'export. */
  onFormats: () => void
  onFermerNote: () => void
  /** Ouvre la feuille de partage native avec le fichier de la carte. */
  onPhotos: () => void
  /** Le contenu du studio d'export, câblé par App sur le même état. */
  studio: ReactNode
}) {
  const T = textes.barre
  const calcul = phase === 'calcul'

  /* La puce reprend le focus quand le studio se referme : c'est elle qui l'a
     ouvert, et la feuille (FeuilleModale) fait le reste, Échap compris. */
  const boutonFormats = useRef<HTMLButtonElement>(null)

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

  /* Le nom du choix, pas celui du fichier : le PNG doublé se choisit comme
     « PNG 2x » mais livre un PNG, et c'est `nomFormat` qui parle du fichier. */
  const nomChoix: Record<Format, string> = {
    png: 'PNG',
    png2x: T.formatPng2x,
    webp: T.formatWebp,
    svg: T.formatSvg,
  }

  return (
    <div className="barre" ref={cadre}>
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
                onClick={onReessayer}
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
        <button
          type="button"
          id="btn-export"
          className="btn-export"
          aria-keyshortcuts="t"
          disabled={vide}
          aria-disabled={calcul}
          aria-busy={calcul}
          onClick={() => onExporter(format)}
        >
          <span className="ico-descendre" aria-hidden="true">
            <i />
            <b />
          </span>
          <span id="cta-libelle">{calcul ? T.rendu : T.telecharger}</span>
        </button>
      </div>

      {/* Le studio d'export, porté hors de la barre : une feuille basse
          modale, la seule du produit, ouverte par la puce ci-dessous. Le
          choix d'une sortie referme la feuille avant d'agir : la carte de
          résultat vit dans la barre, derrière le voile. */}
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

      {/* La puce de synthèse. Elle est la ligne du fichier : la seule chose
          de l'écran qui dise ce que « Télécharger » produira au-delà du motif
          choisi, taille, format, version et voile. Elle dit ce qui est peint,
          et non ce qui est demandé : la version sombre descend sous le seuil
          que le voile vise, la sonde n'a alors plus de voile à poser, et
          écrire « voile inclus » là serait faux.

          Et elle est le chemin du studio : un tap l'ouvre, comme la ligne de
          réglages des exports d'applis vidéo. Le primaire fait la chose, la
          puce la décrit et la règle : aucun des deux ne ment sur son geste.

          Le format qu'elle écrit est celui de la session : choisi au studio,
          il tient jusqu'au prochain changement ou au rechargement, et c'est
          lui que Télécharger produit. La mémoire n'est sûre que parce que la
          puce l'écrit là, sous le bouton. */}
      <button
        type="button"
        id="synthese-sortie"
        ref={boutonFormats}
        className="synthese-sortie"
        aria-haspopup="dialog"
        aria-expanded={formats}
        aria-controls="feuille-modale"
        title={textes.studio.titre}
        onClick={onFormats}
      >
        <span className="synthese-texte">
          {[
            vide
              ? textes.resolution.aucune
              : `${nombre(resolution.largeur, langue)}\u00a0×\u00a0${nombre(resolution.hauteur, langue)}\u00a0px`,
            nomChoix[format],
            ...(sombre ? [textes.studio.syntheseSombre] : []),
            voile
              ? voilePeint
                ? textes.studio.syntheseVoile
                : textes.studio.syntheseVoileNul
              : textes.studio.syntheseSansVoile,
          ].join(', ')}
        </span>
        <span className="ico-chevron" aria-hidden="true" />
      </button>
    </div>
  )
}
