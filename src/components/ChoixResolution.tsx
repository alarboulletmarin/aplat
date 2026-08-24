// SPDX-License-Identifier: AGPL-3.0-only

import { useRef, type ChangeEvent } from 'react'
import { nombre } from '../lib/format'
import type { Langue } from '../lib/moteur'
import {
  chiffres, horsBornes, ORDINATEUR, TABLETTE, TELEPHONE, typeAppareil,
  type Resolution,
} from '../lib/resolution'
import type { Textes } from '../i18n'
import { Arche } from './Arche'

interface Preset {
  id: string
  libelle: string
  largeur: number
  hauteur: number
}

/**
 * Les tailles proposées. Un préréglage identique à la résolution détectée est
 * retiré : il n'y a aucune raison de proposer deux fois la même chose.
 *
 * Les trois formats de référence viennent de `lib/resolution.ts`, où l'export
 * des trois appareils les lit aussi : deux listes auraient fini par diverger,
 * et cet export aurait livré un format que le panneau ne propose pas.
 *
 * Les quatre premières nomment un appareil, la dernière une taille. Le 4K est
 * là parce qu'on le demande par son nom : l'écran d'ordinateur s'arrête à
 * 2 560 × 1 440, et rien ne disait qu'on pouvait aller plus haut alors que la
 * saisie manuelle monte à 8 000 px. Le motif n'est jamais agrandi, il est
 * recalculé : ces 3 840 × 2 160 valent exactement ce que vaut un fichier de
 * cette taille, pas un fichier plus petit étiré.
 *
 * Non exportée : rien d'autre n'en a l'usage, et un module qui exporte autre
 * chose que des composants perd le rafraîchissement à chaud.
 */
function presets(textes: Textes, detecte: Resolution): Preset[] {
  const T = textes.resolution
  return [
    { id: 'detectee', libelle: T.presetAppareil, largeur: detecte.largeur, hauteur: detecte.hauteur },
    { id: 'telephone', libelle: T.presetTelephone, ...TELEPHONE },
    { id: 'tablette', libelle: T.presetTablette, ...TABLETTE },
    { id: 'ordinateur', libelle: T.presetOrdinateur, ...ORDINATEUR },
    { id: 'uhd', libelle: T.presetUHD, largeur: 3840, hauteur: 2160 },
  ].filter(
    (p) =>
      p.id === 'detectee' || p.largeur !== detecte.largeur || p.hauteur !== detecte.hauteur,
  )
}

/**
 * La résolution : détectée par défaut, modifiable à la main.
 *
 * Elle n'est pas un réglage esthétique mais une propriété de l'appareil ; c'est
 * pourquoi elle vit sous les trois choix et non parmi eux, et pourquoi elle ne
 * part pas dans un lien partagé.
 */
export function ChoixResolution({
  largeurSaisie,
  hauteurSaisie,
  resolution,
  detecte,
  edition,
  langue,
  textes,
  onSaisir,
  onPreset,
  onEditer,
}: {
  largeurSaisie: string
  hauteurSaisie: string
  resolution: Resolution
  detecte: Resolution
  edition: boolean
  langue: Langue
  textes: Textes
  onSaisir: (largeur: string, hauteur: string) => void
  onPreset: (largeur: number, hauteur: number) => void
  onEditer: () => void
}) {
  const T = textes.resolution
  const champLargeur = useRef<HTMLInputElement>(null)
  /* Identifiants fixes : il n'y a qu'un jeu de champs sur la page, et les
     vérifications comme les tests d'accessibilité doivent pouvoir les nommer. */
  const idAide = 'res-aide'
  const idSelect = 'res-select'

  const liste = presets(textes, detecte)
  const trouve = liste.find(
    (p) => p.largeur === resolution.largeur && p.hauteur === resolution.hauteur,
  )
  const choix = edition ? 'surMesure' : (trouve?.id ?? 'surMesure')
  const vide = !resolution.largeur || !resolution.hauteur
  const editeur = edition || !trouve

  const mauvaiseLargeur = horsBornes(largeurSaisie)
  const mauvaiseHauteur = horsBornes(hauteurSaisie)
  const enErreur = mauvaiseLargeur || mauvaiseHauteur

  const type = typeAppareil(resolution.largeur, resolution.hauteur)
  const nomType = type === 'telephone' ? T.telephone : type === 'tablette' ? T.tablette : T.ordinateur
  const origine =
    resolution.largeur === detecte.largeur && resolution.hauteur === detecte.hauteur
      ? T.detectee
      : T.saisie

  const surSelection = (evenement: ChangeEvent<HTMLSelectElement>) => {
    const valeur = evenement.target.value
    if (valeur === 'surMesure') {
      onEditer()
      /* Le champ prend le focus dès que l'éditeur apparaît : « Sur mesure »
         n'est pas une destination, c'est une invitation à saisir. */
      requestAnimationFrame(() => {
        champLargeur.current?.focus()
        champLargeur.current?.select()
      })
      return
    }
    const preset = liste.find((p) => p.id === valeur)
    if (preset) onPreset(preset.largeur, preset.hauteur)
  }

  return (
    <div className="res-carte">
      <label className="res-label" htmlFor={idSelect}>
        <span>
          <Arche />
          <span>{T.titre}</span>
        </span>
        <span className="res-select">
          <select id={idSelect} value={choix} onChange={surSelection}>
            {liste.map((p) => (
              <option value={p.id} key={p.id}>
                {`${p.libelle}, ${nombre(p.largeur, langue)}\u00a0×\u00a0${nombre(p.hauteur, langue)}`}
              </option>
            ))}
            <option value="surMesure">
              {trouve
                ? T.surMesure
                : `${T.surMesure}\u00a0\u00a0${nombre(resolution.largeur, langue)}\u00a0×\u00a0${nombre(resolution.hauteur, langue)}`}
            </option>
          </select>
          <i aria-hidden="true" />
        </span>
      </label>

      <p className="res-appareil" id="res-appareil">{`${nomType}, ${origine}`}</p>
      <p className="vh" id="res-valeur">
        {vide
          ? T.aucune
          : `${nombre(resolution.largeur, langue)}\u00a0×\u00a0${nombre(resolution.hauteur, langue)}\u00a0px`}
      </p>

      {editeur && (
        <div>
          <div className="res-champs">
            <label>
              <span>{T.largeur}</span>
              <input
                ref={champLargeur}
                id="res-largeur"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoComplete="off"
                value={largeurSaisie}
                aria-invalid={mauvaiseLargeur}
                aria-describedby={idAide}
                onChange={(e) => onSaisir(chiffres(e.target.value), hauteurSaisie)}
              />
            </label>
            <label>
              <span>{T.hauteur}</span>
              <input
                id="res-hauteur"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoComplete="off"
                value={hauteurSaisie}
                aria-invalid={mauvaiseHauteur}
                aria-describedby={idAide}
                onChange={(e) => onSaisir(largeurSaisie, chiffres(e.target.value))}
              />
            </label>
          </div>
          {/* L'erreur se voit autant qu'elle s'annonce : triangle, trait
              épaissi, et le texte d'aide devient le message. WCAG 3.3.1. */}
          <p className="res-aide" id={idAide} data-etat={enErreur ? 'erreur' : 'aide'}>
            <i aria-hidden="true" />
            <span>{enErreur ? T.horsBornes : T.bornes}</span>
          </p>
        </div>
      )}
    </div>
  )
}
