// SPDX-License-Identifier: AGPL-3.0-only

/**
 * La version et le commit du build, posés par Vite (voir `vite.config.ts`).
 *
 * L'AGPL demande que la source *correspondante* soit désignable : un lien vers
 * la branche principale ne l'est pas, le commit exact l'est. Un build fait
 * depuis une archive n'a pas de dépôt git — le commit est alors vide et seule
 * la version s'affiche.
 */
export const VERSION: string = __APP_VERSION__
export const COMMIT: string = __APP_COMMIT__

const DEPOT = 'https://github.com/alarboulletmarin/aplat'

export function lienSource(): string {
  return COMMIT ? `${DEPOT}/tree/${COMMIT}` : DEPOT
}

export function etiquetteVersion(): string {
  return COMMIT ? `v${VERSION} · ${COMMIT}` : `v${VERSION}`
}
