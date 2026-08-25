// SPDX-License-Identifier: AGPL-3.0-only

/**
 * La ligne de niveau : un troisième geste du moteur.
 *
 * Un champ d'altitude, découpé en paliers, et chaque palier peint d'un aplat.
 * La forme n'est jamais dessinée : elle est révélée par le seuillage, comme
 * sur une carte topographique ou dans une coupe de bois. Concrètement, chaque
 * famille pose des anneaux concentriques déformés par une ondulation
 * périodique : le champ est radial, donc chaque ligne de niveau est une courbe
 * fermée qui se peint du plus grand rayon au plus petit, et la superposition
 * fait le reste.
 *
 * La discipline est celle des lieux : tous les tirages se font à la
 * construction, en nombre fixe pour une densité donnée ; l'échantillonnage
 * angulaire est constant, jamais rapporté à la résolution. Une graine rend
 * donc la même image sur un téléphone et sur un mur.
 *
 * Le fond de la palette n'est pas connu de `formes()` ; les familles qui ont
 * besoin d'un papier le choisissent dans la palette et repeignent leur
 * feuille, comme les gravures le font déjà.
 */
import type { Alea, Densite, Pinceau } from './moteur'
import { anneau, duClairAuSombre, houleFermee, type Point, rampe, ruban } from './trace'

export const IDS_NIVEAUX = ['relief', 'cernes', 'maree', 'empreinte'] as const

export type IdNiveau = (typeof IDS_NIVEAUX)[number]

export function estNiveau(valeur: unknown): valeur is IdNiveau {
  return IDS_NIVEAUX.includes(valeur as IdNiveau)
}

/** Les sommets d'une ligne de niveau : un tour complet, en pas d'angle fixes. */
function ligneDeNiveau(
  cx: number, cy: number, rayon: number, exX: number, exY: number,
  onde: (angle: number) => number, ampleur: number,
): Point[] {
  const points: Point[] = []
  const SOMMETS = 44
  for (let i = 0; i < SOMMETS; i += 1) {
    const angle = (i / SOMMETS) * Math.PI * 2
    const r = rayon * (1 + ampleur * onde(angle))
    points.push([cx + r * Math.cos(angle) * exX, cy + r * Math.sin(angle) * exY])
  }
  return points
}

/* ---------- relief ----------------------------------------------------------- */

/**
 * Des massifs vus du ciel. Le fond de palette fait la mer ; chaque massif
 * monte du rivage au sommet par paliers pris sur une rampe de la palette,
 * rangée de la teinte la plus claire à la plus sombre : les hauteurs foncent
 * en montant, quelle que soit la palette.
 */
function relief(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const massifs = [2, 3, 4][densite]
  const paliers = [4, 5, 7][densite]
  const teintes = duClairAuSombre(C)
  for (let m = 0; m < massifs; m += 1) {
    const cx = W * (0.12 + 0.76 * rnd())
    const cy = H * (0.1 + 0.8 * rnd())
    const rayon = unite * (0.34 + 0.3 * rnd())
    const exY = 0.85 + 0.25 * rnd()
    const onde = houleFermee(rnd, 5)
    for (let k = 0; k < paliers; k += 1) {
      const r = rayon * (1 - k / paliers)
      /* Le premier palier est le rivage : à peine plus clair que la mer ne
         se peut pas sans connaître la mer, alors il prend le bas de la
         rampe, et la montée fait le contraste. */
      ctx.fillStyle = rampe(teintes, k / (paliers - 1))
      anneau(ctx, ligneDeNiveau(cx, cy, r, 1, exY, onde, 0.5))
      ctx.fill()
    }
  }
}

/* ---------- cernes ----------------------------------------------------------- */

/**
 * Le bois en coupe : des anneaux resserrés autour d'un ou plusieurs noeuds,
 * en deux tons qui alternent, et un coeur d'une troisième teinte. La feuille
 * est repeinte du ton clair, comme le papier d'une gravure : l'alternance a
 * besoin de ses deux tons, pas d'un fond qu'elle ne connaît pas.
 */
function cernes(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const teintes = duClairAuSombre(C)
  const papier = teintes[0]
  const encre = C[0] === papier ? C[1] : C[0]
  const coeur = teintes[teintes.length - 1] === encre ? teintes[1] : teintes[teintes.length - 1]

  ctx.fillStyle = papier
  ctx.fillRect(0, 0, W, H)

  const noeuds = [1, 2, 3][densite]
  const cercles = [9, 13, 17][densite]
  for (let n = 0; n < noeuds; n += 1) {
    const cx = W * (0.1 + 0.8 * rnd())
    const cy = H * (0.1 + 0.8 * rnd())
    const rayon = unite * (0.65 + 0.55 * rnd()) * (noeuds > 1 ? 0.75 : 1)
    const exX = 1.05 + 0.35 * rnd()
    const onde = houleFermee(rnd, 4)
    for (let k = cercles; k >= 0; k -= 1) {
      const r = rayon * ((k / cercles) ** 1.35)
      ctx.fillStyle = k === 1 ? coeur : k % 2 === 0 ? encre : papier
      anneau(ctx, ligneDeNiveau(cx, cy, r, exX, 1, onde, 0.16))
      ctx.fill()
    }
  }
}

/* ---------- marée ------------------------------------------------------------ */

/**
 * L'estran : la mer en haut, puis les bandes que l'eau laisse en se retirant,
 * de plus en plus espacées et de plus en plus pâles, des flaques dans le bas,
 * une laisse d'algues, et une étoile de mer pour seule figure. Les laisses
 * pâlissent par transparence, pas par mélange : le sable est le fond de la
 * palette, que ce module ne connaît pas, et un voile de la couleur de l'eau
 * pâlit juste vers lui, quel qu'il soit.
 */
function maree(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const teintes = duClairAuSombre(C)
  const algues = teintes[0]
  const eau = teintes[1]
  const etoile = teintes[2]

  const bordDeMer = H * (0.16 + 0.12 * rnd())
  const laisses = [4, 6, 9][densite]
  const ondes = Array.from({ length: laisses + 1 }, () => houleFermee(rnd, 5))
  const rangAlgues = 1 + Math.floor(rnd() * Math.min(3, laisses - 1))
  const PAS = 28

  const bord = (base: number, ampleur: number, onde: (t: number) => number): Point[] => {
    const points: Point[] = []
    for (let i = 0; i <= PAS; i += 1) {
      const x = (i / PAS) * W
      points.push([x, base + ampleur * onde((i / PAS) * Math.PI * 2)])
    }
    return points
  }

  /* La mer : un aplat plein dont seul le bord bas ondule. */
  const cote = bord(bordDeMer, unite * 0.07, ondes[0])
  ctx.fillStyle = eau
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(W, 0)
  for (let i = cote.length - 1; i >= 0; i -= 1) ctx.lineTo(cote[i][0], cote[i][1])
  ctx.closePath()
  ctx.fill()

  for (let k = 1; k <= laisses; k += 1) {
    const base = bordDeMer + H * 0.052 * (k ** 1.35)
    const ampleur = unite * (0.062 - 0.005 * k)
    const epaisseur = Math.max(unite * 0.01, unite * (0.036 - 0.0042 * k))
    const ligne = bord(base, ampleur, ondes[k])
    if (k === rangAlgues) {
      ctx.fillStyle = algues
      ctx.globalAlpha = 1
    } else {
      ctx.fillStyle = eau
      ctx.globalAlpha = Math.max(0.14, 0.8 - k * 0.11)
    }
    ruban(ctx, ligne, epaisseur)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  /* Les flaques : des lentilles très aplaties, l'eau y est entière. */
  const flaques = [1, 2, 3][densite]
  ctx.fillStyle = eau
  for (let f = 0; f < flaques; f += 1) {
    const cx = W * (0.15 + 0.7 * rnd())
    const cy = H * (0.68 + 0.24 * rnd())
    const r = unite * (0.09 + 0.08 * rnd())
    anneau(ctx, ligneDeNiveau(cx, cy, r, 1.55, 0.6, houleFermee(rnd, 4), 0.3))
    ctx.fill()
  }

  /* L'étoile de mer, posée dans le bas de l'estran. */
  const ex = W * (0.2 + 0.6 * rnd())
  const ey = H * (0.62 + 0.28 * rnd())
  const grand = unite * 0.045
  ctx.fillStyle = etoile
  ctx.beginPath()
  for (let i = 0; i < 10; i += 1) {
    const angle = (i / 10) * Math.PI * 2 - Math.PI / 2
    const r = i % 2 === 0 ? grand : grand * 0.44
    const px = ex + r * Math.cos(angle)
    const py = ey + r * Math.sin(angle)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
}

/* ---------- empreinte -------------------------------------------------------- */

/**
 * Une seule empreinte digitale, géante : des sillons concentriques interrompus
 * autour d'un coeur, en rubans de la teinte la plus sombre de la palette, un
 * sillon sur six dans une autre teinte. Sur l'objet qu'on déverrouille du
 * doigt, le clin d'oeil se passe d'explication.
 */
function empreinte(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const teintes = duClairAuSombre(C)
  const sillon = teintes[teintes.length - 1]
  const eclat = teintes[1]
  const coeur = teintes[2]

  const cx = W * (0.38 + 0.24 * rnd())
  const cy = H * (0.4 + 0.2 * rnd())
  const onde = houleFermee(rnd, 3)
  const anneaux = [14, 20, 28][densite]
  const pasRayon = (unite * 1.45) / anneaux
  const epaisseur = pasRayon * 0.38
  const SOMMETS = 52

  for (let k = 1; k <= anneaux; k += 1) {
    const rayon = k * pasRayon
    const depart = rnd() * Math.PI * 2
    const longueur = (0.8 + 0.18 * rnd()) * Math.PI * 2
    const points: Point[] = []
    for (let i = 0; i <= SOMMETS; i += 1) {
      const angle = depart + (i / SOMMETS) * longueur
      const r = rayon * (1 + 0.07 * onde(angle))
      points.push([cx + r * Math.cos(angle) * 0.92, cy + r * Math.sin(angle) * 1.28])
    }
    ctx.fillStyle = k % 6 === 0 ? eclat : sillon
    ruban(ctx, points, epaisseur)
    ctx.fill()
  }

  ctx.fillStyle = coeur
  ctx.beginPath()
  ctx.arc(cx, cy, pasRayon * 0.6, 0, Math.PI * 2)
  ctx.fill()
}

/* ---------- aiguillage ------------------------------------------------------- */

export function peindreNiveau(
  ctx: Pinceau, W: number, H: number, id: IdNiveau,
  C: readonly string[], densite: Densite, rnd: Alea, unite: number,
): void {
  if (id === 'relief') relief(ctx, W, H, C, densite, rnd, unite)
  else if (id === 'cernes') cernes(ctx, W, H, C, densite, rnd, unite)
  else if (id === 'maree') maree(ctx, W, H, C, densite, rnd, unite)
  else empreinte(ctx, W, H, C, densite, rnd, unite)
}
