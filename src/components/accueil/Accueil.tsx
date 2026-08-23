// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect, useMemo, useState } from 'react'
import type { Langue } from '../../lib/moteur'
import { detecter } from '../../lib/resolution'
import { ecrireAffichage, lireAffichage, type Affichage, type Theme } from '../../lib/url'
import { lienApp } from '../../lib/route'
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
 * animation qui ne dise ni une origine, ni un état, ni une continuité ; et
 * rien d'écrit sur l'appareil, l'état tenant dans l'adresse.
 *
 * Cet état se réduit à deux choses, la langue et le thème, qui sont aussi les
 * deux boutons de l'enseigne. Ils s'écrivent `?l=` et `?t=`, exactement comme
 * dans l'application, et le lien d'entrée les emporte : personne ne doit
 * choisir sa langue deux fois.
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

  /* L'adresse suit les deux boutons, sans empiler d'entrée d'historique : un
     aller-retour clair/sombre ne doit pas coûter deux appuis sur « retour ».
     Le lien d'entrée est calculé à part, et non relu dans la barre d'adresse,
     parce que `replaceState` peut être refusé par certaines ouvertures. */
  const requete = useMemo(() => ecrireAffichage(affichage), [affichage])

  useEffect(() => {
    if (window.location.search.slice(1) === requete) return
    try {
      window.history.replaceState(null, '', `${window.location.pathname}?${requete}`)
    } catch {
      /* certaines ouvertures locales refusent replaceState : sans conséquence */
    }
  }, [requete])

  const lien = lienApp(
    affichage.theme === 'systeme'
      ? { l: affichage.langue }
      : { l: affichage.langue, t: affichage.theme },
  )

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
          lien={lien}
          onLangue={(langue: Langue) =>
            setAffichage((precedent) => ({ ...precedent, langue }))
          }
          onTheme={(theme: Theme) => setAffichage((precedent) => ({ ...precedent, theme }))}
        />

        {/* `tabIndex` négatif : sans lui, le lien d'évitement fait défiler la
            page mais laisse le focus derrière, dans l'enseigne. */}
        <main className="accueil-corps" id="contenu" tabIndex={-1}>
          <Heros langue={affichage.langue} textes={T} lien={lien} />
          <Galerie langue={affichage.langue} textes={T} />
          <Ecrans langue={affichage.langue} textes={T} detecte={detecte} />
          <Promesses textes={T} />
          <Appel textes={T} lien={lien} />
        </main>
      </div>
    </>
  )
}
