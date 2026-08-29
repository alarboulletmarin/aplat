// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Le carreau : une grille, et un alphabet de signes qui la remplit.
 *
 * Les gestes du catalogue posent des formes libres sur un aplat, brisent une
 * surface ou creusent une réserve. Celui-ci fait autre chose, et c'est le
 * geste de l'affiche géométrique : le plan est découpé en cases carrées, et
 * chaque case reçoit un signe pris dans un jeu fini, quart de disque,
 * demi-disque, triangle, amande, sautoir, bandes. Rien n'est dessiné qui ne
 * tienne dans une case, et c'est justement de ce serrage que naît le rythme :
 * deux quarts de disque voisins font un demi, quatre font un rond, et l'oeil
 * lit une composition là où la règle n'a fait que remplir des cases.
 *
 * Quatre familles s'y partagent l'alphabet, et ce qui les sépare n'est pas le
 * jeu de signes mais la façon d'occuper la grille. Bauhaus laisse respirer :
 * des cases vides, des aplats francs, une case sur cinq regroupée par quatre
 * pour porter un signe deux fois plus grand. Carreaux ne laisse rien passer,
 * chaque case a son fond, et le motif se lit en camaïeu. Demi-lunes n'emploie
 * que la moitié du jeu, les rondeurs, et en tire des arches. Jetons revient à
 * deux tons, un papier et une encre, et sème sur son damier des pièces
 * frappées, anneaux, rouages, hexagones.
 *
 * Couloirs sort de la grille carrée et garde tout le reste : ce sont des
 * flotteurs enfilés le long de câbles, une maille qui revient et que l'oeil
 * suit du doigt, ce qui est exactement le critère du groupe. Ses rangées se
 * décalent l'une sur l'autre, comme celles de la panoplie.
 *
 * Le tirage ne se fait jamais dans la boucle des cases, dont le compte dépend
 * du format : la graine sert à fabriquer une clé, et chaque case interroge
 * cette clé par ses propres coordonnées. C'est la discipline des lieux et de
 * la réserve, et ici elle est indispensable : sans elle, une image plus haute
 * d'une rangée redistribuerait tous les signes de la première ligne.
 */
import type { Alea, Densite, Pinceau } from './moteur'
import {
  duClairAuSombre, hachurer, hacher, luminanceHex, tracerCercle, tracerPolygone,
  type Point,
} from './trace'

export const IDS_CARREAUX = [
  'bauhaus', 'carreaux', 'demilunes', 'jetons', 'couloirs', 'dalles',
] as const

export type IdCarreau = (typeof IDS_CARREAUX)[number]

export function estCarreau(valeur: unknown): valeur is IdCarreau {
  return IDS_CARREAUX.includes(valeur as IdCarreau)
}

/* ---------- la grille -------------------------------------------------------- */

/**
 * Une case de la grille. `c` et `r` sont ses coordonnées entières, et ce sont
 * elles, jamais sa position en pixels, qui interrogent la clé : le signe d'une
 * case ne bouge donc pas quand l'image change de taille.
 */
interface Case {
  x: number
  y: number
  cote: number
  c: number
  r: number
}

/**
 * Le découpage : une grille de cases carrées, dont une partie se regroupe par
 * quatre pour porter un signe deux fois plus grand.
 *
 * Sans ce regroupement, un damier régulier ; avec, une composition. C'est la
 * seule irrégularité que la grille s'autorise, et elle suffit à casser la
 * lecture ligne par ligne. Les blocs se lisent deux cases par deux cases
 * depuis le coin, si bien qu'aucun ne peut en chevaucher un autre.
 */
function decouper(
  W: number, H: number, pas: number, cle: number, chance: number,
): Case[] {
  const colonnes = Math.ceil(W / pas)
  const rangees = Math.ceil(H / pas)
  const liste: Case[] = []
  for (let br = 0; br < rangees; br += 2) {
    for (let bc = 0; bc < colonnes; bc += 2) {
      const entier =
        bc + 1 < colonnes && br + 1 < rangees && hacher(bc, br, cle) < chance
      if (entier) {
        liste.push({ x: bc * pas, y: br * pas, cote: pas * 2, c: bc, r: br })
        continue
      }
      for (let dr = 0; dr < 2 && br + dr < rangees; dr += 1) {
        for (let dc = 0; dc < 2 && bc + dc < colonnes; dc += 1) {
          liste.push({
            x: (bc + dc) * pas, y: (br + dr) * pas, cote: pas,
            c: bc + dc, r: br + dr,
          })
        }
      }
    }
  }
  return liste
}

/**
 * Le repère local d'une case : l'origine sur son coin haut gauche, tournée
 * d'un quart de tour autant de fois que demandé. Tous les signes se dessinent
 * ensuite dans un carré `[0, cote]`, sans savoir où ils sont ni comment ils
 * sont orientés. Il faut un `restore()` pour chaque appel.
 */
function orienter(ctx: Pinceau, k: Case, tour: number): void {
  ctx.save()
  ctx.translate(k.x + k.cote / 2, k.y + k.cote / 2)
  ctx.rotate((((tour % 4) + 4) % 4) * (Math.PI / 2))
  ctx.translate(-k.cote / 2, -k.cote / 2)
}

/* ---------- l'alphabet ------------------------------------------------------- */

/*
 * Chaque signe se dessine dans le carré `[0, cote]` du repère local, sans
 * savoir où il est ni comment il est tourné.
 *
 * Les signes évidés ne peignent pas leur trou : le contour et le trou entrent
 * dans le même chemin, rempli en règle paire et impaire, et c'est ce qu'il y a
 * derrière qui remplit le creux. C'est ce qui permet à un anneau de tomber
 * indifféremment sur un aplat de case ou sur la page, sans que le geste ait
 * besoin de connaître le fond de la palette, qu'il ne reçoit pas.
 */

/** Le disque, centré sur la case. `part` est son rayon rapporté au côté. */
function disque(ctx: Pinceau, cote: number, part = 0.5): void {
  tracerCercle(ctx, cote / 2, cote / 2, cote * part)
}

/** Le quart de disque, centré sur le coin haut gauche, plein cadre. */
function quart(ctx: Pinceau, cote: number, part = 1): void {
  ctx.moveTo(0, 0)
  ctx.arc(0, 0, cote * part, 0, Math.PI / 2)
  ctx.closePath()
}

/** Le demi-disque posé sur le bord haut, plein cadre. */
function demi(ctx: Pinceau, cote: number): void {
  ctx.moveTo(cote, 0)
  ctx.arc(cote / 2, 0, cote / 2, 0, Math.PI)
  ctx.closePath()
}

/** Le triangle rectangle, l'hypoténuse d'un coin à l'autre. */
function triangle(ctx: Pinceau, cote: number): void {
  tracerPolygone(ctx, [[0, 0], [cote, 0], [0, cote]])
}

/**
 * L'amande : deux arcs de rayon plein, tendus entre les coins de la
 * contre-diagonale. C'est l'oeil des carrelages, et il tient en un seul
 * chemin parce que le pinceau enchaîne les arcs sans lever le crayon : le
 * second commence exactement là où le premier finit.
 */
function amande(ctx: Pinceau, cote: number): void {
  ctx.moveTo(0, cote)
  ctx.arc(cote, cote, cote, Math.PI, Math.PI * 1.5)
  ctx.arc(0, 0, cote, 0, Math.PI / 2)
  ctx.closePath()
}

/** Les bandes : une case sur deux, en partant du bord haut. */
function bandes(ctx: Pinceau, cote: number, nombre: number): void {
  const pas = cote / nombre
  for (let i = 0; i < nombre; i += 2) {
    tracerPolygone(ctx, [
      [0, i * pas], [cote, i * pas], [cote, (i + 1) * pas], [0, (i + 1) * pas],
    ])
  }
}

/** La croix droite : douze sommets, un seul contour, donc évidable. */
function croix(ctx: Pinceau, cote: number, epaisseur: number): void {
  const a = (cote - epaisseur) / 2
  const b = a + epaisseur
  tracerPolygone(ctx, [
    [a, 0], [b, 0], [b, a], [cote, a], [cote, b], [b, b],
    [b, cote], [a, cote], [a, b], [0, b], [0, a], [a, a],
  ])
}

/** Le sautoir : la même croix, posée sur la pointe. */
function sautoir(ctx: Pinceau, cote: number, epaisseur: number): void {
  ctx.save()
  ctx.translate(cote / 2, cote / 2)
  ctx.rotate(Math.PI / 4)
  ctx.translate(-cote / 2, -cote / 2)
  croix(ctx, cote, epaisseur)
  ctx.restore()
}

/** Les quatre pastilles, en carré. */
function quatre(ctx: Pinceau, cote: number): void {
  for (const [ux, uy] of [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]]) {
    tracerCercle(ctx, cote * ux, cote * uy, cote * 0.21)
  }
}

/** La barre couchée, en travers de la case. */
function barre(ctx: Pinceau, cote: number, epaisseur: number): void {
  const haut = (cote - epaisseur) / 2
  tracerPolygone(ctx, [
    [0, haut], [cote, haut], [cote, haut + epaisseur], [0, haut + epaisseur],
  ])
}

/** Le polygone régulier à `cotes` sommets, pointe en haut. */
function regulier(ctx: Pinceau, cx: number, cy: number, rayon: number, cotes: number): void {
  tracerPolygone(ctx, Array.from({ length: cotes }, (_, i) => {
    const a = (i / cotes) * Math.PI * 2 - Math.PI / 2
    return [cx + Math.cos(a) * rayon, cy + Math.sin(a) * rayon] as Point
  }))
}

/** L'étoile à `pointes` branches, creusée à `creux` fois son rayon. */
function etoile(
  ctx: Pinceau, cx: number, cy: number, rayon: number, pointes: number, creux: number,
): void {
  tracerPolygone(ctx, Array.from({ length: pointes * 2 }, (_, i) => {
    const a = (i / (pointes * 2)) * Math.PI * 2 - Math.PI / 2
    const r = rayon * (i % 2 === 0 ? 1 : creux)
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Point
  }))
}

/**
 * La bande droite d'un disque, taillée par ses deux cordes.
 *
 * Une barre posée en travers d'une pastille déborderait sur ce qui l'entoure ;
 * celle-ci est construite exacte, deux arcs et deux cordes, à partir des
 * angles où le cercle coupe chaque corde. Posée dans le chemin d'un disque et
 * remplie en règle paire et impaire, elle le barre en creux.
 */
function bandeDeDisque(
  ctx: Pinceau, cx: number, cy: number, rayon: number, angle: number, epaisseur: number,
): void {
  const demiBande = Math.min(epaisseur, rayon * 1.98) / 2
  const large = Math.acos(Math.max(-1, Math.min(1, -demiBande / rayon)))
  const etroit = Math.acos(Math.max(-1, Math.min(1, demiBande / rayon)))
  ctx.moveTo(cx + Math.cos(angle + etroit) * rayon, cy + Math.sin(angle + etroit) * rayon)
  ctx.arc(cx, cy, rayon, angle + etroit, angle + large)
  ctx.lineTo(cx + Math.cos(angle - large) * rayon, cy + Math.sin(angle - large) * rayon)
  ctx.arc(cx, cy, rayon, angle - large, angle - etroit)
  ctx.closePath()
}

/** Le carré d'une case, en coordonnées d'image, comme contour à hachurer. */
function contour(x: number, y: number, cote: number): Point[] {
  return [[x, y], [x + cote, y], [x + cote, y + cote], [x, y + cote]]
}

/** Un signe plein : le chemin ouvert, tracé, rempli. */
function plein(ctx: Pinceau, tracer: () => void): void {
  ctx.beginPath()
  tracer()
  ctx.fill()
}

/** Un signe évidé : le contour et son trou dans le même chemin. */
function evide(ctx: Pinceau, tracer: () => void): void {
  ctx.beginPath()
  tracer()
  ctx.fill('evenodd')
}

/* ---------- bauhaus ---------------------------------------------------------- */

/**
 * L'affiche : des cases franches sur le fond de la palette, une sur huit
 * laissée vide, une sur cinq regroupée par quatre pour porter un signe deux
 * fois plus grand. Les signes sont les plus francs de l'alphabet, et la teinte
 * du signe n'est jamais celle de son aplat : l'écart dans la palette vaut au
 * moins un cran, si bien qu'aucune case ne peut se retrouver unie.
 *
 * L'aplat de case n'est pas toujours peint, et c'est ce mélange qui fait
 * l'affiche : une forme posée à même la page n'a pas le poids d'une forme
 * enfermée dans un carré, et la couleur de la palette a besoin de respirer
 * entre les blocs.
 */
function bauhaus(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const cle = Math.floor(rnd() * 0x7fffffff)
  const pas = unite / [3, 5, 7][densite]

  for (const k of decouper(W, H, pas, cle, 0.2)) {
    const signe = hacher(k.c, k.r, cle + 1)
    if (signe < 0.12) continue

    const cote = k.cote
    const iAplat = Math.floor(hacher(k.c, k.r, cle + 2) * C.length)
    const aplat = C[iAplat]
    const ecart = 1 + Math.floor(hacher(k.c, k.r, cle + 3) * (C.length - 1))
    const encre = C[(iAplat + ecart) % C.length]
    const tour = Math.floor(hacher(k.c, k.r, cle + 4) * 4)

    const pose = hacher(k.c, k.r, cle + 5) < 0.58
    if (pose) {
      ctx.fillStyle = aplat
      ctx.fillRect(k.x, k.y, cote, cote)
    }
    if (signe < 0.28) continue

    ctx.fillStyle = pose ? encre : aplat
    orienter(ctx, k, tour)
    if (signe < 0.42) plein(ctx, () => quart(ctx, cote))
    else if (signe < 0.53) plein(ctx, () => demi(ctx, cote))
    else if (signe < 0.62) plein(ctx, () => disque(ctx, cote, 0.38))
    else if (signe < 0.71) plein(ctx, () => triangle(ctx, cote))
    else if (signe < 0.78) plein(ctx, () => amande(ctx, cote))
    else if (signe < 0.82) plein(ctx, () => sautoir(ctx, cote, cote * 0.2))
    else if (signe < 0.86) plein(ctx, () => croix(ctx, cote, cote * 0.26))
    else if (signe < 0.93) plein(ctx, () => bandes(ctx, cote, 5))
    else {
      evide(ctx, () => {
        disque(ctx, cote, 0.42)
        disque(ctx, cote, 0.22)
      })
    }
    ctx.restore()
  }
}

/* ---------- carreaux --------------------------------------------------------- */

/**
 * Le carrelage plein : chaque case a son aplat, aucune ne montre la page, et
 * le motif se lit en camaïeu parce que l'aplat et le signe sont deux teintes
 * voisines de la palette rangée du clair au sombre.
 *
 * Le voisinage est le point. Prendre deux teintes au hasard donne un damier
 * bruyant ; prendre la suivante dans l'ordre des luminances donne cette
 * matière de faïence où la forme apparaît sans crier. L'écart est de un ou de
 * deux crans, jamais nul, et le sens alterne avec la case.
 */
function carreaux(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const cle = Math.floor(rnd() * 0x7fffffff)
  const pas = unite / [4, 6, 9][densite]
  const teintes = duClairAuSombre(C)

  for (const k of decouper(W, H, pas, cle, 0.16)) {
    const cote = k.cote
    const rang = Math.floor(hacher(k.c, k.r, cle + 2) * teintes.length)
    const ecart = 1 + Math.floor(hacher(k.c, k.r, cle + 3) * 2)
    const sens = hacher(k.c, k.r, cle + 6) < 0.5 ? -1 : 1
    const n = teintes.length
    const aplat = teintes[rang]
    const encre = teintes[(((rang + sens * ecart) % n) + n) % n]
    const tour = Math.floor(hacher(k.c, k.r, cle + 4) * 4)

    ctx.fillStyle = aplat
    ctx.fillRect(k.x, k.y, cote, cote)

    const signe = hacher(k.c, k.r, cle + 1)
    if (signe < 0.08) continue

    ctx.fillStyle = encre
    orienter(ctx, k, tour)
    if (signe < 0.2) plein(ctx, () => quart(ctx, cote))
    else if (signe < 0.3) plein(ctx, () => demi(ctx, cote))
    else if (signe < 0.38) plein(ctx, () => disque(ctx, cote, 0.4))
    else if (signe < 0.46) plein(ctx, () => amande(ctx, cote))
    else if (signe < 0.54) plein(ctx, () => triangle(ctx, cote))
    else if (signe < 0.62) plein(ctx, () => bandes(ctx, cote, 5))
    else if (signe < 0.68) plein(ctx, () => quatre(ctx, cote))
    else if (signe < 0.74) plein(ctx, () => croix(ctx, cote, cote * 0.3))
    else if (signe < 0.8) plein(ctx, () => barre(ctx, cote, cote * 0.32))
    else if (signe < 0.86) {
      /* Le rond barré : la barre est taillée dans le disque, jamais posée
         par-dessus, sans quoi elle mordrait la case voisine. */
      evide(ctx, () => {
        disque(ctx, cote, 0.42)
        bandeDeDisque(ctx, cote / 2, cote / 2, cote * 0.42, Math.PI / 4, cote * 0.16)
      })
    } else if (signe < 0.93) {
      evide(ctx, () => {
        disque(ctx, cote, 0.46)
        disque(ctx, cote, 0.28)
      })
    } else {
      evide(ctx, () => {
        quart(ctx, cote)
        quart(ctx, cote, 0.5)
      })
    }
    ctx.restore()
  }
}

/* ---------- demi-lunes ------------------------------------------------------- */

/**
 * Les arches : la moitié ronde de l'alphabet, et rien d'autre.
 *
 * Chaque case porte un demi-disque appuyé sur l'un de ses bords, parfois deux
 * quarts opposés, parfois un rond entier. Comme tous s'appuient sur les bords,
 * deux voisines se répondent : dos à dos elles font un sablier, face à face
 * une amande, et quatre bien tournées un cercle que personne n'a dessiné.
 *
 * L'axe se choisit par rangée plutôt que par case, et c'est ce qui donne les
 * colonnes : sur une rangée, les demi-disques s'appuient tous sur un bord
 * horizontal, sur la suivante sur un bord vertical. Le sens, lui, reste libre
 * case par case, sans quoi la rangée entière regarderait du même côté. Une
 * orientation entièrement libre, elle, rendait le champ moucheté, joli et sans
 * colonnes.
 */
function demilunes(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const cle = Math.floor(rnd() * 0x7fffffff)
  const pas = unite / [3, 4, 6][densite]
  const colonnes = Math.ceil(W / pas)
  const rangees = Math.ceil(H / pas)

  for (let r = 0; r < rangees; r += 1) {
    const vertical = hacher(0, r, cle + 7) < 0.62
    for (let c = 0; c < colonnes; c += 1) {
      const signe = hacher(c, r, cle + 1)
      if (signe < 0.09) continue

      const k: Case = { x: c * pas, y: r * pas, cote: pas, c, r }
      ctx.fillStyle = C[Math.floor(hacher(c, r, cle + 2) * C.length)]

      if (signe > 0.9) {
        /* Le rond entier, posé au centre : la respiration de la colonnade. */
        ctx.beginPath()
        tracerCercle(ctx, k.x + pas / 2, k.y + pas / 2, pas / 2)
        ctx.fill()
        continue
      }

      const tour = (vertical ? 0 : 1) + (hacher(c, r, cle + 4) < 0.5 ? 0 : 2)
      orienter(ctx, k, tour)
      if (signe < 0.68) plein(ctx, () => demi(ctx, pas))
      else if (signe < 0.8) {
        /* Deux quarts opposés : la case se lit comme un ruban qui tourne. */
        plein(ctx, () => {
          quart(ctx, pas)
          ctx.save()
          ctx.translate(pas, pas)
          ctx.rotate(Math.PI)
          quart(ctx, pas)
          ctx.restore()
        })
      } else {
        /* L'arche : un demi-disque coiffant un pied droit. */
        ctx.fillRect(0, pas / 2, pas, pas / 2)
        plein(ctx, () => demi(ctx, pas))
      }
      ctx.restore()
    }
  }
}

/* ---------- jetons ----------------------------------------------------------- */

/**
 * Deux tons, un damier lâche, et des pièces frappées.
 *
 * La page reste celle de la palette : le geste ne peint aucun papier, il pose
 * son encre dessus. C'est ce qui lui permet de rester juste sur les onze
 * palettes sans jamais connaître leur fond, qu'il ne reçoit pas, et c'est
 * aussi ce qui lui donne son air de planche imprimée. L'encre est la plus
 * sombre des teintes, la réserve la plus claire ; il n'en faut pas plus.
 *
 * La grille ne se remplit qu'à moitié : des carrés pleins, des carrés
 * hachurés, et par-dessus des jetons posés soit au centre d'une case, soit sur
 * un croisement, à cheval sur quatre. Un jeton qui tombe sur un carré plein se
 * frappe en réserve, les autres en encre, et tous sont évidés du même chemin :
 * leur creux montre exactement ce qu'ils recouvrent.
 */
function jetons(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const cle = Math.floor(rnd() * 0x7fffffff)
  const pas = unite / [5, 7, 10][densite]
  const colonnes = Math.ceil(W / pas)
  const rangees = Math.ceil(H / pas)
  const teintes = duClairAuSombre(C)
  const reserve = teintes[0]
  const encre = teintes[teintes.length - 1]

  /* Un seul tirage décide du sort d'une case : sous le premier seuil elle est
     pleine, entre les deux elle est hachurée, au-dessus elle reste nue. */
  const remplie = (c: number, r: number): boolean => hacher(c, r, cle + 1) < 0.19
  const hachuree = (c: number, r: number): boolean => {
    const h = hacher(c, r, cle + 1)
    return h >= 0.19 && h < 0.33
  }

  /* Les cases d'abord, toutes, avant le premier jeton : un jeton posé sur un
     croisement mord quatre cases, et la case suivante le recouvrirait. */
  ctx.fillStyle = encre
  for (let r = 0; r < rangees; r += 1) {
    for (let c = 0; c < colonnes; c += 1) {
      if (remplie(c, r)) {
        ctx.fillRect(c * pas, r * pas, pas, pas)
      } else if (hachuree(c, r)) {
        /* Le contour est donné en coordonnées d'image et non de case : le pas
           et la phase des hachures se mesurent alors sur la même origine pour
           tout le monde, et deux cases voisines hachurées du même angle
           continuent la même série au lieu de se décaler d'une demi-bande. */
        hachurer(ctx, contour(c * pas, r * pas, pas),
          hacher(c, r, cle + 8) < 0.5 ? Math.PI / 4 : -Math.PI / 4, pas / 7)
      }
    }
  }

  for (let r = 0; r < rangees; r += 1) {
    for (let c = 0; c < colonnes; c += 1) {
      const choix = hacher(c, r, cle + 2)
      if (choix > 0.42) continue

      /* Au croisement, le jeton mord les quatre cases voisines : il n'est
         frappé en réserve que si les quatre sont pleines, ce qui n'arrive
         presque jamais. Au centre, une seule case décide. */
      const croisement = hacher(c, r, cle + 3) < 0.42
      const cx = c * pas + (croisement ? pas : pas / 2)
      const cy = r * pas + (croisement ? pas : pas / 2)
      const sombre = croisement
        ? remplie(c, r) && remplie(c + 1, r) && remplie(c, r + 1) && remplie(c + 1, r + 1)
        : remplie(c, r)
      const rayon = pas * (croisement ? 0.26 : 0.31)
      const forme = choix / 0.42

      ctx.fillStyle = sombre ? reserve : encre
      if (forme < 0.18) {
        plein(ctx, () => tracerCercle(ctx, cx, cy, rayon))
      } else if (forme < 0.36) {
        evide(ctx, () => {
          tracerCercle(ctx, cx, cy, rayon)
          tracerCercle(ctx, cx, cy, rayon * 0.58)
        })
      } else if (forme < 0.5) {
        /* Le rouage : une couronne crénelée, douze dents, et son moyeu. */
        evide(ctx, () => {
          etoile(ctx, cx, cy, rayon, 12, 0.82)
          tracerCercle(ctx, cx, cy, rayon * 0.5)
        })
      } else if (forme < 0.63) {
        evide(ctx, () => {
          regulier(ctx, cx, cy, rayon, 6)
          regulier(ctx, cx, cy, rayon * 0.6, 6)
        })
      } else if (forme < 0.75) {
        evide(ctx, () => {
          tracerCercle(ctx, cx, cy, rayon)
          ctx.save()
          ctx.translate(cx - rayon, cy - rayon)
          croix(ctx, rayon * 2, rayon * 0.66)
          ctx.restore()
        })
      } else if (forme < 0.86) {
        evide(ctx, () => {
          tracerCercle(ctx, cx, cy, rayon)
          etoile(ctx, cx, cy, rayon * 0.72, 5, 0.44)
        })
      } else if (forme < 0.94) {
        evide(ctx, () => {
          tracerCercle(ctx, cx, cy, rayon)
          regulier(ctx, cx, cy, rayon * 0.5, 4)
        })
      } else {
        evide(ctx, () => {
          tracerCercle(ctx, cx, cy, rayon)
          bandeDeDisque(ctx, cx, cy, rayon, Math.PI / 4, rayon * 0.5)
        })
      }
    }
  }
}

/* ---------- couloirs --------------------------------------------------------- */

/**
 * Les couloirs : les lignes d'eau d'un bassin, vues du dessus.
 *
 * C'est le pavage le plus littéral du geste : une ligne d'eau est déjà une
 * maille qui revient, des flotteurs enfilés sur un câble, et il n'y a rien à
 * inventer pour en faire un motif. Ce qu'il faut, c'est ne pas la lisser.
 *
 * Trois choses font qu'on reconnaît un bassin plutôt qu'une rangée de pastilles,
 * et les trois ont été apprises en regardant le motif rater sans elles. Le câble
 * doit se voir, sinon les flotteurs flottent chacun pour soi et l'image devient
 * des confettis. Les flotteurs doivent se chevaucher, parce qu'ils sont enfilés
 * serré et qu'un jour entre deux disques n'existe pas dans un bassin. Et surtout
 * la couleur ne change pas au hasard : une ligne d'eau est d'une seule teinte
 * sur presque toute sa longueur, et ce sont les cinq derniers mètres qui
 * passent au rouge. C'est ce contraste rare, une couleur qui revient de loin en
 * loin, qui dit la distance ; une couleur par paquet tiré au sort ne dit rien.
 *
 * Les paquets se lisent par leur rang le long du câble, jamais par flotteur :
 * `hacher` est interrogé sur le numéro du paquet, si bien qu'un cadre plus large
 * allonge les câbles sans recolorer ce qui était déjà posé.
 */
function couloirs(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const cle = Math.floor(rnd() * 0x7fffffff)
  const teintes = duClairAuSombre(C)
  const cable = teintes[teintes.length - 1]
  const rayon = unite / [16, 24, 34][densite]
  /* Le pas laisse voir le câble entre deux flotteurs, et l'eau entre deux
     câbles. Serrés à se toucher, les flotteurs couvraient l'image entière : le
     fond de la palette ne passait plus, le câble non plus, et il ne restait
     qu'un tapis de pastilles. Ce qui fait la ligne d'eau, c'est justement
     qu'elle est une ligne posée sur de l'eau. */
  const pas = rayon * 2.15
  const ecart = rayon * 3.1
  const cables = Math.ceil(H / ecart) + 1
  const flotteurs = Math.ceil(W / pas) + 3
  /* Un paquet fait cinq flotteurs, comme les cinq mètres qu'il marque. */
  const paquet = 5

  for (let l = 0; l < cables; l += 1) {
    const y = (l + 0.5) * ecart
    /* Chaque câble démarre ailleurs que son voisin : un demi-flotteur de
       décalage d'une ligne à l'autre, plus un jeu tiré de la graine. Alignés
       au cordeau, les flotteurs font des colonnes verticales que l'oeil suit
       à la place des lignes, et le bassin se lit comme un damier. */
    const decale = (l % 2 === 0 ? 0 : pas / 2) + (hacher(l, 733, cle) - 0.5) * pas * 0.5
    /* La teinte de la ligne, et celle de ses bouts. Deux teintes par câble, pas
       davantage : c'est ce qui fait qu'on suit une ligne d'un bord à l'autre. */
    const base = C[Math.floor(hacher(l, 401, cle) * C.length)]
    let accent = base
    for (let k = 1; k < C.length; k += 1) {
      accent = C[(Math.floor(hacher(l, 401, cle) * C.length) + k) % C.length]
      if (Math.abs(luminanceHex(accent) - luminanceHex(base)) > 0.1) break
    }
    const phase = Math.floor(hacher(l, 991, cle) * paquet)

    ctx.fillStyle = cable
    ctx.fillRect(0, y - rayon * 0.09, W, rayon * 0.18)

    for (let i = 0; i < flotteurs; i += 1) {
      const rang = i + phase
      const bloc = Math.floor(rang / paquet)
      /* Un paquet sur quatre environ passe à l'accent, et jamais deux de
         suite : c'est la cadence d'un balisage, pas une alternance. */
      const marque = hacher(bloc, l, cle) > 0.76
      ctx.fillStyle = marque ? accent : base
      ctx.beginPath()
      tracerCercle(ctx, (i - 0.5) * pas + decale, y, rang % 2 === 0 ? rayon * 0.95 : rayon * 0.78)
      ctx.fill()
    }
  }
}

/* ---------- dalles ----------------------------------------------------------- */

/**
 * Les dalles : de gros pavés penchés, en rangées décalées.
 *
 * Toutes les dalles penchent du même angle, et c'est tout le motif. Une
 * inclinaison qui alternerait d'une rangée à l'autre ferait des losanges, un
 * treillis, quelque chose qu'on regarde comme une grille ; un seul sens fait un
 * mouvement, et l'oeil descend l'image en biais sans qu'on lui ait rien demandé.
 * C'est le geste des affiches de forme des années soixante, et il ne tient qu'à
 * cette constance.
 *
 * Deux choses de plus le font tenir. Les dalles sont **grandes**, quelques-unes
 * par largeur d'écran et non quelques dizaines : c'est ce qui sépare une affiche
 * d'un papier peint. Et une teinte domine largement, les autres ne ponctuent
 * que : quatre couleurs à parts égales redonnent un damier bariolé, où la forme
 * de la dalle disparaît derrière son coloriage.
 *
 * Une dalle sur quatre environ porte une marche, un cran taillé dans son coin
 * haut. Elle ne change pas la lecture de loin et elle la change de près, ce qui
 * est exactement ce qu'on demande à un fond d'écran qu'on voit vingt fois par
 * jour.
 *
 * Les rangées sont décalées d'un demi-pas plus un jeu tiré de la graine, comme
 * la panoplie : alignées, les dalles font des colonnes verticales qui coupent
 * le biais au lieu de le porter.
 */
function dalles(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const cle = Math.floor(rnd() * 0x7fffffff)
  const pas = unite / [2.6, 3.6, 5.2][densite]
  const hauteur = pas * 0.92
  /* Le cisaillement, en fraction de la demi-hauteur. Tiré une fois : c'est la
     constance de l'angle qui fait le motif. */
  const penche = (rnd() < 0.5 ? 1 : -1) * (0.62 + 0.32 * rnd())
  /* La dominante ne peut pas être la teinte la plus claire de la palette :
     c'est presque toujours celle qui ressemble au fond, et une dalle de la
     couleur du fond sur les deux tiers de l'image efface le motif. Elle reste
     disponible pour la ponctuation, où elle ne couvre qu'un sixième. */
  const clair = duClairAuSombre(C)[0]
  const franches = C.filter((teinte) => teinte !== clair)
  const dominante = (franches.length > 0 ? franches : C)[
    Math.floor(rnd() * (franches.length > 0 ? franches.length : C.length))
  ]

  const colonnes = Math.ceil(W / pas) + 3
  const rangees = Math.ceil(H / hauteur) + 3

  /* Les dalles se touchent presque : c'est le serrage qui fait la chaîne
     diagonale, et la chaîne qui fait le mouvement. Espacées, elles flottent
     chacune dans son coin de fond et l'affiche redevient un semis. */
  const l = pas * 0.72
  const h = hauteur * 0.86
  const d = penche * h * 0.55

  for (let r = -1; r < rangees - 1; r += 1) {
    const decale = (r % 2 === 0 ? 0 : pas / 2) + (hacher(r, 313, cle) - 0.5) * pas * 0.3
    const y = r * hauteur + hauteur / 2
    for (let c = -2; c < colonnes - 1; c += 1) {
      const x = c * pas + decale + pas / 2
      /* Deux dalles sur trois portent la dominante ; le reste ponctue. */
      const tirage = hacher(c, r, cle)
      ctx.fillStyle = tirage < 0.66
        ? dominante
        : C[Math.floor(hacher(c, r + 911, cle) * C.length)]

      const hg: Point = [x - l / 2 + d, y - h / 2]
      const hd: Point = [x + l / 2 + d, y - h / 2]
      const bd: Point = [x + l / 2 - d, y + h / 2]
      const bg: Point = [x - l / 2 - d, y + h / 2]

      ctx.beginPath()
      if (hacher(c + 57, r, cle) > 0.74) {
        /* La marche : un cran taillé dans le coin haut, du côté où la dalle
           penche. Elle suit le cisaillement, sinon elle se lit comme un
           accident de tracé plutôt que comme une découpe. */
        const cran = l * 0.4
        const marche = h * 0.3
        ctx.moveTo(hg[0], hg[1])
        ctx.lineTo(hd[0] - cran, hd[1])
        ctx.lineTo(hd[0] - cran - d * 0.6 * (marche / h) * 2, hd[1] + marche)
        ctx.lineTo(hd[0] - d * (marche / h) * 2, hd[1] + marche)
        ctx.lineTo(bd[0], bd[1])
        ctx.lineTo(bg[0], bg[1])
        ctx.closePath()
      } else {
        tracerPolygone(ctx, [hg, hd, bd, bg])
      }
      ctx.fill()
    }
  }
}

/* ---------- aiguillage ------------------------------------------------------- */

export function peindreCarreau(
  ctx: Pinceau, W: number, H: number, id: IdCarreau,
  C: readonly string[], densite: Densite, rnd: Alea, unite: number,
): void {
  if (id === 'bauhaus') bauhaus(ctx, W, H, C, densite, rnd, unite)
  else if (id === 'carreaux') carreaux(ctx, W, H, C, densite, rnd, unite)
  else if (id === 'demilunes') demilunes(ctx, W, H, C, densite, rnd, unite)
  else if (id === 'jetons') jetons(ctx, W, H, C, densite, rnd, unite)
  else if (id === 'couloirs') couloirs(ctx, W, H, C, densite, rnd, unite)
  else dalles(ctx, W, H, C, densite, rnd, unite)
}
