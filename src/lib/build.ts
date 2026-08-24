// SPDX-License-Identifier: AGPL-3.0-only

/**
 * La version et le commit du build, posés par Vite (voir `vite.config.ts`).
 *
 * L'AGPL demande que la source *correspondante* soit désignable : un lien vers
 * la branche principale ne l'est pas, le commit exact l'est. Un build fait
 * depuis une archive n'a pas de dépôt git ; le commit est alors vide et seule
 * la version s'affiche.
 */
export const VERSION: string = __APP_VERSION__
export const COMMIT: string = __APP_COMMIT__

const DEPOT = 'https://github.com/alarboulletmarin/aplat'

/**
 * Le lien de soutien, écrit une fois.
 *
 * Il vit ici, à côté du dépôt, parce que c'est la même chose : deux adresses
 * qui sortent du site et que le pied de page désigne. Rien n'est chargé depuis
 * Ko-fi ; seule l'adresse est connue.
 */
const SOUTIEN = 'https://ko-fi.com/T6T01WC5ZC'

export function lienSoutien(): string {
  return SOUTIEN
}

/**
 * Les deux fonctions prennent un objet plutôt que des positions : sans ça,
 * l'une commencerait par le commit et l'autre par la version, deux chaînes que
 * rien ne distingue au typage. Un appel écrit par analogie avec l'autre
 * produirait « v<commit> » sans que rien ne le signale. L'interface les appelle
 * toujours sans argument ; les paramètres n'existent que pour que les tests
 * atteignent la branche du build sans dépôt git.
 */
export function lienSource({ commit = COMMIT }: { commit?: string } = {}): string {
  return commit ? `${DEPOT}/tree/${commit}` : DEPOT
}

export function etiquetteVersion(
  { version = VERSION, commit = COMMIT }: { version?: string; commit?: string } = {},
): string {
  return commit ? `v${version} (${commit})` : `v${version}`
}
