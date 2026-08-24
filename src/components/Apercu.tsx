// SPDX-License-Identifier: AGPL-3.0-only

import { useEffect, useRef } from 'react'
import { dessiner, type Motif } from '../lib/moteur'
import type { Resolution } from '../lib/resolution'

/**
 * L'aperçu est le fichier.
 *
 * Le canevas est dessiné à la taille de sa boîte, en pixels d'appareil, mais la
 * mesure de lisibilité porte sur la résolution *visée* : le voile brûlé dans
 * l'aperçu est alors exactement celui du PNG téléchargé. Sans ça, on jugerait
 * une image qui n'existe pas.
 */
export function Apercu({
  motif,
  resolution,
  voile,
  sombre,
  largeur,
  hauteur,
  description,
  revision,
}: {
  motif: Motif
  resolution: Resolution
  /** Le voile est-il peint dans le fichier. L'aperçu suit, sans quoi il ment. */
  voile: boolean
  /** La version sombre est-elle demandée. Même règle : l'aperçu est le fichier. */
  sombre: boolean
  /** Taille rendue de la boîte, en pixels CSS. */
  largeur: number
  hauteur: number
  /** Le texte alternatif, ou null quand il n'y a rien à décrire. */
  description: string | null
  revision: number
}) {
  const canevas = useRef<HTMLCanvasElement>(null)
  const precedent = useRef<string | null>(null)

  useEffect(() => {
    const noeud = canevas.current
    if (!noeud || largeur <= 4 || hauteur <= 4) return
    if (!resolution.largeur || !resolution.hauteur) return

    /* Plafonné à 3 : au-delà, on encode quatre fois plus de pixels pour une
       différence que l'écran ne montre pas. */
    const densitePixels = Math.min(window.devicePixelRatio || 1, 3)
    const pw = Math.round(largeur * densitePixels)
    const ph = Math.round(hauteur * densitePixels)
    if (noeud.width !== pw || noeud.height !== ph) {
      noeud.width = pw
      noeud.height = ph
    }

    const ctx = noeud.getContext('2d', { alpha: false })
    if (!ctx) return
    dessiner(ctx, pw, ph, motif, {
      voile,
      sombre,
      mesureW: resolution.largeur,
      mesureH: resolution.hauteur,
    })
    noeud.dataset.peint = '1'

    /* Le fondu dit « le motif a changé ». Il n'a rien à dire quand seule la
       fenêtre a bougé : sur téléphone, le repli de la barre d'URL pendant le
       défilement faisait clignoter l'aperçu. */
    const signature =
      [motif.famille, motif.palette, motif.densite, motif.graine, voile, sombre].join('|')
    const change = precedent.current !== null && precedent.current !== signature
    precedent.current = signature
    if (change && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      noeud.style.transition = 'none'
      noeud.style.opacity = '0.35'
      requestAnimationFrame(() => {
        noeud.style.transition = 'opacity 260ms ease-out'
        noeud.style.opacity = '1'
      })
    }
  }, [motif, resolution.largeur, resolution.hauteur, voile, sombre, largeur, hauteur, revision])

  return (
    <canvas
      ref={canevas}
      id="apercu"
      className="appareil-canevas"
      role={description ? 'img' : undefined}
      aria-label={description ?? undefined}
      aria-describedby={description ? 'note-maquette' : undefined}
      aria-hidden={description ? undefined : true}
    />
  )
}
