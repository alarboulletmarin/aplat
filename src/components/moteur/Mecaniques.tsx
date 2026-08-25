// SPDX-License-Identifier: AGPL-3.0-only

import { famille as trouverFamille, type IdFamille, type Langue, type Motif } from '../../lib/moteur'
import { remplir, type Textes } from '../../i18n'
import { Toile } from '../accueil/Toile'
import { TELEPHONE } from '../accueil/choix'
import { MECANIQUES } from './mecaniques'
import { Etape } from './Etape'

/* Quatre noms, puis un compte. Une fiche qui déroulerait quarante familles
   cesserait d'être une fiche, et le compte dit mieux qu'une liste tronquée
   qu'il y en a d'autres. */
const NOMMEES = 4

/** « Kintsugi, Banquise, Boro », ou « Blobs, Vagues... et 39 autres ». */
function lister(
  ids: readonly IdFamille[], langue: Langue, gabarit: string,
): string {
  const noms = ids.map((id) => trouverFamille(id)?.[langue] ?? id)
  if (noms.length <= NOMMEES) return noms.join(', ')
  return remplir(gabarit, {
    liste: noms.slice(0, NOMMEES).join(', '),
    n: String(noms.length - NOMMEES),
  })
}

/**
 * Étape 03 : les dix gestes.
 *
 * C'est la partie « sous le capot » de la page, et la seule où le motif de la
 * page ne se retrouve pas : chaque fiche garde son exemple, famille et palette
 * figées. Une fiche qui suivrait la palette du moment démontrerait la palette
 * au lieu de démontrer la mécanique, et changer une pastille à l'étape 01
 * repeindrait dix toiles pour rien.
 *
 * Le fil tient dans l'autre sens : toucher une fiche fait passer le motif de la
 * page à sa mécanique, et les cinq autres étapes suivent. La palette, la
 * densité et la graine ne bougent pas, parce que c'est le geste qu'on est venu
 * voir, pas un autre motif.
 *
 * Les familles de chaque fiche ne sont écrites nulle part : `mecaniques.ts`
 * les prend dans les listes que les modules du moteur publient déjà.
 */
export function Mecaniques({
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
  const D = M.mecaniques

  return (
    <Etape rang="03" cle="etape-trois" titre={M.etapes.troisTitre} note={M.etapes.troisNote}>
      <ul className="gestes">
        {MECANIQUES.map((mecanique) => {
          const nom = D[`${mecanique.cle}Nom` as keyof typeof D] as string
          const note = D[`${mecanique.cle}Note` as keyof typeof D] as string
          const ici = mecanique.familles.includes(motif.famille)
          return (
            <li key={mecanique.cle}>
              <div className={ici ? 'geste geste-ici' : 'geste'}>
                <Toile
                  motif={mecanique.exemple}
                  resolution={TELEPHONE}
                  className="geste-toile"
                />
                <div className="geste-mots">
                  <h3 className="geste-nom">{nom}</h3>
                  <p className="geste-note">{note}</p>
                  <p className="geste-familles">
                    {remplir(D.familles, {
                      liste: lister(mecanique.familles, langue, D.etAutres),
                    })}
                  </p>
                  <p className="geste-module">{mecanique.module}</p>
                </div>
                {ici ? (
                  <p className="geste-ici-mot">
                    <span className="pastille" aria-hidden="true" />
                    {D.courante}
                  </p>
                ) : (
                  <button
                    type="button"
                    className="geste-adopter"
                    onClick={() => onChanger({ famille: mecanique.exemple.famille })}
                  >
                    {D.adopter}
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </Etape>
  )
}
