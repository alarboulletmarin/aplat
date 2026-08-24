// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect, useRef, useState } from 'react'
import type { Densite, IdFamille, IdPalette } from '../lib/moteur'
import {
  composer, MAX_TEINTES, MIN_TEINTES, normaliserCouleur, teintes,
  type PalettePerso,
} from '../lib/palettes'
import { remplir, type Textes } from '../i18n'
import { Vignette } from './Vignette'

/**
 * Composer une palette : un nom, un fond, deux à cinq teintes.
 *
 * L'éditeur est dans le panneau, à sa place, et non dans une fenêtre modale :
 * le produit n'en a aucune, et surtout la valeur de l'outil est de voir le
 * rendu pendant qu'on règle. Un carré de couleur ne dit rien de ce que la
 * palette donnera sur un motif ; la vignette, elle, le montre, et elle se
 * redessine à chaque teinte valide.
 *
 * Deux champs par couleur, et c'est voulu. Le nuancier du système sert quand on
 * cherche, la saisie hexadécimale quand on sait : « ma palette de marque »
 * commence par un code à six chiffres, pas par un dégradé à faire glisser.
 *
 * Rien n'est écrit tant qu'on n'a pas enregistré. Le brouillon est seulement
 * déclaré au moteur, le temps de la vignette.
 */
export function EditeurPalette({
  depart,
  brouillon,
  famille,
  densite,
  graine,
  revision,
  textes,
  onBrouillon,
  onEnregistrer,
  onAnnuler,
}: {
  /** La palette qu'on modifie, ou null pour une composition neuve. */
  depart: PalettePerso | null
  /** La composition en cours, quand elle est valide, déjà connue du moteur. */
  brouillon: PalettePerso | null
  famille: IdFamille
  densite: Densite
  graine: number
  revision: number
  textes: Textes
  onBrouillon: (palette: PalettePerso | null) => void
  onEnregistrer: (palette: PalettePerso) => void
  onAnnuler: () => void
}) {
  const T = textes.palettes
  const [nom, setNom] = useState(() => depart?.nom ?? '')
  const [suite, setSuite] = useState<string[]>(() =>
    depart ? teintes(depart) : ['#F7F3E6', '#17243F', '#DFF478'],
  )
  const premier = useRef<HTMLInputElement>(null)

  /* Le focus entre dans l'éditeur à son ouverture : sans ça, le bouton qui
     vient de disparaître laisse le focus au document, et le parcours clavier
     repart du haut de la page. */
  useEffect(() => {
    premier.current?.focus()
  }, [])

  /* Le brouillon est publié à chaque frappe recevable, et retiré sinon. C'est
     lui qui fait vivre la vignette, et c'est le seul effet de bord de
     l'éditeur tant qu'on n'a pas enregistré. */
  useEffect(() => {
    onBrouillon(composer(nom || T.nomDefaut, suite))
  }, [nom, suite, onBrouillon, T.nomDefaut])

  /* Le retrait est à part, sur le démontage seul : dans le même effet, il
     s'exécuterait entre deux frappes et la vignette clignoterait. */
  useEffect(() => () => onBrouillon(null), [onBrouillon])

  const propres = suite.map(normaliserCouleur)
  const invalide = propres.some((teinte) => !teinte)
  const compose = composer(nom || T.nomDefaut, suite)

  const changer = (indice: number, valeur: string) =>
    setSuite((precedente) => precedente.map((teinte, i) => (i === indice ? valeur : teinte)))

  const nommer = (indice: number) =>
    indice === 0 ? T.fond : remplir(T.teinte, { n: String(indice) })

  return (
    <div className="editeur" id="editeur-palette">
      <div className="editeur-tete">
        <label className="editeur-nom" htmlFor="palette-nom">
          <span>{T.nom}</span>
          <input
            ref={premier}
            id="palette-nom"
            type="text"
            maxLength={24}
            autoComplete="off"
            spellCheck={false}
            placeholder={T.nomDefaut}
            value={nom}
            onChange={(evenement) => setNom(evenement.target.value)}
          />
        </label>
        {brouillon && (
          <span className="editeur-apercu">
            <Vignette
              famille={famille}
              palette={brouillon.id as IdPalette}
              densite={densite}
              graine={graine}
              revision={revision}
            />
          </span>
        )}
      </div>

      <div className="editeur-teintes">
        {suite.map((teinte, indice) => {
          const propre = normaliserCouleur(teinte)
          return (
            <div className="editeur-teinte" key={`teinte-${indice}`}>
              <label htmlFor={`palette-teinte-${indice}`}>
                <span>{nommer(indice)}</span>
                <input
                  id={`palette-teinte-${indice}`}
                  type="text"
                  maxLength={7}
                  autoComplete="off"
                  spellCheck={false}
                  inputMode="text"
                  aria-invalid={!propre}
                  value={teinte}
                  onChange={(evenement) => changer(indice, evenement.target.value)}
                />
              </label>
              <input
                className="editeur-nuancier"
                type="color"
                aria-label={remplir(T.nuancier, { nom: nommer(indice) })}
                value={propre || '#000000'}
                onChange={(evenement) => changer(indice, evenement.target.value.toUpperCase())}
              />
              {suite.length > MIN_TEINTES && (
                <button
                  type="button"
                  className="editeur-moins"
                  aria-label={remplir(T.retirerTeinte, { n: String(indice) })}
                  title={remplir(T.retirerTeinte, { n: String(indice) })}
                  onClick={() =>
                    setSuite((precedente) => precedente.filter((_, i) => i !== indice))
                  }
                >
                  <i aria-hidden="true" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* L'aide devient le message d'erreur, comme dans le champ de
          résolution : un texte de plus sous un texte d'aide se lit deux fois
          et ne se voit pas. */}
      <p className="res-aide" id="palette-aide" data-etat={invalide ? 'erreur' : 'aide'}>
        <i aria-hidden="true" />
        <span>{invalide ? T.invalide : T.bornes}</span>
      </p>

      <div className="editeur-actions">
        {suite.length < MAX_TEINTES && (
          <button
            type="button"
            id="btn-ajouter-teinte"
            className="btn-oublier"
            onClick={() => setSuite((precedente) => [...precedente, '#FF6648'])}
          >
            {T.ajouterTeinte}
          </button>
        )}
        <button type="button" id="btn-annuler-palette" className="btn-oublier" onClick={onAnnuler}>
          {T.annuler}
        </button>
        <button
          type="button"
          id="btn-enregistrer-palette"
          className="btn-graine btn-graine-compact"
          disabled={!compose}
          onClick={() => compose && onEnregistrer(compose)}
        >
          <span>{T.enregistrer}</span>
        </button>
      </div>
    </div>
  )
}
