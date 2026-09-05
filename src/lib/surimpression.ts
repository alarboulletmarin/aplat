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
import { chasseDuMot, contoursDuMot } from './alphabet'
import type { Alea, Densite, Pinceau } from './moteur'
import { couperDemiPlan, duClairAuSombre, houleFermee, type Point } from './trace'

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

/* ---------- l'affiche -------------------------------------------------------- */

/**
 * Un mot composé plein cadre, et deux boucles tirées par dessus.
 *
 * La composition est celle d'une affiche de titrage : le mot est coupé en
 * lignes, chaque ligne est étirée jusqu'aux deux bords, et les lignes
 * s'empilent jusqu'à remplir la hauteur. Rien n'y est centré et rien n'y
 * respire. C'est le procédé le plus simple qui soit et c'est le bon : une ligne
 * justifiée au fer des deux côtés donne à chaque mot le corps que sa longueur
 * lui laisse, si bien que YEAH fait des lettres énormes et GOODNESS des lettres
 * étroites, sans que personne n'ait à régler quoi que ce soit.
 *
 * L'interligne est nul et l'approche minuscule : les lettres se touchent
 * presque, comme sur les affiches où l'on serre jusqu'à ce que la page tienne
 * en un bloc. Le blanc du mot n'est pas entre les lettres, il est dans les
 * compteurs.
 *
 * Les boucles sont l'autre moitié du motif, et elles ne suivent aucune ligne :
 * c'est le désaccord entre la rigueur du bloc de texte et le geste libre qui
 * passe dessus que les affiches de référence emploient toutes. Aux croisements,
 * la troisième encre.
 */
function affiche(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number, mot: string,
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

  const marge = unite * 0.05
  const utile = { x: marge, y: marge, w: W - marge * 2, h: H - marge * 2 }
  const approche = 0.02

  /* Le mot en lignes. Les espaces coupent, et un mot trop long pour tenir seul
     n'est pas coupé : une césure demanderait un dictionnaire, et une affiche
     n'en coupe jamais.

     Puis le mot se répète jusqu'à remplir la page. C'est ce que fait l'affiche
     YEAH des images de référence, qui écrit son mot deux fois de suite parce
     qu'une fois ne remplissait pas, et c'est la seule façon d'occuper le cadre
     sans étirer les lettres : le corps d'une ligne est dicté par sa longueur,
     pas choisi, et un mot court laisse donc une ligne basse. Plutôt qu'un
     grand vide, une reprise. */
  const source = mot.split(' ').map((l) => l.trim()).filter((l) => l.length > 0)
  if (source.length === 0) return

  /* Le corps d'une ligne est celui qui la fait toucher les deux bords : c'est
     la largeur utile divisée par la chasse du mot. Sa hauteur vaut son corps,
     la hauteur de capitale étant l'unité de l'alphabet. */
  const corpsDe = (ligne: string) => utile.w / Math.max(0.001, chasseDuMot(ligne, approche))

  const lignes: string[] = []
  const corps: number[] = []
  let demandee = 0
  /* La borne est une sécurité, pas une intention : un mot dont la chasse serait
     dérisoire pourrait sinon demander des milliers de lignes. */
  while (demandee < utile.h && lignes.length < 60) {
    const ligne = source[lignes.length % source.length]
    lignes.push(ligne)
    const c = corpsDe(ligne)
    corps.push(c)
    demandee += c
  }

  /* Et tout se ramène à la hauteur qu'on a. Le facteur ne monte jamais au
     dessus de un : au delà, les lignes déborderaient des deux côtés, chaque
     ligne étant déjà réglée pour toucher les bords. */
  const facteur = Math.min(1, utile.h / demandee)
  const reste = utile.h - demandee * facteur

  const lettres: Point[][][] = []
  let y = utile.y + reste / 2
  for (const [i, ligne] of lignes.entries()) {
    const taille = corps[i] * facteur
    /* Une ligne réduite ne touche plus les bords : elle se centre, comme le
       ferait un compositeur, plutôt que de rester ferrée à gauche. */
    const x = utile.x + (utile.w - chasseDuMot(ligne, approche) * taille) / 2
    const parLettre = new Map<number, Point[][]>()
    for (const { rang, points } of contoursDuMot(ligne, x, y, taille, approche)) {
      const dessin = parLettre.get(rang)
      if (dessin) dessin.push(points)
      else parLettre.set(rang, [points])
    }
    lettres.push(...parLettre.values())
    y += taille
  }

  /* Les lettres, chacune d'un seul chemin : ses contours entrent ensemble et
     la règle paire et impaire creuse les compteurs. Contour par contour, le
     compteur d'un O percerait la lettre d'à côté au lieu de percer la sienne. */
  ctx.fillStyle = encre
  for (const contours of lettres) {
    ctx.beginPath()
    for (const contour of contours) {
      ctx.moveTo(contour[0][0], contour[0][1])
      for (const p of contour.slice(1)) ctx.lineTo(p[0], p[1])
      ctx.closePath()
    }
    ctx.fill('evenodd')
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
       lettres comme elle. */
    const pastilles = [3, 5, 7][densite]
    for (let p = 0; p < pastilles; p += 1) {
      convexes.push(disque(W * rnd(), H * rnd(), epaisseur * (0.5 + 0.5 * rnd()), 16))
    }

    ctx.fillStyle = accent
    for (const piece of convexes) {
      ctx.beginPath()
      ctx.moveTo(piece[0][0], piece[0][1])
      for (const p of piece.slice(1)) ctx.lineTo(p[0], p[1])
      ctx.closePath()
      ctx.fill()
    }

    /* Le troisième aplat, posé en dernier : l'intersection de chaque convexe de
       l'encre claire avec chaque lettre de l'encre sombre. C'est le seul
       endroit du moteur où une couleur n'est ni tirée de la palette ni
       mélangée, mais calculée à partir des deux qui la font.

       Une lettre se coupe contour par contour, et les morceaux se remplissent
       ensemble à la règle paire et impaire : couper le dehors et le dedans par
       le même convexe rend `(dehors ∩ K)` moins `(dedans ∩ K)`, c'est-à-dire la
       lettre coupée, compteurs compris. */
    ctx.fillStyle = croisement
    for (const piece of convexes) {
      for (const contours of lettres) {
        const parts = contours
          .map((contour) => couperConvexe(contour, piece))
          .filter((part) => part.length >= 3)
        if (parts.length === 0) continue
        ctx.beginPath()
        for (const part of parts) {
          ctx.moveTo(part[0][0], part[0][1])
          for (const p of part.slice(1)) ctx.lineTo(p[0], p[1])
          ctx.closePath()
        }
        ctx.fill('evenodd')
      }
    }
  }
}

/* ---------- aiguillage ------------------------------------------------------- */

export function peindreSurimpression(
  ctx: Pinceau, W: number, H: number, id: IdSurimpression,
  C: readonly string[], densite: Densite, rnd: Alea, unite: number, mot: string,
): void {
  void id
  affiche(ctx, W, H, C, densite, rnd, unite, mot)
}
