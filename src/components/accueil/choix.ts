// SPDX-License-Identifier: AGPL-3.0-only

import type { Motif } from '../../lib/moteur'
import type { Resolution } from '../../lib/resolution'

/**
 * Ce que la page d'accueil montre : douze motifs choisis, et trois formats.
 *
 * Choisis, et non tirés au sort à l'ouverture. La page se peint donc deux fois
 * de suite à l'identique, ce qu'une planche de recette peut vérifier et ce
 * qu'une composition dessinée réclame : la première image qu'on voit d'un
 * produit ne se joue pas aux dés. La variation est offerte, pas imposée, en
 * touchant une vignette.
 *
 * Les familles et les palettes sont celles du moteur, pas des noms écrits pour
 * la maquette : la galerie ne peut donc pas montrer un motif que l'application
 * ne sait pas produire.
 */

/** Le format des trois maquettes, en pixels de fichier. */
export const TELEPHONE: Resolution = { largeur: 1179, hauteur: 2556 }
export const ORDINATEUR: Resolution = { largeur: 2560, hauteur: 1440 }
export const TABLETTE: Resolution = { largeur: 2048, hauteur: 2732 }

/** Les trois formats du bandeau, dans l'ordre où on les lit. */
export const FORMATS = [
  { resolution: ORDINATEUR, cle: 'ordinateur' },
  { resolution: TELEPHONE, cle: 'telephone' },
  { resolution: TABLETTE, cle: 'tablette' },
] as const

/* L'arche est la forme de la marque : c'est elle qui ouvre la page. Sur Nuit,
   parce que la première maquette de la page est aussi la première démonstration
   de ce qu'elle promet : des libellés d'icônes qui restent lisibles. Sur une
   palette claire, la sonde passe les libellés en sombre et les quelques-uns qui
   tombent sur une arche foncée disparaissent, ce qui est exactement le contraire
   de l'argument. */
export const HEROS: Motif = { famille: 'arches', palette: 'nuit', densite: 1, graine: 7314 }

/* Un motif large et calme, qui laisse la barre de menus et les icônes de
   bureau lisibles : c'est ce que la section démontre. */
export const BUREAU: Motif = { famille: 'vagues', palette: 'ciel', densite: 1, graine: 2048 }

/* Le motif de la démonstration du voile : celui que l'application ouvre par
   défaut, aux quatre réglages près. Vagues sur Lime & crème demande le voile le
   plus fort que la sonde sache poser, parce que la sonde y choisit des libellés
   clairs et que la moitié haute du motif est du crème. Sans voile, un libellé
   sur deux disparaît ; avec, ils tiennent tous le seuil. C'est la démonstration
   la plus honnête qui soit : elle porte sur le motif que tout le monde voit en
   premier. */
export const VOILE: Motif = { famille: 'vagues', palette: 'lime', densite: 1, graine: 7314 }

/**
 * Les douze de la galerie : les deux groupes du moteur, abstraits puis
 * figures, et les onze palettes toutes représentées au moins une fois.
 */
export const GALERIE: readonly Motif[] = [
  { famille: 'arches', palette: 'soleil', densite: 1, graine: 1204 },
  { famille: 'ondes', palette: 'ciel', densite: 1, graine: 3311 },
  { famille: 'decoupes', palette: 'nuit', densite: 1, graine: 815 },
  { famille: 'terrazzo', palette: 'encre', densite: 1, graine: 6402 },
  { famille: 'ecailles', palette: 'ardoise', densite: 1, graine: 2790 },
  { famille: 'vagues', palette: 'corail', densite: 1, graine: 5518 },
  { famille: 'blobs', palette: 'lime', densite: 1, graine: 941 },
  { famille: 'fleurs', palette: 'menthe', densite: 1, graine: 7726 },
  { famille: 'obliques', palette: 'orage', densite: 1, graine: 3095 },
  { famille: 'tournesol', palette: 'argile', densite: 1, graine: 1663 },
  { famille: 'lunes', palette: 'prune', densite: 1, graine: 4870 },
  { famille: 'colonnes', palette: 'soleil', densite: 2, graine: 2231 },
]
