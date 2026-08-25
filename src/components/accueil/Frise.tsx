// SPDX-License-Identifier: AGPL-3.0-only

/**
 * La frise d'arches : DESIGN_SYSTEM.md, section 5 (le vocabulaire décoratif).
 *
 * La silhouette d'un motif du générateur, arrêtée sur un seuil. Elle sépare
 * les sections de la présentation et souligne l'en-tête de l'application :
 * ni l'une ni l'autre n'a de trait de séparation ou de cadre, elles ont des
 * arches, les mêmes partout.
 *
 * Cinq hauteurs et sept couleurs, deux cycles premiers entre eux : le motif ne
 * se répète qu'au bout de trente-cinq arches, donc jamais dans une frise. Le
 * décalage donne à chacune sa propre entrée en matière.
 *
 * Elle n'informe de rien, et c'est pour ça qu'elle est `aria-hidden`.
 */

const HAUTEURS = ['100%', '62%', '86%', '50%', '74%']
const COULEURS = [
  'var(--encre)', 'var(--encre)', 'var(--lime)', 'var(--encre)',
  'var(--deco-1)', 'var(--encre)', 'var(--deco-2)',
]

/* Trente : au-delà de la largeur maximale de la page, les dernières sont
   rognées, ce que la frise assume. En dessous, elles s'écartent. */
const COMPTE = 30

export function Frise({ decalage = 0 }: { decalage?: number }) {
  return (
    <div className="frise" aria-hidden="true">
      {[...Array(COMPTE).keys()].map((index) => (
        <i
          key={index}
          style={{
            height: HAUTEURS[(index + decalage) % HAUTEURS.length],
            background: COULEURS[(index + decalage) % COULEURS.length],
          }}
        />
      ))}
    </div>
  )
}
