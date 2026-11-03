// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Trois fonds de matière : la poudre, les lames et le lin.
 *
 * La poudre et les lames sont des semis : un champ lisse dit, en chaque point,
 * quelle part du papier l'encre couvre, et chaque grain d'une grille fine est
 * tiré contre ce champ par un hachage de sa position. Pas de seuil ordonné à
 * la Bayer : le tirage est un bruit blanc, et c'est lui qui donne l'aspect de
 * l'aérographe, du toner, de la pierre ponce. Aucune teinte mélangée, seulement
 * l'encre et le papier.
 *
 * Le lin pose un dégradé en fines marches de transparence, puis un tissage par
 * dessus : des fils horizontaux et verticaux, chacun fait de tronçons plus ou
 * moins appuyés, plus clairs ou plus sombres. Le dégradé ne se voit pas en
 * marches parce que le tissage les recouvre.
 *
 * Tout se mesure au petit côté et se lit dans des coordonnées rapportées à
 * `unite`. Les grains sont tirés par position, jamais dans une boucle dont le
 * compte dépendrait du format : un cadre plus haut ajoute des rangées sans
 * changer celles qui y étaient déjà.
 */
import type { Alea, Densite, Pinceau } from './moteur'
import { bruiteur, hacher, lisse } from './trace'

export const IDS_POUDRES = ['poudre', 'lames', 'lin'] as const

export type IdPoudre = (typeof IDS_POUDRES)[number]

export function estPoudre(valeur: unknown): valeur is IdPoudre {
  return IDS_POUDRES.includes(valeur as IdPoudre)
}

const borne = (t: number): number => Math.max(0, Math.min(1, t))

/**
 * Le semis : une grille de grains de côté `unite / finesse`. `encre` rend,
 * pour le centre d'un grain en unités du petit côté, l'indice de la couleur
 * qui le couvre, ou -1 pour le papier.
 *
 * Les grains voisins d'une même rangée et d'une même couleur sont fusionnés en
 * un seul rectangle, et chaque couleur fait un seul chemin : c'est ce qui
 * garde le SVG à quelques éléments et à un poids raisonnable. Les bords sont
 * calés sur des pixels entiers, faute de quoi le lissage du canevas laisserait
 * un liseré clair entre deux rangées pleines.
 */
function semer(
  ctx: Pinceau, W: number, H: number, unite: number, finesse: number,
  C: readonly string[], encre: (u: number, v: number, c: number, r: number) => number,
): void {
  const s = unite / finesse
  const colonnes = Math.ceil(W / s)
  const rangees = Math.ceil(H / s)
  const piles: number[][] = C.map(() => [])
  for (let r = 0; r < rangees; r += 1) {
    const y0 = Math.round(r * s)
    const y1 = Math.max(y0 + 1, Math.round((r + 1) * s))
    const v = (r + 0.5) / finesse
    let debut = -1
    let teinte = -1
    for (let c = 0; c <= colonnes; c += 1) {
      const ici = c < colonnes ? encre((c + 0.5) / finesse, v, c, r) : -1
      if (ici === teinte) continue
      if (teinte >= 0) piles[teinte].push(Math.round(debut * s), y0, Math.round(c * s), y1)
      teinte = ici
      debut = c
    }
  }
  for (const [i, pile] of piles.entries()) {
    ctx.fillStyle = C[i]
    remplir(ctx, pile)
  }
}

/**
 * Des rectangles alignés, quatre nombres chacun (x0, y0, x1, y1), posés par
 * paquets : un seul chemin de cent mille rectangles coûte au canevas bien
 * plus que cinquante chemins de deux mille.
 */
function remplir(ctx: Pinceau, pile: readonly number[]): void {
  const PAQUET = 4 * 2000
  for (let depart = 0; depart < pile.length; depart += PAQUET) {
    ctx.beginPath()
    for (let k = depart; k < Math.min(pile.length, depart + PAQUET); k += 4) {
      const [x0, y0, x1, y1] = [pile[k], pile[k + 1], pile[k + 2], pile[k + 3]]
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y0)
      ctx.lineTo(x1, y1)
      ctx.lineTo(x0, y1)
      ctx.closePath()
    }
    ctx.fill()
  }
}

/* ---------- poudre ----------------------------------------------------------- */

/**
 * Une masse d'encre pulvérisée dont le bord monte et descend comme une crête.
 * La couverture passe de rien au presque plein sur une large frange, et ne
 * l'atteint jamais tout à fait : même au coeur de la masse, quelques grains
 * de papier restent, comme sous un aérographe.
 */
function poudre(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const cle = Math.floor(rnd() * 0x7fffffff)
  const bruit = bruiteur(cle)
  /* La masse vient d'un bord, le plus souvent du bas, légèrement de biais. */
  const cote = rnd() < 0.55 ? 0 : Math.floor(rnd() * 4)
  const angle = cote * Math.PI / 2 + (rnd() - 0.5) * 0.7
  /* L'axe pointe vers la masse : angle nul, la masse est en bas. */
  const ax = Math.sin(angle)
  const ay = Math.cos(angle)
  const largeur = W / unite
  const hauteur = H / unite
  /* L'étendue du cadre projetée sur l'axe, pour poser la crête au bon tiers. */
  const projections = [[0, 0], [largeur, 0], [0, hauteur], [largeur, hauteur]].map(([x, y]) => x * ax + y * ay)
  const bas = Math.min(...projections)
  const haut = Math.max(...projections)
  const crete = bas + (haut - bas) * (0.22 + 0.22 * rnd())
  const frange = 0.55 + 0.3 * rnd()
  const relief = 0.14 + 0.12 * rnd()
  const teinteRare = rnd() < 0.5 && C.length > 1

  semer(ctx, W, H, unite, [230, 300, 380][densite], C, (u, v, c, r) => {
    const g = u * ax + v * ay
    const p = -u * ay + v * ax
    const bord = crete + relief * (bruit(p * 1.4, 0.5) - 0.5) * 2 + 0.05 * (bruit(p * 5.2, 7.5) - 0.5) * 2
    const t = borne((g - bord) / frange + 0.5)
    /* Des nappes plus ou moins chargées à l'intérieur, pour que la masse ne
       soit pas un aplat gris. */
    const charge = 0.82 + 0.3 * (bruit(u * 2.6 + 11, v * 2.6 + 4) - 0.5)
    const couvre = Math.min(0.93, Math.pow(lisse(t), 1.5) * charge)
    const tirage = hacher(c, r, cle)
    if (tirage >= couvre) return -1
    return teinteRare && hacher(c, r, cle + 1) < 0.04 ? 1 : 0
  })
}

/* ---------- lames ------------------------------------------------------------ */

/**
 * Des lames de grain empilées : chacune a un bord net, une ligne pleine, et
 * s'évapore en s'éloignant de lui ; sa hauteur décroît jusqu'à la pointe.
 * Les lames partent toutes du même bord du cadre et s'arrêtent à des longueurs
 * différentes, comme des traînées laissées par un même geste.
 */
function lames(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const cle = Math.floor(rnd() * 0x7fffffff)
  const finesse = [190, 260, 340][densite]
  const horizontal = rnd() < 0.75
  const depuisDebut = rnd() < 0.6
  const versLeHaut = rnd() < 0.7
  const largeur = W / unite
  const hauteur = H / unite
  const etendue = horizontal ? largeur : hauteur
  const travers = horizontal ? hauteur : largeur
  const nombre = [3, 4, 6][densite]
  const echelle = [1, 0.85, 0.7][densite]
  const croissantes = rnd() < 0.5
  const alternees = rnd() < 0.4 && C.length > 1
  const ligne = 1.2 / finesse

  const liste: { base: number; haut: number; long: number; teinte: number }[] = []
  const hauteurs = Array.from({ length: nombre }, () => (0.17 + 0.1 * rnd()) * echelle)
  const total = hauteurs.reduce((a, b) => a + b, 0) + 0.012 * (nombre - 1)
  let curseur = Math.max(0.04, (travers - total) * (0.08 + 0.5 * rnd()))
  for (let j = 0; j < nombre; j += 1) {
    const rang = croissantes ? j : nombre - 1 - j
    const long = etendue * (0.5 + 0.5 * (rang / Math.max(1, nombre - 1))) * (0.92 + 0.12 * rnd())
    const h = hauteurs[j]
    /* La lame s'étend du côté opposé à son bord net. */
    const base = versLeHaut ? curseur + h : curseur
    liste.push({ base, haut: h, long, teinte: alternees ? j % 2 : 0 })
    curseur += h + 0.012
  }
  const sens = versLeHaut ? 1 : -1

  semer(ctx, W, H, unite, finesse, C, (u, v, c, r) => {
    const along = horizontal ? u : v
    const a = depuisDebut ? along : etendue - along
    const b = horizontal ? v : u
    for (const lame of liste) {
      if (a > lame.long) continue
      const d = (lame.base - b) * sens
      if (d < 0) continue
      const reste = 1 - a / lame.long
      const h = lame.haut * Math.pow(reste, 0.7)
      if (d > h) continue
      if (d < ligne) return lame.teinte
      const couvre = 0.96 * Math.pow(1 - d / h, 1.25) * (0.7 + 0.3 * reste)
      return hacher(c, r, cle) < couvre ? lame.teinte : -1
    }
    return -1
  })
}

/* ---------- lin -------------------------------------------------------------- */

function clarte(hex: string): number {
  const n = parseInt(hex.slice(1, 7), 16)
  return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)
}

function distance(a: string, b: string): number {
  const x = parseInt(a.slice(1, 7), 16)
  const y = parseInt(b.slice(1, 7), 16)
  return Math.hypot(((x >> 16) & 255) - ((y >> 16) & 255),
    ((x >> 8) & 255) - ((y >> 8) & 255), (x & 255) - (y & 255))
}

/**
 * Un dégradé doux entre deux couleurs de la palette, sous une toile de lin.
 *
 * Le dégradé est fait de bandes de transparence croissante, assez fines pour
 * que deux bandes voisines diffèrent à peine. Un halo rond et léger
 * l'empêche d'être une simple rampe.
 *
 * La toile : des fils dans les deux sens, à intervalle régulier, découpés en
 * tronçons de longueur tirée. Chaque tronçon reçoit l'un de cinq états, rien,
 * clair, très clair, sombre ou très sombre, et tous les tronçons d'un même
 * état partagent un chemin.
 */
function lin(
  ctx: Pinceau, W: number, H: number, C: readonly string[],
  densite: Densite, rnd: Alea, unite: number,
): void {
  const cle = Math.floor(rnd() * 0x7fffffff)
  /* Le dégradé lie les deux couleurs les plus proches de la palette : entre
     deux teintes opposées, le milieu d'une rampe tourne au gris. */
  let premiere = 0
  let seconde = 1
  let ecartMin = Infinity
  for (let i = 0; i < C.length; i += 1) {
    for (let j = i + 1; j < C.length; j += 1) {
      const ecart = distance(C[i], C[j])
      if (ecart > 0 && ecart < ecartMin) [premiere, seconde, ecartMin] = [i, j, ecart]
    }
  }
  if (rnd() < 0.5) [premiere, seconde] = [seconde, premiere]
  const parClarte = C.map((_, i) => i).sort((a, b) => clarte(C[b]) - clarte(C[a]))
  const largeur = W / unite
  const hauteur = H / unite

  /* Le fond de la première couleur, puis la seconde qui monte en bandes le
     long d'un axe proche de la verticale. */
  ctx.fillStyle = C[premiere]
  ctx.fillRect(0, 0, W, H)
  const angle = Math.PI / 2 + (rnd() - 0.5) * 0.9
  const diagonale = Math.hypot(W, H)
  const marches = 96
  ctx.save()
  ctx.translate(W / 2, H / 2)
  ctx.rotate(angle - Math.PI / 2)
  ctx.fillStyle = C[seconde]
  const debut = 0.15 + 0.2 * rnd()
  const fin = 0.8 + 0.15 * rnd()
  for (let i = 0; i < marches; i += 1) {
    const t = (i + 0.5) / marches
    const avant = i === 0 ? 0 : lisse(borne(((i - 0.5) / marches - debut) / (fin - debut)))
    const apres = lisse(borne((t - debut) / (fin - debut)))
    /* Chaque bande porte l'alpha qui manque pour passer de la précédente à
       elle : les bandes sont posées les unes sur les autres, du bas vers le
       haut de la rampe, et s'additionnent par composition. */
    const manque = avant >= 1 ? 0 : (apres - avant) / (1 - avant)
    if (manque <= 0) continue
    ctx.globalAlpha = manque
    const y = -diagonale / 2 + t * diagonale - diagonale / marches / 2
    ctx.fillRect(-diagonale / 2, y, diagonale, diagonale / 2 - y)
  }
  ctx.restore()
  ctx.globalAlpha = 1

  /* Un halo rond de la couleur la plus claire, qui empêche le dégradé d'être
     une simple rampe sans y mettre de tache. */
  const halo = parClarte[0]
  const cx = W * (0.15 + 0.7 * rnd())
  const cy = H * (0.15 + 0.7 * rnd())
  const rayon = unite * (0.6 + 0.5 * rnd())
  const anneaux = 40
  ctx.fillStyle = C[halo]
  for (let i = 0; i < anneaux; i += 1) {
    ctx.globalAlpha = 0.012
    ctx.beginPath()
    ctx.arc(cx, cy, rayon * (1 - i / anneaux), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  /* La toile. Les deux encres sont la plus claire et la plus sombre de la
     palette, à faible opacité : la toile prend la couleur de ce qu'elle
     recouvre. */
  const triees = [...C].sort((a, b) => clarte(a) - clarte(b))
  const sombre = triees[0]
  const claire = triees[triees.length - 1]
  const etats = [
    { teinte: claire, alpha: 0.07 }, { teinte: claire, alpha: 0.14 },
    { teinte: sombre, alpha: 0.035 }, { teinte: sombre, alpha: 0.07 },
  ]
  const fils = [120, 160, 200][densite]
  const ecart = 1 / fils
  const epaisseur = ecart * 0.42
  const piles: number[][] = etats.map(() => [])
  for (const vertical of [false, true]) {
    const longueur = vertical ? hauteur : largeur
    const compte = Math.ceil((vertical ? largeur : hauteur) * fils)
    const graine = cle + (vertical ? 7919 : 0)
    for (let f = 0; f < compte; f += 1) {
      const b0 = (f * ecart + ecart * 0.29) * unite
      let position = 0
      for (let k = 0; position < longueur; k += 1) {
        const pas = 0.006 + 0.03 * hacher(f, k * 2, graine)
        /* Une chance sur cinq de ne rien poser : le fond reste lisible
           entre les tronçons appuyés. */
        const choix = Math.floor(hacher(f, k * 2 + 1, graine) * 5)
        if (choix > 0) {
          const a0 = position * unite
          const a1 = (position + pas) * unite
          const b1 = b0 + epaisseur * unite * (choix % 2 === 0 ? 1.3 : 1)
          piles[choix - 1].push(...(vertical ? [b0, a0, b1, a1] : [a0, b0, a1, b1]))
        }
        position += pas
      }
    }
  }
  for (const [e, etat] of etats.entries()) {
    ctx.fillStyle = etat.teinte
    ctx.globalAlpha = etat.alpha
    remplir(ctx, piles[e])
  }
  ctx.globalAlpha = 1
}

/* ---------- aiguillage ------------------------------------------------------- */

export function peindrePoudre(
  ctx: Pinceau, W: number, H: number, id: IdPoudre,
  C: readonly string[], densite: Densite, rnd: Alea, unite: number,
): void {
  if (id === 'poudre') poudre(ctx, W, H, C, densite, rnd, unite)
  else if (id === 'lames') lames(ctx, W, H, C, densite, rnd, unite)
  else lin(ctx, W, H, C, densite, rnd, unite)
}
