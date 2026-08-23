// SPDX-License-Identifier: AGPL-3.0-only

import { useId, useRef, type ChangeEvent } from 'react'
import { nombre } from '../lib/format'
import type { Langue } from '../lib/moteur'
import {
  chiffres, horsBornes, typeAppareil,
  type Resolution,
} from '../lib/resolution'
import type { Textes } from '../i18n'

interface Preset {
  id: string
  libelle: string
  largeur: number
  hauteur: number
}

/**
 * Les tailles proposées. Un préréglage identique à la résolution détectée est
 * retiré : il n'y a aucune raison de proposer deux fois la même chose.
 */
export function presets(textes: Textes, detecte: Resolution): Preset[] {
  const T = textes.resolution
  return [
    { id: 'detectee', libelle: T.presetAppareil, largeur: detecte.largeur, hauteur: detecte.hauteur },
    { id: 'telephone', libelle: T.presetTelephone, largeur: 1179, hauteur: 2556 },
    { id: 'tablette', libelle: T.presetTablette, largeur: 2048, hauteur: 2732 },
    { id: 'ordinateur', libelle: T.presetOrdinateur, largeur: 2560, hauteur: 1440 },
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
  const idAide = useId()
  const idSelect = useId()

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
        <span>{T.titre}</span>
        <span className="res-select">
          <select id={idSelect} value={choix} onChange={surSelection}>
            {liste.map((p) => (
              <option value={p.id} key={p.id}>
                {`${p.libelle} — ${nombre(p.largeur, langue)} × ${nombre(p.hauteur, langue)}`}
              </option>
            ))}
            <option value="surMesure">
              {trouve
                ? T.surMesure
                : `${T.surMesure}  ${nombre(resolution.largeur, langue)} × ${nombre(resolution.hauteur, langue)}`}
            </option>
          </select>
          <i aria-hidden="true" />
        </span>
      </label>

      <p className="res-appareil">{`${nomType} · ${origine}`}</p>
      <p className="vh" id="res-valeur">
        {vide
          ? '— × —'
          : `${nombre(resolution.largeur, langue)} × ${nombre(resolution.hauteur, langue)} px`}
      </p>

      {editeur && (
        <div>
          <div className="res-champs">
            <label>
              <span>{T.largeur}</span>
              <input
                ref={champLargeur}
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
