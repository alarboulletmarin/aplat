// SPDX-License-Identifier: AGPL-3.0-only

import {
  FAMILLES, ORDRE_PALETTES, PALETTES,
  type Densite, type IdFamille, type IdPalette, type Langue,
} from '../lib/moteur'
import type { Textes } from '../i18n'
import { Arche } from './Arche'
import { GroupeRadio, OptionRadio } from './GroupeRadio'
import { Vignette } from './Vignette'

/**
 * Trois réglages, pas un de plus : famille, palette, densité. La résolution
 * est détectée (c'est une mesure, pas un choix) et n'apparaît qu'en dessous,
 * modifiable si besoin.
 */

export function ChoixFamille({
  valeur,
  palette,
  densite,
  graine,
  langue,
  textes,
  revision,
  onChoisir,
  onSurprise,
}: {
  valeur: IdFamille
  palette: IdPalette
  densite: Densite
  graine: number
  langue: Langue
  textes: Textes
  revision: number
  onChoisir: (famille: IdFamille) => void
  /** Tire une famille, une palette et une graine d'un coup. */
  onSurprise: () => void
}) {
  const abstraits = FAMILLES.filter((f) => f.groupe === 'abs')
  const paysages = FAMILLES.filter((f) => f.groupe === 'pay')
  const figures = FAMILLES.filter((f) => f.groupe === 'fig')

  const grille = (liste: typeof FAMILLES, titre: string, identifiant: string) => {
    const contient = liste.some((f) => f.id === valeur)
    return (
      <GroupeRadio id={identifiant} etiquettes={`h-famille ${titre}`} className="grille-familles">
        {liste.map((f, indice) => (
          <OptionRadio
            key={f.id}
            choisi={f.id === valeur}
            porteEntree={!contient && indice === 0}
            onChoisir={() => onChoisir(f.id)}
            className="opt opt-famille"
            data-famille={f.id}
          >
            <Vignette
              famille={f.id}
              palette={palette}
              densite={densite}
              graine={graine}
              revision={revision}
            />
            <span className="opt-famille-l">
              <span className="opt-carre" aria-hidden="true" />
              <span>{f[langue]}</span>
            </span>
          </OptionRadio>
        ))}
      </GroupeRadio>
    )
  }

  return (
    <div className="carte">
      {/* « Surprends-moi » est ici et non dans la barre d'action : il change le
          fichier téléchargé, sa place est donc dans le panneau, et c'est
          au-dessus des trente-deux familles qu'on a envie d'en tirer une au
          hasard. La barre garde un seul appel primaire. */}
      <div className="carte-titre">
        <h2 className="carte-h" id="h-famille">
          <Arche />
          <span>{textes.reglages.famille}</span>
        </h2>
        <button
          type="button"
          id="btn-surprise"
          className="btn-surprise"
          title={textes.reglages.surpriseTitre}
          onClick={onSurprise}
        >
          <span className="ico-etincelle" aria-hidden="true" />
          <span>{textes.reglages.surprise}</span>
        </button>
      </div>
      <h3 className="groupe" id="h-abstraits">
        <span className="groupe-arche" aria-hidden="true">
          <i />
          <b />
        </span>
        <span>{textes.reglages.groupeAbstraits}</span>
      </h3>
      {grille(abstraits, 'h-abstraits', 'liste-abstraits')}
      <h3 className="groupe groupe-2" id="h-paysages">
        <span className="groupe-sommet" aria-hidden="true" />
        <span>{textes.reglages.groupePaysages}</span>
      </h3>
      {grille(paysages, 'h-paysages', 'liste-paysages')}
      <h3 className="groupe groupe-2" id="h-figures">
        <span className="groupe-etoile" aria-hidden="true" />
        <span>{textes.reglages.groupeFigures}</span>
      </h3>
      {grille(figures, 'h-figures', 'liste-figures')}
    </div>
  )
}

export function ChoixPalette({
  valeur,
  langue,
  textes,
  onChoisir,
}: {
  valeur: IdPalette
  langue: Langue
  textes: Textes
  onChoisir: (palette: IdPalette) => void
}) {
  return (
    <div className="carte">
      <h2 className="carte-h" id="h-palette">
        <Arche />
        <span>{textes.reglages.palette}</span>
      </h2>
      <GroupeRadio id="liste-palettes" etiquettes="h-palette" className="grille-palettes">
        {ORDRE_PALETTES.map((id) => {
          const p = PALETTES[id]
          return (
            <OptionRadio
              key={id}
              choisi={id === valeur}
              onChoisir={() => onChoisir(id)}
              className="opt opt-palette"
              data-palette={id}
            >
              {/* L'échantillon montre la palette ; le nom la dit. Ni l'un ni
                  l'autre n'est seul à porter l'information. */}
              <span className="opt-palette-s" aria-hidden="true">
                {[p.fond, p.couleurs[0], p.couleurs[1], p.couleurs[2]].map((teinte, i) => (
                  <i key={`${id}-${i}`} style={{ background: teinte }} />
                ))}
              </span>
              <span className="opt-palette-l">
                <span className="opt-carre" aria-hidden="true" />
                <span>{p[langue]}</span>
              </span>
            </OptionRadio>
          )
        })}
      </GroupeRadio>
    </div>
  )
}

export function ChoixDensite({
  valeur,
  textes,
  onChoisir,
}: {
  valeur: Densite
  textes: Textes
  onChoisir: (densite: Densite) => void
}) {
  const noms = [textes.reglages.calme, textes.reglages.moyen, textes.reglages.dense]
  return (
    <div className="bento">
      <h2 className="carte-h" id="h-densite">
        <Arche />
        <span>{textes.reglages.densite}</span>
      </h2>
      <GroupeRadio id="liste-densite" etiquettes="h-densite" className="rangee-densite">
        {([0, 1, 2] as Densite[]).map((niveau) => (
          <OptionRadio
            key={niveau}
            choisi={niveau === valeur}
            onChoisir={() => onChoisir(niveau)}
            className="opt opt-densite"
            data-densite={String(niveau)}
            data-niveau={String(niveau)}
          >
            <span className="opt-densite-d" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="opt-densite-t">{noms[niveau]}</span>
          </OptionRadio>
        ))}
      </GroupeRadio>
    </div>
  )
}
