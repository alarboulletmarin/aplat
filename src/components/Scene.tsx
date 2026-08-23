// SPDX-License-Identifier: AGPL-3.0-only

import { useRef, type CSSProperties } from 'react'
import { famille, palette, type Langue, type Mesure, type Motif } from '../lib/moteur'
import {
  geometrieAppareil, hauteurScene, hauteurVignette, jetonsLibelle, paysageCourt,
} from '../lib/geometrie'
import type { Resolution, TypeAppareil } from '../lib/resolution'
import { remplir, type Textes } from '../i18n'
import { useTaille, useTailleFenetre } from '../hooks/useTaille'
import { useHorloge } from '../hooks/useHorloge'
import { Apercu } from './Apercu'
import { MaquetteBureau, MaquetteTelephone } from './Maquette'
import { Verdict } from './Verdict'

/**
 * La scène : DESIGN_SYSTEM.md, section 1 (la hiérarchie de l'écran) et
 * section 6 (gabarits).
 *
 * Le motif, dans une maquette d'écran, avec le verdict de lisibilité juste
 * dessous.
 *
 * C'est le seul endroit de la page qui répond à la question posée (« mes
 * icônes resteront-elles lisibles ? »), et c'est pour ça qu'il est collant sur
 * téléphone : on règle en dessous, on juge au-dessus, sans faire l'aller-retour.
 *
 * Collant, mais pas encombrant : dès que la page défile, l'aperçu se replie en
 * vignette et le verdict se condense sur une ligne. À trois, la scène, le
 * verdict et la barre d'action prenaient les deux tiers d'un écran de
 * téléphone, et il ne restait presque rien pour choisir parmi dix-huit
 * familles et onze palettes.
 *
 * Le repli passe par l'échelle et non par la géométrie : la boîte de
 * l'appareil garde la taille qu'elle aurait dépliée, si bien que le motif
 * n'est pas redessiné, que la maquette ne se réajuste pas, et que la
 * transition ne coûte qu'une composition.
 */
export function Scene({
  cadre,
  motif,
  resolution,
  type,
  mesure,
  langue,
  textes,
  calculEnCours,
  defile,
  revision,
}: {
  cadre: React.RefObject<HTMLElement | null>
  motif: Motif
  resolution: Resolution
  type: TypeAppareil
  mesure: Mesure | null
  langue: Langue
  textes: Textes
  calculEnCours: boolean
  /** La page a défilé au-delà du seuil de repli. */
  defile: boolean
  revision: number
}) {
  const boite = useRef<HTMLDivElement>(null)
  const tailleBoite = useTaille(boite)
  const fenetre = useTailleFenetre()
  const instant = useHorloge(langue)

  const vide = !resolution.largeur || !resolution.hauteur

  /* Replier l'aperçu n'a de sens que là où la scène recouvre la page,
     c'est-à-dire sous 760 px : au-delà elle tient dans sa colonne et ne prend
     la place de personne.

     Le verdict, lui, se condense aussi en paysage court, où la hauteur est
     comptée : trois lignes de détail y valent le quart de l'écran. Il reste à
     un appui. */
  const replie = defile && fenetre.largeur < 760
  const verdictReplie = replie || paysageCourt(fenetre)

  /* La hauteur dépliée sert de référence à la géométrie, y compris pendant le
     repli : c'est ce qui garde le canevas et la maquette hors de la
     transition. La boîte, elle, se contracte pour rendre la place. */
  const hauteurPleine = hauteurScene(fenetre)
  const hauteurBoite = replie
    ? Math.min(hauteurVignette(fenetre), hauteurPleine)
    : hauteurPleine
  const geometrie = geometrieAppareil(
    { largeur: tailleBoite.largeur, hauteur: hauteurPleine },
    resolution,
    type,
  )
  const echelle =
    replie && geometrie ? Math.min(1, hauteurBoite / geometrie.hauteur) : 1

  const style: CSSProperties = geometrie
    ? ({
        width: `${geometrie.largeur}px`,
        height: `${geometrie.hauteur}px`,
        borderRadius: `${geometrie.rayon}px`,
        ...(echelle < 1 ? { transform: `scale(${echelle.toFixed(4)})` } : {}),
        '--mu': `${geometrie.module}px`,
        '--colonnes': geometrie.colonnes,
        ...(mesure ? jetonsLibelle(mesure.libelles) : {}),
      } as CSSProperties)
    : {}

  const nomFamille = famille(motif.famille)?.[langue] ?? motif.famille
  const nomDensite = [textes.reglages.calme, textes.reglages.moyen, textes.reglages.dense][
    motif.densite
  ]
  const description =
    vide || calculEnCours
      ? null
      : remplir(textes.scene.alternative, {
          famille: nomFamille,
          palette: palette(motif.palette)[langue],
          densite: nomDensite,
          graine: String(motif.graine),
        })

  /* La maquette ne dépend que du type d'appareil, de la langue et de la
     géométrie : c'est ce qui remet son ajustement à zéro, rien d'autre. */
  const signature = [type, langue, geometrie?.largeur, geometrie?.hauteur, instant.quantieme].join('|')

  return (
    <section className="scene" ref={cadre as React.RefObject<HTMLElement>} aria-labelledby="scene-h">
      <h2 className="vh" id="scene-h">
        {textes.scene.titre}
      </h2>

      <div
        className={`scene-boite${replie ? ' scene-boite-repliee' : ''}`}
        id="scene-boite"
        ref={boite}
        style={{ height: `${hauteurBoite}px` }}
      >
        <div className="appareil" id="appareil" style={style}>
          {!vide && (
            <Apercu
              motif={motif}
              resolution={resolution}
              largeur={Math.max(0, (geometrie?.largeur ?? 0) - 8)}
              hauteur={Math.max(0, (geometrie?.hauteur ?? 0) - 8)}
              description={description}
              revision={revision}
            />
          )}

          {!vide && !calculEnCours && type !== 'ordinateur' && (
            <MaquetteTelephone
              textes={textes}
              instant={instant}
              colonnes={geometrie?.colonnes ?? 4}
              signature={signature}
            />
          )}
          {!vide && !calculEnCours && type === 'ordinateur' && (
            <MaquetteBureau textes={textes} instant={instant} signature={signature} />
          )}

          {vide && (
            <div className="etat-vide" id="etat-vide">
              <span className="etat-vide-i" aria-hidden="true" />
              <strong className="etat-vide-t">{textes.scene.videTitre}</strong>
              <span className="etat-vide-b">{textes.scene.videCorps}</span>
            </div>
          )}

          {calculEnCours && (
            <div className="etat-calcul" id="etat-calcul">
              <span className="etat-calcul-p" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </div>
          )}
        </div>
      </div>

      <p className="vh" id="note-maquette">
        {textes.scene.note}
      </p>

      <Verdict
        mesure={vide ? null : mesure}
        textes={textes}
        langue={langue}
        replie={verdictReplie}
      />
    </section>
  )
}
