// SPDX-License-Identifier: AGPL-3.0-only

import { useState, type ChangeEvent } from 'react'
import { nombre } from '../lib/format'
import type { Format } from '../lib/export'
import type { Langue } from '../lib/moteur'
import {
  chiffres, horsBornes, ORDINATEUR, TABLETTE, TELEPHONE, type Resolution,
} from '../lib/resolution'
import type { Textes } from '../i18n'
import { GroupeRadio, OptionRadio } from './GroupeRadio'

/**
 * Le studio d'export : tout ce qui décide du fichier, rassemblé dans la
 * feuille basse que la puce de synthèse ouvre, valeurs courantes
 * présélectionnées, un bouton qui confirme. Le scénario complet, taille sur
 * mesure, version, voile et format, se règle sans jamais quitter la zone du
 * pouce ni remonter le panneau.
 *
 * Le studio ne possède rien : l'état vit dans `App`, les mêmes réglages que
 * le panneau, si bien que les deux surfaces ne peuvent pas diverger. Le
 * format aussi vient d'`App` : c'est un réglage de session, qui tient
 * jusqu'au rechargement, que la puce de synthèse écrit sous le bouton et
 * que Télécharger produit. Il ne part ni dans l'adresse ni sur l'appareil :
 * une visite fraîche repart sur le PNG, la promesse d'origine, et Réessayer
 * après un échec y revient aussi.
 *
 * Les préréglages de taille recopient ceux de `ChoixResolution` : la fonction
 * y est volontairement non exportée, parce qu'un module de composant qui
 * exporte autre chose perd le rafraîchissement à chaud. Les deux listes
 * partent des mêmes constantes de `lib/resolution.ts`, la duplication ne
 * porte que l'assemblage.
 */

interface Prereglage {
  id: string
  libelle: string
  largeur: number
  hauteur: number
}

function prereglages(textes: Textes, detecte: Resolution): Prereglage[] {
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

export function StudioExport({
  largeurSaisie,
  hauteurSaisie,
  resolution,
  detecte,
  vide,
  voile,
  voilePeint,
  sombre,
  svgPossible,
  webpPossible,
  copiee,
  langue,
  textes,
  format,
  onFormat,
  onExporter,
  onTrois,
  onCopier,
  onSaisir,
  onPreset,
  onVoile,
  onSombre,
}: {
  largeurSaisie: string
  hauteurSaisie: string
  resolution: Resolution
  detecte: Resolution
  vide: boolean
  voile: boolean
  voilePeint: boolean
  sombre: boolean
  svgPossible: boolean
  webpPossible: boolean
  copiee: boolean
  langue: Langue
  textes: Textes
  /** Le format de la session, possédé par App comme le reste. */
  format: Format
  onFormat: (format: Format) => void
  onExporter: (format: Format) => void
  onTrois: () => void
  onCopier: () => void
  onSaisir: (largeur: string, hauteur: string) => void
  onPreset: (largeur: number, hauteur: number) => void
  onVoile: () => void
  onSombre: (sombre: boolean) => void
}) {
  const T = textes.studio
  const B = textes.barre
  const R = textes.resolution

  const [edition, setEdition] = useState(false)

  const liste = prereglages(textes, detecte)
  const trouve = liste.find(
    (p) => p.largeur === resolution.largeur && p.hauteur === resolution.hauteur,
  )
  const choix = edition ? 'surMesure' : (trouve?.id ?? 'surMesure')
  const editeur = edition || !trouve

  const mauvaiseLargeur = horsBornes(largeurSaisie)
  const mauvaiseHauteur = horsBornes(hauteurSaisie)
  const enErreur = mauvaiseLargeur || mauvaiseHauteur

  const surSelection = (evenement: ChangeEvent<HTMLSelectElement>) => {
    const valeur = evenement.target.value
    if (valeur === 'surMesure') {
      setEdition(true)
      requestAnimationFrame(() => {
        document.getElementById('studio-largeur')?.focus()
      })
      return
    }
    const prereglage = liste.find((p) => p.id === valeur)
    if (prereglage) {
      setEdition(false)
      onPreset(prereglage.largeur, prereglage.hauteur)
    }
  }

  const formats: { id: Format; nom: string; note: string; indisponible: string | null }[] = [
    { id: 'png', nom: 'PNG', note: B.formatPngNote, indisponible: null },
    { id: 'png2x', nom: B.formatPng2x, note: B.formatPng2xNote, indisponible: null },
    {
      id: 'webp',
      nom: B.formatWebp,
      note: B.formatWebpNote,
      indisponible: webpPossible ? null : B.erreurFormat,
    },
    {
      id: 'svg',
      nom: B.formatSvg,
      note: B.formatSvgNote,
      indisponible: svgPossible ? null : B.formatSvgDense,
    },
  ]
  const indisponibles = formats.filter((f) => f.indisponible)
  const choisi = formats.find((f) => f.id === format) ?? formats[0]

  /* La synthèse dit ce qui sera peint, pas ce qui est demandé : mêmes nuances
     que la ligne du voile de la barre. */
  const nomFormat = formats.find((f) => f.id === format)?.nom ?? 'PNG'
  const morceaux = [
    vide
      ? R.aucune
      : `${nombre(resolution.largeur, langue)}\u00a0×\u00a0${nombre(resolution.hauteur, langue)}\u00a0px`,
    nomFormat,
  ]
  if (sombre) morceaux.push(T.syntheseSombre)
  morceaux.push(voile ? (voilePeint ? T.syntheseVoile : T.syntheseVoileNul) : T.syntheseSansVoile)

  return (
    <div className="studio">
      <div className="studio-groupe">
        <span className="studio-libelle" id="studio-l-format">{T.format}</span>
        <GroupeRadio id="studio-formats" etiquettes="studio-l-format" className="studio-formats">
          {formats.map((f) => (
            <OptionRadio
              key={f.id}
              id={`studio-format-${f.id}`}
              choisi={format === f.id}
              onChoisir={() => {
                if (!f.indisponible) onFormat(f.id)
              }}
              className="opt studio-opt"
              aria-disabled={f.indisponible ? true : undefined}
            >
              {f.nom}
            </OptionRadio>
          ))}
        </GroupeRadio>
        {/* La note du format choisi : ce que la sortie donne de plus ou de
            moins, dit au moment du choix. Et la raison d'un format éteint se
            lit avant l'appui : une ligne par indisponibilité, jamais un
            échec au clic. */}
        <span className="studio-note" id="studio-format-note">{choisi.note}</span>
        {indisponibles.map((f) => (
          <span className="studio-indisponible" key={f.id}>
            {`${f.nom}\u00a0: ${f.indisponible}`}
          </span>
        ))}
      </div>

      <div className="studio-groupe">
        <label className="studio-libelle" htmlFor="studio-select">{T.taille}</label>
        <span className="res-select studio-select">
          <select id="studio-select" value={choix} onChange={surSelection}>
            {liste.map((p) => (
              <option value={p.id} key={p.id}>
                {`${p.libelle}, ${nombre(p.largeur, langue)}\u00a0×\u00a0${nombre(p.hauteur, langue)}`}
              </option>
            ))}
            <option value="surMesure">{R.surMesure}</option>
          </select>
          <i aria-hidden="true" />
        </span>
        {editeur && (
          <div>
            <div className="res-champs">
              <label>
                <span>{R.largeur}</span>
                <input
                  id="studio-largeur"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  autoComplete="off"
                  value={largeurSaisie}
                  aria-invalid={mauvaiseLargeur}
                  aria-describedby="studio-aide"
                  onChange={(e) => onSaisir(chiffres(e.target.value), hauteurSaisie)}
                />
              </label>
              <label>
                <span>{R.hauteur}</span>
                <input
                  id="studio-hauteur"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  autoComplete="off"
                  value={hauteurSaisie}
                  aria-invalid={mauvaiseHauteur}
                  aria-describedby="studio-aide"
                  onChange={(e) => onSaisir(largeurSaisie, chiffres(e.target.value))}
                />
              </label>
            </div>
            <p className="res-aide" id="studio-aide" data-etat={enErreur ? 'erreur' : 'aide'}>
              <i aria-hidden="true" />
              <span>{enErreur ? R.horsBornes : R.bornes}</span>
            </p>
          </div>
        )}
      </div>

      <div className="studio-groupe">
        <span className="studio-libelle" id="studio-l-version">{textes.reglages.version}</span>
        <GroupeRadio id="studio-version" etiquettes="studio-l-version" className="studio-formats">
          <OptionRadio
            choisi={!sombre}
            onChoisir={() => onSombre(false)}
            className="opt studio-opt"
            titre={textes.reglages.versionTitreClaire}
          >
            {textes.reglages.versionClaire}
          </OptionRadio>
          <OptionRadio
            choisi={sombre}
            onChoisir={() => onSombre(true)}
            className="opt studio-opt"
            titre={textes.reglages.versionTitreSombre}
          >
            {textes.reglages.versionSombre}
          </OptionRadio>
        </GroupeRadio>
      </div>

      <p className="studio-voile">
        <span>{voile ? (voilePeint ? B.voileInclus : B.voileNul) : B.voileAbsent}</span>
        <button
          type="button"
          id="studio-voile"
          className="btn-voile"
          data-voile={voile ? 'oui' : 'non'}
          title={B.voileTitre}
          onClick={onVoile}
        >
          <span className="btn-double">
            <span className="btn-double-l" data-actif={voile ? 'oui' : 'non'}>
              {B.voileRetirer}
            </span>
            <span className="btn-double-l" data-actif={voile ? 'non' : 'oui'}>
              {B.voileRemettre}
            </span>
          </span>
        </button>
      </p>

      <p className="studio-synthese">{morceaux.join(', ')}.</p>

      <button
        type="button"
        id="studio-exporter"
        className="btn-export studio-exporter"
        disabled={vide}
        onClick={() => onExporter(format)}
      >
        <span className="ico-descendre" aria-hidden="true">
          <i />
          <b />
        </span>
        <span>{T.exporter}</span>
      </button>

      {/* Deux actions, pas des formats : elles portent le costume complet
          d'un bouton, trait et coins, parce qu'une rangée nue se lisait
          comme une ligne d'aide et non comme quelque chose à appuyer. */}
      <div className="studio-secondaires">
        <button type="button" id="studio-trois" className="studio-action" disabled={vide} onClick={onTrois}>
          <span className="feuille-t">{B.formatTrois}</span>
          <span className="feuille-n">{B.formatTroisNote}</span>
        </button>
        <button type="button" id="studio-copie" className="studio-action" disabled={vide} onClick={onCopier}>
          <span className="feuille-t">{copiee ? B.copiee : B.formatCopie}</span>
          <span className="feuille-n">{B.formatCopieNote}</span>
        </button>
      </div>
    </div>
  )
}
