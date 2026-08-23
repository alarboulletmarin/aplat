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

/** Les clés sont celles de l'URL, courtes et déjà éprouvées. */
export interface Entree {
  m: IdFamille
  p: IdPalette
  d: Densite
  s: number
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
    e.s <= GRAINE_MAX
  )
}

export function identique(a: Entree, b: Entree): boolean {
  return a.m === b.m && a.p === b.p && a.d === b.d && a.s === b.s
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
  for (const entree of valeur) {
    if (!estEntree(entree)) continue
    if (propres.some((autre) => identique(autre, entree))) continue
    propres.push({ m: entree.m, p: entree.p, d: entree.d, s: entree.s })
    if (propres.length === MAX) break
  }
  return propres
}

/**
 * L'entrée passe en tête, sans doublon, et la queue tombe au-delà de dix.
 * Rend la liste reçue, telle quelle, quand elle est déjà en tête : l'appelant
 * y lit qu'il n'a rien à écrire.
 */
export function ajouter(liste: readonly Entree[], entree: Entree): readonly Entree[] {
  if (liste.length > 0 && identique(liste[0], entree)) return liste
  return [entree, ...liste.filter((autre) => !identique(autre, entree))].slice(0, MAX)
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
