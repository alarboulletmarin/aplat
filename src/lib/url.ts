// SPDX-License-Identifier: AGPL-3.0-only

import {
  estDensite, estFamille, estPalette, palette, PREFIXE_PERSO,
  type Densite, type IdFamille, type IdPalette, type Langue,
} from './moteur'
import { type Affichage, type Theme } from './affichage'
import { encoderTeintes } from './palettes'
import { RES_MAX, RES_MIN, type Resolution } from './resolution'

/**
 * L'URL porte le motif affiché, et rien que lui.
 *
 * Ni compte, ni cookie, ni base indexée : ce qui décrit l'image tient dans la
 * barre d'adresse, et c'est aussi ce qui rend un motif transmissible sans
 * passer par personne. Ce qui ne décrit pas l'image n'y entre pas : la langue
 * et le thème vivent sur l'appareil (`affichage.ts`), comme l'historique et
 * les palettes composées.
 */

export type { Affichage, Theme } from './affichage'
export { langueParDefaut } from './affichage'

export interface Reglages {
  langue: Langue
  theme: Theme
  famille: IdFamille
  palette: IdPalette
  densite: Densite
  graine: number
  /**
   * Le voile de lisibilité est-il brûlé dans le fichier.
   *
   * C'est un réglage et non un affichage : il change le PNG téléchargé, donc il
   * a sa place ici, dans l'adresse, avec les quatre autres. Son absence vaut
   * « oui », parce que c'est ce que le produit fait par défaut et depuis
   * toujours : les liens écrits avant lui continuent d'ouvrir la même image.
   */
  voile: boolean
  /**
   * La version sombre : le motif assombri, dans le fichier lui-même.
   *
   * À ne pas confondre avec `theme`, juste au-dessus, qui habille
   * l'application. Celui-ci ne change rien à l'interface et tout à l'image :
   * c'est un aplat noir brûlé dans le PNG, au même titre que le voile, et il a
   * sa place ici pour la même raison. Son absence vaut « claire », qui est ce
   * que le produit a toujours livré.
   */
  sombre: boolean
  largeurSaisie: string
  hauteurSaisie: string
}

export const GRAINE_MAX = 99999

export const REGLAGES_PAR_DEFAUT: Reglages = {
  langue: 'fr',
  theme: 'systeme',
  famille: 'vagues',
  palette: 'lime',
  densite: 1,
  graine: 7314,
  voile: true,
  sombre: false,
  largeurSaisie: '',
  hauteurSaisie: '',
}

/** Une adresse illisible vaut une adresse vide : on retombe sur les défauts. */
function requete(recherche: string): URLSearchParams {
  try {
    return new URLSearchParams(recherche)
  } catch {
    return new URLSearchParams()
  }
}

/**
 * Lit les réglages d'une URL. Tout ce qui n'est pas reconnu retombe sur la
 * valeur par défaut : une URL forgée à la main ne peut produire qu'un motif
 * valide, jamais une erreur.
 *
 * L'affichage est fourni par l'appelant, pas lu ici : il vient de l'appareil
 * (`affichage.ts`), et cette fonction n'assemble que l'état complet dont
 * l'application a besoin pour rendre.
 */
export function lireUrl(
  recherche: string,
  detecte: Resolution,
  affichage: Affichage = {
    langue: REGLAGES_PAR_DEFAUT.langue,
    theme: REGLAGES_PAR_DEFAUT.theme,
  },
): Reglages {
  const q = requete(recherche)

  const famille = q.get('m')
  const palette = q.get('p')
  const densite = Number.parseInt(q.get('d') ?? '', 10)
  const graine = Number.parseInt(q.get('s') ?? '', 10)

  /* La résolution est un couple : une moitié illisible et on retombe
     entièrement sur la détection, plutôt que de mélanger l'écran de
     l'expéditeur et celui du destinataire. Mêmes bornes que les champs. */
  const morceaux = (q.get('r') ?? '').split('x')
  const l = Number.parseInt(morceaux[0], 10)
  const h = Number.parseInt(morceaux[1], 10)
  const resolutionValide =
    morceaux.length === 2 &&
    l >= RES_MIN && l <= RES_MAX && h >= RES_MIN && h <= RES_MAX

  return {
    famille: estFamille(famille) ? famille : REGLAGES_PAR_DEFAUT.famille,
    palette: estPalette(palette) ? palette : REGLAGES_PAR_DEFAUT.palette,
    densite: estDensite(densite) ? densite : REGLAGES_PAR_DEFAUT.densite,
    graine: graine > 0 && graine <= GRAINE_MAX ? graine : REGLAGES_PAR_DEFAUT.graine,
    /* Seul « 0 » retire le voile. Tout le reste, y compris l'absence, le
       laisse : une adresse abîmée ne doit pas rendre une image plus claire que
       celle qu'on croit avoir choisie. */
    voile: q.get('v') !== '0',
    /* Symétrique du voile, et à l'envers pour la même raison : seul « 1 »
       assombrit. Une adresse abîmée rend l'image que le produit livre par
       défaut, jamais une plus sombre que celle qu'on croit avoir choisie. */
    sombre: q.get('n') === '1',
    langue: affichage.langue,
    theme: affichage.theme,
    largeurSaisie: String(resolutionValide ? l : detecte.largeur),
    hauteurSaisie: String(resolutionValide ? h : detecte.hauteur),
  }
}

/**
 * Écrit les réglages en paramètres d'URL.
 *
 * La résolution détectée n'y figure pas : c'est une mesure de l'appareil, pas
 * un réglage. Son absence veut dire « la résolution de l'appareil qui ouvre le
 * lien », ce qui sert aussi mieux le destinataire. Seule une saisie manuelle
 * est transmise.
 *
 * La langue et le thème n'y figurent pas non plus : ils habillent l'interface
 * sans rien changer au fichier, et le destinataire d'un lien a les siens.
 */
export function ecrireUrl(
  reglages: Reglages, resolution: Resolution, detecte: Resolution,
): string {
  const q = new URLSearchParams()
  q.set('m', reglages.famille)
  q.set('p', reglages.palette)
  q.set('d', String(reglages.densite))
  q.set('s', String(reglages.graine))
  if (!reglages.voile) q.set('v', '0')
  if (reglages.sombre) q.set('n', '1')
  /* Une palette composée à la main n'existe que sur l'appareil qui l'a
     composée. Le lien porte donc ses teintes, sans quoi il ouvrirait un autre
     motif chez la personne qui le reçoit, ce qui est exactement ce que le
     produit promet de ne jamais faire. L'identifiant est l'empreinte de ces
     teintes : les deux se vérifient l'un l'autre à la lecture. */
  if (reglages.palette.startsWith(PREFIXE_PERSO)) {
    q.set('k', encoderTeintes(palette(reglages.palette)))
  }
  const surMesure =
    resolution.largeur > 0 && resolution.hauteur > 0 &&
    !(resolution.largeur === detecte.largeur && resolution.hauteur === detecte.hauteur)
  if (surMesure) q.set('r', `${resolution.largeur}x${resolution.hauteur}`)
  return q.toString()
}
