// SPDX-License-Identifier: AGPL-3.0-only

import { dessiner, type Motif } from './moteur'

export type EchecExport = 'capacite' | 'generale'

export class ErreurExport extends Error {
  constructor(public readonly genre: EchecExport) {
    super(genre)
    this.name = 'ErreurExport'
  }
}

/**
 * Le nom du fichier porte tout ce qui a produit l'image : famille, palette,
 * graine, dimensions. Retrouver un motif six mois plus tard, c'est relire son
 * nom de fichier — il n'y a pas de bibliothèque, pas de compte, rien d'autre.
 * La densité y manquerait si l'instantané n'était pas pris au clic.
 */
export function nomFichier(motif: Motif, largeur: number, hauteur: number): string {
  return `aplat-${motif.famille}-${motif.palette}-${motif.graine}-${largeur}x${hauteur}.png`
}

/**
 * Vrai si le canevas est resté noir pur : le dessin n'a pas eu lieu.
 *
 * Certains navigateurs mobiles refusent silencieusement d'allouer un canevas
 * au-delà d'une surface donnée — le dessin ne fait rien et le fichier produit
 * est un aplat noir, que rien d'autre ne distingue d'un export réussi. Aucune
 * palette ne part du noir pur : cinq points suffisent à le voir, et on le dit
 * au lieu de livrer une image vide.
 */
export function canevasNoir(ctx: CanvasRenderingContext2D, l: number, h: number): boolean {
  const points: [number, number][] = [
    [1, 1], [l - 2, 1], [l >> 1, h >> 1], [1, h - 2], [l - 2, h - 2],
  ]
  try {
    for (const [x, y] of points) {
      const d = ctx.getImageData(x, y, 1, 1).data
      if (d[0] || d[1] || d[2]) return false
    }
    return true
  } catch {
    return false /* pas de lecture possible : on ne conclut pas */
  }
}

/** Libère la mémoire du canevas hors écran : un 4K pèse une trentaine de Mo. */
function relacher(canevas: HTMLCanvasElement | null) {
  if (canevas) {
    canevas.width = 1
    canevas.height = 1
  }
}

/** Dessine hors écran et encode le PNG. Lève une `ErreurExport` sinon. */
export function encoderPNG(motif: Motif, largeur: number, hauteur: number): Promise<Blob> {
  return new Promise((resoudre, rejeter) => {
    let canevas: HTMLCanvasElement | null = null
    try {
      canevas = document.createElement('canvas')
      canevas.width = largeur
      canevas.height = hauteur
      const ctx = canevas.getContext('2d', { alpha: false })
      if (!ctx) throw new Error('pas de contexte 2d')
      dessiner(ctx, largeur, hauteur, motif)

      if (canevasNoir(ctx, largeur, hauteur)) {
        relacher(canevas)
        rejeter(new ErreurExport('capacite'))
        return
      }

      canevas.toBlob((blob) => {
        const fini = canevas
        relacher(fini)
        if (!blob || blob.size < 128) rejeter(new ErreurExport('generale'))
        else resoudre(blob)
      }, 'image/png')
    } catch {
      relacher(canevas)
      rejeter(new ErreurExport('generale'))
    }
  })
}

/** Déclenche le téléchargement d'un blob sous le nom donné. */
export function telecharger(blob: Blob, nom: string): void {
  const url = URL.createObjectURL(blob)
  const lien = document.createElement('a')
  lien.href = url
  lien.rel = 'noopener'
  lien.download = nom
  document.body.appendChild(lien)
  lien.click()
  lien.remove()
  setTimeout(() => URL.revokeObjectURL(url), 6000)
}
