// SPDX-License-Identifier: AGPL-3.0-only

/**
 * La résolution : ce que l'appareil déclare, ce que l'utilisateur peut saisir,
 * et les bornes de ce qu'un navigateur sait produire.
 */

export const RES_MIN = 16
export const RES_MAX = 8000

/** Au-delà, aucun navigateur n'alloue le canevas : autant le dire avant. */
export const MPX_MAX = 40e6

export type TypeAppareil = 'telephone' | 'tablette' | 'ordinateur'

export interface Resolution {
  largeur: number
  hauteur: number
}

/** Une résolution invalide vaut zéro : l'interface passe alors en état vide. */
export function depuisSaisie(largeurSaisie: string, hauteurSaisie: string): Resolution {
  const l = Number.parseInt(largeurSaisie, 10)
  const h = Number.parseInt(hauteurSaisie, 10)
  return {
    largeur: l >= RES_MIN ? Math.min(l, RES_MAX) : 0,
    hauteur: h >= RES_MIN ? Math.min(h, RES_MAX) : 0,
  }
}

/** Vrai quand la saisie existe mais tombe hors des bornes : c'est une erreur. */
export function horsBornes(saisie: string): boolean {
  if (!saisie) return false
  const n = Number.parseInt(saisie, 10)
  return Number.isNaN(n) || n < RES_MIN || n > RES_MAX
}

/**
 * Borné vers le haut dès la frappe : sinon le champ affichait 9999, la carte
 * Résolution 8 000, l'URL r=8000 et le fichier 8000 px — quatre vérités pour
 * une seule valeur. La borne basse, elle, ne peut pas être appliquée à la
 * frappe : on passe par « 1 » pour écrire « 1179 ». Elle est signalée.
 */
export function chiffres(saisie: string): string {
  let d = saisie.replace(/[^0-9]/g, '').slice(0, 4)
  if (d && Number.parseInt(d, 10) > RES_MAX) d = String(RES_MAX)
  return d
}

/**
 * En portrait on classe sur le rapport d'aspect, pas sur le petit côté en
 * pixels : un seuil de 1200 px classait un iPhone 15 Pro Max (1290 × 2796)
 * comme une tablette — largeur de scène, nombre de colonnes de la maquette et
 * libellé « Tablette · détecté » tous faux, alors que la densité de la grille
 * est précisément ce que la maquette sert à juger. Un téléphone est plus étroit
 * que 0,62 ; une tablette tourne autour de 0,75.
 */
export function typeAppareil(largeur: number, hauteur: number): TypeAppareil {
  if (!largeur || !hauteur) return 'telephone'
  if (largeur > hauteur) return Math.min(largeur, hauteur) >= 800 ? 'ordinateur' : 'tablette'
  return largeur / hauteur < 0.62 ? 'telephone' : 'tablette'
}

/**
 * La résolution physique de l'écran. C'est une mesure de l'appareil, pas un
 * réglage : elle ne part jamais dans un lien partagé.
 */
export function detecter(): Resolution {
  const dpr = window.devicePixelRatio || 1
  const brutL = window.screen?.width || 390
  const brutH = window.screen?.height || 844
  let largeur = Math.max(320, Math.round(brutL * dpr))
  let hauteur = Math.max(320, Math.round(brutH * dpr))
  /* Sur un appareil tactile, screen.width/height suivent l'orientation sur
     Android mais pas sur iOS. On propose toujours le portrait : c'est ce qu'on
     met en fond d'écran, et le format reste modifiable à la main. */
  const tactile = window.matchMedia?.('(pointer: coarse)').matches ?? false
  if (tactile && largeur > hauteur) {
    const echange = largeur
    largeur = hauteur
    hauteur = echange
  }
  return { largeur, hauteur }
}
