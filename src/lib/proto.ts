// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Le banc d'essai des sorties : deux variantes d'interface derrière un
 * paramètre d'adresse, à retirer avec la décision.
 *
 * `/app?proto=feuille` remplace le dépli des sorties par une feuille basse
 * modale ; `/app?proto=studio` y met toute la configuration d'export ;
 * `/app?proto=trio` va au bout de cette idée : plus de bouton Télécharger,
 * la barre n'a que trois boutons et la feuille est l'unique porte de sortie.
 * Le PNG courant y passe de un geste à deux, c'est le prix à mesurer. Toute
 * autre valeur, ou aucune, laisse l'application strictement telle quelle.
 *
 * Le paramètre est lu une fois au montage, comme le chemin dans `route.ts` :
 * changer de variante est un chargement, pas une transition. Il est maintenu
 * dans l'adresse pendant la session (App.tsx le réinjecte à chaque écriture
 * d'URL) mais jamais dans le lien copié : un prototype ne se partage pas.
 *
 * Voir prototypes/README.md pour la question posée et la grille de jugement.
 */

export type Proto = 'feuille' | 'studio' | 'trio' | null

/** La variante demandée par l'adresse, validée contre la liste blanche. */
export function lireProto(recherche: string): Proto {
  try {
    const valeur = new URLSearchParams(recherche).get('proto')
    return valeur === 'feuille' || valeur === 'studio' || valeur === 'trio'
      ? valeur
      : null
  } catch {
    return null
  }
}
