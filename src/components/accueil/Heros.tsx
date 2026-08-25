// SPDX-License-Identifier: AGPL-3.0-only

import { useState } from 'react'
import { famille, FAMILLES, ORDRE_PALETTES, palette, type Langue } from '../../lib/moteur'
import { GRAINE_MAX } from '../../lib/tirage'
import { nombre } from '../../lib/format'
import { remplir, type Textes } from '../../i18n'
import { Appareil } from './Appareil'
import { Frise } from './Frise'
import { HEROS, TELEPHONE, tirerMotif } from './choix'

/** Les trois densités du moteur : calme, moyen, dense. */
const DENSITES = 3

/**
 * Le haut de la page : ce que c'est, ce que ça donne, et par où on entre.
 *
 * Le nom du produit tient la place d'une image parce qu'il en est une : la
 * display condensée sur toute la largeur est le seul geste typographique de la
 * marque, et il est déjà celui de l'en-tête de l'application.
 *
 * Un appel primaire, un seul, comme partout dans le produit. Le second bouton
 * ne va nulle part : il descend d'une section, dans la même page.
 *
 * Les quatre chiffres sont lus dans le moteur, jamais recopiés. Une famille
 * ajoutée les corrige d'elle-même, et la page ne peut pas promettre un
 * catalogue que l'application n'a pas.
 *
 * L'écran est un bouton, et la ligne sous les appels le dit : la page entière
 * se manipule, il n'y a pas à le deviner. Le motif de départ reste celui du
 * choix arrêté, parce que la première image qu'on voit d'un produit ne se joue
 * pas aux dés ; c'est l'appui qui la change, jamais l'ouverture.
 */
export function Heros({
  langue,
  textes,
  lien,
}: {
  langue: Langue
  textes: Textes
  lien: string
}) {
  const A = textes.accueil
  const [motif, setMotif] = useState(HEROS)
  const nomFamille = famille(motif.famille)?.[langue] ?? motif.famille

  const chiffres = [
    { valeur: FAMILLES.length, mot: A.chiffres.motifs },
    { valeur: ORDRE_PALETTES.length, mot: A.chiffres.palettes },
    { valeur: DENSITES, mot: A.chiffres.densites },
    { valeur: GRAINE_MAX, mot: A.chiffres.graines },
  ]

  return (
    <section className="heros" aria-labelledby="h-heros">
      <p className="surtitre">{A.heros.surtitre}</p>
      <Frise />

      <div className="heros-corps">
        <div className="heros-mots">
          <h1 className="heros-titre" id="h-heros">
            {textes.entete.titre}
          </h1>
          <p className="heros-accroche">{A.heros.accroche}</p>

          <div className="heros-appels">
            <a className="appel-primaire" href={lien}>
              <span className="ico-descendre" aria-hidden="true">
                <i />
                <b />
              </span>
              <span>{A.heros.primaire}</span>
            </a>
            <a className="appel-second" href="#galerie">
              {A.heros.secondaire}
            </a>
          </div>

          <p className="heros-mention">{A.heros.mention}</p>
          <p className="heros-interaction">
            <span className="pastille" aria-hidden="true" />
            {A.heros.interaction}
          </p>
        </div>

        <figure className="heros-ecran">
          <Appareil
            motif={motif}
            resolution={TELEPHONE}
            langue={langue}
            textes={textes}
            className="appareil-telephone"
            etiquette={A.heros.changer}
            onChanger={() => setMotif((precedent) => tirerMotif(precedent))}
          />
          <figcaption className="heros-legende" aria-live="polite">
            <span className="pastille" aria-hidden="true" />
            {remplir(A.heros.legende, {
              famille: nomFamille,
              palette: palette(motif.palette)[langue],
            })}
          </figcaption>
        </figure>
      </div>

      <ul className="chiffres">
        {chiffres.map((chiffre) => (
          <li className="chiffre" key={chiffre.mot}>
            <span className="chiffre-n">{nombre(chiffre.valeur, langue)}</span>
            <span className="chiffre-m">{chiffre.mot}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
