// SPDX-License-Identifier: AGPL-3.0-only

/**
 * La panoplie : ce qu'on enfile pour partir, posé à plat.
 *
 * Un parcours dit où on est allé ; une panoplie dit ce qu'on portait. Ce sont
 * des objets, un par case, reconnaissables un par un, et ils vont donc chez les
 * figures avec les vases et les poissons plutôt qu'avec les trajets.
 *
 * Le geste est celui du carreau, et la discipline aussi : une grille de cases
 * calée sur le coin de l'image, et une clé tirée une seule fois à la
 * construction, que chaque case interroge par ses coordonnées entières. Aucun
 * tirage dans la boucle des cases, dont le compte dépend du format : sans cette
 * règle, une image plus haute d'une rangée redistribuerait tous les maillots de
 * la première ligne, et la sonde de lisibilité mesurerait une autre image que
 * celle qu'on exporte.
 *
 * Ce qui les distingue du carreau, c'est que la case ne porte pas un signe mais
 * un objet, et qu'un objet a un haut et un bas. Les cases sont donc décalées
 * d'une demi-largeur une rangée sur deux, comme un appareillage de briques, et
 * chaque objet penche d'un angle tiré de ses coordonnées : une grille droite
 * d'objets identiques se lit comme un damier, une grille décalée d'objets
 * penchés se lit comme un mur d'affiches.
 *
 * Les creux sont de vrais creux. Le trou d'épingle d'un dossard et l'encolure
 * d'un maillot entrent dans le même chemin que la forme qui les porte, et la
 * règle paire et impaire les évide : le fond de la palette s'y voit, plutôt
 * qu'une teinte devinée qui trahirait dès qu'on change de palette.
 */
import type { Alea, Densite, Pinceau } from './moteur'
import {
  duClairAuSombre, ecrire, hacher, luminanceHex, melangeHex, polygone,
  tracerCercle, tracerPolygone, type Point,
} from './trace'

export const IDS_PANOPLIES = ['maillots', 'dossards', 'bonnets'] as const

export type IdPanoplie = (typeof IDS_PANOPLIES)[number]

export function estPanoplie(valeur: unknown): valeur is IdPanoplie {
  return IDS_PANOPLIES.includes(valeur as IdPanoplie)
}

/* ---------- la grille -------------------------------------------------------- */

/** Une case, et tout ce que l'objet qu'elle porte a besoin de savoir. */
interface Place {
  x: number
  y: number
  cote: number
  c: number
  r: number
}

/**
 * Le parcours des cases, une rangée sur deux décalée d'une demi-largeur.
 *
 * La grille déborde du cadre d'une case dans les quatre directions. C'est ce qui
 * fait qu'un objet est coupé par le bord plutôt qu'arrêté avant lui : un fond
 * d'écran n'a pas de marge, et une rangée qui s'arrêterait proprement au ras du
 * cadre se lirait comme une planche encadrée.
 */
function cases(W: number, H: number, cote: number, cle: number): Place[] {
  const places: Place[] = []
  const colonnes = Math.ceil(W / cote) + 3
  const rangees = Math.ceil(H / cote) + 2
  for (let r = -1; r < rangees - 1; r += 1) {
    /* L'appareillage en briques, et un jeu par rangée tiré de la graine. Le
       demi-pas fait l'essentiel : des rangées alignées donnent des colonnes
       verticales, et l'oeil suit les colonnes au lieu de voir les objets. Le
       jeu empêche le demi-pas de devenir à son tour une régularité, sans
       défaire l'appareillage. Il n'y a pas de réglage pour lui : les quatre
       réglages du produit sont fixés, et ce qui varie sans eux varie par la
       graine. */
    const decale = (r % 2 === 0 ? 0 : cote / 2) + (hacher(r, 313, cle) - 0.5) * cote * 0.34
    for (let c = -1; c < colonnes - 1; c += 1) {
      places.push({ x: c * cote + decale, y: r * cote, cote, c, r })
    }
  }
  return places
}

/** Les teintes d'une panoplie : le papier, l'encre, et le jeu des couleurs. */
function teintes(C: readonly string[], rnd: Alea) {
  const ordre = duClairAuSombre(C)
  const papier = melangeHex(ordre[0], '#FFFFFF', 0.34)
  const encre = ordre[ordre.length - 1]
  /* Le décalage tiré de la graine fait tourner l'attribution des couleurs sans
     toucher à la palette : deux graines donnent deux pelotons, pas deux
     palettes. */
  return { papier, encre, decalage: Math.floor(rnd() * C.length) }
}

/* ---------- les maillots ----------------------------------------------------- */

/**
 * Le maillot, en coordonnées de case : deux manches, un buste, une encolure.
 *
 * Le contour est écrit à la main, sommet par sommet, et c'est le seul moyen : un
 * maillot n'est ni un rectangle arrondi ni une capsule, et ce qui le fait
 * reconnaître tient à trois détails, l'écart des manches, la chute des épaules,
 * et le fait que le bas soit plus large que le haut. Les valeurs sont données
 * pour une case de côté 1, centrée sur son milieu.
 */
const MAILLOT: readonly Point[] = [
  [-0.20, -0.34], [-0.39, -0.24], [-0.33, -0.02], [-0.22, -0.07],
  [-0.24, 0.36], [0.24, 0.36], [0.22, -0.07], [0.33, -0.02],
  [0.39, -0.24], [0.20, -0.34],
]

/** L'encolure, évidée dans le maillot : un demi-disque au creux des épaules. */
const COL_RAYON = 0.105
const COL_Y = -0.335

/**
 * Les maillots : une grille de couleurs qu'on a portées.
 *
 * Cinq décors, et pas un de plus : uni, à pois, à bande, à bretelles, à chevron.
 * Ce sont ceux que le cyclisme a rendus lisibles de loin, et c'est exactement le
 * critère, puisqu'un maillot d'un centimètre de haut sur un écran de téléphone
 * ne se lit pas autrement. Un décor plus fin redeviendrait une texture, et la
 * grille cesserait d'être une grille d'objets.
 *
 * Le décor se pose dans le buste seul, jamais sur les manches : il tient donc
 * dans un rectangle entièrement contenu dans le contour, et rien n'a besoin
 * d'être détouré. C'est le même arrangement que celui des lieux avec leur
 * champ : on choisit une géométrie qui rend la découpe inutile plutôt que de
 * demander au pinceau ce qu'il ne sait pas faire.
 */
function maillots(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const t = teintes(C, rnd)
  const cle = clef(rnd)
  const cote = unite / [2.6, 3.6, 5][densite]

  for (const place of cases(W, H, cote, cle)) {
    const cx = place.x + cote / 2
    const cy = place.y + cote / 2
    const tirage = hacher(place.c, place.r, cle)
    const fond = C[(t.decalage + Math.floor(tirage * C.length)) % C.length]
    const decor = Math.floor(hacher(place.c, place.r + 7919, cle) * 5)
    const contraste = Math.abs(luminanceHex(fond) - luminanceHex(t.encre)) > 0.16
      ? t.encre
      : t.papier

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate((hacher(place.c + 31, place.r, cle) - 0.5) * 0.34)

    /* Le maillot et son encolure, dans le même chemin : le fond de la palette
       se voit au creux du col, comme il se voit entre les pâtés d'une ville. */
    ctx.fillStyle = fond
    ctx.beginPath()
    tracerPolygone(ctx, MAILLOT.map(([x, y]) => [x * cote, y * cote] as Point))
    tracerCercle(ctx, 0, COL_Y * cote, COL_RAYON * cote)
    ctx.fill('evenodd')

    ctx.fillStyle = contraste
    const buste = { x: -0.2 * cote, y: -0.06 * cote, l: 0.4 * cote, h: 0.4 * cote }
    if (decor === 1) {
      for (let i = 0; i < 6; i += 1) {
        const px = buste.x + buste.l * (0.22 + 0.56 * (i % 2))
        const py = buste.y + buste.h * (0.16 + 0.3 * Math.floor(i / 2))
        ctx.beginPath()
        tracerCercle(ctx, px, py, cote * 0.043)
        ctx.fill()
      }
    } else if (decor === 2) {
      /* La bande va d'une couture à l'autre, et suit donc l'évasement du
         buste plutôt que de déborder sur les manches : un rectangle droit
         dépasserait du maillot par le bas, ou s'arrêterait avant la couture
         par le haut, et les deux se voient. */
      const bord = (y: number) => 0.22 + ((y / cote + 0.07) / 0.43) * 0.02
      const haut = buste.y + buste.h * 0.3
      const bas = haut + buste.h * 0.26
      polygone(ctx, [
        [-bord(haut) * cote, haut], [bord(haut) * cote, haut],
        [bord(bas) * cote, bas], [-bord(bas) * cote, bas],
      ])
      ctx.fill()
    } else if (decor === 3) {
      for (const sens of [-1, 1]) {
        ctx.fillRect(sens * 0.13 * cote - 0.035 * cote, buste.y, 0.07 * cote, buste.h)
      }
    } else if (decor === 4) {
      polygone(ctx, [
        [buste.x, buste.y + buste.h * 0.16],
        [0, buste.y + buste.h * 0.52],
        [buste.x + buste.l, buste.y + buste.h * 0.16],
        [buste.x + buste.l, buste.y + buste.h * 0.42],
        [0, buste.y + buste.h * 0.78],
        [buste.x, buste.y + buste.h * 0.42],
      ])
      ctx.fill()
    }

    ctx.restore()
  }
}

/* ---------- les dossards ----------------------------------------------------- */

/**
 * Les dossards : du papier, un nombre, et quatre trous d'épingle.
 *
 * Le nombre est ce qui fait l'objet. Un rectangle blanc percé aux quatre coins
 * est un bout de papier ; le même avec trois chiffres dessus est un dossard, et
 * on sait aussitôt de quoi il s'agit. C'est pour lui que la fonte du moteur a
 * quitté la mesure : elle était la seule table du catalogue capable d'écrire, et
 * un instrument n'est plus le seul à en avoir besoin.
 *
 * Les numéros ne sont pas tirés au hasard dans mille : ils partent d'une centaine
 * commune à toute l'image et ne varient qu'à l'unité près, comme les dossards
 * d'une même course, qui sortent tous de la même boîte. Un désordre complet se
 * lirait comme du bruit numérique ; une série se lit comme une course.
 */
function dossards(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const t = teintes(C, rnd)
  const cle = clef(rnd)
  const cote = unite / [2.4, 3.4, 4.8][densite]
  const centaine = 1 + Math.floor(rnd() * 8)

  const largeur = cote * 0.68
  const hauteur = cote * 0.56
  const trou = cote * 0.026
  const module = hauteur / 11

  for (const place of cases(W, H, cote, cle)) {
    const cx = place.x + cote / 2
    const cy = place.y + cote / 2
    const bande = C[(t.decalage + Math.floor(hacher(place.c, place.r, cle) * C.length)) % C.length]
    const numero = String(
      centaine * 100 + Math.floor(hacher(place.c + 613, place.r, cle) * 100),
    )

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate((hacher(place.c, place.r + 5077, cle) - 0.5) * 0.42)

    /* Le papier et ses quatre trous, dans le même chemin : ce qui se voit au
       travers est le fond de la palette, comme sur un vrai dossard épinglé. */
    ctx.fillStyle = t.papier
    ctx.beginPath()
    tracerPolygone(ctx, [
      [-largeur / 2, -hauteur / 2], [largeur / 2, -hauteur / 2],
      [largeur / 2, hauteur / 2], [-largeur / 2, hauteur / 2],
    ])
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        tracerCercle(ctx, (sx * largeur) / 2.42, (sy * hauteur) / 2.6, trou)
      }
    }
    ctx.fill('evenodd')

    /* La bande de couleur du bas, celle qui porte le nom de la course. */
    ctx.fillStyle = bande
    ctx.fillRect(-largeur / 2, hauteur / 2 - hauteur * 0.19, largeur, hauteur * 0.19)

    ctx.fillStyle = t.encre
    ecrire(ctx, numero, 0, -hauteur * 0.26, module, 'centre')

    ctx.restore()
  }
}

/* ---------- les bonnets ------------------------------------------------------ */

/**
 * Les bonnets : un nageur de face, bonnet et lunettes.
 *
 * Le maillot et le dossard sont des objets posés à plat ; celui-ci est le seul
 * de la panoplie qui soit porté, et c'est ce qui le sauve. Un bonnet de bain
 * seul est un dôme, c'est-à-dire un bol, un champignon ou une colline selon
 * l'humeur de qui regarde. Avec les lunettes, il n'y a plus d'hésitation : deux
 * verres et une sangle font une tête, et la tête fait le nageur.
 *
 * La sangle sort du cadre du visage des deux côtés, jusqu'au bord du bonnet.
 * C'est ce détail qui fait qu'on voit une tête de trois quarts arrière plutôt
 * qu'un masque posé sur un cercle : une sangle qui s'arrêterait aux verres
 * laisserait les lunettes flotter.
 *
 * Les verres sont plus clairs que la monture, comme du verre teinté sur du
 * silicone. Deux aplats de la même teinte les auraient réduits à deux trous.
 */
const BONNET_RX = 0.33
const BONNET_RY = 0.36

/** Le contour du bonnet : la calotte, puis un bord bas légèrement bombé. */
function calotte(cote: number): Point[] {
  const rx = BONNET_RX * cote
  const ry = BONNET_RY * cote
  const cy = 0.08 * cote
  const points: Point[] = []
  const facettes = 26
  for (let i = 0; i <= facettes; i += 1) {
    const a = Math.PI + (Math.PI * i) / facettes
    points.push([Math.cos(a) * rx, cy + Math.sin(a) * ry])
  }
  for (let i = 1; i < 10; i += 1) {
    const t = i / 10
    points.push([rx - 2 * rx * t, cy + Math.sin(Math.PI * t) * ry * 0.14])
  }
  return points
}

function bonnets(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const t = teintes(C, rnd)
  const cle = clef(rnd)
  const cote = unite / [2.5, 3.4, 4.7][densite]
  const contour = calotte(cote)

  for (const place of cases(W, H, cote, cle)) {
    const cx = place.x + cote / 2
    const cy = place.y + cote / 2
    const tirage = hacher(place.c, place.r, cle)
    const fond = C[(t.decalage + Math.floor(tirage * C.length)) % C.length]
    const decor = Math.floor(hacher(place.c, place.r + 6151, cle) * 4)
    const contraste = Math.abs(luminanceHex(fond) - luminanceHex(t.encre)) > 0.16
      ? t.encre
      : t.papier

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate((hacher(place.c + 43, place.r, cle) - 0.5) * 0.26)

    ctx.fillStyle = fond
    polygone(ctx, contour)
    ctx.fill()

    /* Le décor du bonnet, contenu dans la calotte : une bande, deux pastilles,
       un chevron, ou rien. Comme pour le maillot, la géométrie est choisie
       pour que rien n'ait besoin d'être détouré. */
    ctx.fillStyle = contraste
    if (decor === 1) {
      ctx.fillRect(-0.3 * cote, -0.2 * cote, 0.6 * cote, 0.07 * cote)
    } else if (decor === 2) {
      for (const sens of [-1, 1]) {
        ctx.beginPath()
        tracerCercle(ctx, sens * 0.15 * cote, -0.17 * cote, 0.05 * cote)
        ctx.fill()
      }
    } else if (decor === 3) {
      polygone(ctx, [
        [-0.26 * cote, -0.13 * cote], [0, -0.26 * cote], [0.26 * cote, -0.13 * cote],
        [0.26 * cote, -0.05 * cote], [0, -0.18 * cote], [-0.26 * cote, -0.05 * cote],
      ])
      ctx.fill()
    }

    /* Les lunettes : la sangle d'un bord à l'autre, la monture, puis les
       verres, plus clairs qu'elle. */
    const oeil = 0.145 * cote
    const y = 0.01 * cote
    /* La sangle s'arrête juste avant le bord du bonnet. Débordante, elle se
       lit comme une planche posée en travers de la tête, et non comme une
       sangle qui passe derrière. */
    ctx.fillStyle = t.encre
    ctx.fillRect(-0.3 * cote, y - 0.022 * cote, 0.6 * cote, 0.044 * cote)
    for (const sens of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(sens * oeil, y, 0.115 * cote, 0.088 * cote, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    /* Le verre est clair et la monture sombre : à teintes égales, les deux
       verres deviennent deux trous. Le mélange part du papier, jamais de
       l'encre, sans quoi il vire au kaki sur les palettes chaudes. */
    ctx.fillStyle = melangeHex(t.papier, t.encre, 0.18)
    for (const sens of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(sens * oeil, y, 0.079 * cote, 0.055 * cote, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }
}

/* ---------- outils communs --------------------------------------------------- */

/** La clé de la scène : le seul tirage dont dépendent tous les hachages. */
function clef(rnd: Alea): number {
  return Math.floor(rnd() * 0x7fffffff)
}

/* ---------- aiguillage ------------------------------------------------------- */

export function peindrePanoplie(
  ctx: Pinceau, W: number, H: number, id: IdPanoplie,
  C: readonly string[], densite: Densite, rnd: Alea, unite: number,
): void {
  if (id === 'maillots') maillots(ctx, W, H, C, densite, rnd, unite)
  else if (id === 'dossards') dossards(ctx, W, H, C, densite, rnd, unite)
  else bonnets(ctx, W, H, C, densite, rnd, unite)
}
