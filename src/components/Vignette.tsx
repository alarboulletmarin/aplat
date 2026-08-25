// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect, useRef } from 'react'
import { dessiner, type Densite, type IdFamille, type IdPalette } from '../lib/moteur'
import { useVisible } from '../hooks/useVisible'

/**
 * L'aperçu d'une famille, dans sa puce.
 *
 * Seules les vignettes réellement à l'écran sont dessinées : sur un téléphone
 * il y en a six ou sept, pas quarante et une, et chacune est un rendu complet du
 * moteur. Celles qui reviennent dans le champ sont dessinées à ce moment-là.
 */
export function Vignette({
  famille,
  palette,
  densite,
  graine,
  revision,
}: {
  famille: IdFamille
  palette: IdPalette
  densite: Densite
  graine: number
  revision: number
}) {
  const canevas = useRef<HTMLCanvasElement>(null)
  const visible = useVisible(canevas)

  useEffect(() => {
    const noeud = canevas.current
    if (!noeud || !visible) return
    const boite = noeud.getBoundingClientRect()
    if (boite.width < 4) return

    /* Au moins 1,5 : sous cette valeur les courbes des vignettes crénelaient,
       au-dessus de 2 on paie des pixels que la puce ne montre pas. */
    const densitePixels = Math.max(1.5, Math.min(window.devicePixelRatio || 1, 2))
    const l = Math.round(boite.width * densitePixels)
    const h = Math.round(boite.height * densitePixels)
    if (noeud.width !== l || noeud.height !== h) {
      noeud.width = l
      noeud.height = h
    }
    const ctx = noeud.getContext('2d', { alpha: false })
    if (!ctx) return
    dessiner(ctx, l, h, { famille, palette, densite, graine })
    noeud.dataset.peint = '1'
  }, [visible, famille, palette, densite, graine, revision])

  return <canvas ref={canevas} aria-hidden="true" data-vignette={famille} />
}
