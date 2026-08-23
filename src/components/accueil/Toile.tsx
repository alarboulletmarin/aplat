// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect, useRef } from 'react'
import { dessiner, dessinerSansVoile, type Motif } from '../../lib/moteur'
import type { Resolution } from '../../lib/resolution'
import { useTaille } from '../../hooks/useTaille'
import { useVisible } from '../../hooks/useVisible'

/**
 * Un motif, peint par le moteur du produit.
 *
 * La page d'accueil ne montre pas d'images : elle montre le générateur en
 * train de tourner. Rien n'est chargé, rien n'est préparé à l'avance, et une
 * capture d'écran ne pourrait pas mentir ici puisqu'il n'y en a aucune.
 *
 * Deux précautions, parce qu'une page de présentation en aligne une quinzaine
 * là où l'application n'en tient qu'une : on ne peint que ce qui approche du
 * champ de vision, et la taille du canevas suit sa boîte au lieu d'être
 * relevée une fois pour toutes.
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
  const visible = useVisible(canevas)
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

    /* Plafonné à 2 : la page en aligne une quinzaine, et le troisième pixel
       par point coûte deux fois plus de rendu pour une différence que ces
       tailles ne montrent pas. Plancher à 1,5 : en dessous, les courbes des
       vignettes crénellent. */
    const densitePixels = Math.max(1.5, Math.min(window.devicePixelRatio || 1, 2))
    const l = Math.round(largeur * densitePixels)
    const h = Math.round(hauteur * densitePixels)
    if (noeud.width !== l || noeud.height !== h) {
      noeud.width = l
      noeud.height = h
    }

    const ctx = noeud.getContext('2d', { alpha: false })
    if (!ctx) return
    const peindre = voile ? dessiner : dessinerSansVoile
    peindre(ctx, l, h, { famille, palette, densite, graine }, mesureL, mesureH)
    noeud.dataset.peint = '1'
  }, [visible, largeur, hauteur, voile, famille, palette, densite, graine, mesureL, mesureH])

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
