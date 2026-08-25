// SPDX-License-Identifier: AGPL-3.0-only

import { useCallback, useEffect, useState } from 'react'
import type { Langue, Motif } from '../../lib/moteur'
import { detecter } from '../../lib/resolution'
import {
  adresseNettoyee, lireAffichage, retenirLangue, retenirTheme,
  type Affichage, type Theme,
} from '../../lib/affichage'
import { lienAccueil, lienApp } from '../../lib/route'
import { textes as dictionnaire } from '../../i18n'
import { useThemeResolu } from '../../hooks/useThemeResolu'
import { Enseigne } from '../accueil/Enseigne'
import { Frise } from '../accueil/Frise'
import { PiedDocument } from '../accueil/PiedDocument'
import { Quatre } from './Quatre'
import { Graine } from './Graine'
import { Mecaniques } from './Mecaniques'
import { Couches } from './Couches'
import { Sonde } from './Sonde'
import { Cadres } from './Cadres'
import { Sortie } from './Sortie'
import { DEPART } from './mecaniques'
/* La feuille part avec ce morceau, et non depuis `main.tsx` comme les six
   autres : la page est chargée en différé, sa feuille l'est donc aussi, et ni
   l'application ni la présentation ne paient des règles qu'elles n'emploient
   pas. Ce qu'elle emprunte à l'accueil (la gouttière, l'enseigne, la frise,
   les têtes de section, l'appel, le pied) vient de `accueil.css`, qui est
   globale et donc déjà là à la première peinture. */
import '../../styles/moteur.css'

/**
 * La page du mécanisme, sur « /moteur ».
 *
 * Elle ne raconte pas comment Aplat dessine, elle le montre en train de
 * dessiner : chaque image de cette page sort du moteur, au chargement, dans le
 * navigateur qui la lit. Il n'y a donc aucune capture d'écran à tenir à jour,
 * et rien ici ne peut expliquer un mécanisme que le produit n'aurait pas.
 *
 * **Un seul motif traverse les six étapes.** C'est ce qui fait la
 * démonstration : ce qu'on choisit à la première se retrouve à la dernière, et
 * la page se termine en offrant le lien qui l'ouvre dans l'application. Le fil
 * n'est pas une figure de style, c'est la seule chose qui distingue cette page
 * d'une documentation illustrée.
 *
 * D'où la règle de répartition de l'état, qui tient en une phrase : **ce qui
 * décrit le motif monte ici, ce qui décrit la façon de le regarder reste dans
 * l'étape qui le regarde.** La couche choisie, l'interrupteur du voile et le
 * cadre visé sont des façons de regarder ; sans cette règle, un appui sur le
 * voile rendrait la page entière et repeindrait les cinq autres étapes.
 *
 * Elle garde les règles des deux autres documents, parce que c'est le même
 * produit : un seul appel primaire, tout en bas, là où la démonstration
 * s'achève ; aucune animation qui ne dise ni une origine, ni un état, ni une
 * continuité ; et rien d'écrit sur l'appareil tant qu'on ne choisit rien.
 *
 * Elle ne lit pas les paramètres de motif de son adresse, et c'est voulu : un
 * lien qui porte un motif désigne l'application, et la page part toujours du
 * même motif choisi, ce qui la rend reproductible.
 */
export function Moteur() {
  const [detecte] = useState(detecter)
  const [affichage, setAffichage] = useState<Affichage>(() =>
    lireAffichage(window.location.search, navigator.language),
  )
  const [motif, setMotif] = useState<Motif>(DEPART)

  const T = dictionnaire(affichage.langue)
  const M = T.moteur
  const themeResolu = useThemeResolu(affichage.theme)

  /* Une seule porte pour les six commandes, d'identité stable : les étapes la
     reçoivent en prop et ne la font pas changer de rendu en rendu. */
  const changer = useCallback(
    (partiel: Partial<Motif>) => setMotif((precedent) => ({ ...precedent, ...partiel })),
    [],
  )

  /* Les mêmes lignes que dans les deux autres documents : `data-theme` ne
     porte que le thème résolu, la langue est celle du document, et la couleur
     de la barre du navigateur suit le thème. Le titre et la description sont
     ceux du mécanisme : les trois pages ne se cherchent pas dans les mêmes
     mots. */
  useEffect(() => {
    const racine = document.documentElement
    racine.dataset.theme = themeResolu
    racine.lang = affichage.langue
    document.title = M.document.titre
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', M.document.description)
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', themeResolu === 'sombre' ? '#0E1729' : '#F2EDDD')
  }, [themeResolu, affichage.langue, M])

  /* Les liens d'avant portent encore `?l=` et `?t=` : ils sont honorés au
     chargement, puis l'adresse est nettoyée, sans empiler d'entrée
     d'historique. */
  useEffect(() => {
    const propre = adresseNettoyee(window.location.pathname, window.location.search)
    if (propre === null) return
    try {
      window.history.replaceState(null, '', propre)
    } catch {
      /* certaines ouvertures locales refusent replaceState : sans conséquence */
    }
  }, [])

  const lien = lienApp()
  const accueil = lienAccueil()

  return (
    <>
      <a className="evitement" href="#contenu">
        {T.accueil.enseigne.evitement}
      </a>

      <div className="accueil moteur">
        <Enseigne
          langue={affichage.langue}
          resolu={themeResolu}
          textes={T}
          accueil={accueil}
          lien={lien}
          onLangue={(langue: Langue) => {
            retenirLangue(langue)
            setAffichage((precedent) => ({ ...precedent, langue }))
          }}
          onTheme={(theme: Theme) => {
            retenirTheme(theme)
            setAffichage((precedent) => ({ ...precedent, theme }))
          }}
        />

        <main className="accueil-corps moteur-corps" id="contenu" tabIndex={-1}>
          <section className="moteur-tete" aria-labelledby="h-moteur">
            <p className="surtitre">{M.heros.surtitre}</p>
            <Frise />
            <h1 className="moteur-titre" id="h-moteur">
              {M.heros.titre}
            </h1>
            <p className="moteur-accroche">{M.heros.accroche}</p>
            <p className="heros-interaction">
              <span className="pastille" aria-hidden="true" />
              {M.heros.interaction}
            </p>
            <p className="moteur-mention">{M.heros.mention}</p>
          </section>

          <Quatre langue={affichage.langue} textes={T} motif={motif} onChanger={changer} />
          <Graine langue={affichage.langue} textes={T} motif={motif} onChanger={changer} />
          <Mecaniques langue={affichage.langue} textes={T} motif={motif} onChanger={changer} />
          <Couches textes={T} motif={motif} />
          <Sonde langue={affichage.langue} textes={T} motif={motif} />
          <Cadres langue={affichage.langue} textes={T} motif={motif} detecte={detecte} />
          <Sortie langue={affichage.langue} textes={T} motif={motif} />
        </main>

        <PiedDocument textes={T} mention={T.accueil.pied.mention} />
      </div>
    </>
  )
}
