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
 */
import type { Alea, Densite, Pinceau } from './moteur'
import { hacher, ruban, type Point } from './trace'

export const IDS_COURANTS = ['courants', 'rubans', 'sillage'] as const
export type IdCourant = (typeof IDS_COURANTS)[number]

export function estCourant(valeur: unknown): valeur is IdCourant {
  return IDS_COURANTS.includes(valeur as IdCourant)
}

interface Echantillon {
  point: Point
  courbe: number
  rang: number
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
  const angleEn = (x: number, y: number): number => {
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
        const angle = angleEn(point[0], point[1])
        /* Le point milieu réduit les angles visibles sans lisser après coup :
           un lissage déplacerait les lignes hors de leur corridor de sécurité. */
        const milieu = angleEn(point[0] + Math.cos(angle) * pas * sens / 2,
          point[1] + Math.sin(angle) * pas * sens / 2)
        const suivant: Point = [point[0] + Math.cos(milieu) * pas * sens,
          point[1] + Math.sin(milieu) * pas * sens]
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

export function peindreCourant(
  ctx: Pinceau, W: number, H: number, id: IdCourant,
  C: readonly string[], densite: Densite, rnd: Alea, unite: number,
): void {
  const cle = Math.floor(rnd() * 0x7fffffff)
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
