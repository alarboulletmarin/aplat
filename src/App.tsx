// SPDX-License-Identifier: AGPL-3.0-only

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  enregistrerPalettes, FAMILLES, famille as trouverFamille, mesurer, ORDRE_PALETTES,
  type Densite, type Groupe, type IdFamille, type IdPaletteQuelconque, type Langue, type Motif,
} from './lib/moteur'
import {
  ajouter as ajouterPalette, ecrire as ecrirePalettes, lire as lirePalettes,
  paletteDeRequete, retirer as retirerPalette, versPalette, type PalettePerso,
} from './lib/palettes'
import {
  depuisSaisie, detecter, MPX_MAX, TROIS_APPAREILS, typeAppareil,
} from './lib/resolution'
import { ecrireUrl, lireUrl, type Reglages, type Theme } from './lib/url'
import { tirer, tirerGraine } from './lib/tirage'
import { lireAffichage, retenirLangue, retenirTheme } from './lib/affichage'
import { lienAccueil } from './lib/route'
import {
  copierImage, encoderImage, encoderSVG, ErreurExport, facteur,
  fichierPartageable, nomFichier, telecharger, webpDisponible, type Format,
} from './lib/export'
import { ELEMENTS_MAX, rendreSVG } from './lib/svg'
import { nombre } from './lib/format'
import { textes as dictionnaire } from './i18n'
import { useDefilement } from './hooks/useDefilement'
import { useHistorique } from './hooks/useHistorique'
import { useFocusDegage } from './hooks/useFocusDegage'
import { useHauteursCollantes } from './hooks/useHauteursCollantes'
import { useRevisionFenetre } from './hooks/useRevisionFenetre'
import { useThemeResolu } from './hooks/useThemeResolu'
import { Entete } from './components/Entete'
import { Scene } from './components/Scene'
import { ChoixDensite, ChoixFamille, ChoixPalette, ChoixVersion } from './components/Reglages'
import { Historique } from './components/Historique'
import { ChoixResolution } from './components/ChoixResolution'
import { Partage } from './components/Partage'
import { BarreAction, type Echec, type Fichier, type Phase } from './components/BarreAction'
import { MiseAJour } from './components/MiseAJour'
import { Pied } from './components/Pied'

interface Ephemere {
  phase: Phase
  echec: Echec | null
  fichier: Fichier | null
  copie: boolean
  echecCopie: boolean
  copieImage: boolean
  formats: boolean
  edition: boolean
}

const EPHEMERE_INITIAL: Ephemere = {
  phase: 'repos',
  echec: null,
  fichier: null,
  copie: false,
  echecCopie: false,
  copieImage: false,
  formats: false,
  edition: false,
}

/**
 * Le temps que la note de succès reste à l'écran.
 *
 * Elle restait sinon jusqu'au prochain réglage, et une carte qui ne part
 * jamais finit en décor : on cesse de la lire, y compris la fois où elle dit
 * autre chose. Douze secondes : le double du temps de lire ses trois lignes,
 * et assez pour commencer l'appui long que l'astuce décrit. La note d'erreur,
 * elle, ne part pas seule : une erreur non lue est une erreur perdue.
 */
const NOTE_VISIBLE_MS = 12000

/**
 * Une seule page. Trois réglages. Un seul appel primaire : télécharger.
 *
 * Rien n'est envoyé : l'état partageable tient dans l'URL, et l'image est
 * calculée puis encodée ici même. Deux choses seulement sont écrites sur
 * l'appareil, et toutes deux s'effacent d'un bouton : les dix derniers motifs
 * regardés, et les palettes qu'on a composées.
 */
export function App() {
  const [detecte] = useState(detecter)

  /* --- les palettes composées, avant tout le reste ---------------------------
     Le registre du moteur doit être posé avant qu'une palette ne soit lue :
     `lireUrl` valide `p` contre la liste blanche, et cette liste comprend
     désormais les palettes de cet appareil. D'où l'ordre des déclarations, qui
     n'est pas décoratif. */
  const [recue] = useState(() => paletteDeRequete(window.location.search))
  const [persos, setPersos] = useState<PalettePerso[]>(lirePalettes)
  /* La palette en cours de composition. Elle est dessinable sans être écrite :
     c'est ce qui permet à l'éditeur de montrer le motif au lieu de trois
     carrés de couleur. */
  const [brouillon, setBrouillon] = useState<PalettePerso | null>(null)
  const [editionPalette, setEditionPalette] = useState<PalettePerso | 'nouvelle' | null>(null)

  const inventaire = useMemo(() => {
    const liste = [...persos]
    for (const venue of [recue, brouillon]) {
      if (venue && !liste.some((p) => p.id === venue.id)) liste.push(venue)
    }
    return liste
  }, [persos, recue, brouillon])

  /* Pendant le rendu, et non dans un effet : les enfants dessinent avec ces
     couleurs au même passage, et un effet arriverait après la première
     peinture. L'appel est idempotent et ne dépend que de l'état. */
  enregistrerPalettes(inventaire.map(versPalette))

  const [reglages, setReglages] = useState<Reglages>(() =>
    lireUrl(
      window.location.search,
      detecte,
      lireAffichage(window.location.search, navigator.language),
    ),
  )
  const [ephemere, setEphemere] = useState<Ephemere>(EPHEMERE_INITIAL)

  /* Le verrou de réentrance ne peut pas vivre dans la phase d'affichage :
     n'importe quel réglage la remet à « repos », et un clic sur une palette
     pendant l'encodage relancerait un second export en parallèle du premier. */
  const exportEnCours = useRef(false)
  const minuterieCopie = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const entete = useRef<HTMLElement>(null)
  const scene = useRef<HTMLElement>(null)
  const barre = useRef<HTMLDivElement>(null)
  const revision = useRevisionFenetre()

  const T = dictionnaire(reglages.langue)
  const resolution = useMemo(
    () => depuisSaisie(reglages.largeurSaisie, reglages.hauteurSaisie),
    [reglages.largeurSaisie, reglages.hauteurSaisie],
  )
  const vide = !resolution.largeur || !resolution.hauteur
  const type = typeAppareil(resolution.largeur, resolution.hauteur)

  /* L'onglet ouvert des familles. Il suit la famille en cours dès qu'elle
     change hors de lui, ce qui arrive avec « Surprends-moi », avec une
     vignette d'historique et avec un lien reçu. C'est là qu'est la mémoire du
     dernier onglet, et elle est dans l'adresse plutôt que sur l'appareil. */
  const groupeDeLaFamille = trouverFamille(reglages.famille)?.groupe ?? 'abs'
  const [groupe, setGroupe] = useState<Groupe>(groupeDeLaFamille)
  const [familleVue, setFamilleVue] = useState<IdFamille>(reglages.famille)
  if (familleVue !== reglages.famille) {
    setFamilleVue(reglages.famille)
    if (groupeDeLaFamille !== groupe) setGroupe(groupeDeLaFamille)
  }

  const motif: Motif = useMemo(
    () => ({
      famille: reglages.famille,
      palette: reglages.palette,
      densite: reglages.densite,
      graine: reglages.graine,
    }),
    [reglages.famille, reglages.palette, reglages.densite, reglages.graine],
  )

  /* La sonde est mémoïsée deux fois : ici pour le rendu, et dans le moteur
     lui-même pour l'export. Les deux tombent donc sur le même verdict. */
  const mesure = useMemo(
    () =>
      vide
        ? null
        : mesurer(motif.famille, motif.palette, motif.densite, motif.graine,
            resolution.largeur, resolution.hauteur, reglages.sombre),
    [motif, resolution.largeur, resolution.hauteur, vide, reglages.sombre],
  )

  /** Un réglage touché efface le résultat précédent, mais jamais un export en cours. */
  const changer = useCallback((patch: Partial<Reglages>, edition?: boolean) => {
    setReglages((precedent) => ({ ...precedent, ...patch }))
    setEphemere((precedent) => ({
      ...precedent,
      phase: exportEnCours.current ? precedent.phase : 'repos',
      echec: exportEnCours.current ? precedent.echec : null,
      copie: false,
      echecCopie: false,
      copieImage: false,
      ...(edition === undefined ? {} : { edition }),
    }))
  }, [])

  /** La note de succès se ferme : d'un bouton, d'un glissement, ou du temps. */
  const fermerNote = useCallback(() => {
    setEphemere((precedent) =>
      precedent.phase === 'faite' ? { ...precedent, phase: 'repos' } : precedent,
    )
  }, [])

  /* Le retrait au temps passe par un effet et non par `finir()` : l'effet est
     défait dès que la phase bouge, si bien qu'un export relancé pendant le
     compte ne peut pas voir sa note emportée par la minuterie du précédent. */
  useEffect(() => {
    if (ephemere.phase !== 'faite') return
    const minuterie = setTimeout(fermerNote, NOTE_VISIBLE_MS)
    return () => clearTimeout(minuterie)
  }, [ephemere.phase, fermerNote])

  /* La mémoire de motifs. Elle n'entre pas dans `Reglages` : ce qui est dans
     l'URL décrit le motif affiché, l'historique décrit ceux d'avant. */
  const { liste: historique, epingler, oublier } = useHistorique(motif)

  /* Le repli de la scène est décidé ici et non dans `Scene` : la réserve de
     défilement des deux barres collantes en dépend, et c'est `App` qui la
     publie. */
  const defile = useDefilement()

  useFocusDegage()
  useHauteursCollantes(
    entete,
    scene,
    barre,
    `${revision}|${ephemere.phase}|${ephemere.formats}|${reglages.langue}|${vide}|${defile}`,
  )

  /* La résolution visée, en toutes lettres dans l'en-tête : c'est la seule
     mesure qui décide du fichier, et elle reste sous les yeux pendant qu'on
     règle. Le même texte que celui du panneau, à la même mise en forme. */
  const etiquetteResolution = vide
    ? T.resolution.aucune
    : `${nombre(resolution.largeur, reglages.langue)}\u00a0×\u00a0${nombre(resolution.hauteur, reglages.langue)}\u00a0px`

  /* --- thème, langue et métadonnées du document ---
     `data-theme` ne porte que le thème résolu : « système » est un choix, pas
     un thème, et la feuille de style n'a ainsi qu'un seul bloc sombre. */
  const themeResolu = useThemeResolu(reglages.theme)
  useEffect(() => {
    const racine = document.documentElement
    racine.dataset.theme = themeResolu
    racine.lang = reglages.langue
    document.title = T.document.titre
    document.querySelector('meta[name="description"]')?.setAttribute('content', T.document.description)
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', themeResolu === 'sombre' ? '#0E1729' : '#F2EDDD')
  }, [themeResolu, reglages.langue, T])

  /* --- l'URL suit l'état, sans jamais empiler d'entrée d'historique ---
     Le lien est calculé, pas relu après coup : `replaceState` peut être refusé
     par certaines ouvertures locales, et relire `location.href` ferait alors
     copier une adresse qui n'est plus celle des réglages affichés. */
  const requete = useMemo(
    () => ecrireUrl(reglages, resolution, detecte),
    [reglages, resolution, detecte],
  )
  const lien = `${window.location.origin}${window.location.pathname}?${requete}`

  /* La marque, en haut, ramène à la présentation. Le lien est nu : la langue
     et le thème attendent sur l'appareil, revenir sur « / » ne coûte pas le
     choix qu'on vient de faire. */
  const retour = lienAccueil()

  useEffect(() => {
    if (window.location.search.slice(1) === requete) return
    try {
      window.history.replaceState(null, '', `${window.location.pathname}?${requete}`)
    } catch {
      /* certaines ouvertures locales refusent replaceState : sans conséquence */
    }
  }, [requete])

  useEffect(() => () => clearTimeout(minuterieCopie.current), [])

  /* --- actions --- */

  const nouvelleGraine = () => changer({ graine: tirerGraine() })

  /* « Surprends-moi » : famille, palette et graine d'un coup. Le tirage exclut
     la valeur courante des deux listes, sinon un clic sur deux ne changerait
     rien de visible et le bouton passerait pour cassé. La densité ne bouge pas :
     c'est un goût, pas un motif. Les palettes composées entrent dans le
     tirage : ce sont des palettes, et les exclure ferait un hasard qui ignore
     précisément ce qu'on a choisi de fabriquer. */
  const surprendre = () => {
    const palettes: IdPaletteQuelconque[] = [
      ...ORDRE_PALETTES,
      ...persos.map((p) => p.id),
    ]
    changer({
      famille: tirer(FAMILLES.map((f) => f.id), reglages.famille),
      palette: tirer(palettes, reglages.palette),
      graine: tirerGraine(),
    })
  }

  const copier = () => {
    const fin = (reussi: boolean) => {
      setEphemere((precedent) => ({ ...precedent, copie: reussi, echecCopie: !reussi }))
      clearTimeout(minuterieCopie.current)
      if (reussi) {
        minuterieCopie.current = setTimeout(
          () => setEphemere((precedent) => ({ ...precedent, copie: false })),
          2600,
        )
      }
    }
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(lien).then(
          () => fin(true),
          () => fin(false),
        )
        return
      }
    } catch {
      /* API absente ou contexte non sécurisé */
    }
    fin(false)
  }

  /* --- les palettes composées ------------------------------------------------ */

  const enregistrerPalette = (palette: PalettePerso) => {
    const suivante = ajouterPalette(persos, palette)
    setPersos(suivante)
    ecrirePalettes(suivante)
    setEditionPalette(null)
    setBrouillon(null)
    changer({ palette: palette.id })
  }

  const supprimerPalette = (id: string) => {
    const suivante = retirerPalette(persos, id)
    setPersos(suivante)
    ecrirePalettes(suivante)
    setEditionPalette(null)
    /* Une palette supprimée cesse d'être dessinable au même instant : sans ce
       retour à Lime & crème, l'aperçu montrerait une palette qui n'existe plus,
       et l'adresse en porterait le nom. */
    if (reglages.palette === id) changer({ palette: 'lime' })
  }

  /* --- l'export -------------------------------------------------------------- */

  const echecDe = (erreur: unknown): Echec =>
    erreur instanceof ErreurExport ? (erreur.genre as Echec) : 'generale'

  const finir = (fichier: Fichier) => {
    exportEnCours.current = false
    setEphemere((precedent) => ({ ...precedent, phase: 'faite', echec: null, fichier }))
  }

  const echouer = (erreur: unknown) => {
    exportEnCours.current = false
    setEphemere((precedent) => ({ ...precedent, phase: 'erreur', echec: echecDe(erreur) }))
  }

  /**
   * Une sortie, quelle qu'elle soit.
   *
   * L'instantané est pris au clic : l'encodage d'un PNG de plusieurs mégapixels
   * dure plusieurs centaines de millisecondes, pendant lesquelles l'interface
   * reste cliquable. Sans ça, un changement de palette pendant l'encodage
   * renommerait un fichier déjà dessiné, et la densité (absente du nom)
   * glisserait sans laisser de trace.
   */
  const exporter = (format: Format) => {
    if (exportEnCours.current) return
    if (vide) {
      setEphemere((precedent) => ({ ...precedent, edition: true }))
      return
    }
    const echelle = facteur(format)
    const largeur = resolution.largeur * echelle
    const hauteur = resolution.hauteur * echelle
    if (format !== 'svg' && largeur * hauteur > MPX_MAX) {
      setEphemere((precedent) => ({ ...precedent, phase: 'erreur', echec: 'trop' }))
      return
    }

    const travail = {
      motif, largeur, hauteur, voile: reglages.voile, sombre: reglages.sombre, format,
    }
    const nom = nomFichier(travail.motif, largeur, hauteur, {
      format,
      voile: reglages.voile,
      sombre: reglages.sombre,
    })

    exportEnCours.current = true
    setEphemere((precedent) => ({ ...precedent, phase: 'calcul', echec: null }))

    /* Le délai laisse le navigateur peindre l'état « rendu en cours » avant de
       bloquer le fil principal sur l'encodage. */
    setTimeout(() => {
      if (format === 'svg') {
        try {
          const rendu = rendreSVG(travail.motif, largeur, hauteur, travail.voile, travail.sombre)
          if (rendu.elements > ELEMENTS_MAX) throw new ErreurExport('svgDense')
          const blob = encoderSVG(travail)
          telecharger(blob, nom)
          /* Pas de feuille de partage pour le SVG : la pellicule n'en veut
             pas, et c'est la pellicule que le bouton promet. */
          finir({ largeur, hauteur, octets: blob.size, format, nombre: 1, photos: null })
        } catch (erreur) {
          echouer(erreur)
        }
        return
      }
      encoderImage(travail).then((blob) => {
        telecharger(blob, nom)
        finir({
          largeur, hauteur, octets: blob.size, format, nombre: 1,
          photos: fichierPartageable(blob, nom),
        })
      }, echouer)
    }, 70)
  }

  /**
   * La même graine en téléphone, tablette et ordinateur.
   *
   * Trois téléchargements de suite, et non une archive : un fichier compressé
   * demanderait une bibliothèque, donc du code embarqué, pour un gain qui est
   * nul sur un téléphone où l'on ne sait pas l'ouvrir. Ils partent l'un après
   * l'autre, encodés en série : trois canevas de plusieurs mégapixels alloués
   * ensemble, c'est justement ce qu'un appareil modeste refuse.
   */
  const exporterTrois = () => {
    if (exportEnCours.current) return
    if (vide) {
      setEphemere((precedent) => ({ ...precedent, edition: true }))
      return
    }
    const courant = motif
    const voile = reglages.voile
    const sombre = reglages.sombre
    exportEnCours.current = true
    setEphemere((precedent) => ({ ...precedent, phase: 'calcul', echec: null }))

    let total = 0
    const suite = TROIS_APPAREILS.reduce(
      (chaine, format) =>
        chaine.then(() =>
          encoderImage({
            motif: courant,
            largeur: format.largeur,
            hauteur: format.hauteur,
            voile,
            sombre,
            format: 'png',
          }).then(
            (blob) =>
              new Promise<void>((resoudre) => {
                total += blob.size
                telecharger(
                  blob,
                  nomFichier(courant, format.largeur, format.hauteur, { voile, sombre }),
                )
                /* Un navigateur qui reçoit trois téléchargements dans la même
                   milliseconde n'en garde souvent qu'un. Un demi-battement
                   entre chacun suffit à ce qu'ils soient trois. */
                setTimeout(resoudre, 400)
              }),
          ),
        ),
      Promise.resolve(),
    )

    suite.then(
      () =>
        finir({
          largeur: TROIS_APPAREILS[0].largeur,
          hauteur: TROIS_APPAREILS[0].hauteur,
          octets: total,
          format: 'png',
          nombre: TROIS_APPAREILS.length,
          photos: null,
        }),
      echouer,
    )
  }

  /* Trois touches pour la rangée d'action, cadeau de l'ordinateur : V pour
     Variante, S pour Surprends-moi, T pour Télécharger. Jamais pendant une
     saisie, jamais avec un modificateur (Ctrl+S reste au navigateur), jamais
     en rafale d'appui maintenu. Les boutons les annoncent par
     `aria-keyshortcuts` et leur infobulle. L'effet suit la déclaration
     d'`exporter` et se réabonne à chaque rendu : trois fermetures fraîches,
     jamais un réglage en retard. */
  useEffect(() => {
    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.metaKey || evenement.ctrlKey || evenement.altKey || evenement.repeat) return
      const cible = evenement.target as HTMLElement | null
      if (cible?.closest('input, textarea, select, [contenteditable]')) return
      const touche = evenement.key.toLowerCase()
      if (touche === 'v') nouvelleGraine()
      else if (touche === 's') surprendre()
      else if (touche === 't') exporter('png')
    }
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  })

  /**
   * La feuille de partage native, avec le fichier de la carte de succès :
   * « Enregistrer l'image » y met la pellicule à un appui. L'appui sur le
   * bouton est un geste frais, la seule chose que la feuille exige. Une
   * feuille refermée sans choisir n'est pas un échec : le fichier est déjà
   * téléchargé, la carte reste.
   */
  const enregistrerPhotos = () => {
    const fichier = ephemere.fichier?.photos
    if (fichier) navigator.share({ files: [fichier] }).catch(() => {})
  }

  /** L'image dans le presse-papiers, en PNG : c'est le seul type accepté partout. */
  const copierLImage = () => {
    if (exportEnCours.current || vide) return
    const travail = {
      motif,
      largeur: resolution.largeur,
      hauteur: resolution.hauteur,
      voile: reglages.voile,
      sombre: reglages.sombre,
      format: 'png' as const,
    }
    exportEnCours.current = true
    copierImage(encoderImage(travail)).then(
      () => {
        exportEnCours.current = false
        setEphemere((precedent) => ({ ...precedent, copieImage: true, phase: 'repos' }))
        clearTimeout(minuterieCopie.current)
        minuterieCopie.current = setTimeout(
          () => setEphemere((precedent) => ({ ...precedent, copieImage: false })),
          2600,
        )
      },
      echouer,
    )
  }

  /* Le SVG n'est éprouvé qu'à l'ouverture du dépli : construire le document
     vectoriel à chaque graine coûterait un rendu complet de plus par motif,
     pour une sortie que la plupart ne demandent jamais. Le résultat est gardé
     par `rendreSVG`, si bien que le clic qui suit ne le recalcule pas. */
  const svgPossible = useMemo(() => {
    if (!ephemere.formats || vide) return false
    try {
      return (
        rendreSVG(motif, resolution.largeur, resolution.hauteur, reglages.voile, reglages.sombre)
          .elements <= ELEMENTS_MAX
      )
    } catch {
      return false
    }
  }, [
    ephemere.formats, vide, motif,
    resolution.largeur, resolution.hauteur, reglages.voile, reglages.sombre,
  ])

  const webpPossible = useMemo(() => webpDisponible(), [])

  return (
    <>
      <a className="evitement" href="#reglages">
        {T.entete.evitement}
      </a>

      <div className="page">
        <Entete cadre={entete} textes={T} accueil={retour} resolution={etiquetteResolution} />

        <main className="colonnes">
          <Scene
            cadre={scene}
            motif={motif}
            resolution={resolution}
            type={type}
            mesure={mesure}
            voile={reglages.voile}
            sombre={reglages.sombre}
            langue={reglages.langue}
            textes={T}
            calculEnCours={ephemere.phase === 'calcul'}
            defile={defile}
            revision={revision}
          />

          <section className="panneau" id="reglages" tabIndex={-1} aria-labelledby="h-reglages">
            <h2 className="vh" id="h-reglages">
              {T.reglages.titre}
            </h2>

            <ChoixFamille
              valeur={reglages.famille}
              palette={reglages.palette}
              densite={reglages.densite}
              graine={reglages.graine}
              groupe={groupe}
              langue={reglages.langue}
              textes={T}
              revision={revision}
              onChoisir={(famille: IdFamille) => changer({ famille })}
              onGroupe={setGroupe}
            />
            <ChoixPalette
              valeur={reglages.palette}
              langue={reglages.langue}
              textes={T}
              persos={persos}
              recue={recue}
              brouillon={brouillon}
              edition={editionPalette}
              famille={reglages.famille}
              densite={reglages.densite}
              graine={reglages.graine}
              revision={revision}
              onChoisir={(palette: IdPaletteQuelconque) => changer({ palette })}
              onEditer={setEditionPalette}
              onBrouillon={setBrouillon}
              onEnregistrer={enregistrerPalette}
              onSupprimer={supprimerPalette}
              onAnnuler={() => {
                setEditionPalette(null)
                setBrouillon(null)
              }}
            />
            <ChoixDensite
              valeur={reglages.densite}
              textes={T}
              onChoisir={(densite: Densite) => changer({ densite })}
            />
            {/* La version vient après la densité et avant l'historique : c'est
                le dernier réglage qui décide de l'image, et le premier qu'on
                revoit une fois le motif trouvé. */}
            <ChoixVersion
              valeur={reglages.sombre}
              textes={T}
              onChoisir={(sombre: boolean) => changer({ sombre })}
            />
            <Historique
              liste={historique}
              courant={motif}
              langue={reglages.langue}
              textes={T}
              revision={revision}
              onRestaurer={(restaure: Motif) =>
                changer({
                  famille: restaure.famille,
                  palette: restaure.palette,
                  densite: restaure.densite,
                  graine: restaure.graine,
                })
              }
              onEpingler={epingler}
              onOublier={oublier}
            />
            <ChoixResolution
              largeurSaisie={reglages.largeurSaisie}
              hauteurSaisie={reglages.hauteurSaisie}
              resolution={resolution}
              detecte={detecte}
              edition={ephemere.edition}
              langue={reglages.langue}
              textes={T}
              onSaisir={(largeurSaisie, hauteurSaisie) =>
                changer({ largeurSaisie, hauteurSaisie })
              }
              onPreset={(largeur, hauteur) =>
                changer({ largeurSaisie: String(largeur), hauteurSaisie: String(hauteur) }, false)
              }
              onEditer={() => setEphemere((precedent) => ({ ...precedent, edition: true }))}
            />
            <Partage
              lien={lien}
              copie={ephemere.copie}
              echecCopie={ephemere.echecCopie}
              graine={reglages.graine}
              textes={T}
              onCopier={copier}
            />
          </section>
        </main>

        {/* Langue et thème vivent ici : ils ne changent rien au fichier
            téléchargé, et le panneau ne contient que ce qui agit sur lui.
            Le choix est retenu sur l'appareil au moment où il est fait :
            c'est lui que « / » relira, et que le script d'index.html relira
            avant la première peinture des prochaines ouvertures. */}
        <Pied
          langue={reglages.langue}
          theme={reglages.theme}
          textes={T}
          onLangue={(langue: Langue) => {
            retenirLangue(langue)
            changer({ langue })
          }}
          onTheme={(theme: Theme) => {
            retenirTheme(theme)
            changer({ theme })
          }}
        />

        <BarreAction
          cadre={barre}
          phase={ephemere.phase}
          echec={ephemere.echec}
          fichier={ephemere.fichier}
          resolution={resolution}
          vide={vide}
          voile={reglages.voile}
          /* Ce que la sonde a réellement posé, et non ce que le réglage
             demande : la version sombre passe sous le seuil que le voile vise,
             et il n'y a alors rien à annoncer comme inclus. */
          voilePeint={Boolean(mesure && mesure.voile > 0.02)}
          sombre={reglages.sombre}
          langue={reglages.langue}
          textes={T}
          formats={ephemere.formats}
          svgPossible={svgPossible}
          webpPossible={webpPossible}
          copiee={ephemere.copieImage}
          onSurprise={surprendre}
          onGraine={nouvelleGraine}
          onExporter={exporter}
          onCopier={copierLImage}
          onTrois={exporterTrois}
          onFormats={() =>
            setEphemere((precedent) => ({ ...precedent, formats: !precedent.formats }))
          }
          onVoile={() => changer({ voile: !reglages.voile })}
          onFermerNote={fermerNote}
          onPhotos={enregistrerPhotos}
        >
          <MiseAJour textes={T} />
        </BarreAction>
      </div>
    </>
  )
}
