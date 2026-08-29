// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router'

/**
 * Ce qu'un chargement de document faisait tout seul, et qu'il faut refaire à
 * la main dès qu'on remplace la page sans changer de document.
 *
 * Trois choses, que le navigateur offrait et qu'il n'offre plus :
 *
 * - **le haut de la page.** Arriver sur la présentation au milieu de la
 *   galerie parce qu'on y était sur la page précédente n'a aucun sens. Le
 *   déplacement est immédiat, jamais filé : une page qui défile toute seule
 *   sur une longueur qu'on n'a pas demandée est exactement l'animation que le
 *   projet refuse, et `prefers-reduced-motion` n'aurait rien à corriger
 *   puisqu'il n'y a rien à voir.
 * - **le focus.** Il reste sinon sur le lien cliqué, c'est à dire dans une
 *   page qui n'existe plus, et la tabulation suivante repart d'un endroit
 *   arbitraire. Il est posé sur le `<main>` de la page arrivée, qui porte
 *   `tabIndex={-1}` pour l'accepter.
 * - **l'annonce.** Un changement de document est annoncé par le navigateur ;
 *   un changement de page à l'intérieur du même document ne l'est par
 *   personne. Le titre de la page arrivée est donc porté à la région
 *   d'`index.html`, après que la page l'a posé.
 *
 * Le retour arrière fait exception pour le défilement : le navigateur rend
 * lui-même la position qu'on avait quittée, et la lui reprendre serait perdre
 * ce qu'il vient de faire correctement.
 *
 * Rien ne se déclenche tant que le chemin ne change pas. L'adresse de
 * l'application change à chaque réglage, elle, et le contenu ne bouge pas d'un
 * pouce : la remettre en haut et lui voler son focus à chaque tirage serait
 * insupportable.
 */

/**
 * Le dernier chemin traité, gardé hors de React.
 *
 * Ce composant vit dans la même frontière de suspension que les pages, ce qui
 * est la seule façon d'avoir la certitude que ses effets tournent une fois la
 * page arrivée montée, donc une fois son titre posé. Le prix est qu'il est
 * démonté avec elles quand la frontière montre son repli, et une mémoire tenue
 * par `useRef` repartirait alors du chemin d'arrivée, c'est à dire qu'elle ne
 * verrait aucun changement et ne ferait rien. Celle-ci est une propriété du
 * document, pas de l'arbre : elle survit.
 */
let dernier = window.location.pathname

export function Arrivee() {
  const { pathname } = useLocation()
  const type = useNavigationType()

  useEffect(() => {
    /* Le premier rendu n'est pas une arrivée : personne n'a navigué, et voler
       le focus au chargement ferait sauter la page avant qu'on ait lu la
       première ligne. */
    if (pathname === dernier) return
    dernier = pathname

    if (type !== 'POP') window.scrollTo(0, 0)

    /* `preventScroll` : le focus est posé après le défilement, et un
       navigateur qui ramènerait le `<main>` dans le champ défilerait une
       seconde fois, à l'envers de ce qu'on vient de faire. */
    document.querySelector('main')?.focus({ preventScroll: true })

    /* Le titre a déjà été posé par la page arrivée : son effet a tourné avant
       celui-ci, parce qu'elle est rendue avant dans l'arbre.

       Il est porté par un noeud neuf, et non écrit dans la région : la
       présentation et l'application ont le même titre de document, à dessein,
       et une région dont le texte ne bouge pas n'annonce rien. C'est l'ajout
       qui s'annonce, et un ajout a toujours lieu. */
    const region = document.getElementById('annonce')
    if (region) {
      const mot = document.createElement('span')
      mot.textContent = document.title
      region.replaceChildren(mot)
    }
  }, [pathname, type])

  return null
}
