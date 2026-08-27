// SPDX-License-Identifier: AGPL-3.0-only

import {
  famille as trouverFamille, palette as trouverPalette,
  FAMILLES, ORDRE_PALETTES,
  type Densite, type Groupe, type Langue, type Motif,
} from '../../lib/moteur'
import { GRAINE_MAX, tirer } from '../../lib/tirage'
import { nombre } from '../../lib/format'
import { remplir, type Textes } from '../../i18n'
import { TELEPHONE } from '../accueil/choix'
import { Appareil } from '../accueil/Appareil'
import { GroupeRadio, OptionRadio } from '../GroupeRadio'
import { Etape } from './Etape'

/* Les huit groupes, dans l'ordre du moteur, avec la clé du mot qui les nomme
   dans le panneau de l'application. Le classement est le même, montré
   autrement : la page n'invente pas un second vocabulaire. */
const GROUPES: readonly { id: Groupe; cle: 'groupeAbstraits' | 'groupePavages'
  | 'groupeVolumes' | 'groupeInstruments' | 'groupeMatieres'
  | 'groupePaysages' | 'groupeLieux' | 'groupeFigures' }[] = [
  { id: 'abs', cle: 'groupeAbstraits' },
  { id: 'pav', cle: 'groupePavages' },
  { id: 'vol', cle: 'groupeVolumes' },
  { id: 'ins', cle: 'groupeInstruments' },
  { id: 'mat', cle: 'groupeMatieres' },
  { id: 'pay', cle: 'groupePaysages' },
  { id: 'lieu', cle: 'groupeLieux' },
  { id: 'fig', cle: 'groupeFigures' },
]

const DENSITES: readonly { valeur: Densite; cle: 'calme' | 'moyen' | 'dense' }[] = [
  { valeur: 0, cle: 'calme' },
  { valeur: 1, cle: 'moyen' },
  { valeur: 2, cle: 'dense' },
]

/** Une famille du groupe, jamais celle qu'on regarde déjà. */
function autreFamille(groupe: Groupe, courante: string) {
  const dans = FAMILLES.filter((f) => f.groupe === groupe).map((f) => f.id)
  return tirer(dans, courante as (typeof dans)[number])
}

/**
 * Étape 01 : les quatre réglages.
 *
 * Le motif derrière une vraie grille d'icônes, et sous lui les réglages qui le
 * font. C'est l'application en trois rangées, pas en soixante-seize vignettes :
 * une liste complète des familles referait le panneau de l'outil dans un autre
 * document, ce que le design refuse. Les huit groupes disent le classement, et
 * « une autre famille » donne accès au reste sans construire un second
 * éditeur.
 *
 * Les quatre chiffres de la ligne du bas sont lus dans le moteur, jamais
 * recopiés : une famille ajoutée les corrige d'elle-même.
 */
export function Quatre({
  langue,
  textes,
  motif,
  onChanger,
}: {
  langue: Langue
  textes: Textes
  motif: Motif
  onChanger: (partiel: Partial<Motif>) => void
}) {
  const M = textes.moteur
  const R = textes.reglages
  const courant = trouverFamille(motif.famille)
  const groupe = courant?.groupe ?? 'abs'
  const nomGroupe = R[GROUPES.find((g) => g.id === groupe)?.cle ?? 'groupeAbstraits']

  return (
    <Etape rang="01" cle="etape-un" titre={M.etapes.unTitre} note={M.etapes.unNote}>
      <div className="etape-paire">
        <Appareil
          motif={motif}
          resolution={TELEPHONE}
          langue={langue}
          textes={textes}
          className="appareil-etape"
          description={remplir(M.reglages.legende, {
            famille: courant?.[langue] ?? motif.famille,
            palette: trouverPalette(motif.palette)[langue],
          })}
        />

        <div className="etape-commandes">
          <div className="commande">
            <h3 className="commande-titre" id="h-mot-famille">
              {M.reglages.groupe}
            </h3>
            <GroupeRadio id="mot-famille" etiquettes="h-mot-famille" className="commande-rangee">
              {GROUPES.map((g) => (
                <OptionRadio
                  key={g.id}
                  choisi={g.id === groupe}
                  onChoisir={() => onChanger({ famille: autreFamille(g.id, motif.famille) })}
                  className="opt opt-mot"
                >
                  {R[g.cle]}
                </OptionRadio>
              ))}
            </GroupeRadio>
            <p className="commande-lu">
              {remplir(M.reglages.legende, {
                famille: courant?.[langue] ?? motif.famille,
                palette: trouverPalette(motif.palette)[langue],
              })}
            </p>
            <button
              type="button"
              className="commande-relance"
              title={remplir(M.reglages.autreTitre, { groupe: nomGroupe })}
              onClick={() => onChanger({ famille: autreFamille(groupe, motif.famille) })}
            >
              {M.reglages.autre}
            </button>
          </div>

          <div className="commande">
            <h3 className="commande-titre" id="h-mot-palette">
              {R.palette}
            </h3>
            <GroupeRadio id="mot-palette" etiquettes="h-mot-palette" className="commande-rangee">
              {ORDRE_PALETTES.map((id) => {
                const P = trouverPalette(id)
                return (
                  <OptionRadio
                    key={id}
                    choisi={id === motif.palette}
                    onChoisir={() => onChanger({ palette: id })}
                    className="opt opt-pastille"
                    titre={P[langue]}
                    aria-label={P[langue]}
                    style={{ background: P.fond, color: P.couleurs[0] }}
                  >
                    <span className="pastille-teinte" aria-hidden="true" />
                  </OptionRadio>
                )
              })}
            </GroupeRadio>
          </div>

          <div className="commande">
            <h3 className="commande-titre" id="h-mot-densite">
              {R.densite}
            </h3>
            <GroupeRadio id="mot-densite" etiquettes="h-mot-densite" className="commande-rangee">
              {DENSITES.map((d) => (
                <OptionRadio
                  key={d.valeur}
                  choisi={d.valeur === motif.densite}
                  onChoisir={() => onChanger({ densite: d.valeur })}
                  className="opt opt-mot"
                >
                  {R[d.cle]}
                </OptionRadio>
              ))}
            </GroupeRadio>
          </div>

          <p className="etape-chiffres">
            {remplir(M.reglages.compte, {
              familles: nombre(FAMILLES.length, langue),
              palettes: nombre(ORDRE_PALETTES.length, langue),
              densites: nombre(DENSITES.length, langue),
              graines: nombre(GRAINE_MAX, langue),
            })}
          </p>
        </div>
      </div>
    </Etape>
  )
}
