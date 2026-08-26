// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Les outils de tracé que les gestes du moteur se partagent.
 *
 * Le pinceau du moteur ne sait que remplir : pas de trait, pas de contour.
 * C'est un choix, et il tient toujours : un trait est un état de plus à noter
 * dans le SVG, et une épaisseur de plus à faire survivre aux transformations.
 * Mais plusieurs gestes dessinent des choses qui ressemblent à des traits :
 * les sillons d'une empreinte, les lignes d'un plan de métro, l'axe d'une
 * fougère. Ce module les fabrique comme des surfaces : un ruban est un
 * polygone fermé qui longe sa polyligne des deux côtés, et il se remplit
 * comme n'importe quel aplat.
 *
 * S'y trouvent aussi le bruit de valeur et la teinte mélangée, parce que les
 * modules de gestes ne peuvent rien importer d'autre que des types depuis le
 * moteur : c'est le moteur qui les importe, eux, pour son aiguillage, et un
 * aller-retour de valeurs ferait un cycle. `lieux.ts` avait recopié la
 * luminance pour cette raison exacte ; le bruit et elle vivent désormais ici,
 * une seule fois.
 */
import type { Alea, Pinceau } from './moteur'

/* ---------- nombres déterministes ------------------------------------------- */

/** Un réel de [0, 1[ tiré de deux entiers et d'une graine, toujours le même. */
export function hacher(x: number, y: number, graine: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(graine, 2246822519)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export const lisse = (t: number): number => t * t * (3 - 2 * t)

/**
 * Un bruit de valeur : la grille entière reçoit des hauteurs tirées de la
 * graine, et le point s'interpole entre ses quatre coins. Fonction pure des
 * coordonnées, donc la même à toute résolution : c'est lui qui remplace les
 * tirages que les boucles dépendantes du format s'interdisent.
 */
export function bruiteur(graine: number): (x: number, y: number) => number {
  return (x, y) => {
    const ix = Math.floor(x)
    const iy = Math.floor(y)
    const fx = lisse(x - ix)
    const fy = lisse(y - iy)
    const a = hacher(ix, iy, graine)
    const b = hacher(ix + 1, iy, graine)
    const c = hacher(ix, iy + 1, graine)
    const d = hacher(ix + 1, iy + 1, graine)
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
  }
}

/**
 * Une ondulation périodique sur le tour complet : des harmoniques entières
 * sommées, phases et poids tirés à la construction. Parce que les fréquences
 * sont entières, la valeur en 2 pi est celle en zéro : un anneau déformé par
 * elle se referme sans couture, ce qu'une houle libre ne garantit pas.
 */
export function houleFermee(rnd: Alea, harmoniques = 4): (angle: number) => number {
  const termes = Array.from({ length: harmoniques }, (_, i) => ({
    rang: i + 2,
    phase: rnd() * Math.PI * 2,
    poids: rnd() / (i + 2),
  }))
  return (angle) =>
    termes.reduce((somme, { rang, phase, poids }) => somme + poids * Math.cos(rang * angle + phase), 0)
}

/* ---------- teintes ---------------------------------------------------------- */

/**
 * Le mélange de deux teintes hexadécimales, canal par canal en sRGB. Le moteur
 * a le sien (`melange`), mais il n'est pas importable d'ici sans cycle ; la
 * copie est courte et le commentaire du moteur explique déjà pourquoi le sRGB
 * suffit à des bornes proches.
 */
export function melangeHex(a: string, b: string, t: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return a
  const part = Math.max(0, Math.min(1, t))
  const canal = (i: number) => {
    const de = Number.parseInt(a.slice(1 + i * 2, 3 + i * 2), 16)
    const vers = Number.parseInt(b.slice(1 + i * 2, 3 + i * 2), 16)
    return Math.round(de + (vers - de) * part).toString(16).padStart(2, '0')
  }
  return `#${canal(0)}${canal(1)}${canal(2)}`.toUpperCase()
}

/** La teinte à la position `t` d'une rampe qui traverse la liste entière. */
export function rampe(C: readonly string[], t: number): string {
  if (C.length < 2) return C[0]
  const position = Math.max(0, Math.min(1, t)) * (C.length - 1)
  const cran = Math.min(C.length - 2, Math.floor(position))
  return melangeHex(C[cran], C[cran + 1], position - cran)
}

/**
 * La luminance WCAG d'une teinte hexadécimale, pour ranger une palette du
 * clair au sombre sans connaître son fond.
 */
export function luminanceHex(teinte: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(teinte.trim())
  if (!m) return 0.5
  const canal = (i: number) => {
    const c = Number.parseInt(m[1].slice(i * 2, i * 2 + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal(0) + 0.7152 * canal(1) + 0.0722 * canal(2)
}

/**
 * L'éclairage : une teinte, un niveau, et la face qu'il faut peindre.
 *
 * C'est tout ce qu'il faut pour du relief en aplats. Une surface plane ne
 * devient un volume que si ses faces se distinguent par la valeur, et le
 * moteur ne sait poser que des aplats : la teinte d'une face est donc sa
 * teinte propre, poussée vers le jour ou vers l'ombre selon qu'elle regarde
 * la lumière ou s'en détourne. Le niveau va de -1, l'ombre pleine, à 1, le
 * plein jour.
 *
 * Le jour et l'ombre sont presque le blanc et presque le noir, teintés d'un
 * quart par les deux bouts de la palette. Les deux réglages ont été essayés,
 * et c'est celui-là qui tient.
 *
 * Éclairer vers la teinte la plus claire de la palette semblait plus élégant,
 * et donnait de la boue : sur Lime & crème, une face de bleu marine poussée
 * vers un jaune vert ressort kaki, et le cube entier perd la couleur pour
 * laquelle on l'a choisi. Le blanc et le noir, eux, ne déplacent pas la
 * teinte, ils ne font que monter et descendre sa valeur, ce qui est
 * exactement ce qu'une lumière fait. Le quart de palette qui les teinte suffit
 * à ce que le jour d'une palette chaude ne soit pas celui d'une palette froide.
 *
 * L'ombre est commune à toutes les teintes, et c'est voulu : les ombres d'une
 * même scène convergent, elles ne gardent pas chacune la couleur de ce qui les
 * porte.
 */
export function eclairage(C: readonly string[]): (base: string, niveau: number) => string {
  const teintes = duClairAuSombre(C)
  const jour = melangeHex(teintes[0], '#FFFFFF', 0.78)
  const ombre = melangeHex(teintes[teintes.length - 1], '#000000', 0.74)
  return (base, niveau) => {
    const n = Math.max(-1, Math.min(1, niveau))
    return n >= 0 ? melangeHex(base, jour, n) : melangeHex(base, ombre, -n)
  }
}

/** La palette triée de la plus claire à la plus sombre, luminance WCAG. */
export function duClairAuSombre(C: readonly string[]): string[] {
  return [...C].sort((a, b) => luminanceHex(b) - luminanceHex(a))
}

/* ---------- chemins ---------------------------------------------------------- */

export type Point = readonly [number, number]

/**
 * Un polygone fermé aux angles adoucis : la courbe passe par le milieu de
 * chaque côté et prend chaque sommet comme point de contrôle. C'est le lissage
 * que le pinceau permet, puisqu'il ne connaît que la quadratique ; il suffit
 * largement à des anneaux organiques, et il ne déborde jamais de l'enveloppe
 * des sommets.
 */
export function anneau(ctx: Pinceau, points: readonly Point[]): void {
  const n = points.length
  if (n < 3) return
  const milieu = (i: number): Point => {
    const a = points[i % n]
    const b = points[(i + 1) % n]
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  }
  ctx.beginPath()
  const depart = milieu(n - 1)
  ctx.moveTo(depart[0], depart[1])
  for (let i = 0; i < n; i += 1) {
    const sommet = points[i]
    const suivant = milieu(i)
    ctx.quadraticCurveTo(sommet[0], sommet[1], suivant[0], suivant[1])
  }
  ctx.closePath()
}

/**
 * Le ruban : une polyligne ouverte épaissie en polygone fermé, bouts ronds.
 *
 * L'aller longe la ligne décalée d'une demi-épaisseur du côté gauche, le
 * retour du côté droit, et deux demi-cercles ferment les extrémités. C'est le
 * trait du moteur : une surface, que le SVG note comme n'importe quelle autre.
 * Les normales sont moyennées aux sommets, ce qui tient tant que le rayon de
 * courbure reste plus grand que l'épaisseur ; les gestes qui l'appellent
 * échantillonnent assez finement pour ça.
 */
export function ruban(ctx: Pinceau, points: readonly Point[], epaisseur: number): void {
  const n = points.length
  if (n < 2) return
  const demi = epaisseur / 2
  const normales: Point[] = []
  for (let i = 0; i < n; i += 1) {
    const avant = points[Math.max(0, i - 1)]
    const apres = points[Math.min(n - 1, i + 1)]
    const dx = apres[0] - avant[0]
    const dy = apres[1] - avant[1]
    const longueur = Math.hypot(dx, dy) || 1
    normales.push([-dy / longueur, dx / longueur])
  }
  ctx.beginPath()
  ctx.moveTo(points[0][0] + normales[0][0] * demi, points[0][1] + normales[0][1] * demi)
  for (let i = 1; i < n; i += 1) {
    ctx.lineTo(points[i][0] + normales[i][0] * demi, points[i][1] + normales[i][1] * demi)
  }
  const fin = Math.atan2(normales[n - 1][1], normales[n - 1][0])
  ctx.arc(points[n - 1][0], points[n - 1][1], demi, fin, fin + Math.PI, true)
  for (let i = n - 2; i >= 0; i -= 1) {
    ctx.lineTo(points[i][0] - normales[i][0] * demi, points[i][1] - normales[i][1] * demi)
  }
  const debut = Math.atan2(-normales[0][1], -normales[0][0])
  ctx.arc(points[0][0], points[0][1], demi, debut, debut + Math.PI, true)
  ctx.closePath()
}

/**
 * Le quart d'anneau, ou n'importe quel secteur : l'arc extérieur à l'aller,
 * l'intérieur au retour, et les deux bouts fermés droit.
 *
 * Le pinceau ne connaît pas le trait, alors une bande courbe se construit
 * comme une surface, exactement comme `ruban` construit une bande droite. La
 * coulée y fait serpenter ses rubans, la mesure y trace ses arcs de
 * rapporteur.
 */
export function arcEpais(
  ctx: Pinceau, cx: number, cy: number, rayon: number,
  depart: number, fin: number, epaisseur: number,
): void {
  ctx.beginPath()
  ctx.arc(cx, cy, rayon + epaisseur / 2, depart, fin)
  ctx.arc(cx, cy, rayon - epaisseur / 2, fin, depart, true)
  ctx.closePath()
}

/**
 * Le pointillé : une ligne droite hachée en tirets, chacun posé comme un
 * ruban.
 *
 * Le pas est constant et compté depuis le départ, si bien que deux lignes qui
 * se croisent ne se coupent pas au même endroit de leur cadence, ce qui est
 * précisément ce qui fait qu'un pointillé se lit comme un pointillé et non
 * comme une trame. Le dernier tiret est tronqué plutôt que débordé.
 */
export function pointille(
  ctx: Pinceau, de: Point, vers: Point, epaisseur: number, tiret: number, blanc: number,
): void {
  const dx = vers[0] - de[0]
  const dy = vers[1] - de[1]
  const longueur = Math.hypot(dx, dy)
  const pas = tiret + blanc
  if (!(longueur > 0) || !(pas > 0)) return
  const ux = dx / longueur
  const uy = dy / longueur
  for (let t = 0; t < longueur; t += pas) {
    const fin = Math.min(t + tiret, longueur)
    ruban(ctx, [
      [de[0] + ux * t, de[1] + uy * t],
      [de[0] + ux * fin, de[1] + uy * fin],
    ], epaisseur)
    ctx.fill()
  }
}

/**
 * La pastille allongée : un rectangle aux deux bouts ronds, posé à plat. C'est
 * la forme que la vectorisation des champs fusionne rangée par rangée, et le
 * point de couture des tissus. `roundRect` du pinceau est optionnel ; la
 * capsule ne l'est pas, donc elle se construit à la main.
 */
export function capsule(ctx: Pinceau, x: number, y: number, largeur: number, hauteur: number): void {
  const r = Math.min(hauteur / 2, largeur / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + largeur - r, y)
  ctx.arc(x + largeur - r, y + hauteur / 2, r, -Math.PI / 2, Math.PI / 2)
  ctx.lineTo(x + r, y + hauteur)
  ctx.arc(x + r, y + hauteur / 2, r, Math.PI / 2, Math.PI * 1.5)
  ctx.closePath()
}

/**
 * Un champ seuillé, vectorisé rangée par rangée : les cellules pleines
 * consécutives d'une même ligne deviennent une capsule. C'est le procédé qui
 * ramène une grille de dizaines de milliers de cellules à quelques milliers
 * de chemins, celui que la trame des lieux pratique avec des rectangles ;
 * ici les bouts sont ronds, parce que les gestes qui s'en servent dessinent
 * des matières, pas des gravures.
 */
export function peindreChampSeuille(
  ctx: Pinceau, valeurs: ArrayLike<number>, colonnes: number, rangees: number,
  seuil: number, coteX: number, gonfle = 0.72, coteY = coteX,
): void {
  const rayon = Math.min(coteX, coteY) * gonfle
  for (let r = 0; r < rangees; r += 1) {
    let debut = -1
    for (let c = 0; c <= colonnes; c += 1) {
      const plein = c < colonnes && valeurs[r * colonnes + c] > seuil
      if (plein && debut < 0) debut = c
      if (!plein && debut >= 0) {
        const x0 = debut * coteX + coteX / 2 - rayon
        const x1 = c * coteX - coteX / 2 + rayon
        capsule(ctx, x0, r * coteY + coteY / 2 - rayon, x1 - x0, rayon * 2)
        ctx.fill()
        debut = -1
      }
    }
  }
}

/**
 * Le contour d'un polygone, ajouté au chemin courant sans l'ouvrir.
 *
 * C'est lui qui permet d'évider un signe : le contour et son trou entrent dans
 * le même chemin, que la règle paire et impaire remplit en anneau. Le pinceau
 * ne sait pas détourer, et c'est la seule façon qu'a une forme creuse de
 * laisser voir ce qui est derrière elle plutôt qu'une teinte devinée.
 */
export function tracerPolygone(ctx: Pinceau, points: readonly Point[]): void {
  if (points.length < 2) return
  ctx.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1])
  ctx.closePath()
}

/**
 * Le contour d'un cercle, ajouté au chemin courant sans l'ouvrir. Le crayon
 * est posé sur le départ de l'arc avant de le suivre : sans ce `moveTo`, l'arc
 * traînerait derrière lui un segment venu de la forme précédente.
 */
export function tracerCercle(ctx: Pinceau, cx: number, cy: number, rayon: number): void {
  ctx.moveTo(cx + rayon, cy)
  ctx.arc(cx, cy, rayon, 0, Math.PI * 2)
  ctx.closePath()
}

/**
 * Un polygone fermé, sommet par sommet : le chemin, pas le remplissage.
 *
 * Le chemin est ouvert avant tout examen du nombre de sommets. C'est
 * volontaire : une découpe peut ne rien laisser, et un `fill()` qui suivrait
 * sans `beginPath()` repeindrait la forme d'avant au lieu de ne rien peindre.
 */
export function polygone(ctx: Pinceau, points: readonly Point[]): void {
  ctx.beginPath()
  tracerPolygone(ctx, points)
}

/**
 * Un polygone convexe coupé par un demi-plan : ce qui reste du côté où
 * `nx x + ny y <= d`. C'est la découpe de Sutherland et Hodgman, la même que
 * la fracture pratique sur ses cellules ; elle est ici parce que le pinceau ne
 * sait pas détourer, et qu'une bande de hachures doit donc arriver déjà
 * taillée à la forme qui la porte.
 */
export function couperDemiPlan(
  points: readonly Point[], nx: number, ny: number, d: number,
): Point[] {
  const garde: Point[] = []
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    const da = a[0] * nx + a[1] * ny - d
    const db = b[0] * nx + b[1] * ny - d
    if (da <= 0) garde.push(a)
    if ((da <= 0) !== (db <= 0)) {
      const t = da / (da - db)
      garde.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    }
  }
  return garde
}

/**
 * Les hachures : des bandes parallèles taillées dans un polygone convexe.
 *
 * Le pinceau ne connaît que le remplissage, jamais le trait ni le détourage :
 * chaque bande est donc calculée comme une surface, découpée deux fois contre
 * la forme qui la porte. Le pas et la phase se mesurent sur la normale, si
 * bien qu'une case et sa voisine hachurées du même angle continuent la même
 * série au lieu de se décaler d'une demi-bande.
 */
export function hachurer(
  ctx: Pinceau, contour: readonly Point[], angle: number, pas: number, part = 0.5,
): void {
  if (contour.length < 3 || !(pas > 0)) return
  const nx = Math.cos(angle)
  const ny = Math.sin(angle)
  const projections = contour.map((p) => p[0] * nx + p[1] * ny)
  const debut = Math.floor(Math.min(...projections) / pas) * pas
  const fin = Math.max(...projections)
  for (let d = debut; d < fin; d += pas) {
    const bande = couperDemiPlan(
      couperDemiPlan(contour, nx, ny, d + pas * part), -nx, -ny, -d,
    )
    if (bande.length < 3) continue
    polygone(ctx, bande)
    ctx.fill()
  }
}
