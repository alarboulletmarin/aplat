// SPDX-License-Identifier: AGPL-3.0-only

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FAMILLES, mesurer, ORDRE_PALETTES,
  type Densite, type IdFamille, type IdPalette, type Langue, type Motif,
} from './lib/moteur'
import { depuisSaisie, detecter, MPX_MAX, typeAppareil } from './lib/resolution'
import { ecrireUrl, GRAINE_MAX, lireUrl, type Reglages, type Theme } from './lib/url'
import { encoderPNG, ErreurExport, nomFichier, telecharger } from './lib/export'
import { textes as dictionnaire } from './i18n'
import { useDefilement } from './hooks/useDefilement'
import { useFocusDegage } from './hooks/useFocusDegage'
import { useHauteursCollantes } from './hooks/useHauteursCollantes'
import { useRevisionFenetre } from './hooks/useRevisionFenetre'
import { useThemeResolu } from './hooks/useThemeResolu'
import { Entete } from './components/Entete'
import { Scene } from './components/Scene'
import { ChoixDensite, ChoixFamille, ChoixPalette } from './components/Reglages'
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
  edition: boolean
}

const EPHEMERE_INITIAL: Ephemere = {
  phase: 'repos',
  echec: null,
  fichier: null,
  copie: false,
  echecCopie: false,
  edition: false,
}

/**
 * Une seule page. Trois réglages. Un seul appel primaire : télécharger.
 *
 * Rien n'est stocké, rien n'est envoyé : l'état partageable tient dans l'URL,
 * et l'image est calculée puis encodée ici même.
 */
export function App() {
  const [detecte] = useState(detecter)
  const [reglages, setReglages] = useState<Reglages>(() =>
    lireUrl(window.location.search, detecte, navigator.language),
  )
  const [ephemere, setEphemere] = useState<Ephemere>(EPHEMERE_INITIAL)

  /* Le verrou de réentrance ne peut pas vivre dans la phase d'affichage :
     n'importe quel réglage la remet à « repos », et un clic sur une palette
     pendant l'encodage relancerait un second export en parallèle du premier. */
  const exportEnCours = useRef(false)
  const minuterieCopie = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

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
            resolution.largeur, resolution.hauteur),
    [motif, resolution.largeur, resolution.hauteur, vide],
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
      ...(edition === undefined ? {} : { edition }),
    }))
  }, [])

  /* Le repli de la scène est décidé ici et non dans `Scene` : la réserve de
     défilement des deux barres collantes en dépend, et c'est `App` qui la
     publie. */
  const defile = useDefilement()

  useFocusDegage()
  useHauteursCollantes(
    scene,
    barre,
    `${revision}|${ephemere.phase}|${reglages.langue}|${vide}|${defile}`,
  )

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

  const nouvelleGraine = () => changer({ graine: Math.floor(Math.random() * GRAINE_MAX) + 1 })

  /* « Surprends-moi » : famille, palette et graine d'un coup. Le tirage exclut
     la valeur courante des deux listes, sinon un clic sur deux ne changerait
     rien de visible et le bouton passerait pour cassé. La densité ne bouge pas :
     c'est un goût, pas un motif. */
  const surprendre = () => {
    const tirer = <T,>(liste: readonly T[], sauf: T): T => {
      const restantes = liste.filter((valeur) => valeur !== sauf)
      const choix = restantes.length ? restantes : liste
      return choix[Math.floor(Math.random() * choix.length)]
    }
    changer({
      famille: tirer(FAMILLES.map((f) => f.id), reglages.famille),
      palette: tirer(ORDRE_PALETTES, reglages.palette),
      graine: Math.floor(Math.random() * GRAINE_MAX) + 1,
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
        navigator.clipboard.writeText(window.location.href).then(
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

  const exporter = () => {
    if (exportEnCours.current) return
    if (vide) {
      setEphemere((precedent) => ({ ...precedent, edition: true }))
      return
    }
    if (resolution.largeur * resolution.hauteur > MPX_MAX) {
      setEphemere((precedent) => ({ ...precedent, phase: 'erreur', echec: 'trop' }))
      return
    }

    /* Instantané pris au clic : l'encodage d'un PNG de plusieurs mégapixels
       dure plusieurs centaines de millisecondes, pendant lesquelles
       l'interface reste cliquable. Sans ça, un changement de palette pendant
       l'encodage renommerait un fichier déjà dessiné, et la densité (absente
       du nom) glisserait sans laisser de trace. */
    const travail = { motif, largeur: resolution.largeur, hauteur: resolution.hauteur }

    exportEnCours.current = true
    setEphemere((precedent) => ({ ...precedent, phase: 'calcul', echec: null }))

    /* Le délai laisse le navigateur peindre l'état « rendu en cours » avant de
       bloquer le fil principal sur l'encodage. */
    setTimeout(() => {
      encoderPNG(travail.motif, travail.largeur, travail.hauteur).then(
        (blob) => {
          telecharger(blob, nomFichier(travail.motif, travail.largeur, travail.hauteur))
          exportEnCours.current = false
          setEphemere((precedent) => ({
            ...precedent,
            phase: 'faite',
            echec: null,
            fichier: { largeur: travail.largeur, hauteur: travail.hauteur, octets: blob.size },
          }))
        },
        (erreur: unknown) => {
          exportEnCours.current = false
          setEphemere((precedent) => ({
            ...precedent,
            phase: 'erreur',
            echec: erreur instanceof ErreurExport ? erreur.genre : 'generale',
          }))
        },
      )
    }, 70)
  }

  return (
    <>
      <a className="evitement" href="#reglages">
        {T.entete.evitement}
      </a>

      <div className="page">
        <Entete textes={T} />

        <main className="colonnes">
          <Scene
            cadre={scene}
            motif={motif}
            resolution={resolution}
            type={type}
            mesure={mesure}
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
              langue={reglages.langue}
              textes={T}
              revision={revision}
              onChoisir={(famille: IdFamille) => changer({ famille })}
              onSurprise={surprendre}
            />
            <ChoixPalette
              valeur={reglages.palette}
              langue={reglages.langue}
              textes={T}
              onChoisir={(palette: IdPalette) => changer({ palette })}
            />
            <ChoixDensite
              valeur={reglages.densite}
              textes={T}
              onChoisir={(densite: Densite) => changer({ densite })}
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
            téléchargé, et le panneau ne contient que ce qui agit sur lui. */}
        <Pied
          langue={reglages.langue}
          theme={reglages.theme}
          textes={T}
          onLangue={(langue: Langue) => changer({ langue })}
          onTheme={(theme: Theme) => changer({ theme })}
        />

        <BarreAction
          cadre={barre}
          phase={ephemere.phase}
          echec={ephemere.echec}
          fichier={ephemere.fichier}
          resolution={resolution}
          vide={vide}
          langue={reglages.langue}
          textes={T}
          onGraine={nouvelleGraine}
          onExporter={exporter}
        >
          <MiseAJour textes={T} />
        </BarreAction>
      </div>
    </>
  )
}
