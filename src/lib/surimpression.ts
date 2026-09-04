// SPDX-License-Identifier: AGPL-3.0-only

/**
 * La surimpression : deux encres, et une troisième là où elles se croisent.
 *
 * Le geste vient de l'affiche sérigraphiée. On tire une première encre, on
 * tire la seconde par dessus, et aux croisements les deux se multiplient : le
 * rouge sur le bleu ne donne ni du rouge ni du bleu, il donne une troisième
 * couleur que personne n'a choisie et que tout le monde reconnaît. C'est ce
 * qui distingue une affiche à deux couleurs d'un dessin à deux couleurs.
 *
 * Le moteur ne peut pas l'obtenir comme un logiciel de dessin l'obtiendrait.
 * `multiply` existe sur le canevas, mais le pinceau qui note, celui de
 * `svg.ts`, accepte `globalCompositeOperation` sans l'écrire : un motif tiré
 * en fondu serait une image sur le canevas et une autre dans le fichier
 * vectoriel, ce qui casse la promesse centrale du produit. La transparence est
 * écartée pour la même raison qu'ailleurs dans le moteur, et elle ne donnerait
 * de toute façon pas la même couleur.
 *
 * La surimpression est donc **calculée**, comme l'interférence des trames l'est
 * déjà : la troisième couleur est le produit canal par canal des deux encres, et
 * la région où elle se pose est l'intersection géométrique des deux formes,
 * découpée avant d'être peinte. Trois aplats opaques, aucun fondu, et le
 * vectoriel dit exactement ce que le canevas montre.
 *
 * Tout tient à ce que l'intersection soit calculable. Découper un polygone
 * quelconque par un autre demande une algèbre de polygones que ce dépôt n'a pas
 * et n'aura pas ; découper un polygone par un **convexe** ne demande que la
 * coupe de Sutherland et Hodgman, déjà écrite dans `trace.ts` et déjà employée
 * par la fracture et les hachures. Les formes du motif sont donc toutes
 * convexes, et ce n'est pas une contrainte subie : un signe d'affiche est un
 * fût, un bol, un quart de rond, un triangle, et une boucle épaisse se découpe
 * en quadrilatères et en disques. Ce que la contrainte interdit vraiment, c'est
 * la lettre elle-même, dont le contour ne se réduit pas à des convexes ; le
 * motif pose des signes qui en ont la carrure, et pas un alphabet.
 */
import type { Alea, Densite, Pinceau } from './moteur'
import {
  couperDemiPlan, duClairAuSombre, hacher, houleFermee, polygone, type Point,
} from './trace'

export const IDS_SURIMPRESSIONS = ['affiche'] as const

export type IdSurimpression = (typeof IDS_SURIMPRESSIONS)[number]

export function estSurimpression(valeur: unknown): valeur is IdSurimpression {
  return IDS_SURIMPRESSIONS.includes(valeur as IdSurimpression)
}

/* ---------- les encres ------------------------------------------------------- */

/**
 * Le produit de deux encres, canal par canal.
 *
 * C'est la loi de l'encre transparente posée sur une encre sèche : chaque
 * canal ne peut que descendre, jamais monter, et le croisement est toujours
 * plus sombre que les deux encres qui le font. Le calcul se fait en sRGB sans
 * correction, exactement comme `melangeHex` du même module, et pour la même
 * raison : ce qu'on cherche est la couleur qu'un imprimeur obtiendrait, pas
 * une interpolation juste.
 */
export function surimprimer(a: string, b: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return a
  const canal = (i: number) => {
    const x = Number.parseInt(a.slice(1 + i * 2, 3 + i * 2), 16)
    const y = Number.parseInt(b.slice(1 + i * 2, 3 + i * 2), 16)
    return Math.round((x * y) / 255).toString(16).padStart(2, '0')
  }
  return `#${canal(0)}${canal(1)}${canal(2)}`.toUpperCase()
}

/* ---------- découpe ---------------------------------------------------------- */

/**
 * L'intersection d'un polygone quelconque et d'un convexe.
 *
 * Le sujet est coupé par chaque côté de la découpe, une fois par côté. Le sens
 * du polygone de découpe n'est pas supposé : on regarde de quel côté tombe son
 * propre centre, ce qui décide de la normale sans avoir à savoir si le contour
 * tourne dans un sens ou dans l'autre. Un signe écrit à l'envers passait
 * autrement au travers de toutes les coupes et rendait un rectangle plein.
 */
function couperConvexe(sujet: readonly Point[], decoupe: readonly Point[]): Point[] {
  if (sujet.length < 3 || decoupe.length < 3) return []
  const cx = decoupe.reduce((somme, p) => somme + p[0], 0) / decoupe.length
  const cy = decoupe.reduce((somme, p) => somme + p[1], 0) / decoupe.length
  let reste: Point[] = [...sujet]
  for (let i = 0; i < decoupe.length && reste.length >= 3; i += 1) {
    const a = decoupe[i]
    const b = decoupe[(i + 1) % decoupe.length]
    let nx = b[1] - a[1]
    let ny = a[0] - b[0]
    let d = a[0] * nx + a[1] * ny
    if (cx * nx + cy * ny > d) {
      nx = -nx
      ny = -ny
      d = -d
    }
    reste = couperDemiPlan(reste, nx, ny, d)
  }
  return reste.length >= 3 ? reste : []
}

/** Le polygone d'un disque : convexe, donc découpable. */
function disque(cx: number, cy: number, rayon: number, sommets = 18): Point[] {
  return Array.from({ length: sommets }, (_, i): Point => {
    const angle = (i / sommets) * Math.PI * 2
    return [cx + Math.cos(angle) * rayon, cy + Math.sin(angle) * rayon]
  })
}

/** Le quadrilatère d'un segment épais, sans ses bouts : convexe lui aussi. */
function tronçon(de: Point, vers: Point, epaisseur: number): Point[] {
  const dx = vers[0] - de[0]
  const dy = vers[1] - de[1]
  const longueur = Math.hypot(dx, dy) || 1
  const nx = (-dy / longueur) * (epaisseur / 2)
  const ny = (dx / longueur) * (epaisseur / 2)
  return [
    [de[0] + nx, de[1] + ny],
    [vers[0] + nx, vers[1] + ny],
    [vers[0] - nx, vers[1] - ny],
    [de[0] - nx, de[1] - ny],
  ]
}

/* ---------- les signes ------------------------------------------------------- */

/**
 * Le jeu de signes, et pourquoi il ressemble à des lettres sans en être.
 *
 * Chacun est une liste de convexes, jamais une forme creuse : un compteur de
 * lettre, le blanc au milieu d'un O, se fabrique donc avec quatre fûts posés en
 * cadre plutôt qu'avec un anneau troué. Le dessin y gagne d'ailleurs, un cadre
 * de quatre fûts étant exactement ce qu'une grotesque étroite dessine.
 *
 * Les proportions sont celles d'une grotesque de titre : le fût vaut deux
 * cinquièmes de la chasse, et le cadre est monté sur un fût plus mince que les
 * autres signes. Ce n'est pas une coquetterie : monté sur le fût courant, son
 * compteur se refermait en une fente, et un cadre sans compteur n'est plus un
 * O, c'est un pavé. Le blanc intérieur est ce qui fait lire une lettre.
 *
 * Les signes remplissent la case jusqu'à ses bords, l'approche étant retirée
 * de la case en amont : c'est ce qui fait tenir une ligne serrée, comme sur
 * les affiches où les mots se touchent.
 */
function signe(x: number, y: number, w: number, h: number, rang: number): Point[][] {
  const fut = w * 0.42
  const barre = h * 0.3
  const rect = (px: number, py: number, pw: number, ph: number): Point[] => [
    [px, py], [px + pw, py], [px + pw, py + ph], [px, py + ph],
  ]
  /* Le demi-disque et le quart de disque sont donnés en sommets, et non par un
     arc : le pinceau saurait tracer l'arc, la découpe ne saurait pas le
     couper. */
  const secteur = (cx: number, cy: number, rayon: number, de: number, a: number): Point[] => {
    const sommets = 10
    const points: Point[] = [[cx, cy]]
    for (let i = 0; i <= sommets; i += 1) {
      const angle = de + ((a - de) * i) / sommets
      points.push([cx + Math.cos(angle) * rayon, cy + Math.sin(angle) * rayon])
    }
    return points
  }

  switch (rang) {
    case 0: /* le fût plein : la haste d'un I, d'un L, d'un H */
      return [rect(x + (w - fut) / 2, y, fut, h)]
    case 1: { /* le cadre : quatre fûts, le compteur d'un O ou d'un D */
      const mince = w * 0.26
      const traverse = h * 0.2
      return [
        rect(x, y, w, traverse),
        rect(x, y + h - traverse, w, traverse),
        rect(x, y + traverse, mince, h - traverse * 2),
        rect(x + w - mince, y + traverse, mince, h - traverse * 2),
      ]
    }
    case 2: /* le bol : la panse d'un P, d'un B, d'un C */
      return [
        secteur(x + w / 2, y + h / 2, Math.min(w, h) / 2, -Math.PI / 2, Math.PI / 2),
        rect(x, y, fut, h),
      ]
    case 3: /* les deux barres : la traverse d'un E, d'un F */
      return [rect(x, y, w, barre * 0.8), rect(x, y + h - barre * 0.8, w, barre * 0.8)]
    case 4: /* le quart de rond : l'épaule d'un n, la queue d'un a */
      return [secteur(x, y + h, Math.min(w, h), -Math.PI / 2, 0)]
    case 5: /* la diagonale : l'oblique d'un V, d'un X */
      return [[
        [x, y], [x + w * 0.55, y], [x + w, y + h], [x + w * 0.45, y + h],
      ]]
    case 6: /* le pavé : la lettre qu'on ne lit plus, l'aplat qui tient la ligne */
      return [rect(x, y, w, h)]
    default: /* la case blanche : l'espace entre deux mots */
      return []
  }
}

/* ---------- l'affiche -------------------------------------------------------- */

/**
 * Des signes serrés en lignes, et deux boucles tirées par dessus.
 *
 * La composition est celle d'une affiche de titrage : des lignes de hauteurs
 * inégales, empilées du haut au bas du cadre, chacune découpée en cases de
 * largeurs inégales. Rien n'y est centré et rien n'y respire, parce que c'est
 * le serrage qui fait lire un titre. Les lignes se comptent sur le format et
 * les cases sur la ligne, donc aucun tirage ne se fait dans ces deux boucles :
 * la clé est interrogée par les coordonnées, comme dans le carreau.
 *
 * Les boucles sont l'autre moitié du motif. Elles sont fermées et tirées au
 * gros trait, elles sortent du cadre et y reviennent, et elles ne suivent
 * aucune des lignes de signes : c'est ce désaccord entre la rigueur du bloc de
 * texte et le geste libre qui passe dessus que les affiches de référence
 * emploient toutes.
 */
function affiche(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  /* Les deux encres se prennent au milieu de l'échelle, et c'est la couleur du
     croisement qui l'exige. Le produit de deux canaux ne peut que descendre :
     la teinte la plus sombre d'une palette, multipliée par n'importe quoi,
     rend un noir dont personne ne dira quelle encre l'a fait, et l'affiche
     perd sa troisième couleur au moment même où elle la gagne. Deux teintes
     moyennes rendent un croisement franc, plus sombre que les deux et
     reconnaissable comme leur produit, ce que les affiches de référence
     montrent partout. */
  const teintes = duClairAuSombre(C)
  const encre = teintes[Math.min(teintes.length - 1, 2)]
  const accent = teintes[Math.min(teintes.length - 2, 1)]
  const croisement = surimprimer(encre, accent)

  const cle = Math.floor(rnd() * 0x7fffffff)
  const lignes = [4, 6, 9][densite]
  const marge = unite * 0.05
  const approche = unite * 0.014
  const interligne = unite * 0.016
  const dedans = { x: marge, y: marge, w: W - marge * 2, h: H - marge * 2 }

  /* Les signes, tous posés avant la moindre peinture : la surimpression a
     besoin de la liste entière pour découper, et un signe peint plus tôt ne
     se laisserait plus croiser. */
  const formes: Point[][] = []
  const hauteurs = Array.from({ length: lignes }, (_, r) => 0.7 + 0.6 * hacher(0, r, cle))
  const somme = hauteurs.reduce((a, b) => a + b, 0)
  let y = dedans.y
  for (let r = 0; r < lignes; r += 1) {
    const h = (hauteurs[r] / somme) * dedans.h
    /* Le compte de cases suit la hauteur de la ligne : une ligne haute porte
       des signes larges, donc peu, ce qui est exactement ce qu'un titrage
       fait quand un mot court occupe une ligne entière. */
    const cases = Math.max(2, Math.round(dedans.w / (h * 0.66)))
    const parts = Array.from({ length: cases }, (_, c) => 0.85 + 0.3 * hacher(c + 1, r, cle))
    const large = parts.reduce((a, b) => a + b, 0)
    let x = dedans.x
    for (let c = 0; c < cases; c += 1) {
      const w = (parts[c] / large) * dedans.w
      const tirage = hacher(c + 1, r, cle + 7)
      /* Une case sur huit reste blanche, et c'est le seul blanc de la
         composition : sans lui, le bloc devient un mur et cesse de se lire
         comme des mots. */
      /* Le tirage n'est pas uniforme : le pavé plein ferme la ligne et le
         blanc l'ouvre, et il en faut peu des deux. Les cinq signes qui portent
         un compteur ou une courbe se partagent le reste, parce que ce sont eux
         qui font lire de la lettre plutôt que de la brique. */
      const JEU = [0, 0, 1, 1, 1, 2, 2, 3, 4, 5, 6]
      const rang = tirage < 0.1
        ? 7
        : JEU[Math.floor(hacher(c + 1, r, cle + 13) * JEU.length) % JEU.length]
      /* L'approche et l'interligne sont des longueurs fixes, jamais des parts
         de la case : une chasse étroite et une chasse large doivent laisser le
         même blanc entre elles, sinon la ligne cesse de se lire comme un mot.
         C'est l'approche d'un titrage serré, et c'est elle qui fait tout. */
      for (const piece of signe(x, y, w - approche, h - interligne, rang)) formes.push(piece)
      x += w
    }
    y += h
  }

  ctx.fillStyle = encre
  for (const piece of formes) {
    polygone(ctx, piece)
    ctx.fill()
  }

  /* Les boucles, chacune découpée en tronçons et en disques de raccord : ce
     sont les convexes que la surimpression sait croiser. Le disque de raccord
     fait aussi le bout rond, et c'est pour cela qu'il y en a un de plus que de
     tronçons. */
  const boucles = [1, 2, 2][densite]
  for (let b = 0; b < boucles; b += 1) {
    const cx = W * (0.25 + 0.5 * rnd())
    const cy = H * (0.2 + 0.6 * rnd())
    const rayon = Math.min(W, H) * (0.34 + 0.24 * rnd())
    const epaisseur = unite * (0.045 + 0.03 * rnd())
    const houle = houleFermee(rnd, 3)
    const crans = 44
    const chemin = Array.from({ length: crans }, (_, i): Point => {
      const angle = (i / crans) * Math.PI * 2
      const r = rayon * (1 + 0.55 * houle(angle))
      return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]
    })

    const convexes: Point[][] = []
    for (let i = 0; i < chemin.length; i += 1) {
      convexes.push(tronçon(chemin[i], chemin[(i + 1) % chemin.length], epaisseur))
      convexes.push(disque(chemin[i][0], chemin[i][1], epaisseur / 2, 12))
    }

    /* Les pastilles : les points d'une ponctuation qu'aucun texte ne porte.
       Elles sont posées avec la boucle et de la même encre, et croisent les
       signes comme elle. */
    const pastilles = [3, 5, 7][densite]
    for (let p = 0; p < pastilles; p += 1) {
      convexes.push(disque(
        W * rnd(), H * rnd(), epaisseur * (0.5 + 0.5 * rnd()), 16,
      ))
    }

    ctx.fillStyle = accent
    for (const piece of convexes) {
      polygone(ctx, piece)
      ctx.fill()
    }

    /* Le troisième aplat, posé en dernier : l'intersection de chaque convexe
       de l'encre claire avec chaque signe de l'encre sombre. C'est le seul
       endroit du moteur où une couleur n'est ni tirée de la palette ni
       mélangée, mais calculée à partir des deux qui la font. */
    ctx.fillStyle = croisement
    for (const piece of convexes) {
      for (const forme of formes) {
        const part = couperConvexe(forme, piece)
        if (part.length < 3) continue
        polygone(ctx, part)
        ctx.fill()
      }
    }
  }
}

/* ---------- aiguillage ------------------------------------------------------- */

export function peindreSurimpression(
  ctx: Pinceau, W: number, H: number, id: IdSurimpression,
  C: readonly string[], densite: Densite, rnd: Alea, unite: number,
): void {
  void id
  affiche(ctx, W, H, C, densite, rnd, unite)
}
