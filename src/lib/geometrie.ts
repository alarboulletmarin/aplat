// SPDX-License-Identifier: AGPL-3.0-only

/**
 * La géométrie de la maquette d'écran.
 *
 * À part de `resolution.ts`, qui ne connaît que des pixels de fichier. Ici on
 * calcule des pixels d'affichage : la boîte de l'appareil, son rayon, le module
 * dont dépendent toutes les tailles de la maquette. Ce sont des fonctions pures
 * pour qu'elles se testent sans navigateur, alors même qu'elles décrivent une
 * mise en page.
 */
import type { Resolution, TypeAppareil } from './resolution'

export interface Boite {
  largeur: number
  hauteur: number
}

export interface Geometrie {
  largeur: number
  hauteur: number
  rayon: number
  /** Le module de la maquette : un centième du petit côté. */
  module: number
  colonnes: number
}

/** Doit rester égale à la bordure de `.appareil` dans `ecrans.css`. */
export const BORDURE_APPAREIL = 4

/**
 * La hauteur au-delà de laquelle une fenêtre couchée n'est plus « courte » :
 * la même valeur que le `max-height` de la règle `@media (orientation:
 * landscape)` d'`ecrans.css`. Les deux doivent basculer ensemble, sinon la
 * scène est calculée pour une barre d'action que la feuille de style n'a pas
 * encore réduite.
 */
export const PAYSAGE_COURT = 560

/**
 * Ce que la scène doit laisser sous elle en paysage court : la barre d'action
 * compacte, l'encoche de l'appareil, le verdict de lisibilité et les marges de
 * la scène. Une hauteur, pas une fraction : à 390 px de haut, 62 % de l'écran
 * ne laissent pas de quoi poser une barre de 56 px.
 *
 * Elle est passée de 168 à 212 le jour où la barre a gagné sa ligne du voile :
 * une ligne de plus sous le bouton, c'est une ligne de moins pour la scène, et
 * les deux valeurs bougent ensemble ou pas du tout. `tools/reach.mjs` le tient
 * fermé en vérifiant que le verdict reste entier au-dessus de la barre.
 */
const RESERVE_PAYSAGE = 212

/**
 * Ce que l'en-tête collant prend au-dessus d'elle, en paysage court : la scène
 * ne se colle pas au bord de la fenêtre mais sous lui (`top: var(--bar)` dans
 * `ecrans.css`). La valeur est celle que dessine la variante compacte de
 * `@media (orientation: landscape)` : huit pixels de rembourrage, une marque de
 * trente pixels et ses sept pixels sous elle, un filet de dix et son seuil de
 * trois. Elle bascule avec cette règle, ou pas du tout.
 */
const ENTETE_PAYSAGE = 58

/** Vrai quand la fenêtre est couchée et trop basse pour la mise en page pleine. */
export function paysageCourt(fenetre: Boite): boolean {
  return fenetre.largeur > fenetre.hauteur && fenetre.hauteur <= PAYSAGE_COURT
}

/**
 * La hauteur réservée à la scène. Elle prend une part de l'écran, jamais tout :
 * les réglages doivent rester atteignables sans que l'aperçu disparaisse.
 *
 * En paysage court, la part cesse d'être une fraction pour devenir un reste.
 * L'aperçu y était rogné par la barre d'action : un plancher de 300 px sur une
 * fenêtre de 390 px de haut ne laisse rien au verdict ni à la barre, et le bas
 * du téléphone, dock compris, passait dessous. On le redimensionne plutôt que
 * de le laisser couper.
 */
export function hauteurScene(fenetre: Boite): number {
  const h = fenetre.hauteur || 800
  if (paysageCourt(fenetre)) {
    /* Le plancher a suivi la réserve, et pour la même raison : à 390 px de haut
       il n'y a plus 150 px à donner à l'aperçu sans que le verdict passe sous
       la barre, et un aperçu coupé ne sert à rien du tout. */
    return Math.round(Math.max(118, Math.min(420, h - RESERVE_PAYSAGE - ENTETE_PAYSAGE)))
  }
  const etroit = fenetre.largeur < 760
  return Math.round(
    etroit
      ? Math.max(214, Math.min(348, h * 0.4))
      : Math.max(300, Math.min(600, h * 0.62)),
  )
}

/**
 * La hauteur de l'aperçu une fois replié en vignette, au défilement.
 *
 * Sur téléphone en portrait, la scène collante, le verdict et la barre
 * d'action occupaient ensemble les deux tiers de l'écran : il ne restait
 * presque rien pour choisir parmi trente-huit familles et onze palettes. Replié,
 * l'aperçu garde de quoi juger la silhouette du motif, et rend le reste aux
 * grilles.
 *
 * La part est descendue de 22 à 18 % le jour où la barre a gagné sa ligne du
 * voile : la place se reprend là où elle sert le moins, et une vignette de
 * silhouette la supporte mieux qu'une grille de familles. Sous 360 px, c'est le
 * seul endroit où il restait quelque chose à reprendre : la barre, le verdict
 * replié et les cibles de 44 px y sont tous au minimum.
 */
export function hauteurVignette(fenetre: Boite): number {
  const h = fenetre.hauteur || 800
  return Math.round(Math.max(98, Math.min(156, h * 0.18)))
}

/**
 * La boîte de l'appareil, au rapport d'aspect exact du fichier visé.
 *
 * Le canevas est en `inset: 0` : il remplit la boîte de contenu, pas la boîte
 * de bordure. C'est donc celle-ci qui doit porter le rapport d'aspect ; sinon
 * l'aperçu est un format légèrement différent de celui du fichier, et la mesure
 * de lisibilité porte sur une image qui n'existe pas.
 */
export function geometrieAppareil(
  boite: Boite,
  resolution: Resolution,
  type: TypeAppareil,
): Geometrie | null {
  if (!resolution.largeur || !resolution.hauteur) return null

  const plafond = type === 'telephone' ? 300 : type === 'tablette' ? 430 : 660
  /* Le plancher est bas, et il le doit : en deux colonnes sur un téléphone, la
     colonne de l'aperçu fait cent trente pixels. Un plancher de 160 px y
     dessinerait un appareil plus large que sa colonne, qui déborderait de la
     page. Il ne sert qu'à écarter les largeurs absurdes ; la boîte non encore
     mesurée est déjà traitée par le `|| 300`. */
  const maxL = Math.max(80, Math.min(boite.largeur || 300, plafond))
  const maxH = Math.max(200, boite.hauteur || 420)
  const bord = 2 * BORDURE_APPAREIL
  const interneL = Math.max(40, maxL - bord)
  const interneH = Math.max(40, maxH - bord)

  let l = interneL
  let h = (l * resolution.hauteur) / resolution.largeur
  if (h > interneH) {
    h = interneH
    l = (h * resolution.largeur) / resolution.hauteur
  }

  const largeur = Math.round(l) + bord
  const hauteur = Math.round(h) + bord
  const petitCote = Math.min(largeur, hauteur)

  return {
    largeur,
    hauteur,
    rayon: Math.round(
      petitCote * (type === 'telephone' ? 0.13 : type === 'tablette' ? 0.055 : 0.024),
    ),
    module: petitCote / 100,
    colonnes: type === 'telephone' ? 4 : 6,
  }
}

/**
 * Les couleurs de libellé de la maquette, déduites de la mesure. Elles ne sont
 * pas décoratives : ce sont celles qu'un vrai système poserait sur ce fond, et
 * c'est ce qui rend l'aperçu concluant.
 */
export function jetonsLibelle(libelles: 'clair' | 'sombre'): Record<string, string> {
  const base = libelles === 'clair' ? '247,243,230' : '23,36,63'
  const jetons: Record<string, string> = {
    '--libelle': libelles === 'clair' ? '#F7F3E6' : '#17243F',
    '--libelle-inv': libelles === 'clair' ? '#17243F' : '#F7F3E6',
  }
  for (const opacite of [14, 15, 16, 20, 24, 26, 28, 90]) {
    jetons[`--l${opacite}`] = `rgba(${base},${opacite / 100})`
  }
  return jetons
}
