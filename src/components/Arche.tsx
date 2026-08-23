// SPDX-License-Identifier: AGPL-3.0-only

/**
 * L'arche des titres : DESIGN_SYSTEM.md, section 5 (le vocabulaire décoratif).
 *
 * La forme de la marque, en petit, devant chaque titre de section. Elle est
 * dessinée en CSS à partir de deux aplats, comme tous les pictogrammes de la
 * page : ni jeu d'icônes, ni emoji.
 *
 * Elle habille et repère, elle ne porte aucune information : le titre reste
 * entier sans elle, et c'est pour ça qu'elle est `aria-hidden`.
 */
export function Arche() {
  return (
    <span className="ico-arche" aria-hidden="true">
      <i />
      <b />
    </span>
  )
}
