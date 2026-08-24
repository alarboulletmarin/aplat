// SPDX-License-Identifier: AGPL-3.0-only

import { FAMILLES, ORDRE_PALETTES, type Motif } from '../../lib/moteur'
import { ORDINATEUR, TABLETTE, TELEPHONE } from '../../lib/resolution'
import { GRAINE_MAX } from '../../lib/url'

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

/* Le format des trois maquettes, en pixels de fichier. Ils viennent du même
   endroit que les préréglages de l'application : la présentation ne peut pas
   montrer une taille que l'outil ne propose pas. */
export { ORDINATEUR, TABLETTE, TELEPHONE }

/** Les trois formats du bandeau, dans l'ordre où on les lit. */
export const FORMATS = [
  { resolution: ORDINATEUR, cle: 'ordinateur' },
  { resolution: TELEPHONE, cle: 'telephone' },
  { resolution: TABLETTE, cle: 'tablette' },
] as const

/* L'arcade, c'est la marque répétée : la forme du logo, en colonnade, jusqu'à
   remplir l'écran. C'est elle qui ouvre la page dans la maquette.

   Sur Nuit et non sur une palette claire, parce que la première image de la
   page est aussi la première démonstration de ce qu'elle promet : des libellés
   d'icônes qui restent lisibles. Sur un fond clair, la sonde passe les libellés
   en sombre, et ceux qui tombent sur une arche foncée disparaissent, ce qui est
   exactement le contraire de l'argument. */
export const HEROS: Motif = { famille: 'arcade', palette: 'nuit', densite: 1, graine: 7314 }

/* Un paysage, et le plus calme des trois : sur un bureau, les icônes sont en
   haut à gauche et le dock en bas, c'est-à-dire aux deux endroits que des
   nuages laissent tranquilles. */
export const BUREAU: Motif = { famille: 'nuages', palette: 'ciel', densite: 1, graine: 2048 }

/* Le motif de la démonstration du voile : celui que l'application ouvre par
   défaut, aux quatre réglages près. Vagues sur Lime & crème demande le voile le
   plus fort que la sonde sache poser, parce que la sonde y choisit des libellés
   clairs et que la moitié haute du motif est du crème. Sans voile, un libellé
   sur deux disparaît ; avec, ils tiennent tous le seuil. C'est la démonstration
   la plus honnête qui soit : elle porte sur le motif que tout le monde voit en
   premier. */
export const VOILE: Motif = { famille: 'vagues', palette: 'lime', densite: 1, graine: 7314 }

/**
 * Les douze de la galerie : les couples famille et palette de la maquette,
 * dans son ordre. Les trois groupes du moteur y passent, et les onze palettes
 * sont toutes représentées au moins une fois.
 */
/**
 * Un autre motif, tiré au sort, jamais le même que celui qu'on regarde.
 *
 * La page entière est cliquable : chaque écran est un bouton, et l'appuyer
 * change le fond d'écran. C'est la démonstration la plus courte du produit,
 * puisque c'est exactement ce que fait « Surprends-moi » dans l'application, et
 * c'est aussi ce qui répond à la question que la page pose : « ça donne quoi,
 * les autres ? »
 *
 * Le tirage exclut la famille et la palette en cours : un appui sur deux qui ne
 * changerait rien de visible ferait passer la page pour figée.
 */
export function tirerMotif(precedent: Motif): Motif {
  const tirer = <V,>(liste: readonly V[], sauf: V): V => {
    const restantes = liste.filter((valeur) => valeur !== sauf)
    const choix = restantes.length ? restantes : liste
    return choix[Math.floor(Math.random() * choix.length)]
  }
  return {
    famille: tirer(FAMILLES.map((f) => f.id), precedent.famille),
    palette: tirer(ORDRE_PALETTES, precedent.palette),
    densite: precedent.densite,
    graine: tirerGraine(),
  }
}

export function tirerGraine(): number {
  return Math.floor(Math.random() * GRAINE_MAX) + 1
}

export const GALERIE: readonly Motif[] = [
  { famille: 'arcade', palette: 'soleil', densite: 1, graine: 1204 },
  { famille: 'azulejos', palette: 'ciel', densite: 1, graine: 3311 },
  { famille: 'sommets', palette: 'nuit', densite: 1, graine: 815 },
  { famille: 'vitrail', palette: 'encre', densite: 1, graine: 6402 },
  { famille: 'truchet', palette: 'lime', densite: 1, graine: 2790 },
  { famille: 'horizon', palette: 'corail', densite: 1, graine: 5518 },
  { famille: 'mosaique', palette: 'argile', densite: 1, graine: 941 },
  { famille: 'agrumes', palette: 'menthe', densite: 1, graine: 7726 },
  { famille: 'persiennes', palette: 'orage', densite: 1, graine: 3095 },
  { famille: 'tresse', palette: 'prune', densite: 1, graine: 1663 },
  { famille: 'ecailles', palette: 'ardoise', densite: 1, graine: 4870 },
  { famille: 'vases', palette: 'soleil', densite: 1, graine: 2231 },
]
