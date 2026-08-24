// SPDX-License-Identifier: AGPL-3.0-only

/**
 * L'historique local des motifs regardés.
 *
 * C'est la seule chose qu'Aplat écrit sur l'appareil, et la promesse de
 * confidentialité a été réécrite pour le dire plutôt que de le taire.
 *
 * Ce qui est gardé : quatre réglages par entrée, dix entrées au plus. Ni
 * image, ni horodatage, ni identifiant, ni URL, ni compteur de visites. Rien
 * qui distingue un appareil d'un autre, rien qui décrive une session. Le rendu
 * étant déterministe, ces quatre réglages suffisent à redessiner le motif à
 * l'identique : une vignette enregistrée ne serait qu'un cache de calcul, et
 * pèserait mille fois plus.
 *
 * Les entrées relues sont validées une à une par les mêmes listes blanches que
 * l'URL. Un stockage est modifiable à la main comme une barre d'adresse ; ce
 * qui en sort n'est pas plus digne de confiance.
 *
 * Tout accès passe par un `try` : la navigation privée refuse le stockage, un
 * quota plein aussi, et une application qui promet de fonctionner hors ligne
 * n'a pas le droit de tomber pour ça. Sans stockage, l'historique reste vide
 * et le reste fonctionne.
 */
import {
  estDensite, estFamille, estPalette,
  type Densite, type IdFamille, type IdPalette, type Motif,
} from './moteur'
import { GRAINE_MAX } from './url'

/** Le nom est préfixé : un jour, une autre application partagera cette origine. */
export const CLE = 'aplat:motifs'

/** Dix, et la liste est bornée : un historique n'est pas un flux. */
export const MAX = 10

/**
 * Six épingles au plus.
 *
 * L'épingle répond à la seule chose que dix entrées ne savent pas faire :
 * garder celle qu'on a aimée pendant qu'on en regarde dix autres. Elle est
 * bornée à six sur dix pour que la liste reste ce qu'elle est, une mémoire
 * courte : au-delà, ce ne serait plus un historique mais une collection, et
 * c'est exactement ce que le produit refuse. Quatre places restent toujours
 * libres pour les motifs qui passent.
 */
export const MAX_EPINGLES = 6

/** Les clés sont celles de l'URL, courtes et déjà éprouvées. */
export interface Entree {
  m: IdFamille
  p: IdPalette
  d: Densite
  s: number
  /** 1 quand l'entrée est épinglée. Absent sinon : la liste reste minuscule. */
  f?: 1
}

export function versEntree(motif: Motif): Entree {
  return { m: motif.famille, p: motif.palette, d: motif.densite, s: motif.graine }
}

export function versMotif(entree: Entree): Motif {
  return { famille: entree.m, palette: entree.p, densite: entree.d, graine: entree.s }
}

export function estEntree(valeur: unknown): valeur is Entree {
  if (typeof valeur !== 'object' || valeur === null) return false
  const e = valeur as Record<string, unknown>
  return (
    estFamille(e.m) &&
    estPalette(e.p) &&
    estDensite(e.d) &&
    typeof e.s === 'number' &&
    Number.isInteger(e.s) &&
    e.s > 0 &&
    e.s <= GRAINE_MAX &&
    (e.f === undefined || e.f === 1)
  )
}

/** L'égalité porte sur le motif, jamais sur l'épingle : c'est la même image. */
export function identique(a: Entree, b: Entree): boolean {
  return a.m === b.m && a.p === b.p && a.d === b.d && a.s === b.s
}

/** Les épinglées d'abord, dans leur ordre, puis les autres dans le leur. */
function ranger(liste: readonly Entree[]): Entree[] {
  return [...liste.filter((entree) => entree.f), ...liste.filter((entree) => !entree.f)]
}

export function epingles(liste: readonly Entree[]): number {
  return liste.filter((entree) => entree.f).length
}

/**
 * Épingle ou désépingle une entrée, et remet la liste dans son ordre.
 *
 * Rend la liste reçue telle quelle quand l'épingle est refusée, c'est-à-dire
 * quand les six sont prises : l'appelant y lit qu'il n'a rien à écrire, et
 * l'interface a déjà désactivé le bouton.
 */
export function basculer(liste: readonly Entree[], entree: Entree): readonly Entree[] {
  const cible = liste.find((autre) => identique(autre, entree))
  if (!cible) return liste
  if (!cible.f && epingles(liste) >= MAX_EPINGLES) return liste
  return ranger(
    liste.map((autre) => {
      if (!identique(autre, entree)) return autre
      if (!autre.f) return { ...autre, f: 1 as const }
      return { m: autre.m, p: autre.p, d: autre.d, s: autre.s }
    }),
  )
}

/**
 * Relit une liste depuis son texte. Fonction pure, pour qu'elle se teste sans
 * navigateur : c'est elle qui décide ce qui est recevable.
 */
export function analyser(brut: string | null): Entree[] {
  if (!brut) return []
  let valeur: unknown
  try {
    valeur = JSON.parse(brut)
  } catch {
    return []
  }
  if (!Array.isArray(valeur)) return []
  const propres: Entree[] = []
  let gardees = 0
  for (const entree of valeur) {
    if (!estEntree(entree)) continue
    if (propres.some((autre) => identique(autre, entree))) continue
    /* Un stockage se modifie à la main : au-delà de six épingles, les
       suivantes redeviennent des entrées ordinaires plutôt que de faire
       déborder la liste des motifs qui passent. */
    const epingle = entree.f === 1 && gardees < MAX_EPINGLES
    if (epingle) gardees += 1
    propres.push({
      m: entree.m, p: entree.p, d: entree.d, s: entree.s,
      ...(epingle ? { f: 1 as const } : {}),
    })
    if (propres.length === MAX) break
  }
  return ranger(propres)
}

/**
 * L'entrée passe en tête des non épinglées, sans doublon, et la queue tombe
 * au-delà de dix. Rend la liste reçue, telle quelle, quand il n'y a rien à
 * changer : l'appelant y lit qu'il n'a rien à écrire.
 *
 * En tête des non épinglées, et non en tête de tout : les épingles tiennent le
 * haut de la liste, et un motif traversé ne doit pas les pousser plus bas à
 * chaque fois. Une entrée déjà épinglée ne bouge pas non plus, elle est déjà
 * gardée.
 */
export function ajouter(liste: readonly Entree[], entree: Entree): readonly Entree[] {
  const connue = liste.find((autre) => identique(autre, entree))
  if (connue?.f) return liste
  const gardees = liste.filter((autre) => autre.f)
  if (liste[gardees.length] && identique(liste[gardees.length], entree)) return liste
  const libres = liste.filter((autre) => !autre.f && !identique(autre, entree))
  return [...gardees, entree, ...libres].slice(0, MAX)
}

export function lire(): Entree[] {
  try {
    return analyser(window.localStorage.getItem(CLE))
  } catch {
    /* stockage refusé : pas d'historique, et rien d'autre ne change */
    return []
  }
}

export function ecrire(liste: readonly Entree[]): void {
  try {
    window.localStorage.setItem(CLE, JSON.stringify(liste))
  } catch {
    /* quota plein ou stockage refusé : l'historique ne survivra pas à la
       fermeture de l'onglet, et c'est tout ce qu'on y perd */
  }
}

export function effacer(): void {
  try {
    window.localStorage.removeItem(CLE)
  } catch {
    /* rien à effacer si l'on n'a rien pu écrire */
  }
}
