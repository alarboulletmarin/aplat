// SPDX-License-Identifier: AGPL-3.0-only

import {
  useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties,
} from 'react'
import {
  ASSOMBRISSEMENT, assombrir, famille, palette, sansVoile,
  type Langue, type Mesure, type Motif,
} from '../lib/moteur'
import {
  BORDURE_APPAREIL, geometrieAppareil, hauteurScene, hauteurVignette,
  jetonsLibelle, paysageCourt,
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
/** Le rayon de la poignée du rideau, égal à celui de `.rideau-poignee`. */
const RAYON_POIGNEE = 15

/**
 * Où le rideau se tient au départ : au milieu.
 *
 * Il a commencé tout à droite, l'aperçu entier montrant le fichier tel quel, et
 * c'était la mauvaise réponse à la bonne question. Un comparateur qui s'ouvre
 * fermé ne compare rien : il fallait avoir l'idée de tirer le trait pour
 * découvrir qu'il y avait deux états, et toute position autre que l'extrême
 * droite montrait du sombre sans montrer de clair à côté.
 *
 * Au milieu, les deux conditions sont là d'emblée, sous les mêmes libellés, et
 * c'est exactement ce qu'on est venu juger. Le fichier, lui, reste entier : il
 * est à gauche du trait, et le verdict le nomme.
 */
const RIDEAU_DEPART = 50

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
     fichier, et repart au milieu au rechargement. C'est le même geste que la
     bascule qu'il remplace, mais continu : un thème sombre ne se juge pas à
     « avant » et « après » posés l'un après l'autre, il se juge en voyant la
     limite passer sur le motif, sous les mêmes libellés.

     L'état ne suit pas la glissade image par image, et c'est délibéré. Pendant
     qu'on glisse, seuls deux jetons CSS sont écrits sur l'appareil : rien ne
     re-rend, rien ne se recalcule, et le navigateur n'a qu'à recomposer deux
     couches déjà peintes. L'état est posé au relâchement, sur l'événement
     `change` que le clavier émet aussi à chaque flèche. Ce qui doit être en
     direct l'est, c'est-à-dire l'image ; ce qui peut attendre la fin du geste
     l'attend, c'est-à-dire le chiffre du verdict. */
  const [separation, setSeparation] = useState(RIDEAU_DEPART)
  const glissiere = useRef<HTMLInputElement>(null)
  const cadreRideau = useRef<HTMLDivElement>(null)
  const aplat = useRef<HTMLSpanElement>(null)
  /* La largeur utile de l'aperçu, tenue à jour hors du geste. La lire dans le
     DOM pendant la glissade forcerait un recalcul de mise en page par image,
     ce qui est exactement ce qu'on cherche à éviter ; elle est de toute façon
     déjà calculée par la géométrie. */
  const largeurRideau = useRef(0)

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

  const largeurUtile = Math.max(1, (geometrie?.largeur ?? 0) - 2 * BORDURE_APPAREIL)

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

  /**
   * Pose la position du rideau dans le DOM, sans passer par l'état.
   *
   * Deux jetons, posés sur les deux seules boîtes qui les lisent : l'aplat
   * assombri, qui n'a pas d'enfant, et le cadre du rideau, qui en a trois. Les
   * poser sur l'appareil, qui les aurait transmis aux deux, coûtait cinq
   * millisecondes de recalcul de style par image sur un processeur bridé six
   * fois : un jeton personnalisé se propage à tout le sous-arbre, et ce
   * sous-arbre est la maquette entière, cent vingt nœuds. Mesuré, pas supposé.
   *
   * Le premier jeton est un pourcentage : il translate deux boîtes de la
   * largeur de l'aperçu, donc un `translateX` en pourcentage les pose
   * exactement à la limite. Le second est en pixels, parce que la poignée fait
   * trente pixels et qu'un pourcentage y compterait sa propre largeur ; c'est
   * aussi là qu'elle est bornée pour rester entière contre les bords.
   */
  const poser = useCallback((valeur: number) => {
    const largeur = Math.max(1, largeurRideau.current)
    const x = (valeur / 100) * largeur
    const bornee =
      Math.min(Math.max(x, RAYON_POIGNEE), Math.max(RAYON_POIGNEE, largeur - RAYON_POIGNEE))
    for (const noeud of [aplat.current, cadreRideau.current]) {
      if (!noeud) continue
      noeud.style.setProperty('--rideau', `${valeur}%`)
      noeud.style.setProperty('--poignee', `${bornee.toFixed(1)}px`)
    }
  }, [])

  /* Le seul chemin par lequel React pose le rideau : au montage, au
     relâchement, et quand la largeur de l'aperçu change. Jamais en style en
     ligne, sans quoi un rendu venu d'ailleurs (l'heure de la maquette, par
     exemple) le ramènerait à la position d'avant le geste en cours. Avant la
     peinture, pour que la poignée n'apparaisse pas d'abord au mauvais endroit. */
  useLayoutEffect(() => {
    largeurRideau.current = largeurUtile
    poser(Number(glissiere.current?.value ?? separation))
  }, [largeurUtile, separation, poser, replie, vide, calculEnCours])

  /* Les deux écoutes sont natives, et posées à la main.
     
     `input` d'abord : il pose l'image, et rien d'autre. `change` ensuite, pour
     l'état : au doigt comme à la souris il arrive au relâchement, une fois, et
     au clavier à chaque flèche. React ne donne pas cet événement, son
     `onChange` étant `input`, d'où l'écoute directe ; c'est aussi ce qui permet
     à la glissière de rester non contrôlée pendant le geste.

     Rien n'est posé entre les deux : le verdict ne dépend plus de la position du
     rideau, puisqu'il annonce les deux rapports en même temps. Glisser ne coûte
     donc aucun rendu, pas même différé. */
  useEffect(() => {
    const noeud = glissiere.current
    if (!noeud) return
    const suivre = () => poser(Number(noeud.value))
    const relever = () => setSeparation(Number(noeud.value))
    noeud.addEventListener('input', suivre)
    noeud.addEventListener('change', relever)
    return () => {
      noeud.removeEventListener('input', suivre)
      noeud.removeEventListener('change', relever)
    }
  }, [poser, replie, vide, calculEnCours])

  /* Le verdict porte sur le fichier tel qu'il sera, et il annonce à côté ce
     qu'un thème sombre en ferait. Les deux ensemble, et non l'un ou l'autre
     selon la position du rideau : c'est justement ce que le rideau montre, et
     un chiffre qui bascule au passage du trait se lit deux fois moins bien que
     deux chiffres posés côte à côte.

     Le voile retiré, lui, change le contraste du fichier lui-même, et il
     s'applique donc avant : assombrir une image qu'on n'exporte pas n'aurait
     aucun sens. */
  const rideauVisible = !vide && !calculEnCours && !replie && Boolean(geometrie)
  const brute = vide || !mesure ? null : voile ? mesure : sansVoile(mesure)
  const sombre = brute && rideauVisible ? assombrir(brute) : null

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

              Il fait la largeur de l'aperçu et se décale vers la droite de la
              position du rideau : ce qui dépasse est coupé par l'appareil, et
              ce qui reste est exactement la moitié assombrie. La même graine se
              voit donc en clair et en sombre d'un seul regard, sous les mêmes
              libellés. Posé une fois pour toutes, même au repos où il est
              entièrement dehors : le promouvoir en pleine glissade coûterait
              une image. */}
          {!vide && (
            <span
              className="apercu-assombri"
              ref={aplat}
              aria-hidden="true"
              style={{ background: `rgba(0, 0, 0, ${ASSOMBRISSEMENT})` }}
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
          {rideauVisible && (
            <div className="rideau" id="rideau" ref={cadreRideau}>
              <span className="rideau-suivi" aria-hidden="true">
                <span className="rideau-trait" />
              </span>
              {/* La poignée est bornée à quinze pixels des bords, le trait ne
                  l'est pas : au repos, le rideau est à cent et le trait tombe
                  sur le bord même, où une poignée centrée serait coupée en deux
                  et ne se verrait plus. Le trait dit la limite, la poignée dit
                  qu'on peut la prendre ; l'écart des deux ne dépasse jamais la
                  largeur d'un doigt, et seulement contre les bords. */}
              <span className="rideau-poignee" aria-hidden="true">
                <i />
                <i />
              </span>
              <input
                ref={glissiere}
                type="range"
                id="rideau-glissiere"
                className="rideau-glissiere"
                min={0}
                max={100}
                step={1}
                defaultValue={separation}
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
              />
            </div>
          )}
        </div>
      </div>

      <p className="vh" id="note-maquette">
        {textes.scene.note}
      </p>

      <Verdict
        mesure={brute}
        sombre={sombre}
        textes={textes}
        langue={langue}
        replie={verdictReplie}
        voileRetire={!voile}
      />
    </section>
  )
}
