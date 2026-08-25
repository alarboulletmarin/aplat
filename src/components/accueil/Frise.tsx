// SPDX-License-Identifier: AGPL-3.0-only

import { useState } from 'react'

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
 *
 * Toucher une arche la fait plonger et rebondir, et l'onde gagne ses voisines
 * en s'amortissant : une corde pincée, rien de plus. C'est un jeu pour le
 * doigt qui explore, jamais un chemin : aucun réglage ne bouge, rien n'est
 * annoncé, et qui ne le trouve pas n'a rien manqué. La frise reste donc hors
 * du parcours clavier, comme tout décor, et l'onde se tait avec
 * `prefers-reduced-motion`.
 */

const HAUTEURS = ['100%', '62%', '86%', '50%', '74%']
const COULEURS = [
  'var(--encre)', 'var(--encre)', 'var(--lime)', 'var(--encre)',
  'var(--deco-1)', 'var(--encre)', 'var(--deco-2)',
]

/* Trente : au-delà de la largeur maximale de la page, les dernières sont
   rognées, ce que la frise assume. En dessous, elles s'écartent. */
const COMPTE = 30

/* L'onde meurt à la neuvième arche : au-delà, le retard seul ferait croire à
   une seconde vague partie de nulle part. */
const PORTEE = 9

export function Frise({ decalage = 0 }: { decalage?: number }) {
  /* Le compteur de coups entre dans la clé des arches : chaque toucher les
     remonte, et l'animation repart de zéro même quand on pince deux fois la
     même corde. Trente éléments vides, le remontage ne coûte rien. */
  const [onde, setOnde] = useState<{ origine: number; coup: number } | null>(null)

  const toucher = (evenement: React.PointerEvent<HTMLDivElement>) => {
    const origine = Array.prototype.indexOf.call(
      evenement.currentTarget.children,
      evenement.target as HTMLElement,
    )
    if (origine < 0) return
    setOnde((precedent) => ({ origine, coup: (precedent?.coup ?? 0) + 1 }))
  }

  return (
    <div
      className={onde ? 'frise frise-onde' : 'frise'}
      aria-hidden="true"
      onPointerDown={toucher}
    >
      {[...Array(COMPTE).keys()].map((index) => {
        const distance = onde ? Math.abs(index - onde.origine) : PORTEE
        const touche = distance < PORTEE
        return (
          <i
            key={onde ? `${onde.coup}-${index}` : index}
            style={{
              height: HAUTEURS[(index + decalage) % HAUTEURS.length],
              background: COULEURS[(index + decalage) % COULEURS.length],
              ...(touche
                ? {
                    '--onde-delai': `${distance * 45}ms`,
                    '--onde-creux': String(1 - 0.55 * (1 - distance / PORTEE)),
                  }
                : {}),
            } as React.CSSProperties}
          />
        )
      })}
    </div>
  )
}
