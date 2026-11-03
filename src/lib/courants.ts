// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Des lignes de courant inspirées de « Flow Fields », Tyler Hobbs (2020).
 * https://www.tylerxhobbs.com/words/flow-fields
 *
 * Le champ combine des plis sinusoïdaux et des lentilles qui dévient les
 * lignes localement. Aucun bruit de Perlin : les déformations ont une échelle
 * et une direction communes, plutôt qu'une agitation uniforme.
 * Tout se calcule au petit côté, y compris les collisions : l'aperçu et le
 * fichier prennent exactement les mêmes décisions, quelle que soit leur taille.
 *
 * Faisceaux prend l'autre moitié de l'essai : peu de traits, aucune collision,
 * des bandes de couleurs collées côte à côte qui gonflent, se pincent en fil et
 * finissent en pointe. Les lignes du champ convergent, et les faisceaux avec.
 */
import type { Alea, Densite, Pinceau } from './moteur'
import { hacher, ruban, type Point } from './trace'

export const IDS_COURANTS = ['courants', 'rubans', 'sillage', 'faisceaux'] as const
export type IdCourant = (typeof IDS_COURANTS)[number]

export function estCourant(valeur: unknown): valeur is IdCourant {
  return IDS_COURANTS.includes(valeur as IdCourant)
}

interface Echantillon {
  point: Point
  courbe: number
  rang: number
}

/**
 * Le champ d'angles d'une graine : des plis sinusoïdaux orientés et quatre
 * lentilles. Courants et Faisceaux lisent le même, si bien qu'une graine donne
 * la même circulation aux deux gestes.
 */
export function champDeDirections(cle: number): (x: number, y: number) => number {
  const phase = hacher(0, 0, cle) * Math.PI * 2
  const direction = hacher(1, 0, cle) * Math.PI * 2
  const lentilles = Array.from({ length: 4 }, (_, i) => ({
    x: hacher(i, 1, cle) * 2 - 0.4,
    y: hacher(i, 2, cle) * 2 - 0.4,
    force: (hacher(i, 3, cle) - 0.5) * 5,
  }))

  /* La grille d'angles est paresseuse : les grands formats ne calculent que
     les cellules effectivement traversées. Les angles restent déroulés,
     sans retour modulo 2 pi qui créerait une couture à l'interpolation. */
  const grille = new Map<string, number>()
  const angleAuNoeud = (c: number, r: number): number => {
    const nom = `${c},${r}`
    const present = grille.get(nom)
    if (present !== undefined) return present
    const x = c / 40
    const y = r / 40
    const u = x * Math.cos(direction) + y * Math.sin(direction)
    const v = -x * Math.sin(direction) + y * Math.cos(direction)
    let angle = direction + 0.9 * Math.sin(3.2 * u + phase + 0.8 * Math.sin(3 * v + phase))
    for (const lentille of lentilles) {
      const dx = x - lentille.x
      const dy = y - lentille.y
      angle += lentille.force * Math.exp(-(dx * dx + dy * dy) * 5)
    }
    grille.set(nom, angle)
    return angle
  }
  return (x, y) => {
    const c = Math.floor(x * 40)
    const r = Math.floor(y * 40)
    const fx = x * 40 - c
    const fy = y * 40 - r
    const a = angleAuNoeud(c, r)
    const b = angleAuNoeud(c + 1, r)
    const d = angleAuNoeud(c, r + 1)
    const e = angleAuNoeud(c + 1, r + 1)
    return (a + (b - a) * fx) * (1 - fy) + (d + (e - d) * fx) * fy
  }
}

/** Un pas d'intégration au point milieu, dans le sens donné. */
function avancer(angleEn: (x: number, y: number) => number, point: Point, pas: number): Point {
  const angle = angleEn(point[0], point[1])
  const milieu = angleEn(point[0] + Math.cos(angle) * pas / 2, point[1] + Math.sin(angle) * pas / 2)
  return [point[0] + Math.cos(milieu) * pas, point[1] + Math.sin(milieu) * pas]
}

/** Géométrie en unités du petit côté, indépendante du pinceau et des couleurs. */
export function composerCourants(
  largeur: number, hauteur: number, densite: Densite, cle: number, larges = false,
): { courbes: Point[][]; espacement: number; epaisseur: number; pas: number } {
  /* Les formats extrêmes gardent un budget de départs borné. Ce facteur ne
     dépend que du rapport du cadre, jamais de sa résolution en pixels. */
  const facteur = Math.max(1, Math.sqrt(largeur * hauteur / 8))
  const espacement = facteur / (larges ? [9, 14, 21] : [14, 23, 36])[densite]
  const epaisseur = espacement * (larges ? 0.58 : 0.13)
  const pas = Math.min(0.004, espacement / 6)
  const marge = 0.18
  const angleEn = champDeDirections(cle)

  /* Deux segments peuvent passer plus près que leurs sommets. Ajouter un pas
     entier à la distance testée garantit l'espacement des segments eux-mêmes,
     et laisse encore espacement - epaisseur de fond entre deux rubans. */
  const securite = espacement + pas
  const voisinage = new Map<string, Echantillon[]>()
  const caseDe = ([x, y]: Point): [number, number] =>
    [Math.floor(x / securite), Math.floor(y / securite)]
  const inscrire = (e: Echantillon) => {
    const nom = caseDe(e.point).join(',')
    const liste = voisinage.get(nom) ?? []
    liste.push(e)
    voisinage.set(nom, liste)
  }
  const libre = (point: Point, courbe: number, rang: number): boolean => {
    const [c, r] = caseDe(point)
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        for (const autre of voisinage.get(`${c + dx},${r + dy}`) ?? []) {
          /* Les voisins immédiats appartiennent au même trait. Le rang signé
             permet de tester aussi le retour contre l'aller et d'arrêter une
             ligne qui reviendrait sur elle-même. */
          if (autre.courbe === courbe && Math.abs(autre.rang - rang) * pas < securite * 2) continue
          if (Math.hypot(point[0] - autre.point[0], point[1] - autre.point[1]) < securite) return false
        }
      }
    }
    return true
  }

  const departs: { point: Point; priorite: number }[] = []
  const maille = espacement * 0.85
  for (let r = -1; r <= Math.ceil((hauteur + marge) / maille); r += 1) {
    for (let c = -1; c <= Math.ceil((largeur + marge) / maille); c += 1) {
      departs.push({
        point: [(c + hacher(c, r, cle + 1)) * maille, (r + hacher(c, r, cle + 2)) * maille],
        priorite: hacher(c, r, cle + 3),
      })
    }
  }
  departs.sort((a, b) => a.priorite - b.priorite)
  const courbes: Point[][] = []
  let numero = 0
  for (const { point: depart } of departs) {
    const courbe = numero++
    if (!libre(depart, courbe, 0)) continue
    const poses: Echantillon[] = [{ point: depart, courbe, rang: 0 }]
    inscrire(poses[0])
    const suivre = (sens: number): Point[] => {
      const points: Point[] = []
      let point = depart
      for (let i = 1; i <= Math.ceil(2.8 / pas); i += 1) {
        /* Le point milieu réduit les angles visibles sans lisser après coup :
           un lissage déplacerait les lignes hors de leur corridor de sécurité. */
        const suivant = avancer(angleEn, point, pas * sens)
        if (suivant[0] < -marge || suivant[1] < -marge ||
            suivant[0] > largeur + marge || suivant[1] > hauteur + marge ||
            !libre(suivant, courbe, i * sens)) break
        points.push(suivant)
        const e = { point: suivant, courbe, rang: i * sens }
        poses.push(e)
        inscrire(e)
        point = suivant
      }
      return points
    }
    const aller = suivre(1)
    const retour = suivre(-1)
    if ((aller.length + retour.length) * pas >= 0.16) {
      courbes.push([...retour.reverse(), depart, ...aller])
    } else {
      /* Un départ trop court ne doit pas laisser d'obstacles invisibles. */
      for (const e of poses) {
        const nom = caseDe(e.point).join(',')
        const liste = voisinage.get(nom)!
        liste.splice(liste.indexOf(e), 1)
        if (liste.length === 0) voisinage.delete(nom)
      }
    }
  }
  return { courbes, espacement, epaisseur, pas }
}

/** Une bande d'un faisceau : ses deux bords, en unités du petit côté. */
export interface Brin {
  bords: [Point[], Point[]]
  couleur: number
}

/**
 * Les faisceaux : chacun suit une ligne du champ et porte deux à quatre brins
 * de couleurs voisines dans la palette. La largeur totale suit une enveloppe
 * nulle aux deux bouts, et la part de chaque brin varie le long du trait :
 * l'un s'efface pendant que l'autre gonfle, sans jamais laisser de jour entre
 * eux, puisque les bords sont des sommes cumulées des mêmes parts.
 */
export function composerFaisceaux(
  largeur: number, hauteur: number, densite: Densite, cle: number, couleurs: number,
): Brin[] {
  const angleEn = champDeDirections(cle)
  const pas = 0.005
  const marge = 0.35
  const aire = largeur * hauteur / 2.165
  const nombre = Math.max(4, Math.round([8, 14, 22][densite] * aire))
  const echelle = [1.25, 1, 0.8][densite]
  const brins: Brin[] = []
  let precedent: Point = [largeur / 2, hauteur / 2]

  for (let i = 0; i < nombre; i += 1) {
    const h = (k: number) => hacher(i, 10 + k, cle)
    /* Un faisceau sur trois ou quatre part à côté du précédent : les deux suivent alors
       des lignes voisines du champ, se rejoignent et se séparent. */
    const voisin = i > 0 && h(0) < 0.3
    const depart: Point = voisin
      ? [precedent[0] + (h(1) - 0.5) * 0.16, precedent[1] + (h(2) - 0.5) * 0.16]
      : [h(1) * (largeur + 0.3) - 0.15, h(2) * (hauteur + 0.3) - 0.15]
    precedent = depart

    const demiLongueur = 0.5 + 1.1 * h(3)
    const suivre = (sens: number): Point[] => {
      const points: Point[] = []
      let point = depart
      for (let k = 1; k * pas <= demiLongueur; k += 1) {
        point = avancer(angleEn, point, pas * sens)
        if (point[0] < -marge || point[1] < -marge ||
            point[0] > largeur + marge || point[1] > hauteur + marge) break
        points.push(point)
      }
      return points
    }
    const ligne = [...suivre(-1).reverse(), depart, ...suivre(1)]
    const n = ligne.length
    if (n < 12) continue

    /* Des fils et des bandes : un faisceau sur quatre reste un trait fin, les
       autres prennent une largeur tirée sur une échelle géométrique. */
    const fil = h(4) < 0.25
    const pleine = echelle * (fil ? 0.006 + 0.012 * h(5) : 0.05 * Math.pow(4, h(5)))
    const nombreBrins = Math.min(couleurs, fil ? 1 + Math.floor(h(6) * 2) : 2 + Math.floor(h(6) * 3))
    const teinte = Math.floor(h(7) * couleurs)
    const frequence = 0.6 + 1.4 * h(8)
    const phase = h(9) * Math.PI * 2
    const parts = Array.from({ length: nombreBrins }, (_, j) => ({
      frequence: 0.8 + 2.2 * hacher(i, 30 + j, cle),
      phase: hacher(i, 40 + j, cle) * Math.PI * 2,
    }))

    const normales: Point[] = ligne.map((_, k) => {
      const avant = ligne[Math.max(0, k - 1)]
      const apres = ligne[Math.min(n - 1, k + 1)]
      const dx = apres[0] - avant[0]
      const dy = apres[1] - avant[1]
      const l = Math.hypot(dx, dy) || 1
      return [-dy / l, dx / l]
    })
    const bords: Point[][] = Array.from({ length: nombreBrins + 1 }, () => [])
    for (let k = 0; k < n; k += 1) {
      const t = k / (n - 1)
      /* L'enveloppe : nulle aux bouts, gonflée puis pincée entre les deux. */
      const houle = 0.5 + 0.5 * Math.sin(Math.PI * 2 * frequence * t + phase)
      const total = pleine * Math.pow(Math.sin(Math.PI * t), 0.6) * (0.3 + 0.7 * houle)
      const poids = parts.map((p) => 0.12 + Math.pow(0.5 + 0.5 * Math.sin(Math.PI * 2 * p.frequence * t + p.phase), 2))
      const somme = poids.reduce((a, b) => a + b, 0)
      let decalage = -total / 2
      for (let j = 0; j <= nombreBrins; j += 1) {
        const [x, y] = ligne[k]
        bords[j].push([x + normales[k][0] * decalage, y + normales[k][1] * decalage])
        if (j < nombreBrins) decalage += total * poids[j] / somme
      }
    }
    for (let j = 0; j < nombreBrins; j += 1) {
      brins.push({ bords: [bords[j], bords[j + 1]], couleur: (teinte + j) % couleurs })
    }
  }
  return brins
}

export function peindreCourant(
  ctx: Pinceau, W: number, H: number, id: IdCourant,
  C: readonly string[], densite: Densite, rnd: Alea, unite: number,
): void {
  const cle = Math.floor(rnd() * 0x7fffffff)
  if (id === 'faisceaux') {
    for (const { bords: [gauche, droite], couleur } of composerFaisceaux(W / unite, H / unite, densite, cle, C.length)) {
      ctx.fillStyle = C[couleur]
      ctx.beginPath()
      ctx.moveTo(gauche[0][0] * unite, gauche[0][1] * unite)
      for (let k = 1; k < gauche.length; k += 1) ctx.lineTo(gauche[k][0] * unite, gauche[k][1] * unite)
      for (let k = droite.length - 1; k >= 0; k -= 1) ctx.lineTo(droite[k][0] * unite, droite[k][1] * unite)
      ctx.closePath()
      ctx.fill()
    }
    return
  }
  const { courbes, epaisseur, pas } = composerCourants(W / unite, H / unite, densite, cle, id === 'rubans')
  for (const [i, courbe] of courbes.entries()) {
    ctx.fillStyle = C[Math.floor(hacher(i, 4, cle) * C.length)]
    const points: Point[] = courbe.map(([x, y]) => [x * unite, y * unite])
    if (id === 'sillage') {
      /* Les lacunes appartiennent au dessin ; le corridor entier reste réservé
         pour qu'aucune autre ligne ne traverse les blancs du pointillé. */
      const tiret = Math.max(2, Math.round(epaisseur * 4 / pas))
      const periode = tiret + Math.max(2, Math.round(epaisseur * 3 / pas))
      for (let debut = 0; debut < points.length - 1; debut += periode) {
        ruban(ctx, points.slice(debut, debut + tiret + 1), epaisseur * unite)
        ctx.fill()
      }
    } else {
      ruban(ctx, points, epaisseur * unite)
      ctx.fill()
    }
  }
}
