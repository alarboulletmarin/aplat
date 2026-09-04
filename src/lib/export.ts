// SPDX-License-Identifier: AGPL-3.0-only

/**
 * L'export : dessiner hors écran, encoder, livrer le fichier.
 *
 * Séparé du moteur parce qu'il ne parle pas de la même chose. Le moteur répond
 * à « quelle image », ce module à « le navigateur a-t-il pu la produire ». Deux
 * échecs ne se voient qu'ici, et aucun n'est une erreur levée : un canevas trop
 * grand que le navigateur refuse silencieusement d'allouer, et un encodage qui
 * rend un blob vide. Les confondre avec le rendu reviendrait à faire porter au
 * moteur des limites qui ne sont pas les siennes.
 *
 * Il y a maintenant plusieurs sorties, et elles ne servent pas la même chose.
 * Le PNG à la résolution de l'écran est le fond d'écran. Le PNG doublé est la
 * même image pour un écran qu'on ne connaît pas encore. Le WebP est le même
 * fond d'écran, deux à trois fois plus léger, pour l'envoyer. Le SVG n'est plus
 * un fond d'écran mais un motif, qu'on reprend ailleurs. Le presse-papiers,
 * enfin, est le chemin le plus court vers une conversation.
 *
 * Ce qui ne change pas : toutes passent par le même moteur, à la même graine,
 * et l'aperçu reste le fichier.
 */
import { dessiner, type Ecran, type Motif } from './moteur'
import { rendreSVG } from './svg'

export type EchecExport = 'capacite' | 'generale' | 'formatRefuse' | 'presse' | 'svgDense'

export class ErreurExport extends Error {
  constructor(public readonly genre: EchecExport) {
    super(genre)
    this.name = 'ErreurExport'
  }
}

/** Les sorties proposées, dans l'ordre où le panneau les range. */
export type Format = 'png' | 'png2x' | 'webp' | 'svg'

export const TYPES: Record<Exclude<Format, 'svg'>, string> = {
  png: 'image/png',
  png2x: 'image/png',
  webp: 'image/webp',
}

/** Le facteur d'échelle propre à chaque sortie matricielle. */
export function facteur(format: Format): number {
  return format === 'png2x' ? 2 : 1
}

export function extension(format: Format): string {
  return format === 'webp' ? 'webp' : format === 'svg' ? 'svg' : 'png'
}

/**
 * Le nom du fichier porte tout ce qui a produit l'image : famille, palette,
 * graine, dimensions. Retrouver un motif six mois plus tard, c'est relire son
 * nom de fichier : il n'y a pas de bibliothèque, pas de compte, rien d'autre.
 * La densité y manquerait si l'instantané n'était pas pris au clic.
 *
 * Le voile retiré s'y écrit aussi : deux fichiers d'un même motif, l'un avec
 * son voile et l'autre sans, ne se distinguent pas à l'oeil dans une pellicule,
 * et le nom est le seul endroit qui puisse le dire. La version sombre, elle, se
 * distingue très bien à l'oeil, mais c'est le même motif et la même graine :
 * sans le mot dans le nom, les deux fichiers se rangeraient l'un sur l'autre.
 */
export function nomFichier(
  motif: Motif, largeur: number, hauteur: number,
  { format = 'png', voile = true, sombre = false }:
    { format?: Format; voile?: boolean; sombre?: boolean } = {},
): string {
  const version = sombre ? '-sombre' : ''
  const sansVoile = voile ? '' : '-sansvoile'
  return `aplat-${motif.famille}-${motif.palette}-${motif.graine}-${largeur}x${hauteur}${version}${sansVoile}.${extension(format)}`
}

/**
 * Vrai si le canevas est resté noir pur : le dessin n'a pas eu lieu.
 *
 * Certains navigateurs mobiles refusent silencieusement d'allouer un canevas
 * au-delà d'une surface donnée ; le dessin ne fait rien et le fichier produit
 * est un aplat noir, que rien d'autre ne distingue d'un export réussi. Aucune
 * palette livrée ne part du noir pur : cinq points suffisent à le voir, et on
 * le dit au lieu de livrer une image vide.
 *
 * Une palette composée à la main, elle, peut être en noir pur : c'est même
 * exactement ce qu'on compose pour un écran OLED. Quand les cinq points sont
 * noirs, on départage donc en écrivant un pixel blanc et en le relisant : un
 * canevas refusé n'enregistre pas l'écriture, une image légitimement noire
 * si. Le pixel sondé est remis dans son état exact avant de conclure.
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
    const avant = ctx.getImageData(0, 0, 1, 1).data
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, 1, 1)
    const apres = ctx.getImageData(0, 0, 1, 1).data
    ctx.fillStyle = `rgb(${avant[0]},${avant[1]},${avant[2]})`
    ctx.fillRect(0, 0, 1, 1)
    return !(apres[0] || apres[1] || apres[2])
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

/**
 * Le WebP n'est pas partout, et un navigateur qui ne le connaît pas ne le dit
 * pas : `toBlob` livre alors un PNG sous le nom demandé. Le contrôle se fait
 * donc avant, sur un canevas d'un pixel, et le format n'est proposé que s'il
 * est vraiment produit.
 */
let webpConnu: boolean | null = null

export function webpDisponible(): boolean {
  if (webpConnu !== null) return webpConnu
  try {
    const sonde = document.createElement('canvas')
    sonde.width = 1
    sonde.height = 1
    webpConnu = sonde.toDataURL('image/webp').startsWith('data:image/webp')
  } catch {
    webpConnu = false
  }
  return webpConnu
}

export interface Travail {
  motif: Motif
  largeur: number
  hauteur: number
  /** Le voile de lisibilité est-il brûlé dans le fichier. */
  voile: boolean
  /** La version sombre : le motif assombri, dans le fichier lui-même. */
  sombre: boolean
  /**
   * L'écran sur lequel la lisibilité a été jugée. Il change la bande que la
   * sonde mesure, donc le voile qu'elle dose, donc le fichier : il traverse
   * l'export au même titre que la version.
   */
  ecran: Ecran
  format: Format
}

/**
 * Dessine hors écran et encode. Lève une `ErreurExport` sinon.
 *
 * Les dimensions données sont celles du fichier, facteur compris : c'est
 * l'appelant qui décide qu'un PNG doublé fait deux fois la largeur, parce que
 * c'est lui qui doit vérifier que le résultat tient sous le plafond.
 */
export function encoderImage(travail: Travail): Promise<Blob> {
  const { motif, largeur, hauteur, voile, sombre, ecran, format } = travail
  return new Promise((resoudre, rejeter) => {
    if (format === 'webp' && !webpDisponible()) {
      rejeter(new ErreurExport('formatRefuse'))
      return
    }
    let canevas: HTMLCanvasElement | null = null
    try {
      canevas = document.createElement('canvas')
      canevas.width = largeur
      canevas.height = hauteur
      const ctx = canevas.getContext('2d', { alpha: false })
      if (!ctx) throw new Error('pas de contexte 2d')
      dessiner(ctx, largeur, hauteur, motif, { voile, sombre, ecran })

      if (canevasNoir(ctx, largeur, hauteur)) {
        relacher(canevas)
        rejeter(new ErreurExport('capacite'))
        return
      }

      canevas.toBlob(
        (blob) => {
          const fini = canevas
          relacher(fini)
          if (!blob || blob.size < 128) rejeter(new ErreurExport('generale'))
          else resoudre(blob)
        },
        TYPES[format === 'svg' ? 'png' : format],
      )
    } catch {
      relacher(canevas)
      rejeter(new ErreurExport('generale'))
    }
  })
}

/**
 * Le motif en vectoriel. Lève `svgDense` quand la famille compte trop de formes
 * pour que le fichier ait encore un sens.
 */
export function encoderSVG(travail: Travail): Blob {
  const { motif, largeur, hauteur, voile, sombre, ecran } = travail
  const rendu = rendreSVG(motif, largeur, hauteur, voile, sombre, ecran)
  if (!rendu.elements) throw new ErreurExport('generale')
  return new Blob([rendu.texte], { type: 'image/svg+xml;charset=utf-8' })
}

/**
 * Le fichier prêt pour la feuille de partage native, ou null si elle ne le
 * prendra pas. La tâche du produit finit dans la pellicule, et le
 * téléchargement seul s'arrête un geste avant sur téléphone : la feuille de
 * partage, elle, met « Enregistrer l'image » à un appui. Le jugement se rend
 * sur le fichier réel, au moment du succès : `navigator.canShare` refuse ce
 * que la feuille refuserait.
 */
export function fichierPartageable(blob: Blob, nom: string): File | null {
  try {
    const fichier = new File([blob], nom, { type: blob.type })
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [fichier] })
      ? fichier
      : null
  } catch {
    return null
  }
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

/**
 * L'image dans le presse-papiers.
 *
 * Le PNG est le seul type que les presse-papiers acceptent partout ; un WebP y
 * est refusé par la plupart. La conversion n'a donc pas à être offerte : on
 * copie du PNG, et on le dit.
 *
 * Le `ClipboardItem` reçoit la promesse plutôt que le blob là où c'est possible.
 * Safari exige que l'appel parte du geste de la personne, et attendre le blob
 * avant de le construire faisait perdre ce geste, donc la permission.
 */
export function copierImage(blob: Blob | Promise<Blob>): Promise<void> {
  const presse = navigator.clipboard
  const Item = window.ClipboardItem
  if (!presse?.write || typeof Item !== 'function') {
    return Promise.reject(new ErreurExport('presse'))
  }
  try {
    const item = new Item({ 'image/png': blob })
    return presse.write([item]).catch(() => {
      throw new ErreurExport('presse')
    })
  } catch {
    return Promise.reject(new ErreurExport('presse'))
  }
}
