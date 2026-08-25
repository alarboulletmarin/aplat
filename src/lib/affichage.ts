// SPDX-License-Identifier: AGPL-3.0-only

import type { Langue } from './moteur'

/**
 * La langue et le thème de l'interface vivent sur l'appareil, pas dans
 * l'adresse.
 *
 * Ils ne décrivent pas l'image : un lien qui les emporterait imposerait au
 * destinataire la langue et le thème de l'expéditeur, alors que chacun a les
 * siens. Ils sont donc retenus dans le stockage local, à côté des motifs et
 * des palettes, et l'adresse ne porte que ce qui décrit le fichier.
 *
 * Le stockage est commun à « / » et « /app » : un choix fait sur une page
 * vaut sur l'autre sans qu'aucun lien n'ait à le transporter. Et rien n'est
 * écrit tant qu'on ne choisit rien : les défauts restent la langue du
 * navigateur et le thème du système, l'absence de choix s'écrit par l'absence.
 *
 * Les liens d'avant portaient `?l=` et `?t=`. Ils sont encore lus et gagnent
 * pour ce chargement-là, puis l'adresse est nettoyée : un lien déjà partagé
 * ne casse pas, et n'écrase pas non plus le choix retenu sur l'appareil.
 */

export type Theme = 'clair' | 'sombre' | 'systeme'

export interface Affichage {
  langue: Langue
  theme: Theme
}

export const CLE_LANGUE = 'aplat:langue'
export const CLE_THEME = 'aplat:theme'

/** Le français si le navigateur le demande, l'anglais sinon. */
export function langueParDefaut(langueNavigateur: string | undefined): Langue {
  return (langueNavigateur || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

function estLangue(valeur: string | null): valeur is Langue {
  return valeur === 'fr' || valeur === 'en'
}

/* « Système » ne se stocke pas plus qu'il ne s'écrivait dans l'adresse :
   c'est l'absence de choix. */
function estThemeChoisi(valeur: string | null): valeur is 'clair' | 'sombre' {
  return valeur === 'clair' || valeur === 'sombre'
}

/** Une adresse illisible vaut une adresse vide : on retombe sur la suite. */
function requete(recherche: string): URLSearchParams {
  try {
    return new URLSearchParams(recherche)
  } catch {
    return new URLSearchParams()
  }
}

/** Un stockage refusé vaut un stockage vide : les défauts feront l'affaire. */
function retenu(cle: string): string | null {
  try {
    return window.localStorage.getItem(cle)
  } catch {
    return null
  }
}

/**
 * L'affichage au chargement : l'adresse d'abord, parce que les liens d'avant
 * la portent encore ; le stockage ensuite, parce que c'est le choix retenu ;
 * les défauts enfin.
 */
export function lireAffichage(recherche: string, langueNavigateur?: string): Affichage {
  const q = requete(recherche)
  const langueUrl = q.get('l')
  const themeUrl = q.get('t')
  const langueRetenue = retenu(CLE_LANGUE)
  const themeRetenu = retenu(CLE_THEME)
  return {
    langue: estLangue(langueUrl)
      ? langueUrl
      : estLangue(langueRetenue)
        ? langueRetenue
        : langueParDefaut(langueNavigateur),
    theme: estThemeChoisi(themeUrl)
      ? themeUrl
      : estThemeChoisi(themeRetenu)
        ? themeRetenu
        : 'systeme',
  }
}

export function retenirLangue(langue: Langue): void {
  try {
    window.localStorage.setItem(CLE_LANGUE, langue)
  } catch {
    /* stockage refusé : le choix vivra le temps de la page, et c'est tout */
  }
}

export function retenirTheme(theme: Theme): void {
  try {
    if (theme === 'systeme') window.localStorage.removeItem(CLE_THEME)
    else window.localStorage.setItem(CLE_THEME, theme)
  } catch {
    /* stockage refusé : le choix vivra le temps de la page, et c'est tout */
  }
}

/**
 * L'adresse débarrassée de `l` et `t`, ou null s'il n'y avait rien à ôter.
 *
 * Le nettoyage rend l'adresse telle qu'elle s'écrit désormais : celle de la
 * page, avec ses seuls paramètres de motif. Il est calculé ici, à côté de la
 * lecture de compatibilité, pour que les deux vivent et meurent ensemble.
 */
export function adresseNettoyee(chemin: string, recherche: string): string | null {
  const q = requete(recherche)
  if (!q.has('l') && !q.has('t')) return null
  q.delete('l')
  q.delete('t')
  const reste = q.toString()
  return reste ? `${chemin}?${reste}` : chemin
}
