// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Le système de la personne, pour une seule chose : lui dire par quel chemin
 * une image téléchargée devient son fond d'écran.
 *
 * Le chemin n'est pas le même d'un système à l'autre, et c'est le dernier
 * mètre de la tâche : l'image est dans le dossier des téléchargements, le fond
 * d'écran n'a pas changé. Une phrase générique (« ouvre le fichier ») ne
 * dispense personne de chercher.
 *
 * Lecture de l'agent utilisateur, donc approximative, et c'est assumé : elle ne
 * choisit qu'une phrase d'aide, jamais un comportement. Un iPad récent se
 * présente comme un Mac ; l'écran tactile le trahit. Tout ce qui n'est pas
 * reconnu retombe sur la phrase de l'ordinateur.
 */
export type Plateforme = 'ios' | 'android' | 'autre'

export function plateforme(
  navigateur: Pick<Navigator, 'userAgent' | 'maxTouchPoints'> | undefined =
    typeof navigator === 'undefined' ? undefined : navigator,
): Plateforme {
  if (!navigateur) return 'autre'
  const agent = navigateur.userAgent ?? ''
  if (/iPhone|iPad|iPod/i.test(agent)) return 'ios'
  if (/Android/i.test(agent)) return 'android'
  if (/Macintosh/i.test(agent) && (navigateur.maxTouchPoints ?? 0) > 1) return 'ios'
  return 'autre'
}
