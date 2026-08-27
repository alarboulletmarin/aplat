// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

/**
 * La feuille basse modale du banc d'essai (`lib/proto.ts`). Le produit n'a
 * aucune modale, et c'est une règle : ce composant existe pour éprouver cette
 * règle sur pièce, pas pour la contourner. Il n'est monté que sous
 * `?proto=feuille` ou `?proto=studio`, et disparaît avec la décision.
 *
 * L'anatomie est celle que la proposition défend : un voile qui grise
 * l'arrière-plan pour séparer les plans, une poignée, un glissement vers le
 * bas qui renvoie la feuille. Le glissement suit le doigt, c'est de la
 * manipulation directe et non une animation ; la glissade d'entrée, elle, est
 * une transition CSS que `base.css` neutralise déjà sous
 * `prefers-reduced-motion`.
 *
 * Une modale se doit entière : `role="dialog"`, focus posé dessus à
 * l'ouverture, Tab qui boucle dedans, `inert` sur le reste du document,
 * Échap, tap sur le voile, et le focus rendu au déclencheur en sortant.
 * Autant de chemins de sortie que d'entrées.
 */
export function FeuilleModale({
  id,
  titreId,
  titre,
  ouverte,
  grande = false,
  onFermer,
  retourFocus,
  children,
}: {
  id: string
  titreId: string
  titre: string
  ouverte: boolean
  /** Le studio est plus haut que la liste des sorties. */
  grande?: boolean
  onFermer: () => void
  /** Le déclencheur, qui reprend le focus à la fermeture. */
  retourFocus: RefObject<HTMLElement | null>
  children: ReactNode
}) {
  const cadre = useRef<HTMLDivElement>(null)

  /* Le seuil du renvoi : assez pour qu'un défilement hésitant ne ferme rien,
     assez court pour que le geste voulu n'ait pas à traverser l'écran. */
  const SEUIL_RENVOI = 80
  const glisse = useRef<{ depart: number; pointeur: number } | null>(null)

  useEffect(() => {
    if (!ouverte) return
    /* `inert` sur la racine : la feuille est portée hors de `#root`, le reste
       du document cesse d'exister pour le focus comme pour le lecteur
       d'écran. Le défilement de la page est retenu le temps de l'ouverture. */
    const racine = document.getElementById('root')
    racine?.setAttribute('inert', '')
    const debordement = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cadre.current?.focus({ preventScroll: true })
    const declencheur = retourFocus.current
    return () => {
      racine?.removeAttribute('inert')
      document.body.style.overflow = debordement
      declencheur?.focus()
    }
  }, [ouverte, retourFocus])

  if (!ouverte) return null

  const surTouche = (evenement: React.KeyboardEvent<HTMLDivElement>) => {
    if (evenement.key === 'Escape') {
      onFermer()
      return
    }
    if (evenement.key !== 'Tab') return
    /* Tab boucle dans la feuille. Les focusables se relisent à chaque appui :
       le studio montre et cache ses champs de saisie. */
    const focusables = Array.from(
      cadre.current?.querySelectorAll<HTMLElement>('button, select, input') ?? [],
    ).filter((noeud) => !noeud.hidden && noeud.offsetParent !== null)
    if (!focusables.length) return
    const premier = focusables[0]
    const dernier = focusables[focusables.length - 1]
    if (evenement.shiftKey && (document.activeElement === premier || document.activeElement === cadre.current)) {
      evenement.preventDefault()
      dernier.focus()
    } else if (!evenement.shiftKey && document.activeElement === dernier) {
      evenement.preventDefault()
      premier.focus()
    }
  }

  const prendre = (evenement: React.PointerEvent<HTMLDivElement>) => {
    glisse.current = { depart: evenement.clientY, pointeur: evenement.pointerId }
    cadre.current?.classList.add('feuille-modale-saisie')
    evenement.currentTarget.setPointerCapture(evenement.pointerId)
  }
  const suivre = (evenement: React.PointerEvent<HTMLDivElement>) => {
    if (!glisse.current || evenement.pointerId !== glisse.current.pointeur) return
    const descente = Math.max(0, evenement.clientY - glisse.current.depart)
    if (cadre.current) cadre.current.style.transform = `translateY(${descente}px)`
  }
  const relacher = (evenement: React.PointerEvent<HTMLDivElement>, abandonne: boolean) => {
    if (!glisse.current || evenement.pointerId !== glisse.current.pointeur) return
    const descente = evenement.clientY - glisse.current.depart
    glisse.current = null
    cadre.current?.classList.remove('feuille-modale-saisie')
    if (cadre.current) cadre.current.style.transform = ''
    if (!abandonne && descente > SEUIL_RENVOI) onFermer()
  }

  return createPortal(
    <>
      {/* Le voile est un bouton : le tap qui ferme est un geste nommé, pas un
          clic dans le vide. Il reste hors du parcours de tabulation, la
          feuille a déjà Échap et sa poignée. */}
      <button
        type="button"
        className="feuille-scrim"
        aria-label={titre}
        tabIndex={-1}
        onClick={onFermer}
      />
      <div
        id={id}
        ref={cadre}
        className={grande ? 'feuille-modale feuille-modale-grande' : 'feuille-modale'}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titreId}
        tabIndex={-1}
        onKeyDown={surTouche}
      >
        <div
          className="feuille-poignee"
          onPointerDown={prendre}
          onPointerMove={suivre}
          onPointerUp={(evenement) => relacher(evenement, false)}
          onPointerCancel={(evenement) => relacher(evenement, true)}
        >
          <i aria-hidden="true" />
        </div>
        <h2 className="feuille-titre" id={titreId}>
          {titre}
        </h2>
        <div className="feuille-modale-corps">{children}</div>
      </div>
    </>,
    document.body,
  )
}
