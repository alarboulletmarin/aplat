// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Le tirage au sort, seule porte par laquelle `Math.random` entre dans le
 * produit : le moteur, lui, est déterministe de bout en bout. « Surprends-moi »,
 * la variante et les vignettes de l'accueil passent tous par ici, si bien que
 * les bornes du hasard ne sont écrites qu'une fois.
 */

export const GRAINE_MAX = 99999

/** Un élément au hasard, jamais `sauf` tant que la liste offre autre chose. */
export function tirer<V>(liste: readonly V[], sauf: V): V {
  const restantes = liste.filter((valeur) => valeur !== sauf)
  const choix = restantes.length ? restantes : liste
  return choix[Math.floor(Math.random() * choix.length)]
}

/** Une graine au hasard, dans les bornes que l'adresse accepte. */
export function tirerGraine(): number {
  return Math.floor(Math.random() * GRAINE_MAX) + 1
}
