// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Le relief : la teinte dit l'orientation, et le plat devient volume.
 *
 * Tout le catalogue est en aplats fermés, sans dégradé ni ombre portée, et
 * c'est un parti pris : un dégradé se trame, pèse trois fois plus en PNG et ne
 * survit pas au vectoriel. Ce geste montre qu'on n'en a pas besoin. Un volume
 * ne se voit pas parce que la lumière y glisse, il se voit parce que ses faces
 * ne sont pas de la même valeur. Trois aplats bien choisis font un cube plus
 * sûrement qu'un dégradé.
 *
 * La lumière ne bouge jamais : elle vient d'en haut à gauche, et de devant.
 * C'est la seule règle que les quatre familles partagent, et c'est elle qui
 * les fait tenir ensemble. Une face tournée vers elle prend la teinte de la
 * palette poussée vers le jour, une face qui s'en détourne la même poussée
 * vers l'ombre (`eclairage`, dans `trace.ts`).
 *
 * Toutes gardent les parallèles parallèles : c'est l'axonométrie, et elle
 * donne du volume sans rien promettre de la distance. Un motif de fond
 * d'écran se regarde de trop près et de trop longtemps pour qu'un point de
 * fuite y tienne : la perspective vraie choisit un endroit d'où regarder, et
 * une grille d'icônes n'est pas cet endroit.
 *
 * Chacune fabrique donc son volume autrement, et c'est ce qui les sépare.
 * **Cubes** empile des solides, trois faces par cube. **Plis** froisse une
 * nappe et donne à chaque facette la valeur de sa pente, la profondeur venant
 * du calcul et non du dessin. **Bossage** ne creuse rien du tout : ses
 * panneaux sont plats, et seul le chanfrein dit lesquels sortent et lesquels
 * rentrent. **Tuyaux** courbe la valeur en travers d'une barre droite, et une
 * barre devient un cylindre.
 *
 * Comme les familles de grille, aucune ne tire au sort dans une boucle dont le
 * compte dépend du format : la graine fabrique une clé, et chaque case ou
 * chaque sommet interroge cette clé par ses coordonnées.
 */
import type { Alea, Densite, Pinceau } from './moteur'
import {
  bruiteur, duClairAuSombre, eclairage, hacher, polygone, type Point,
} from './trace'

export const IDS_RELIEFS = [
  'cubes', 'plis', 'bossage', 'tuyaux', 'escaliers', 'torsades', 'casiers',
  'soufflet', 'treillis',
] as const

export type IdRelief = (typeof IDS_RELIEFS)[number]

export function estRelief(valeur: unknown): valeur is IdRelief {
  return IDS_RELIEFS.includes(valeur as IdRelief)
}

/** Le polygone plein, en une fois : c'est tout ce que ce geste dessine. */
function face(ctx: Pinceau, teinte: string, points: readonly Point[]): void {
  ctx.fillStyle = teinte
  polygone(ctx, points)
  ctx.fill()
}

/* ---------- cubes ------------------------------------------------------------ */

/**
 * L'axonométrie : des cubes empilés, vus d'un angle qui ne fuit nulle part.
 *
 * Trois faces par cube, et la même règle pour tous : le dessus regarde la
 * lumière, le côté gauche la reçoit de biais, le droit ne la reçoit pas. Ce
 * sont ces trois valeurs, et rien d'autre, qui font le volume ; le contour,
 * lui, n'est qu'un losange et deux parallélogrammes.
 *
 * La hauteur ne se tire pas case par case, elle se lit dans un bruit continu :
 * des cubes de hauteur libre feraient un tapis de pointes, un champ lisse fait
 * des collines de blocs, et la teinte se prend dans la palette selon
 * l'altitude, comme une carte en couleurs hypsométriques.
 *
 * Les colonnes descendent bien au-delà du bas du cadre plutôt que de s'arrêter
 * sur un sol : autrement, la dernière rangée laisserait voir la page sous
 * elle, et le tas de cubes flotterait.
 */
function cubes(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const eclairer = eclairage(C)
  const cle = Math.floor(rnd() * 0x7fffffff)
  const bruit = bruiteur(cle)
  const cote = unite / [5, 8, 13][densite]

  /* La base isométrique : `+i` part vers la droite en descendant, `+j` vers la
     gauche en descendant, `+k` monte tout droit. Un demi-losange fait donc
     `demiLarge` de large et `demiHaut` de haut. */
  const demiLarge = cote * (Math.sqrt(3) / 2)
  const demiHaut = cote / 2
  /* Un cube vrai, et non un pavé : en isométrie, l'arête verticale se projette
     de toute sa longueur quand le losange du dessus n'en fait que la moitié en
     hauteur. Un étage plus court se lirait comme une dalle. */
  const etage = cote
  const etages = [3, 4, 5][densite]
  /* La longueur d'onde des collines se mesure en cubes, et le nombre de cubes
     visibles dépend de la densité : une longueur d'onde fixe donnerait un
     plateau presque plat au cran calme et un hérissement au cran dense. */
  const onde = [2.1, 3.2, 4.6][densite] * (0.85 + 0.4 * rnd())

  /* Le bas des colonnes, hors cadre : la silhouette de chaque prisme y descend
     tout droit, et la rangée de devant recouvre celle de derrière. */
  const fond = H + cote * 2

  const hauteur = (i: number, j: number): number =>
    Math.round(bruit(i / onde, j / onde) * etages)

  /* Les diagonales `s = i + j` se peignent de la plus lointaine à la plus
     proche : c'est le peintre, et sur un damier isométrique il suffit. Deux
     cases d'une même diagonale ne se recouvrent jamais. */
  const sMin = Math.floor(-etages * (etage / demiHaut)) - 2
  const sMax = Math.ceil(H / demiHaut) + 2
  const uMax = Math.ceil(W / demiLarge) + 2

  for (let s = sMin; s <= sMax; s += 1) {
    for (let u = -uMax; u <= uMax; u += 1) {
      /* `i` et `j` sont entiers seulement si `u` et `s` ont la même parité. */
      if (((u - s) % 2 + 2) % 2 !== 0) continue
      const i = (s + u) / 2
      const j = (s - u) / 2

      const h = hauteur(i, j)
      const sommet = h * etage
      const x = u * demiLarge
      const y = s * demiHaut - sommet

      /* Le losange du dessus, dans l'ordre haut, droite, bas, gauche. */
      const nord: Point = [x, y]
      const est: Point = [x + demiLarge, y + demiHaut]
      const sud: Point = [x, y + demiHaut * 2]
      const ouest: Point = [x - demiLarge, y + demiHaut]

      if (est[0] < -demiLarge || ouest[0] > W + demiLarge) continue
      if (sud[1] < -demiHaut || y > fond) continue

      /* La teinte se prend franche dans la palette, par palier d'altitude, et
         jamais entre deux : un mélange entre deux teintes voisines rend un
         gris de terre, et le tas de cubes perd d'un coup les couleurs pour
         lesquelles on l'a choisi. Une colonne sur six monte ou descend d'un
         palier, juste assez pour que les bandes ne soient pas des rayures. */
      const decale = hacher(i, j, cle + 1) < 0.17 ? 1 : 0
      const palier = Math.min(C.length - 1, Math.floor((h / (etages + 1)) * C.length) + decale)
      const teinte = C[palier]
      face(ctx, eclairer(teinte, 0.4), [nord, est, sud, ouest])
      face(ctx, eclairer(teinte, -0.1), [ouest, sud, [sud[0], fond], [ouest[0], fond]])
      face(ctx, eclairer(teinte, -0.52), [sud, est, [est[0], fond], [sud[0], fond]])
    }
  }
}

/* ---------- plis ------------------------------------------------------------- */

/**
 * La nappe froissée : une grille de triangles, et chaque facette prend la
 * valeur de sa pente.
 *
 * Rien n'est dessiné en volume ici, et c'est le point. Les sommets restent sur
 * un quadrillage à peine bousculé, les triangles pavent le plan sans un
 * interstice, et la seule chose qui vienne de la troisième dimension est une
 * hauteur, tirée d'un bruit continu, qui ne sert qu'à orienter les facettes.
 * La normale de chaque triangle, comparée à la lumière, donne un nombre entre
 * -1 et 1 ; ce nombre est la teinte. Le froissé est entièrement dans la
 * valeur.
 *
 * Les sommets sont bousculés parce qu'une grille régulière se lirait comme une
 * grille : l'oeil suivrait les rangées au lieu des plis. Le décalage reste
 * sous le tiers du pas, faute de quoi deux triangles voisins se croiseraient
 * et la nappe se déchirerait.
 */
function plis(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const eclairer = eclairage(C)
  const cle = Math.floor(rnd() * 0x7fffffff)
  const bruit = bruiteur(cle)
  const pas = unite / [7, 12, 19][densite]
  const colonnes = Math.ceil(W / pas) + 1
  const rangees = Math.ceil(H / pas) + 1
  const relief = pas * (0.9 + 1.1 * rnd())
  /* Le pli doit rester large devant la facette : sous cinq facettes par pli,
     la nappe cesse d'être froissée et devient granuleuse. */
  const grain = 0.12 + 0.1 * rnd()

  /* Le sommet `(c, r)` : sa place à l'écran, bousculée, et sa hauteur. Tout
     vient du hachage et du bruit, donc rien ne dépend du format. */
  const sommet = (c: number, r: number): [number, number, number] => [
    c * pas + (hacher(c, r, cle + 1) - 0.5) * pas * 0.44,
    r * pas + (hacher(c, r, cle + 2) - 0.5) * pas * 0.44,
    (bruit(c * grain, r * grain) - 0.5) * relief * 2,
  ]

  /* La lumière, en haut à gauche et devant : l'axe des ordonnées descend, donc
     « en haut » se dit avec un signe négatif. */
  const LUM = [-0.46, -0.52, 0.72]
  const norme = Math.hypot(LUM[0], LUM[1], LUM[2])

  const facette = (
    a: [number, number, number], b: [number, number, number], c: [number, number, number],
  ) => {
    const ux = b[0] - a[0]
    const uy = b[1] - a[1]
    const uz = b[2] - a[2]
    const vx = c[0] - a[0]
    const vy = c[1] - a[1]
    const vz = c[2] - a[2]
    let nx = uy * vz - uz * vy
    let ny = uz * vx - ux * vz
    let nz = ux * vy - uy * vx
    /* La normale regarde toujours le spectateur : sans ce retournement, un
       triangle décrit dans l'autre sens ressortirait éclairé à l'envers. */
    if (nz < 0) {
      nx = -nx
      ny = -ny
      nz = -nz
    }
    const longueur = Math.hypot(nx, ny, nz) || 1
    const cosinus = (nx * LUM[0] + ny * LUM[1] + nz * LUM[2]) / (longueur * norme)
    /* Une nappe plate rend un cosinus proche de 0,72, la valeur de la face de
       devant : c'est de là qu'on compte, pour qu'un pli sans pente ressorte à
       la teinte de la palette et non délavé. */
    const niveau = Math.max(-0.62, Math.min(0.55, (cosinus - 0.72) * 2.4))
    /* Comme pour les cubes, la teinte se prend franche dans la palette : le
       relief est déjà tout entier dans la valeur, et une teinte interpolée
       entre deux couleurs de la palette n'y ajouterait qu'un voile terreux. */
    const altitude = (a[2] + b[2] + c[2]) / (6 * relief) + 0.5
    const teinte = C[Math.max(0, Math.min(C.length - 1, Math.floor(altitude * C.length)))]
    face(ctx, eclairer(teinte, niveau), [
      [a[0], a[1]], [b[0], b[1]], [c[0], c[1]],
    ])
  }

  /* La nappe commence une case avant le coin. Les sommets sont bousculés, et
     celui de l'origine pouvait partir vers l'intérieur : la page se voyait
     alors en filet le long des bords haut et gauche. */
  for (let r = -1; r < rangees; r += 1) {
    for (let c = -1; c < colonnes; c += 1) {
      const a = sommet(c, r)
      const b = sommet(c + 1, r)
      const d = sommet(c, r + 1)
      const e = sommet(c + 1, r + 1)
      /* La diagonale du carré bascule d'une case à l'autre : toujours la même,
         et le froissé prendrait un sens de lecture qu'il n'a pas. */
      if (hacher(c, r, cle + 3) < 0.5) {
        facette(a, b, e)
        facette(a, e, d)
      } else {
        facette(a, b, d)
        facette(b, e, d)
      }
    }
  }
}

/* ---------- bossage ---------------------------------------------------------- */

/**
 * Le bossage : des panneaux parfaitement plats dont seul le chanfrein dit
 * s'ils sortent ou s'ils rentrent.
 *
 * C'est le relief le plus mince qui soit, et le plus convaincant : quatre
 * trapèzes autour d'une face, le trapèze du haut éclairé et celui du bas dans
 * l'ombre, et le panneau sort de la paroi. Les deux mêmes trapèzes échangés,
 * et il y rentre. Rien d'autre n'a changé, ni la forme ni la taille, et l'oeil
 * n'a pourtant pas le choix : il a passé sa vie sous une lumière qui vient
 * d'en haut.
 *
 * Trois signes seulement, mais chacun creux ou saillant : le panneau
 * chanfreiné, la bosse ronde, faite de trois disques décalés vers la lumière,
 * et la pyramide, quatre triangles qui se rejoignent au centre.
 *
 * La paroi qui les porte n'est pas peinte : c'est le fond de la palette. Une
 * teinte prise dans la palette avait été essayée, et elle se retournait contre
 * les palettes sombres, où la plus claire disponible virait au vert vif ;
 * le fond, lui, est la surface pour laquelle chaque palette a été composée.
 */
function bossage(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const eclairer = eclairage(C)
  const cle = Math.floor(rnd() * 0x7fffffff)
  const pas = unite / [3, 5, 8][densite]
  const colonnes = Math.ceil(W / pas)
  const rangees = Math.ceil(H / pas)
  for (let r = 0; r < rangees; r += 1) {
    for (let c = 0; c < colonnes; c += 1) {
      const signe = hacher(c, r, cle + 1)
      if (signe < 0.1) continue

      const x = c * pas
      const y = r * pas
      const base = C[Math.floor(hacher(c, r, cle + 2) * C.length)]
      /* Saillant ou creux : c'est le seul basculement de la famille, et il
         suffit à retourner le panneau. En creux, les deux paires de faces
         s'échangent, le haut prend l'ombre et le bas la lumière. */
      const sens = hacher(c, r, cle + 3) < 0.62 ? 1 : -1
      const marge = pas * 0.09
      const chanfrein = pas * 0.13
      const a0 = x + marge
      const b0 = y + marge
      const a1 = x + pas - marge
      const b1 = y + pas - marge

      if (signe < 0.46) {
        /* Le panneau chanfreiné : quatre trapèzes et une face. */
        const c0 = a0 + chanfrein
        const d0 = b0 + chanfrein
        const c1 = a1 - chanfrein
        const d1 = b1 - chanfrein
        face(ctx, eclairer(base, sens * 0.44), [[a0, b0], [a1, b0], [c1, d0], [c0, d0]])
        face(ctx, eclairer(base, sens * 0.2), [[a0, b0], [c0, d0], [c0, d1], [a0, b1]])
        face(ctx, eclairer(base, sens * -0.26), [[a1, b0], [a1, b1], [c1, d1], [c1, d0]])
        face(ctx, eclairer(base, sens * -0.46), [[a0, b1], [c0, d1], [c1, d1], [a1, b1]])
        face(ctx, base, [[c0, d0], [c1, d0], [c1, d1], [c0, d1]])
        continue
      }

      const cx = x + pas / 2
      const cy = y + pas / 2
      if (signe < 0.78) {
        /* La bosse ronde : trois disques de moins en moins larges, décalés
           vers la lumière. Un dégradé ferait la même chose, en trois fois le
           poids et sans passer au vectoriel. */
        const rayon = pas * 0.4
        const glissement = rayon * 0.2 * sens
        for (const [part, decalage, niveau] of [
          [1, 0, -0.42], [0.78, 1, 0.06], [0.46, 2, 0.42],
        ]) {
          ctx.fillStyle = eclairer(base, niveau * sens)
          ctx.beginPath()
          ctx.arc(
            cx - glissement * decalage, cy - glissement * decalage, rayon * part, 0, Math.PI * 2,
          )
          ctx.fill()
        }
        continue
      }

      /* La pyramide : quatre triangles qui montent au centre, et une arête
         franche entre chaque. */
      const centre: Point = [cx, cy]
      face(ctx, eclairer(base, sens * 0.46), [[a0, b0], [a1, b0], centre])
      face(ctx, eclairer(base, sens * 0.16), [[a0, b0], centre, [a0, b1]])
      face(ctx, eclairer(base, sens * -0.28), [[a1, b0], [a1, b1], centre])
      face(ctx, eclairer(base, sens * -0.5), [[a0, b1], centre, [a1, b1]])
    }
  }
}

/* ---------- tuyaux ----------------------------------------------------------- */

/**
 * Le cylindre : une barre droite, trois bandes dans le sens de la longueur, et
 * la barre est ronde.
 *
 * C'est le tour le plus vieux du dessin technique, et il ne demande aucune
 * courbe : la valeur varie en travers de la barre, du bord éclairé au bord
 * dans l'ombre, et l'oeil lit un rond. Les barres couchées s'éclairent par le
 * haut, les barres debout par la gauche, la lumière étant la même pour toutes.
 *
 * Elles se croisent en se tressant, une case sur deux dessus, et c'est là que
 * la profondeur cesse d'être une illusion de teinte : celle qui passe dessous
 * reçoit l'ombre portée de celle qui passe dessus, deux traits sombres le long
 * de ses bords. Sans ces deux traits, le tressage se lit encore mais à plat,
 * comme un damier.
 *
 * Chaque case dessine ses deux tronçons entière, dans l'ordre du tressage.
 * C'est ce qui permet à une barre continue d'être peinte en morceaux sans
 * qu'aucune couture ne se voie : deux tronçons voisins se joignent au bord
 * exact de la case.
 */
function tuyaux(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const eclairer = eclairage(C)
  const cle = Math.floor(rnd() * 0x7fffffff)
  const pas = unite / [3, 5, 8][densite]
  const colonnes = Math.ceil(W / pas)
  const rangees = Math.ceil(H / pas)
  const rayon = pas * 0.34
  const ombre = pas * 0.055

  /* Les bandes d'un cylindre, de son bord éclairé à son bord dans l'ombre. */
  const BANDES: readonly [number, number, number][] = [
    [-1, -0.52, 0.46],
    [-0.52, -0.1, 0.16],
    [-0.1, 0.42, -0.16],
    [0.42, 1, -0.5],
  ]

  /* Une barre manquante de loin en loin : sans elles, le tressage couvre tout
     et la palette n'a plus de fond où respirer. */
  const posee = (axe: number, rang: number): boolean => hacher(axe, rang, cle + 4) > 0.16

  for (let r = 0; r < rangees; r += 1) {
    for (let c = 0; c < colonnes; c += 1) {
      const couchee = posee(0, r)
      const debout = posee(1, c)
      if (!couchee && !debout) continue

      const x = c * pas
      const y = r * pas
      const cx = x + pas / 2
      const cy = y + pas / 2
      const teinteCouchee = C[Math.floor(hacher(0, r, cle + 1) * C.length)]
      const teinteDebout = C[Math.floor(hacher(1, c, cle + 2) * C.length)]

      const barreCouchee = () => {
        for (const [de, a, niveau] of BANDES) {
          face(ctx, eclairer(teinteCouchee, niveau), [
            [x, cy + de * rayon], [x + pas, cy + de * rayon],
            [x + pas, cy + a * rayon], [x, cy + a * rayon],
          ])
        }
      }
      const barreDebout = () => {
        for (const [de, a, niveau] of BANDES) {
          face(ctx, eclairer(teinteDebout, niveau), [
            [cx + de * rayon, y], [cx + de * rayon, y + pas],
            [cx + a * rayon, y + pas], [cx + a * rayon, y],
          ])
        }
      }
      /* L'ombre portée de la barre de dessus sur celle de dessous, de part et
         d'autre du croisement. */
      const ombreCouchee = () => {
        for (const sens of [-1, 1]) {
          face(ctx, eclairer(teinteDebout, -0.72), [
            [cx + sens * rayon, cy - rayon], [cx + sens * (rayon + ombre), cy - rayon],
            [cx + sens * (rayon + ombre), cy + rayon], [cx + sens * rayon, cy + rayon],
          ])
        }
      }
      const ombreDebout = () => {
        for (const sens of [-1, 1]) {
          face(ctx, eclairer(teinteCouchee, -0.72), [
            [cx - rayon, cy + sens * rayon], [cx - rayon, cy + sens * (rayon + ombre)],
            [cx + rayon, cy + sens * (rayon + ombre)], [cx + rayon, cy + sens * rayon],
          ])
        }
      }

      if (!debout) {
        barreCouchee()
        continue
      }
      if (!couchee) {
        barreDebout()
        continue
      }
      if ((r + c) % 2 === 0) {
        barreDebout()
        ombreDebout()
        barreCouchee()
      } else {
        barreCouchee()
        ombreCouchee()
        barreDebout()
      }
    }
  }
}

/* ---------- escaliers -------------------------------------------------------- */

/**
 * Les escaliers : le même empilement que les cubes, mais une hauteur qui compte
 * au lieu d'onduler.
 *
 * Cubes lit son altitude dans un bruit continu, et obtient des collines de
 * blocs. Ici l'altitude est une marche : elle monte d'un cran par case, revient
 * au sol tous les quelques crans, et recommence. Ce retour au sol est le motif à
 * lui seul. Il pose une paroi haute là où le bruit ne posait qu'une pente, et
 * c'est cette paroi qui fait lire un escalier plutôt qu'un terrain.
 *
 * Les volées voisines sont décalées de deux marches. Alignées, elles feraient
 * des gradins, c'est-à-dire une seule volée très large ; décalées, chaque volée
 * part où la précédente en est à mi-hauteur, et l'oeil monte en biais sans
 * jamais trouver le palier d'où tout serait parti. C'est le seul emprunt à
 * Escher que le geste s'autorise, et il ne coûte qu'un terme.
 *
 * La marche est moins haute qu'elle n'est profonde, à la différence du cube qui
 * est un vrai cube. C'est ce qu'est une marche, et c'est aussi ce qui empêche
 * les deux familles de se confondre au premier coup d'oeil.
 */
function escaliers(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const eclairer = eclairage(C)
  const cle = Math.floor(rnd() * 0x7fffffff)
  const cote = unite / [5, 8, 12][densite]

  /* La même base isométrique que les cubes : `+i` vers la droite en descendant,
     `+j` vers la gauche en descendant, `+k` tout droit vers le haut. */
  const demiLarge = cote * (Math.sqrt(3) / 2)
  const demiHaut = cote / 2
  /* Une marche, et non un cube : le contremarche fait un peu plus de la moitié
     du giron. */
  const etage = cote * 0.55

  const periode = [4, 5, 6][densite]
  const large = [2, 3, 3][densite]
  /* Le sens de la montée et le décalage des volées, tirés une fois. */
  const sens = rnd() < 0.5 ? 1 : -1
  const glisse = 1 + Math.floor(rnd() * 2)

  /* Le rang d'une case dans sa volée, et le numéro de la volée. Les deux
     sortent du même compte : la marche est le reste, la volée le quotient. */
  const bandeDe = (j: number) => Math.floor(j / large)
  const rangDe = (i: number, j: number) => i * sens + bandeDe(j) * glisse
  const hauteur = (i: number, j: number): number => {
    const r = rangDe(i, j)
    return ((r % periode) + periode) % periode
  }

  const fond = H + cote * 2
  const sMin = Math.floor(-periode * (etage / demiHaut)) - 2
  const sMax = Math.ceil(H / demiHaut) + 2
  const uMax = Math.ceil(W / demiLarge) + 2

  /* Les diagonales `s = i + j`, de la plus lointaine à la plus proche : c'est
     le peintre, et sur un damier isométrique il suffit. Deux cases d'une même
     diagonale ne se recouvrent jamais. */
  for (let s = sMin; s <= sMax; s += 1) {
    for (let u = -uMax; u <= uMax; u += 1) {
      if (((u - s) % 2 + 2) % 2 !== 0) continue
      const i = (s + u) / 2
      const j = (s - u) / 2

      const h = hauteur(i, j)
      const x = u * demiLarge
      const y = s * demiHaut - h * etage

      const nord: Point = [x, y]
      const est: Point = [x + demiLarge, y + demiHaut]
      const sud: Point = [x, y + demiHaut * 2]
      const ouest: Point = [x - demiLarge, y + demiHaut]

      if (est[0] < -demiLarge || ouest[0] > W + demiLarge) continue
      if (sud[1] < -demiHaut || y > fond) continue

      /* La teinte va à la volée entière, jamais à la marche. Une couleur par
         altitude découpait chaque volée en autant de teintes qu'elle a de
         marches : l'oeil y voyait des masses de couleur empilées et plus du
         tout un escalier. Une volée d'une seule teinte se suit du pied au
         sommet, et c'est elle l'objet. La valeur des faces continue de dire
         l'orientation, comme partout dans ce geste. */
      const volee = Math.floor(rangDe(i, j) / periode)
      const teinte = C[Math.floor(hacher(volee, bandeDe(j), cle) * C.length)]

      face(ctx, eclairer(teinte, 0.4), [nord, est, sud, ouest])
      face(ctx, eclairer(teinte, -0.1), [ouest, sud, [sud[0], fond], [ouest[0], fond]])
      face(ctx, eclairer(teinte, -0.52), [sud, est, [est[0], fond], [sud[0], fond]])
    }
  }
}

/* ---------- torsades --------------------------------------------------------- */

/**
 * Les torsades : un cordon enroulé autour de son fût, comme une colonne torse.
 *
 * La première version pinçait un ruban plat à chaque demi-tour, et le voisinage
 * l'a condamnée : posée à côté de **Fuseaux**, elle en reprenait la silhouette
 * exacte, une colonne de lentilles. Deux familles ne peuvent pas partager un
 * contour. Ce qu'un ruban vrillé a de propre n'était pas là ; il est ici, dans
 * l'enroulement.
 *
 * Le fût est un cylindre vertical qu'on ne dessine pas : on n'en peint que ce
 * qui se voit, la moitié tournée vers nous. Un point de sa surface est repéré
 * par l'angle qu'il fait avec l'axe du regard, et sa position dans l'image s'en
 * déduit par un sinus. Le cordon suit une hélice : son angle avance avec la
 * hauteur, il traverse la face visible en biais, disparaît par un bord et
 * revient par l'autre. Aucun pincement, aucune pointe, et c'est ce qui le
 * sépare du fuseau.
 *
 * L'éclairage appartient au fût, jamais au cordon. La face visible est coupée
 * en cinq tranches d'angle égal, chacune de sa valeur, la plus claire un peu à
 * gauche du milieu puisque la lumière vient de là ; le cordon prend la valeur
 * de la tranche qu'il traverse. C'est l'inverse de ce qu'on ferait
 * spontanément, et c'est ce qui donne le volume : un cordon ombré pour son
 * compte roulerait sur lui-même sans que la colonne, elle, soit ronde.
 *
 * Une seule teinte par colonne. Le fût est cette teinte enfoncée dans l'ombre,
 * si bien que le creux entre deux spires se lit comme un fond et non comme un
 * second objet.
 *
 * Le parcours est par rangées : un cadre plus haut n'ajoute qu'à la fin de la
 * liste, et un cadre plus large ne déplace pas ce qui est à gauche. Rien n'est
 * tiré dans les boucles, dont le compte dépend du format ; la phase et la
 * teinte de chaque colonne se lisent dans la clé par son numéro.
 */
function torsades(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const eclairer = eclairage(C)
  const cle = Math.floor(rnd() * 0x7fffffff)
  const pas = unite / [4, 6.5, 9.5][densite]
  /* Les fûts se touchent : un jeu entre eux laisserait passer une raie de fond
     à chaque colonne, et le motif deviendrait une palissade. */
  const rayon = pas * 0.5
  /* Le pas de l'hélice : ce qu'il faut descendre pour un tour entier. Plus
     court, les spires se serrent en trame ; beaucoup plus long, le cordon
     redevient une bande droite. */
  const hauteurTour = pas * (2.2 + 0.8 * rnd())
  /* Le tronçon vertical. Le compte se lit sur le bord du cordon, pas sur sa
     surface : à chaque tronçon, le bord se déplace de tout un trente-deuxième
     de tour, et si le tronçon est trop haut ce déplacement fait une marche
     d'escalier bien visible le long de la spire. Quatorze en donnaient une tous
     les demi-rayons. */
  const marche = hauteurTour / 32
  /* La demi-largeur angulaire du cordon : les deux tiers de la face visible lui
     reviennent, le tiers restant creusant la gorge. Au-delà, les spires se
     touchent et la gorge disparaît. */
  const cordon = 1.05
  /* Le sens de l'enroulement, tiré une fois pour toute l'image : des colonnes
     qui tourneraient chacune dans son sens ne feraient plus une torsade. */
  const sens = rnd() < 0.5 ? -1 : 1

  /* Les cinq tranches du fût, avec leur valeur. Le maximum est décalé vers la
     gauche, là où la lumière frappe. Le plancher de la plus sombre reste bien
     au-dessus de celui de la gorge : sur une teinte déjà foncée, les deux se
     confondraient et la colonne redeviendrait une bande plate. */
  const TRANCHES = 5
  const bornes: number[] = []
  const valeurs: number[] = []
  for (let j = 0; j <= TRANCHES; j += 1) bornes.push(-Math.PI / 2 + (j * Math.PI) / TRANCHES)
  for (let j = 0; j < TRANCHES; j += 1) {
    valeurs.push(0.62 * Math.cos((bornes[j] + bornes[j + 1]) / 2 + 0.45) - 0.2)
  }

  const colonnes = Math.ceil(W / pas) + 2
  const rangs = Math.ceil(H / marche) + 2
  const borne = (a: number, bas: number, haut: number): number =>
    Math.max(bas, Math.min(haut, a))
  const teinteDe = (c: number): string => C[Math.floor(hacher(c, 401, cle) * C.length)]

  /* Les fûts d'un seul tenant, avant tout cordon : un rectangle par colonne
     plutôt qu'un par case, ce qui divise le nombre de formes par le nombre de
     rangées. Aucune colonne n'empiète sur sa voisine, l'ordre entre elles est
     donc sans effet. Une image plus large n'ajoute des fûts qu'à droite, une
     image plus haute n'en ajoute aucun. */
  for (let c = -1; c < colonnes - 1; c += 1) {
    const x = (c + 0.5) * pas
    face(ctx, eclairer(teinteDe(c), -0.78), [
      [x - rayon, -marche], [x + rayon, -marche],
      [x + rayon, (rangs - 1) * marche], [x - rayon, (rangs - 1) * marche],
    ])
  }

  for (let k = -1; k < rangs - 1; k += 1) {
    const y0 = k * marche
    const y1 = y0 + marche

    for (let c = -1; c < colonnes - 1; c += 1) {
      const x = (c + 0.5) * pas
      const teinte = teinteDe(c)
      const phase = hacher(c, 17, cle) * Math.PI * 2
      /* L'angle se ramène dans un tour avant d'être essayé : sans cela il croît
         avec la hauteur et sort pour de bon de la fenêtre des trois spires
         voisines, le cordon s'évanouissant au bas de l'image. Le second angle
         se prend à partir du premier, pour que le tronçon ne se retourne pas
         quand le tour change. */
      const brut = phase + (sens * y0 * Math.PI * 2) / hauteurTour
      const tour = Math.PI * 2
      const a0 = brut - Math.floor(brut / tour + 0.5) * tour
      const a1 = a0 + (sens * marche * tour) / hauteurTour

      for (let j = 0; j < TRANCHES; j += 1) {
        const bas = bornes[j]
        const haut = bornes[j + 1]
        /* Une seule spire peut couper une tranche donnée, la face visible étant
           deux fois plus étroite qu'un tour ; on essaie les voisines pour que
           celle qui revient par le bord soit prise. */
        for (let t = -1; t <= 1; t += 1) {
          const centre0 = a0 + t * Math.PI * 2
          const centre1 = a1 + t * Math.PI * 2
          const g0 = borne(centre0 - cordon, bas, haut)
          const d0 = borne(centre0 + cordon, bas, haut)
          const g1 = borne(centre1 - cordon, bas, haut)
          const d1 = borne(centre1 + cordon, bas, haut)
          if (d0 - g0 <= 0 && d1 - g1 <= 0) continue

          face(ctx, eclairer(teinte, valeurs[j]), [
            [x + rayon * Math.sin(g0), y0], [x + rayon * Math.sin(d0), y0],
            [x + rayon * Math.sin(d1), y1], [x + rayon * Math.sin(g1), y1],
          ])
        }
      }
    }
  }
}

/* ---------- casiers ---------------------------------------------------------- */

/**
 * Le casier : un plateau de cases ouvertes, vu de la même axonométrie que les
 * cubes, chacune creusée à sa profondeur.
 *
 * Tout le groupe montre jusqu'ici des volumes pleins, vus du dehors. Celui-ci
 * est le seul qui montre un dedans, et c'est de là qu'il tire son image : on
 * voit le fond de chaque case et les deux parois du fond, celles qui nous font
 * face ; les deux parois de devant, elles, ne montrent que leur dos, qui est le
 * plateau. Un creux se dessine exactement comme une bosse, à ceci près que les
 * deux faces éclairées échangent leurs valeurs.
 *
 * Le plateau est d'une seule teinte, et chaque case de la sienne : c'est ce qui
 * fait lire une pièce unique percée de trous plutôt qu'un tas de boîtes. La
 * profondeur, elle, se lit à l'ombre du fond, qui s'enfonce d'un cran par
 * palier. Sans cet assombrissement, trois profondeurs donnent trois dessins
 * qu'on ne distingue qu'en suivant les parois du regard.
 *
 * L'ordre du peintre suffit et il n'y a rien à découper : le creux d'une case
 * déborde sur les cases d'en dessous, qui sont peintes après elle et
 * commencent par recouvrir leur losange. Ce débordement fixe la profondeur
 * maximale ; au-delà de deux demi-hauteurs, il sauterait par-dessus la rangée
 * suivante et un fond se retrouverait posé sur le plateau.
 */
function casiers(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const eclairer = eclairage(C)
  const cle = Math.floor(rnd() * 0x7fffffff)
  const cote = unite / [4.5, 7, 10.5][densite]

  /* La base isométrique des cubes, à l'identique. */
  const demiLarge = cote * (Math.sqrt(3) / 2)
  const demiHaut = cote / 2
  /* Le palier de profondeur, choisi pour que la case la plus creuse ne déborde
     que d'une rangée. */
  const palier = cote * 0.33

  /* Ce qu'il reste du plateau entre deux cases : la case est le losange réduit
     vers son centre. À moins de sept dixièmes, le plateau mange le motif ; à
     plus de neuf, les cases se touchent et le plateau n'est plus qu'un trait. */
  const creux = 0.76
  /* Le plateau prend la teinte la plus claire de la palette, et lui seul monte
     dans le jour. C'est la condition pour qu'on lise un creux : une case moins
     sombre que ce qui l'entoure se retourne en bosse, et l'axonométrie ne
     tranche pas, elle laisse l'oeil décider. Tirer la teinte du plateau au
     hasard donnait une case sur trois en relief. */
  const plateau = duClairAuSombre(C)[0]

  const sMax = Math.ceil(H / demiHaut) + 4
  const uMax = Math.ceil(W / demiLarge) + 2

  /* Les diagonales `s = i + j`, de la plus lointaine à la plus proche. */
  for (let s = -2; s <= sMax; s += 1) {
    for (let u = -uMax; u <= uMax; u += 1) {
      if (((u - s) % 2 + 2) % 2 !== 0) continue
      const i = (s + u) / 2
      const j = (s - u) / 2

      const x = u * demiLarge
      const y = s * demiHaut
      if (x + demiLarge < 0 || x - demiLarge > W) continue

      /* Le losange du plateau, d'abord et en entier : il recouvre ce que la
         rangée précédente a laissé déborder. */
      face(ctx, eclairer(plateau, 0.4), [
        [x, y], [x + demiLarge, y + demiHaut], [x, y + demiHaut * 2],
        [x - demiLarge, y + demiHaut],
      ])

      const profond = 1 + Math.floor(hacher(i, j, cle) * 3)
      const fond = profond * palier
      const teinte = C[Math.floor(hacher(i, j, cle + 7) * C.length)]

      const cx = x
      const cy = y + demiHaut
      const nord: Point = [cx, cy - creux * demiHaut]
      const est: Point = [cx + creux * demiLarge, cy]
      const sud: Point = [cx, cy + creux * demiHaut]
      const ouest: Point = [cx - creux * demiLarge, cy]

      /* Les deux parois du fond, dans les valeurs des faces du cube mais
         échangées : celle qui borde le nord-ouest regarde vers le sud-est, là
         où le cube tourne sa face sombre. Toutes deux restent sous le plateau,
         quelle que soit leur teinte : c'est l'ombre du creux. */
      face(ctx, eclairer(teinte, -0.58), [
        nord, ouest, [ouest[0], ouest[1] + fond], [nord[0], nord[1] + fond],
      ])
      face(ctx, eclairer(teinte, -0.18), [
        nord, est, [est[0], est[1] + fond], [nord[0], nord[1] + fond],
      ])
      /* Le fond est à plat comme le plateau, mais la lumière n'y descend
         qu'en partie, et de moins en moins à mesure qu'on creuse : c'est ce
         seul assombrissement qui fait lire trois profondeurs. */
      face(ctx, eclairer(teinte, 0.05 - 0.2 * profond), [
        [nord[0], nord[1] + fond], [est[0], est[1] + fond],
        [sud[0], sud[1] + fond], [ouest[0], ouest[1] + fond],
      ])
    }
  }
}

/* ---------- soufflet --------------------------------------------------------- */

/**
 * Le soufflet : un pli d'accordéon régulier, celui des cartes qu'on déplie
 * d'une main et des soufflets de chambre photographique.
 *
 * C'est le contraire exact de **Plis**, et les deux ne tiennent ensemble qu'à
 * ce titre. Là, une nappe froissée au hasard, dont aucune facette ne répète la
 * voisine ; ici, un pli calculé, quatre orientations seulement, qui reviennent
 * en damier sur toute l'image. L'un est du papier qu'on a chiffonné, l'autre du
 * papier qu'on a plié.
 *
 * La géométrie tient en une ligne : les lignes de pli horizontales font un
 * zigzag, les verticales restent droites. Une colonne sur deux est décalée vers
 * le bas, et il n'en faut pas davantage pour que chaque facette devienne un
 * parallélogramme penché, tantôt dans un sens tantôt dans l'autre.
 *
 * Les valeurs se lisent sur les deux parités. Celle de la rangée est la grande,
 * puisqu'elle porte le pli lui-même, une facette montant vers la lumière et la
 * suivante s'en détournant ; celle de la colonne n'ajoute qu'un biais, le
 * quart de tour que le zigzag donne à la facette. Quatre valeurs en tout, et le
 * volume est entier : il n'y a rien à ombrer de plus.
 *
 * La couleur ne suit pas le pli, elle le traverse. Une teinte par facette ferait
 * un damier de confettis, une teinte par rangée ferait des rayures qui doublent
 * le pli ; un bruit lent pose des plaques de couleur qui coupent les rangées en
 * travers, et c'est ce qui empêche de lire le motif comme une trame.
 */
function soufflet(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const eclairer = eclairage(C)
  const cle = Math.floor(rnd() * 0x7fffffff)
  const bruit = bruiteur(cle)
  const large = unite / [5.5, 9, 14][densite]
  /* La rangée est plus courte que la colonne : un pli carré se lit comme un
     damier, un pli écrasé se lit comme un pli. */
  const haut = large * 0.58
  /* Le décalage d'une colonne sur deux, qui fait tout le zigzag. Au-delà des
     trois quarts de la rangée, les facettes se croisent et le pli se déchire. */
  const zigzag = haut * (0.5 + 0.25 * rnd())
  /* L'échelle des plaques de couleur, prise sur le petit côté et non en
     facettes : comptée en facettes, la plaque rétrécit avec la densité et le
     bruit finit par changer de teinte à chaque pli, ce qui fait une neige de
     couleurs. Rapportée à l'image, elle garde la même taille aux trois crans et
     seul le pli s'affine. */
  const plaque = unite * (0.26 + 0.14 * rnd())

  const colonnes = Math.ceil(W / large) + 2
  const rangees = Math.ceil((H + zigzag) / haut) + 2

  const ordonnee = (m: number, n: number): number =>
    n * haut + (((m % 2) + 2) % 2 === 1 ? zigzag : 0)

  for (let n = -1; n < rangees - 1; n += 1) {
    for (let m = -1; m < colonnes - 1; m += 1) {
      const x0 = m * large
      const x1 = x0 + large
      const yGauche = ordonnee(m, n)
      const yDroite = ordonnee(m + 1, n)

      const pairRangee = (((n % 2) + 2) % 2) === 1
      const pairColonne = (((m % 2) + 2) % 2) === 1
      /* La parité de la rangée porte le pli, celle de la colonne le biais. */
      const niveau = 0.06 + (pairRangee ? 0.34 : -0.34) + (pairColonne ? 0.14 : -0.14)
      const teinte = C[Math.min(
        C.length - 1, Math.floor(bruit(x0 / plaque, (yGauche + haut / 2) / plaque) * C.length),
      )]

      face(ctx, eclairer(teinte, niveau), [
        [x0, yGauche], [x1, yDroite], [x1, yDroite + haut], [x0, yGauche + haut],
      ])
    }
  }
}

/* ---------- treillis --------------------------------------------------------- */

/**
 * Le treillis : une charpente de barres, et le vide entre elles.
 *
 * Les huit autres volumes sont pleins ; celui-ci est le seul qu'on traverse du
 * regard. C'est ce qui le justifie, et c'est aussi ce qui le rend délicat : dès
 * qu'on voit le fond au travers, la moindre barre mal empilée se remarque, alors
 * qu'un massif d'aplats pardonne tout.
 *
 * À chaque noeud partent trois barres, une par axe de l'axonométrie : deux
 * poutres qui filent en losange et un montant qui descend à l'étage du dessous.
 * Le montant coupe chaque losange en deux, et le vide du treillis est donc fait
 * de triangles, ce qui est la figure de toutes les charpentes : c'est la seule
 * maille qu'on ne peut pas déformer sans casser une barre.
 *
 * La teinte suit un bruit lent plutôt que le tirage de chaque case. Tirée case
 * par case, elle sème des barres isolées d'une autre couleur que l'oeil lit
 * comme des manques dans la structure ; par plaques, elle lit comme des travées
 * peintes séparément, ce qu'une charpente est.
 *
 * Une barre n'est pas un trait : c'est une poutre, et elle se dessine en deux
 * aplats, le dessus et le côté. C'est le minimum pour qu'elle ait une épaisseur,
 * et le maximum qu'on puisse se permettre à ce compte de barres. Un seul aplat
 * par barre rendait un dessin au trait, ce que ce groupe ne fait jamais.
 *
 * L'ordre du peintre est celui des cubes : les diagonales `i plus j`, de la plus
 * lointaine à la plus proche. C'est ce qui met les barres de devant devant, et
 * il n'y a rien d'autre à calculer.
 */
function treillis(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const eclairer = eclairage(C)
  const cle = Math.floor(rnd() * 0x7fffffff)
  const cote = unite / [3.6, 5.6, 8.4][densite]

  const demiLarge = cote * (Math.sqrt(3) / 2)
  const demiHaut = cote / 2
  const etage = cote * 0.86
  /* La section de la poutre. Au-delà du quart du côté, les barres se touchent
     aux noeuds et le treillis se referme en massif. */
  const poutre = cote * 0.15

  const bruit = bruiteur(cle)
  const plaque = unite * (0.3 + 0.16 * rnd())

  /* La poutre : le dessus, puis le côté qui pend dessous. Les deux quadrilatères
     partagent une arête, si bien qu'aucun liseré de fond ne passe entre eux. */
  const barre = (
    ax: number, ay: number, bx: number, by: number, teinte: string, niveau: number,
  ): void => {
    face(ctx, eclairer(teinte, niveau + 0.34), [
      [ax, ay], [bx, by], [bx, by + poutre], [ax, ay + poutre],
    ])
    face(ctx, eclairer(teinte, niveau), [
      [ax, ay + poutre], [bx, by + poutre],
      [bx, by + poutre * 2], [ax, ay + poutre * 2],
    ])
  }

  const sMax = Math.ceil(H / demiHaut) + 4
  const uMax = Math.ceil(W / demiLarge) + 2

  for (let s = -4; s <= sMax; s += 1) {
    for (let u = -uMax; u <= uMax; u += 1) {
      if (((u - s) % 2 + 2) % 2 !== 0) continue

      const x = u * demiLarge
      const y = s * demiHaut
      if (x + demiLarge * 2 < 0 || x - demiLarge * 2 > W) continue

      const teinte = C[Math.min(
        C.length - 1, Math.floor(bruit(x / plaque, y / plaque) * C.length),
      )]

      /* L'étage bas, puis le montant, puis l'étage haut : de bas en haut, ce qui
         est aussi l'ordre du plus lointain au plus proche dans une même case. */
      for (const k of [0, 1]) {
        const ny = y - k * etage
        if (k === 1) {
          /* Le montant, avant les poutres du haut qu'il porte. */
          face(ctx, eclairer(teinte, 0.12), [
            [x - poutre, ny], [x + poutre, ny],
            [x + poutre, ny + etage], [x - poutre, ny + etage],
          ])
        }
        barre(x, ny, x + demiLarge, ny + demiHaut, teinte, -0.5)
        barre(x, ny, x - demiLarge, ny + demiHaut, teinte, -0.08)
      }
    }
  }
}

/* ---------- aiguillage ------------------------------------------------------- */

export function peindreRelief(
  ctx: Pinceau, W: number, H: number, id: IdRelief,
  C: readonly string[], densite: Densite, rnd: Alea, unite: number,
): void {
  if (id === 'cubes') cubes(ctx, W, H, C, densite, rnd, unite)
  else if (id === 'plis') plis(ctx, W, H, C, densite, rnd, unite)
  else if (id === 'bossage') bossage(ctx, W, H, C, densite, rnd, unite)
  else if (id === 'tuyaux') tuyaux(ctx, W, H, C, densite, rnd, unite)
  else if (id === 'escaliers') escaliers(ctx, W, H, C, densite, rnd, unite)
  else if (id === 'torsades') torsades(ctx, W, H, C, densite, rnd, unite)
  else if (id === 'casiers') casiers(ctx, W, H, C, densite, rnd, unite)
  else if (id === 'soufflet') soufflet(ctx, W, H, C, densite, rnd, unite)
  else treillis(ctx, W, H, C, densite, rnd, unite)
}
