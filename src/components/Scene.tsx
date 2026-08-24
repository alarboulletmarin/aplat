// SPDX-License-Identifier: AGPL-3.0-only

import { useRef, useState, type CSSProperties } from 'react'
import {
  ASSOMBRISSEMENT, assombrir, famille, palette, sansVoile,
  type Langue, type Mesure, type Motif,
} from '../lib/moteur'
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
 * téléphone, et il ne restait presque rien pour choisir parmi trente-deux
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
  voile,
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
  /** Le voile de lisibilité est-il peint dans le fichier, donc dans l'aperçu. */
  voile: boolean
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

  /* Le rideau clair/sombre : la position du trait, en pourcentage de la
     largeur, comptée depuis la gauche. Cent, donc rien d'assombri, tant qu'on
     n'y touche pas.
     
     Une aide à la lecture, pas un réglage : il ne part ni dans l'URL ni dans le
     fichier, et repart à cent au rechargement. C'est le même geste que la
     bascule qu'il remplace, mais continu : un thème sombre ne se juge pas à
     « avant » et « après » posés l'un après l'autre, il se juge en voyant la
     limite passer sur le motif, sous les mêmes libellés. */
  const [separation, setSeparation] = useState(100)

  const vide = !resolution.largeur || !resolution.hauteur

  /* Replier l'aperçu n'a de sens que là où la scène recouvre la page,
     c'est-à-dire sous 360 px : au-delà elle tient dans sa colonne, à côté des
     réglages, et ne prend la place de personne. Le seuil est celui de
     `.colonnes` dans `ecrans.css` ; les deux basculent ensemble.

     Le verdict, lui, se condense dans deux autres cas. En paysage court, où la
     hauteur est comptée : trois lignes de détail y valent le quart de l'écran.
     Et dans une colonne étroite, où le détail déplié fait dix lignes de quatre
     mots et pousse la barre d'action hors de vue. Il reste à un appui dans les
     deux cas. */
  const replie = defile && fenetre.largeur < 360
  const colonneEtroite = tailleBoite.largeur > 0 && tailleBoite.largeur < 300
  const verdictReplie = replie || paysageCourt(fenetre) || colonneEtroite

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

  /* Dans une colonne étroite, l'appareil est borné par la largeur et non par la
     hauteur : la boîte se referme sur lui plutôt que de laisser sous l'aperçu
     un vide qui pousserait le verdict vers la barre d'action. Au-delà de 760 px
     la boîte garde la hauteur de la maquette, et l'appareil y est centré. */
  const hauteurRendue =
    geometrie && fenetre.largeur < 760
      ? Math.min(hauteurBoite, geometrie.hauteur)
      : hauteurBoite

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

  /* Le verdict porte sur le fichier tel qu'il sera, et sur la condition qu'on
     regarde. Deux corrections, dans cet ordre : le voile retiré change le
     contraste du fichier lui-même, l'assombrissement ne change que ce qu'on en
     voit. Les inverser reviendrait à assombrir une image qui n'existe pas. */
  const assombri = separation < 100
  const brute = vide || !mesure ? null : voile ? mesure : sansVoile(mesure)
  const verdict = brute && assombri ? assombrir(brute) : brute

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
        style={{ height: `${hauteurRendue}px` }}
      >
        <div className="appareil" id="appareil" style={style}>
          {!vide && (
            <Apercu
              motif={motif}
              resolution={resolution}
              voile={voile}
              largeur={Math.max(0, (geometrie?.largeur ?? 0) - 8)}
              hauteur={Math.max(0, (geometrie?.hauteur ?? 0) - 8)}
              description={description}
              revision={revision}
            />
          )}

          {/* L'assombrissement est peint par-dessus le motif et sous la
              maquette : ce sont bien les libellés sur un fond assombri qu'on
              juge. Le fichier téléchargé, lui, ne le porte pas.
              Il est découpé à la position du rideau, si bien que la même
              graine se voit en clair et en sombre d'un seul regard, sous les
              mêmes libellés. */}
          {!vide && assombri && (
            <span
              className="apercu-assombri"
              aria-hidden="true"
              style={{
                background: `rgba(0, 0, 0, ${ASSOMBRISSEMENT})`,
                clipPath: `inset(0 0 0 ${separation}%)`,
              }}
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

          {/* La glissière ne couvre qu'une bande de quarante-quatre pixels au
              milieu de l'appareil, et non toute sa surface : sur téléphone
              l'aperçu est collé en haut de l'écran, et une glissière plein
              cadre y aurait pris le geste de défilement. Elle disparaît avec
              le repli, faute de place et faute d'objet : replié, on parcourt
              les motifs ; déplié, on les juge. */}
          {!vide && !calculEnCours && !replie && geometrie && (
            <div className="rideau" id="rideau">
              <span
                className="rideau-trait"
                style={{ left: `${separation}%` }}
                aria-hidden="true"
              />
              {/* La poignée est bornée à quinze pixels des bords, le trait ne
                  l'est pas : au repos, le rideau est à cent et le trait tombe
                  sur le bord même, où une poignée centrée serait coupée en deux
                  et ne se verrait plus. Le trait dit la limite, la poignée dit
                  qu'on peut la prendre ; l'écart des deux ne dépasse jamais la
                  largeur d'un doigt, et seulement contre les bords. */}
              <span
                className="rideau-poignee"
                style={{ left: `clamp(15px, ${separation}%, calc(100% - 15px))` }}
                aria-hidden="true"
              >
                <i />
                <i />
              </span>
              <input
                type="range"
                id="rideau-glissiere"
                className="rideau-glissiere"
                min={0}
                max={100}
                step={1}
                value={separation}
                aria-label={textes.lisibilite.rideau}
                aria-valuetext={
                  separation >= 100
                    ? textes.lisibilite.rideauClair
                    : separation <= 0
                      ? textes.lisibilite.rideauSombre
                      : remplir(textes.lisibilite.rideauValeur, {
                          n: String(100 - separation),
                        })
                }
                title={textes.lisibilite.rideauTitre}
                onChange={(evenement) => setSeparation(Number(evenement.target.value))}
              />
            </div>
          )}
        </div>
      </div>

      <p className="vh" id="note-maquette">
        {textes.scene.note}
      </p>

      <Verdict
        mesure={verdict}
        textes={textes}
        langue={langue}
        replie={verdictReplie}
        assombri={assombri}
        voileRetire={!voile}
      />
    </section>
  )
}
