// SPDX-License-Identifier: AGPL-3.0-only

import {
  assainirMot, estDensite, estFamille, estPalette, MOT_PAR_DEFAUT, palette, PREFIXE_PERSO,
  type Densite, type Ecran, type IdFamille, type IdPaletteQuelconque, type Langue,
  type Motif,
} from './moteur'
import { GRAINE_MAX } from './tirage'
import { type Affichage, type Theme } from './affichage'
import { encoderTeintes } from './palettes'
import { RES_MAX, RES_MIN, type Resolution } from './resolution'
import { CHEMIN_APP } from './route'

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
  palette: IdPaletteQuelconque
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
  /**
   * L'écran sur lequel la lisibilité est jugée : l'accueil et sa grille
   * d'icônes, ou le verrouillage et son cartouche d'heure.
   *
   * Il est ici, avec le voile et la version, et pour exactement la même
   * raison : la sonde ne mesure pas la même bande selon l'écran, elle dose
   * donc un autre voile, et ce voile est brûlé dans le PNG. Deux écrans, deux
   * fichiers. Ce n'est pas un réglage de l'aperçu, même si c'est l'aperçu qui
   * le montre. Son absence vaut « accueil », qui est le seul écran que le
   * produit ait jamais montré : les liens écrits avant lui ouvrent la même
   * image qu'avant.
   */
  ecran: Ecran
  /**
   * Le mot que l'affiche écrit. Il ne concerne qu'une famille sur
   * soixante-dix-neuf, et il est ici quand même : c'est un réglage du motif au
   * même titre que la densité, il change l'image, donc un lien qui ne le
   * porterait pas ouvrirait une autre affiche chez le destinataire.
   *
   * Il est toujours assaini à la lecture comme à l'écriture, `assainirMot`
   * étant le seul point d'entrée : l'adresse est la seule partie du produit qui
   * vienne du dehors, et la seule chaîne libre qu'elle porte désormais.
   */
  mot: string
  largeurSaisie: string
  hauteurSaisie: string
}

export const REGLAGES_PAR_DEFAUT: Reglages = {
  langue: 'fr',
  theme: 'systeme',
  famille: 'vagues',
  palette: 'lime',
  densite: 1,
  graine: 7314,
  voile: true,
  sombre: false,
  ecran: 'accueil',
  mot: MOT_PAR_DEFAUT,
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
    /* Même prudence que les deux précédents : seul « 1 » demande le
       verrouillage, dont la bande est la plus sévère des deux. Une adresse
       abîmée rend l'écran d'accueil, celui que le produit a toujours mesuré. */
    ecran: q.get('e') === '1' ? 'verrou' : 'accueil',
    /* Assaini, jamais rejeté : une adresse abîmée doit ouvrir une affiche, pas
       une page vide. Ce qui n'est pas de la fonte tombe, et un mot devenu vide
       retombe sur celui par défaut. */
    mot: assainirMot(q.get('t') ?? ''),
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
  if (reglages.ecran === 'verrou') q.set('e', '1')
  /* Le mot par défaut ne s'écrit pas : une adresse ne porte que ce qu'on a
     choisi, comme pour le voile et la version. */
  if (reglages.mot !== MOT_PAR_DEFAUT) q.set('t', reglages.mot)
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

/**
 * L'adresse qui ouvre un motif dans l'application.
 *
 * La page du mécanisme construit un motif d'étape en étape et le rend à la fin
 * sous forme de lien. Il passe par `ecrireUrl` plutôt que d'assembler ses
 * quatre paramètres à la main : la grammaire de l'adresse n'est écrite qu'ici,
 * et un lien composé ailleurs cesserait d'être lu correctement le jour où elle
 * bouge.
 *
 * Il est ici et non dans `route.ts` pour une raison de poids, au sens propre :
 * `route.ts` est lu par `main.tsx` avant le moindre rendu, et il n'importe
 * rien. Lui donner ce lien y ferait entrer le moteur entier, c'est-à-dire
 * annuler la coupe en trois morceaux que les imports paresseux obtiennent.
 *
 * Aucune résolution des deux côtés : `ecrireUrl` n'écrit `r` que pour une
 * saisie manuelle, et la page n'en propose aucune. Son absence veut dire « la
 * résolution de l'appareil qui ouvre le lien », ce que la page vient
 * précisément d'expliquer.
 */
export function lienAppDuMotif(motif: Motif): string {
  const reglages: Reglages = { ...REGLAGES_PAR_DEFAUT, ...motif }
  const aucune: Resolution = { largeur: 0, hauteur: 0 }
  return `${CHEMIN_APP}?${ecrireUrl(reglages, aucune, aucune)}`
}
