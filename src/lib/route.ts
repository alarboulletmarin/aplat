// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Deux documents, un seul bundle.
 *
 * `/` présente le projet, `/app` le fait tourner. La séparation n'est pas une
 * navigation ajoutée à l'application : celle-ci reste l'écran unique décrit
 * par le README, et la page d'accueil est ce qu'on voit avant d'y entrer.
 *
 * Pas de bibliothèque de routage pour deux adresses. Le chemin est lu une fois
 * au démarrage, et rien ne le change ensuite : passer de l'une à l'autre est
 * un lien, pas une transition. C'est aussi ce qui garde l'application entière
 * à l'abri du rendu de l'accueil, et réciproquement.
 */

export type Route = 'accueil' | 'app'

/** Le chemin de l'application, tel qu'il s'écrit dans les liens. */
export const CHEMIN_APP = '/app'

/** Celui de la présentation. La marque y ramène, depuis les deux pages. */
export const CHEMIN_ACCUEIL = '/'

/**
 * Les paramètres qui décrivent un motif.
 *
 * `l` et `t` n'en sont pas : la langue et le thème valent pour les deux pages,
 * et `/?l=en` désigne l'accueil en anglais, pas l'application.
 */
const PARAMETRES_MOTIF = ['m', 'p', 'd', 's', 'r'] as const

/** Le chemin, débarrassé de sa barre oblique finale et de sa casse. */
function normaliser(chemin: string): string {
  const propre = chemin.toLowerCase().replace(/\/+$/, '')
  return propre === '' ? '/' : propre
}

export function route(chemin: string): Route {
  return normaliser(chemin) === CHEMIN_APP ? 'app' : 'accueil'
}

/**
 * L'adresse vers laquelle rediriger, ou null s'il n'y a rien à faire.
 *
 * Aplat a vécu à la racine : les liens partagés d'alors s'écrivent
 * `/?m=vagues&p=lime&s=7314`, et ils portent une image que quelqu'un a voulu
 * transmettre. Les laisser tomber sur la page de présentation reviendrait à
 * perdre exactement ce que le produit promet, « copier le lien suffit à
 * retrouver la même image ». Ils sont donc reconduits vers l'application avec
 * leur requête intacte.
 *
 * La règle ne regarde que les paramètres de motif : une adresse nue, ou qui ne
 * porte que la langue et le thème, reste sur l'accueil.
 */
export function redirection(chemin: string, recherche: string): string | null {
  if (route(chemin) !== 'accueil') return null

  let q: URLSearchParams
  try {
    q = new URLSearchParams(recherche)
  } catch {
    return null
  }

  if (!PARAMETRES_MOTIF.some((cle) => q.has(cle))) return null
  return `${CHEMIN_APP}${recherche.startsWith('?') ? recherche : `?${recherche}`}`
}

/** Un chemin et sa requête, la requête omise quand elle est vide. */
function lien(chemin: string, parametres: Record<string, string>): string {
  const requete = new URLSearchParams(parametres).toString()
  return requete ? `${chemin}?${requete}` : chemin
}

/**
 * Un lien vers l'application, avec les réglages d'affichage déjà posés.
 *
 * La langue et le thème choisis sur l'accueil traversent le lien : arriver sur
 * l'application en français puis la voir en anglais parce que le navigateur en
 * a décidé autrement serait un pas en arrière visible.
 */
export function lienApp(parametres: Record<string, string>): string {
  return lien(CHEMIN_APP, parametres)
}

/**
 * Un lien vers la présentation, avec les mêmes réglages d'affichage.
 *
 * C'est celui de la marque, en haut des deux pages : un logo ramène chez soi,
 * et le voyage de retour ne doit pas plus reperdre la langue que l'aller.
 *
 * Aucun paramètre de motif n'a le droit d'y entrer : `redirection()` renverrait
 * aussitôt vers `/app`, et le lien ne mènerait nulle part.
 */
export function lienAccueil(parametres: Record<string, string>): string {
  return lien(CHEMIN_ACCUEIL, parametres)
}
