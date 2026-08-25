// SPDX-License-Identifier: AGPL-3.0-only

import { FAMILLES, type IdFamille, type Motif } from '../../lib/moteur'
import { IDS_CHIMIE } from '../../lib/chimie'
import { IDS_FRACTURES } from '../../lib/fractures'
import { IDS_GRAMMAIRES } from '../../lib/grammaires'
import { IDS_LIEUX } from '../../lib/lieux'
import { IDS_NIVEAUX } from '../../lib/niveaux'
import { IDS_PAVAGES } from '../../lib/pavages'
import { IDS_RESEAUX } from '../../lib/reseaux'
import { IDS_RESERVES } from '../../lib/reserves'
import { IDS_TRAMES } from '../../lib/trames'

/**
 * Les dix mécaniques de dessin, et les familles qui en sortent.
 *
 * C'est le pendant de `accueil/choix.ts` pour la page du moteur : ce qu'elle
 * montre, choisi une fois, plutôt que tiré au sort à l'ouverture.
 *
 * **Aucune liste de familles n'est recopiée ici.** Chaque fiche prend la liste
 * que son module publie déjà (`IDS_NIVEAUX`, `IDS_FRACTURES`, etc.), et la
 * première, celle des gestes d'origine, est ce qui reste une fois les neuf
 * autres retirées de `FAMILLES`. Une famille ajoutée au moteur se range donc
 * d'elle-même dans la bonne fiche, et aucune fiche ne peut citer une famille
 * qui n'existe pas.
 *
 * `cle` est la clé du libellé dans le dictionnaire, `exemple` le motif que la
 * fiche peint. Les exemples sont figés, palette comprise : ils démontrent une
 * mécanique, pas le motif qu'on est en train de composer plus haut dans la
 * page, et les faire suivre reviendrait à redessiner dix toiles à chaque
 * pastille de palette touchée.
 */
export interface Mecanique {
  cle: string
  /** Le fichier qui la tient, montré tel quel : c'est un lien vers la source. */
  module: string
  familles: readonly IdFamille[]
  exemple: Motif
}

/* Les neuf gestes venus d'un module, dans l'ordre où ils sont arrivés dans le
   moteur. Le premier de la liste publiée ci-dessous n'en est pas : il est ce
   qui restait avant eux. */
const VENUES_DES_MODULES: readonly IdFamille[] = [
  ...IDS_NIVEAUX, ...IDS_FRACTURES, ...IDS_RESERVES, ...IDS_CHIMIE,
  ...IDS_PAVAGES, ...IDS_LIEUX, ...IDS_TRAMES, ...IDS_RESEAUX, ...IDS_GRAMMAIRES,
]

/** Tout ce que `formes()` dessine encore lui-même, sans passer par un module. */
const SEMEES: readonly IdFamille[] = FAMILLES
  .map((f) => f.id)
  .filter((id) => !VENUES_DES_MODULES.includes(id))

export const MECANIQUES: readonly Mecanique[] = [
  {
    cle: 'semer',
    module: 'lib/moteur.ts',
    familles: SEMEES,
    exemple: { famille: 'blobs', palette: 'corail', densite: 1, graine: 4212 },
  },
  {
    cle: 'niveaux',
    module: 'lib/niveaux.ts',
    familles: IDS_NIVEAUX,
    exemple: { famille: 'relief', palette: 'ardoise', densite: 1, graine: 3160 },
  },
  {
    cle: 'fractures',
    module: 'lib/fractures.ts',
    familles: IDS_FRACTURES,
    exemple: { famille: 'kintsugi', palette: 'nuit', densite: 1, graine: 8807 },
  },
  {
    cle: 'reserves',
    module: 'lib/reserves.ts',
    familles: IDS_RESERVES,
    exemple: { famille: 'claustra', palette: 'soleil', densite: 1, graine: 2455 },
  },
  {
    cle: 'chimie',
    module: 'lib/chimie.ts',
    familles: IDS_CHIMIE,
    exemple: { famille: 'pelage', palette: 'argile', densite: 1, graine: 6031 },
  },
  {
    cle: 'pavages',
    module: 'lib/pavages.ts',
    familles: IDS_PAVAGES,
    exemple: { famille: 'penrose', palette: 'menthe', densite: 1, graine: 1509 },
  },
  {
    cle: 'lieux',
    module: 'lib/lieux.ts',
    familles: IDS_LIEUX,
    exemple: { famille: 'phare', palette: 'encre', densite: 1, graine: 7042 },
  },
  {
    cle: 'trames',
    module: 'lib/trames.ts',
    familles: IDS_TRAMES,
    exemple: { famille: 'moire', palette: 'prune', densite: 1, graine: 3728 },
  },
  {
    cle: 'reseaux',
    module: 'lib/reseaux.ts',
    familles: IDS_RESEAUX,
    exemple: { famille: 'metro', palette: 'ciel', densite: 1, graine: 5194 },
  },
  {
    cle: 'grammaires',
    module: 'lib/grammaires.ts',
    familles: IDS_GRAMMAIRES,
    exemple: { famille: 'herbier', palette: 'lime', densite: 1, graine: 2966 },
  },
]

/* Le motif de départ de la page. Choisi, jamais tiré : la première image d'une
   démonstration ne se joue pas aux dés, et la page doit se peindre deux fois de
   suite à l'identique. Vagues sur Lime et crème est le motif que l'application
   ouvre par défaut, et c'est aussi celui où le voile de l'étape 05 travaille le
   plus : la démonstration porte donc sur ce que tout le monde voit en premier. */
export const DEPART: Motif = { famille: 'vagues', palette: 'lime', densite: 1, graine: 7314 }
