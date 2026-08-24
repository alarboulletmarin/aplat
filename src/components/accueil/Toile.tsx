// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect, useRef } from 'react'
import { dessiner, dessinerSansVoile, type Motif } from '../../lib/moteur'
import type { Resolution } from '../../lib/resolution'
import { useTaille } from '../../hooks/useTaille'
import { useVisible } from '../../hooks/useVisible'
import { useEconomie } from '../../hooks/useEconomie'

/**
 * Un motif, peint par le moteur du produit.
 *
 * La page d'accueil ne montre pas d'images : elle montre le générateur en
 * train de tourner. Rien n'est chargé, rien n'est préparé à l'avance, et une
 * capture d'écran ne pourrait pas mentir ici puisqu'il n'y en a aucune.
 *
 * Trois précautions, parce qu'une page de présentation en aligne une quinzaine
 * là où l'application n'en tient qu'une.
 *
 * *On ne peint que ce qui approche du champ de vision.* Une seule toile est
 * visible à l'ouverture sur téléphone ; les autres attendent d'être atteintes.
 *
 * *On peint quand le fil principal est libre.* Sans ça, les toiles d'une même
 * section deviennent visibles ensemble et se peignent l'une derrière l'autre
 * dans la même image, ce qui fait exactement le pic que le défilement
 * différé cherchait à éviter. `requestIdleCallback` les étale, avec un délai
 * de garde pour qu'aucune ne reste blanche.
 *
 * *On compte les pixels.* La taille du canevas suit sa boîte au lieu d'être
 * relevée une fois pour toutes, et le nombre de pixels par point descend à un
 * dès que l'appareil demande à économiser.
 *
 * `resolution` : le format visé quand il diffère de la boîte. La sonde de
 * lisibilité mesure alors le format réellement exporté, comme dans
 * l'application, et le voile montré est celui du fichier.
 */
export function Toile({
  motif,
  resolution,
  voile = true,
  className,
  description,
}: {
  motif: Motif
  resolution?: Resolution
  /** Faux pour la démonstration du voile, qui montre justement son absence. */
  voile?: boolean
  className?: string
  /** Le texte alternatif, ou rien quand une légende voisine dit déjà tout. */
  description?: string
}) {
  const canevas = useRef<HTMLCanvasElement>(null)
  const economie = useEconomie()
  const visible = useVisible(canevas, economie ? '0px' : '200px 0px')
  const { largeur, hauteur } = useTaille(canevas)

  /* Les quatre réglages sont sortis de l'objet qui les porte : la galerie
     fabrique le sien à chaque rendu, et dépendre de son identité redessinerait
     les douze vignettes à chaque graine relancée. */
  const { famille, palette, densite, graine } = motif
  const mesureL = resolution?.largeur ?? 0
  const mesureH = resolution?.hauteur ?? 0

  useEffect(() => {
    const noeud = canevas.current
    if (!noeud || !visible || largeur < 4 || hauteur < 4) return

    const peindre = () => {
      /* Plafonné à 2 : la page en aligne une quinzaine, et le troisième pixel
         par point coûte deux fois plus de rendu pour une différence que ces
         tailles ne montrent pas. Plancher à 1,5 : en dessous, les courbes des
         vignettes crénellent. En économie, un pixel par point, et le crénelage
         est le prix demandé. */
      const densitePixels = economie
        ? 1
        : Math.max(1.5, Math.min(window.devicePixelRatio || 1, 2))
      const l = Math.round(largeur * densitePixels)
      const h = Math.round(hauteur * densitePixels)
      if (noeud.width !== l || noeud.height !== h) {
        noeud.width = l
        noeud.height = h
      }

      const ctx = noeud.getContext('2d', { alpha: false })
      if (!ctx) return
      const trace = voile ? dessiner : dessinerSansVoile
      trace(ctx, l, h, { famille, palette, densite, graine }, mesureL, mesureH)
      noeud.dataset.peint = '1'
    }

    /* Le délai de garde compte : sans lui, un onglet en arrière-plan n'est
       jamais « inactif » et la toile resterait blanche au retour. */
    const inactif = window.requestIdleCallback
    if (typeof inactif !== 'function') {
      const differe = window.setTimeout(peindre, 0)
      return () => window.clearTimeout(differe)
    }
    const jeton = inactif(peindre, { timeout: 500 })
    return () => window.cancelIdleCallback?.(jeton)
  }, [
    visible, largeur, hauteur, voile, economie,
    famille, palette, densite, graine, mesureL, mesureH,
  ])

  return (
    <canvas
      ref={canevas}
      className={className}
      role={description ? 'img' : undefined}
      aria-label={description}
      aria-hidden={description ? undefined : true}
    />
  )
}
