// SPDX-License-Identifier: AGPL-3.0-only

import { useRef, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'

/**
 * Un groupe à choix unique et exclusif : ce sont des boutons radio, pas des
 * bascules. Un seul arrêt de tabulation par groupe, les flèches déplacent le
 * choix — comme des radios natives. Le parcours clavier de la page passe ainsi
 * d'une quarantaine d'arrêts à une dizaine, ce qui compte d'autant plus qu'il
 * y a deux barres collantes.
 */
export function GroupeRadio({
  etiquettes,
  className,
  children,
}: {
  /** Les `id` des titres qui nomment le groupe, séparés par une espace. */
  etiquettes: string
  className?: string
  children: ReactNode
}) {
  const cadre = useRef<HTMLDivElement>(null)

  const surTouche = (evenement: KeyboardEvent<HTMLDivElement>) => {
    const touche = evenement.key
    const deplacements = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End']
    if (!deplacements.includes(touche)) return
    const groupe = cadre.current
    if (!groupe) return

    const options = Array.from(groupe.querySelectorAll<HTMLButtonElement>('.opt'))
    const courant = options.indexOf(document.activeElement as HTMLButtonElement)
    if (courant < 0) return
    evenement.preventDefault()

    const suivant =
      touche === 'Home'
        ? 0
        : touche === 'End'
          ? options.length - 1
          : touche === 'ArrowRight' || touche === 'ArrowDown'
            ? (courant + 1) % options.length
            : (courant - 1 + options.length) % options.length

    options[suivant].focus()
    options[suivant].click()
  }

  return (
    <div
      ref={cadre}
      role="radiogroup"
      aria-labelledby={etiquettes}
      className={className}
      onKeyDown={surTouche}
    >
      {children}
    </div>
  )
}

/**
 * Une puce du groupe. `porteEntree` donne l'arrêt de tabulation au premier
 * élément d'un groupe où rien n'est choisi : les familles sont réparties en
 * deux groupes, celui qui ne contient pas la sélection garderait sinon une
 * porte d'entrée fermée au clavier.
 */
export function OptionRadio({
  choisi,
  porteEntree = false,
  onChoisir,
  className,
  titre,
  children,
  ...reste
}: {
  choisi: boolean
  porteEntree?: boolean
  onChoisir: () => void
  className: string
  titre?: string
  children: ReactNode
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'role' | 'tabIndex' | 'aria-checked' | 'className' | 'title' | 'onClick' | 'children'
>) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={choisi}
      tabIndex={choisi || porteEntree ? 0 : -1}
      className={className}
      title={titre}
      onClick={onChoisir}
      {...reste}
    >
      {children}
    </button>
  )
}
