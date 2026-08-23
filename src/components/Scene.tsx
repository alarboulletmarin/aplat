// SPDX-License-Identifier: AGPL-3.0-only

import { useRef, type CSSProperties } from 'react'
import { famille, palette, type Langue, type Mesure, type Motif } from '../lib/moteur'
import { geometrieAppareil, hauteurScene, jetonsLibelle } from '../lib/geometrie'
import type { Resolution, TypeAppareil } from '../lib/resolution'
import { remplir, type Textes } from '../i18n'
import { useTaille, useTailleFenetre } from '../hooks/useTaille'
import { useHorloge } from '../hooks/useHorloge'
import { Apercu } from './Apercu'
import { MaquetteBureau, MaquetteTelephone } from './Maquette'
import { Verdict } from './Verdict'

/**
 * La scène : le motif, dans une maquette d'écran, avec le verdict de
 * lisibilité juste dessous.
 *
 * C'est le seul endroit de la page qui répond à la question posée — « mes
 * icônes resteront-elles lisibles ? » — et c'est pour ça qu'il est collant sur
 * téléphone : on règle en dessous, on juge au-dessus, sans faire l'aller-retour.
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
  revision: number
}) {
  const boite = useRef<HTMLDivElement>(null)
  const tailleBoite = useTaille(boite)
  const fenetre = useTailleFenetre()
  const instant = useHorloge(langue)

  const vide = !resolution.largeur || !resolution.hauteur
  const geometrie = geometrieAppareil(tailleBoite, resolution, type)

  const style: CSSProperties = geometrie
    ? ({
        width: `${geometrie.largeur}px`,
        height: `${geometrie.hauteur}px`,
        borderRadius: `${geometrie.rayon}px`,
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
        className="scene-boite"
        ref={boite}
        style={{ height: `${hauteurScene(fenetre)}px` }}
      >
        <div className="appareil" style={style}>
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
            <div className="etat-vide">
              <span className="etat-vide-i" aria-hidden="true" />
              <strong className="etat-vide-t">{textes.scene.videTitre}</strong>
              <span className="etat-vide-b">{textes.scene.videCorps}</span>
            </div>
          )}

          {calculEnCours && (
            <div className="etat-calcul">
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

      <Verdict mesure={vide ? null : mesure} textes={textes} langue={langue} />
    </section>
  )
}
