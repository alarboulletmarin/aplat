// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect, useState } from 'react'
import type { Langue } from '../../lib/moteur'
import { detecter } from '../../lib/resolution'
import {
  adresseNettoyee, lireAffichage, retenirLangue, retenirTheme,
  type Affichage, type Theme,
} from '../../lib/affichage'
import { lienAccueil, lienApp, lienMoteur } from '../../lib/route'
import { textes as dictionnaire } from '../../i18n'
import { useThemeResolu } from '../../hooks/useThemeResolu'
import { Enseigne } from './Enseigne'
import { Heros } from './Heros'
import { Galerie } from './Galerie'
import { Ecrans } from './Ecrans'
import { Promesses } from './Promesses'
import { Appel } from './Appel'

/**
 * La page d'accueil, sur « / ». L'application vit sous « /app ».
 *
 * Elle ne raconte pas le produit, elle le fait tourner : chaque image de cette
 * page sort du moteur, au chargement, dans le navigateur qui la lit. Il n'y a
 * donc aucune capture d'écran à tenir à jour, et rien ici ne peut promettre un
 * rendu que l'application ne donnerait pas.
 *
 * Elle garde les règles de l'application, parce que c'est le même produit :
 * un seul appel primaire, répété en bas de page mais jamais dédoublé ; aucune
 * animation qui ne dise ni une origine, ni un état, ni une continuité.
 *
 * Son état se réduit à deux choses, la langue et le thème, qui sont aussi les
 * deux boutons de l'enseigne. Ils sont retenus sur l'appareil, exactement
 * comme dans l'application et par le même stockage : personne ne choisit sa
 * langue deux fois, et aucun lien n'a besoin de la transporter.
 */
export function Accueil() {
  const [detecte] = useState(detecter)
  const [affichage, setAffichage] = useState<Affichage>(() =>
    lireAffichage(window.location.search, navigator.language),
  )

  const T = dictionnaire(affichage.langue)
  const themeResolu = useThemeResolu(affichage.theme)

  /* Les mêmes trois lignes que dans l'application : `data-theme` ne porte que
     le thème résolu, la langue est celle du document, et la couleur de la
     barre du navigateur suit le thème. Le titre et la description sont ceux de
     la présentation, pas ceux de l'outil : les deux pages ne se cherchent pas
     dans les mêmes mots. */
  useEffect(() => {
    const racine = document.documentElement
    racine.dataset.theme = themeResolu
    racine.lang = affichage.langue
    document.title = T.accueil.document.titre
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', T.accueil.document.description)
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', themeResolu === 'sombre' ? '#0E1729' : '#F2EDDD')
  }, [themeResolu, affichage.langue, T])

  /* Les liens d'avant portent encore `?l=` et `?t=` : ils sont honorés au
     chargement, puis l'adresse est nettoyée, sans empiler d'entrée
     d'historique. Elle ne porte plus l'affichage, qui vit sur l'appareil. */
  useEffect(() => {
    const propre = adresseNettoyee(window.location.pathname, window.location.search)
    if (propre === null) return
    try {
      window.history.replaceState(null, '', propre)
    } catch {
      /* certaines ouvertures locales refusent replaceState : sans conséquence */
    }
  }, [])

  /* Les trois liens internes sont nus : le choix fait ici attend déjà sur
     l'appareil, la porte vers « /app », celle vers « /moteur » et la marque
     n'ont rien à porter. */
  const lien = lienApp()
  const accueil = lienAccueil()
  const moteur = lienMoteur()

  return (
    <>
      <a className="evitement" href="#contenu">
        {T.accueil.enseigne.evitement}
      </a>

      <div className="accueil">
        <Enseigne
          langue={affichage.langue}
          resolu={themeResolu}
          textes={T}
          accueil={accueil}
          lien={lien}
          /* Le choix est retenu au moment où il est fait : c'est lui que
             « /app » relira, et que le script d'index.html relira avant la
             première peinture des prochaines ouvertures. */
          onLangue={(langue: Langue) => {
            retenirLangue(langue)
            setAffichage((precedent) => ({ ...precedent, langue }))
          }}
          onTheme={(theme: Theme) => {
            retenirTheme(theme)
            setAffichage((precedent) => ({ ...precedent, theme }))
          }}
        />

        {/* `tabIndex` négatif : sans lui, le lien d'évitement fait défiler la
            page mais laisse le focus derrière, dans l'enseigne. */}
        <main className="accueil-corps" id="contenu" tabIndex={-1}>
          <Heros langue={affichage.langue} textes={T} lien={lien} />
          <Galerie langue={affichage.langue} textes={T} moteur={moteur} />
          <Ecrans langue={affichage.langue} textes={T} detecte={detecte} />
          <Promesses textes={T} />
          <Appel textes={T} lien={lien} moteur={moteur} />
        </main>
      </div>
    </>
  )
}
