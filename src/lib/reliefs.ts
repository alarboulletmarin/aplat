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
 * C'est la seule règle que les cinq familles partagent, et c'est elle qui les
 * fait tenir ensemble. Une face tournée vers elle prend la teinte de la
 * palette poussée vers le jour, une face qui s'en détourne la même poussée
 * vers l'ombre (`eclairage`, dans `trace.ts`).
 *
 * Chacune fabrique sa profondeur autrement, et c'est ce qui les sépare.
 * **Cubes** empile des solides en axonométrie, trois faces par cube, sans
 * point de fuite. **Plis** froisse une nappe et donne à chaque facette la
 * valeur de sa pente, la profondeur venant du calcul et non du dessin.
 * **Bossage** ne creuse rien du tout : ses panneaux sont plats, et seul le
 * chanfrein dit lesquels sortent et lesquels rentrent. **Tuyaux** courbe la
 * valeur en travers d'une barre droite, et une barre devient un cylindre.
 * **Point de fuite** abandonne l'axonométrie pour la perspective vraie : tout
 * converge vers un point, et la couleur pâlit avec la distance.
 *
 * Comme les familles de grille, aucune ne tire au sort dans une boucle dont le
 * compte dépend du format : la graine fabrique une clé, et chaque case ou
 * chaque sommet interroge cette clé par ses coordonnées.
 */
import type { Alea, Densite, Pinceau } from './moteur'
import {
  bruiteur, duClairAuSombre, eclairage, hacher, polygone, type Point,
} from './trace'

export const IDS_RELIEFS = ['cubes', 'plis', 'bossage', 'tuyaux', 'fuite'] as const

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

/* ---------- point de fuite --------------------------------------------------- */

/**
 * La perspective vraie, celle qui a un point de fuite.
 *
 * Les quatre autres familles gardent les parallèles parallèles : c'est
 * l'axonométrie, elle donne du volume mais pas de distance. Ici tout converge
 * vers un point posé sur l'horizon, et le damier au sol se resserre en s'en
 * approchant. Une case au sol est un simple quadrilatère, et le calcul tient
 * en une ligne : à la profondeur `z`, tout se réduit d'un facteur `1 / z`, en
 * largeur comme en hauteur.
 *
 * La seconde profondeur est dans la couleur, et c'est celle qui compte le
 * plus. Un damier qui se resserre sans pâlir se lit comme un motif de plus en
 * plus fin ; le même damier pâli à mesure qu'il s'éloigne se lit comme une
 * plaine. Les peintres appellent ça la perspective aérienne.
 *
 * Elle se fait par l'éclairage et non par un mélange avec la couleur du ciel,
 * ce qui était le premier essai : mélanger un sol bleu marine avec un ciel
 * jaune vert rend un kaki, et la plaine ressortait boueuse sur la moitié des
 * palettes. Pousser la même teinte vers le jour ne déplace pas sa couleur, et
 * le lointain reste de la couleur du proche, en plus clair, ce qui est
 * exactement ce que fait l'air.
 *
 * Le sol est peint bande par bande, une par rangée de profondeur, parce qu'un
 * aplat unique ne saurait pas pâlir : c'est lui qui porte la brume, et les
 * cases du damier ne font que s'y poser.
 *
 * Les blocs debout donnent l'échelle, et leur flanc visible dépend du côté du
 * point de fuite où ils se trouvent. C'est la seule chose que l'axonométrie ne
 * sait pas faire, et c'est ce qui distingue vraiment cette famille des quatre
 * autres.
 */
function fuite(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const eclairer = eclairage(C)
  const teintes = duClairAuSombre(C)
  /* Le sol part de la teinte la plus sombre : c'est elle qui a le plus de
     marge pour pâlir, et c'est la seule qui donne au premier plan de quoi
     détacher les cases du damier posées dessus. */
  const sol = teintes[teintes.length - 1]

  const horizon = H * (0.2 + 0.14 * rnd())
  const fx = W * (0.3 + 0.4 * rnd())
  const cle = Math.floor(rnd() * 0x7fffffff)
  const profondeurs = [10, 16, 24][densite]
  const largeurs = [9, 14, 20][densite]
  const bas = H - horizon

  /* `u` est le facteur de réduction à la profondeur `z` : plein cadre au
     premier plan, nul à l'horizon. */
  const u = (z: number): number => 1 / (1 + z * 0.42)
  const auSol = (lateral: number, z: number): Point => [
    fx + lateral * unite * 0.3 * u(z),
    horizon + bas * u(z),
  ]
  /* La distance lue de 0, au premier plan, à 1, sur l'horizon. */
  const loin = (z: number): number => 1 - u(z)
  /* La brume : de la teinte du sol au premier plan, presque celle du ciel au
     bout de la plaine. */
  const brume = (teinte: string, z: number, assise: number): string =>
    eclairer(teinte, assise + (0.86 - assise) * loin(z))

  /* Le ciel n'est pas peint : c'est le fond de la palette. Un ciel pris dans
     les teintes ressortait presque blanc sur les onze, et Nuit comme Encre y
     perdaient d'un coup ce pour quoi on les choisit. Le fond, lui, est sombre
     quand la palette l'est, et la plaine embrumée s'y lit comme un banc de
     brouillard sous un ciel de nuit.

     Ce qui reste entre l'horizon et la rangée la plus lointaine : la plaine y
     a déjà rejoint le lointain, et sans cette bande le damier buterait sur une
     ligne nette. */
  ctx.fillStyle = brume(sol, profondeurs, -0.1)
  ctx.fillRect(0, horizon, W, H - horizon)

  for (let z = profondeurs - 1; z >= 0; z -= 1) {
    /* La bande de sol, sur toute la largeur : c'est elle qui pâlit avec la
       distance, et le damier ne fait que s'y poser.

       Chaque bande descend jusqu'au bas de l'image et la suivante, plus
       proche, la recouvre : les bandes se joignent donc sans couture, et sans
       le pixel de rattrapage qu'un raccord bord à bord réclamait. Un pixel
       est une longueur, et aucune famille du moteur n'en connaît. */
    const arriere = horizon + bas * u(z + 1)
    ctx.fillStyle = brume(sol, z, -0.1)
    ctx.fillRect(0, arriere, W, H - arriere)

    for (let i = -largeurs; i < largeurs; i += 1) {
      /* Une case sur deux seulement : l'autre laisse voir la bande de sol, et
         le damier n'a pas à peindre deux fois la même surface. */
      if (((i + z) % 2 + 2) % 2 !== 0) continue
      const a = auSol(i, z)
      const b = auSol(i + 1, z)
      const c = auSol(i + 1, z + 1)
      const d = auSol(i, z + 1)
      if (Math.min(a[0], d[0]) > W || Math.max(b[0], c[0]) < 0) continue
      face(ctx, brume(C[Math.floor(hacher(i, z, cle + 1) * C.length)], z, -0.2), [a, b, c, d])
    }
  }

  /* Les blocs, du plus lointain au plus proche : trois faces chacun. */
  const blocs = [4, 7, 11][densite]
  const tirages = Array.from({ length: blocs }, () => ({
    lateral: (rnd() - 0.5) * largeurs * 1.4,
    z: rnd() * (profondeurs - 2),
    largeur: 0.4 + 0.8 * rnd(),
    hauteur: 0.5 + 1.3 * rnd(),
    teinte: C[Math.floor(rnd() * C.length)],
  })).sort((a, b) => b.z - a.z)

  for (const bloc of tirages) {
    const { lateral, z, largeur, hauteur, teinte } = bloc
    const monte = bas * 0.62 * hauteur
    const [xa, ya] = auSol(lateral, z)
    const [xb] = auSol(lateral + largeur, z)
    const [xc, yc] = auSol(lateral, z + largeur)
    const [xd] = auSol(lateral + largeur, z + largeur)
    const ha = monte * u(z)
    const hb = monte * u(z + largeur)
    const peindre = (niveau: number, points: readonly Point[]) =>
      face(ctx, brume(teinte, z, niveau), points)

    /* La face de devant, celle qui regarde le spectateur. */
    peindre(0.06, [[xa, ya], [xb, ya], [xb, ya - ha], [xa, ya - ha]])
    /* Le dessus, qui fuit vers le point. */
    peindre(0.42, [[xa, ya - ha], [xb, ya - ha], [xd, yc - hb], [xc, yc - hb]])
    /* Le flanc : à gauche du point de fuite on voit celui de droite, et
       inversement. */
    if ((xa + xb) / 2 < fx) {
      peindre(-0.4, [[xb, ya], [xb, ya - ha], [xd, yc - hb], [xd, yc]])
    } else {
      peindre(-0.4, [[xa, ya], [xa, ya - ha], [xc, yc - hb], [xc, yc]])
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
  else fuite(ctx, W, H, C, densite, rnd, unite)
}
