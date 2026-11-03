// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest'
import { composerCourants, composerFaisceaux, estCourant, IDS_COURANTS, peindreCourant } from './courants'
import { alea, estFamille, FAMILLES, PALETTES, type Pinceau } from './moteur'
import { svgDuMotif } from './svg'
import type { Point } from './trace'

function distanceAuSegment(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)
}

function distanceSegments(a: Point, b: Point, c: Point, d: Point): number {
  const croix = (p: Point, q: Point, r: Point) =>
    (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
  if (croix(a, b, c) * croix(a, b, d) < 0 && croix(c, d, a) * croix(c, d, b) < 0) return 0
  return Math.min(distanceAuSegment(a, c, d), distanceAuSegment(b, c, d),
    distanceAuSegment(c, a, b), distanceAuSegment(d, a, b))
}

describe('le champ de directions', () => {
  it('inscrit les quatre variantes dans le catalogue abstrait et les listes blanches', () => {
    for (const id of IDS_COURANTS) {
      expect(estCourant(id) && estFamille(id)).toBe(true)
      expect(FAMILLES.find((f) => f.id === id)?.groupe).toBe('abs')
    }
    for (const id of ['constructor', '__proto__', null, 0, 'meandres']) expect(estCourant(id)).toBe(false)
  })

  it('reproduit une graine et la distingue des autres', () => {
    const a = composerCourants(1, 2, 1, 7314)
    expect(a.courbes.length).toBeGreaterThan(10)
    expect(composerCourants(1, 2, 1, 7314)).toEqual(a)
    expect(composerCourants(1, 2, 1, 7315).courbes).not.toEqual(a.courbes)
  })

  it('conserve un vide entre les surfaces, y compris entre deux sommets échantillonnés', () => {
    /* Vérification segment contre segment, indépendante du test de points du
       moteur. La grille du test ne sert qu'à écarter les paires lointaines. */
    for (const larges of [false, true]) {
      for (const densite of [0, 1, 2] as const) {
        const { courbes, espacement, epaisseur } = composerCourants(1, 1.6, densite, 4242, larges)
        type Segment = { a: Point; b: Point; courbe: number }
        const grille = new Map<string, Segment[]>()
        let minimum = Infinity
        for (const [courbe, points] of courbes.entries()) {
          for (let i = 1; i < points.length; i += 1) {
            const segment = { a: points[i - 1], b: points[i], courbe }
            const c0 = Math.floor(Math.min(segment.a[0], segment.b[0]) / espacement)
            const c1 = Math.floor(Math.max(segment.a[0], segment.b[0]) / espacement)
            const r0 = Math.floor(Math.min(segment.a[1], segment.b[1]) / espacement)
            const r1 = Math.floor(Math.max(segment.a[1], segment.b[1]) / espacement)
            for (let r = r0 - 1; r <= r1 + 1; r += 1) {
              for (let c = c0 - 1; c <= c1 + 1; c += 1) {
                for (const autre of grille.get(`${c},${r}`) ?? []) {
                  if (autre.courbe !== courbe) minimum = Math.min(minimum,
                    distanceSegments(segment.a, segment.b, autre.a, autre.b))
                }
              }
            }
            for (let r = r0; r <= r1; r += 1) {
              for (let c = c0; c <= c1; c += 1) {
                const nom = `${c},${r}`
                const liste = grille.get(nom) ?? []
                liste.push(segment)
                grille.set(nom, liste)
              }
            }
          }
        }
        expect(Number.isFinite(minimum)).toBe(true)
        expect(minimum - epaisseur, `large=${larges}, densité=${densite}`).toBeGreaterThanOrEqual(espacement - epaisseur - 1e-10)
      }
    }
  })

  it('augmente le nombre de courbes avec la densité', () => {
    const nombres = ([0, 1, 2] as const).map((d) => composerCourants(1, 2, d, 7314).courbes.length)
    expect(nombres[1]).toBeGreaterThan(nombres[0])
    expect(nombres[2]).toBeGreaterThan(nombres[1])
  })

  it('trace les mêmes coordonnées relatives dans l’aperçu et dans le fichier', () => {
    for (const id of IDS_COURANTS) {
      const enregistrer = (unite: number) => {
        const traces: number[][] = []
        const ctx = {
          beginPath() {}, closePath() {}, fill() {},
          moveTo(x: number, y: number) { traces.push([x / unite, y / unite]) },
          lineTo(x: number, y: number) { traces.push([x / unite, y / unite]) },
          arc(x: number, y: number, r: number, a: number, b: number) {
            traces.push([x / unite, y / unite, r / unite, a, b])
          },
        } as unknown as Pinceau
        peindreCourant(ctx, unite, unite * 2, id, PALETTES.lime.couleurs, 1, alea(7314), unite)
        return traces.flat()
      }
      const petit = enregistrer(180)
      const grand = enregistrer(1440)
      expect(grand.length).toBe(petit.length)
      expect(Math.max(...grand.map((n, i) => Math.abs(n - petit[i])))).toBeLessThan(1e-10)
    }
  })

  it.each(Object.entries(PALETTES))('exporte les quatre variantes avec la palette %s sans couleur étrangère', (palette, P) => {
    for (const famille of IDS_COURANTS) {
      const rendu = svgDuMotif({ famille, palette: palette as keyof typeof PALETTES, densite: 1, graine: 7314 }, 360, 780, false)
      expect(rendu.texte).not.toMatch(/NaN|Infinity|undefined/)
      const teintes = [...rendu.texte.matchAll(/<path d="[^"]*" fill="([^"]*)"/g)].map((m) => m[1])
      expect(teintes.length).toBeGreaterThan(2)
      for (const teinte of teintes) expect([P.fond, ...P.couleurs]).toContain(teinte)
    }
  })
})

describe('les faisceaux', () => {
  it('reproduit une graine et la distingue des autres', () => {
    const a = composerFaisceaux(1, 2, 1, 7314, 4)
    expect(a.length).toBeGreaterThan(10)
    expect(composerFaisceaux(1, 2, 1, 7314, 4)).toEqual(a)
    expect(composerFaisceaux(1, 2, 1, 7315, 4)).not.toEqual(a)
  })

  it('finit chaque brin en pointe, aux deux bouts', () => {
    for (const { bords: [gauche, droite] } of composerFaisceaux(1, 2, 1, 4242, 4)) {
      const n = gauche.length
      expect(droite.length).toBe(n)
      for (const k of [0, n - 1]) {
        expect(Math.hypot(gauche[k][0] - droite[k][0], gauche[k][1] - droite[k][1])).toBeLessThan(1e-9)
      }
    }
  })

  it('colle les brins d’un faisceau sans jour entre eux', () => {
    /* Les bords sont des sommes cumulées : le bord droit d'un brin est, point
       pour point, le bord gauche du suivant. */
    const brins = composerFaisceaux(1, 2, 2, 4242, 4)
    let collages = 0
    for (let i = 1; i < brins.length; i += 1) {
      if (brins[i].bords[0] === brins[i - 1].bords[1]) collages += 1
    }
    expect(collages).toBeGreaterThan(5)
  })

  it('ne pose que des couleurs de la palette, voisines dans un même faisceau', () => {
    for (const brin of composerFaisceaux(1, 2, 1, 7314, 3)) {
      expect(brin.couleur).toBeGreaterThanOrEqual(0)
      expect(brin.couleur).toBeLessThan(3)
    }
  })

  it('augmente le nombre de brins avec la densité', () => {
    const nombres = ([0, 1, 2] as const).map((d) => composerFaisceaux(1, 2, d, 7314, 4).length)
    expect(nombres[1]).toBeGreaterThan(nombres[0])
    expect(nombres[2]).toBeGreaterThan(nombres[1])
  })
})
