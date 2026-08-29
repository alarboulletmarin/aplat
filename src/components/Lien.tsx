// SPDX-License-Identifier: AGPL-3.0-only

import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { route } from '../lib/route'
import { precharger } from '../pages'

/**
 * Le passage d'un document à l'autre.
 *
 * Les trois pages ont longtemps été reliées par des ancres nues, et chaque
 * clic était un chargement de document : le navigateur jetait la page,
 * relisait `index.html`, remontait React à zéro, puis allait chercher le
 * morceau de la page visée. Deux attentes en file, et entre les deux un écran
 * qui n'a plus rien à montrer. C'est ce battement que ce composant supprime :
 * le document reste, React remplace la page, la feuille de style et les deux
 * polices sont déjà là.
 *
 * Le survol et la prise de focus demandent le morceau d'avance
 * (`pages.ts`). Un lien qu'on regarde est un lien qu'on va cliquer, et le
 * pari coûte une requête que le service worker sert le plus souvent depuis le
 * précache. Le doigt n'a pas de survol : `onTouchStart` lui donne les quelques
 * dizaines de millisecondes qui séparent l'appui du relâchement.
 *
 * Il ne sert qu'aux trois adresses du site. Ce qui sort d'Aplat (le dépôt, la
 * licence, les notices) reste une ancre : ce sont d'autres documents, pour de
 * bon.
 */
export function Lien({
  vers,
  className,
  children,
}: {
  /** Le chemin visé, tel que le donnent `lienApp()`, `lienMoteur()`, `lienAccueil()`. */
  vers: string
  className?: string
  children: ReactNode
}) {
  /* `vers` peut porter une requête (`/app?m=vagues&s=7314`), que `route()` ne
     sait pas lire : elle attend un chemin seul. L'origine courante ne sert
     qu'à rendre l'adresse analysable, elle ne voyage pas dans le lien. */
  const amorcer = () => {
    try {
      precharger(route(new URL(vers, window.location.origin).pathname))
    } catch {
      /* adresse illisible : le clic la chargera, ou pas, comme avant */
    }
  }

  return (
    <Link
      className={className}
      to={vers}
      onMouseEnter={amorcer}
      onFocus={amorcer}
      onTouchStart={amorcer}
    >
      {children}
    </Link>
  )
}
