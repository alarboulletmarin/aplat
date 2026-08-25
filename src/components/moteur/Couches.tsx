// SPDX-License-Identifier: AGPL-3.0-only

import { useState, type CSSProperties } from 'react'
import { COUCHES, mesurer, type Couche, type Motif } from '../../lib/moteur'
import { remplir, type Textes } from '../../i18n'
import { Toile } from '../accueil/Toile'
import { TELEPHONE } from '../accueil/choix'
import { Etape } from './Etape'

/* L'ombre n'est pas dans l'escalier : elle n'existe que dans la version
   sombre, et la démonstration porte sur l'image claire, celle que le produit
   livre par défaut. Une position qui ne changerait rien à l'écran ferait
   passer le contrôle pour cassé ; une ligne sous le canevas le dit, et c'est
   plus honnête. La couche reste dans `COUCHES`, donc dans le dictionnaire, et
   son nom est lu par la même clé que les quatre autres. */
const MONTREES = COUCHES.filter((couche) => couche !== 'ombre')

/**
 * Étape 04 : les quatre couches.
 *
 * Un seul canevas et quatre positions. La position choisie arrête le dessin
 * là, et c'est le moteur qui s'arrête, pas la page : `dessiner` prend un
 * `arret`, et l'ordre des couches n'est donc écrit qu'une fois, à l'endroit où
 * il est déjà. Recomposer les couches ici aurait donné une pile qui ressemble
 * au rendu sans en être un, c'est-à-dire une capture d'écran déguisée.
 *
 * La position de départ est la dernière, l'image entière : la première image
 * d'une démonstration ne se montre pas en aplat nu.
 *
 * Le dictionnaire des couches est un `Record<Couche, ...>` : ajouter une
 * couche au moteur casse la compilation ici, ce qui est la seule garantie que
 * la page n'enseigne pas une pile périmée.
 */
export function Couches({ textes, motif }: { textes: Textes; motif: Motif }) {
  const M = textes.moteur
  const C = M.couches
  const [arret, setArret] = useState<Couche>('grain')

  /* Le voile mesuré, pour que la note de sa couche porte le chiffre de ce
     motif-ci et non un exemple. La sonde mesure le format du téléphone, comme
     l'étape suivante : les deux tombent donc sur la même entrée de mémoire, et
     la seconde ne coûte rien. */
  const mesure = mesurer(
    motif.famille, motif.palette, motif.densite, motif.graine,
    TELEPHONE.largeur, TELEPHONE.hauteur,
  )

  const MOTS: Record<Couche, { nom: string; note: string }> = {
    fond: { nom: C.fondNom, note: C.fondNote },
    formes: { nom: C.formesNom, note: C.formesNote },
    ombre: { nom: C.ombreNom, note: C.ombreNote },
    voile: {
      nom: C.voileNom,
      note: remplir(C.voileNote, { voile: String(Math.round(mesure.voile * 100)) }),
    },
    grain: { nom: C.grainNom, note: C.grainNote },
  }

  return (
    <Etape rang="04" cle="etape-quatre" titre={M.etapes.quatreTitre} note={M.etapes.quatreNote}>
      <div className="etape-paire">
        <Toile
          motif={motif}
          resolution={TELEPHONE}
          arret={arret}
          className="couches-toile"
        />

        <ol className="couches">
          {MONTREES.map((couche, rang) => {
            const ici = couche === arret
            return (
              <li key={couche}>
                <button
                  type="button"
                  className={ici ? 'couche couche-ici' : 'couche'}
                  aria-current={ici ? 'step' : undefined}
                  title={remplir(C.arreter, { couche: MOTS[couche].nom })}
                  onClick={() => setArret(couche)}
                  style={{ '--marche': rang } as CSSProperties}
                >
                  <span className="couche-nom">{MOTS[couche].nom}</span>
                  <span className="couche-note">{MOTS[couche].note}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
      <p className="etape-note">{C.note}</p>
    </Etape>
  )
}
