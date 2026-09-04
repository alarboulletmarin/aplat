// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ces tests protègent : les deux familles à frontière courbe, le lagon
 * et la floraison, et la discipline sans laquelle elles mentiraient.
 *
 * Elles comptent leurs germes sur le format, comme un carreau compte ses
 * cases : une image plus haute porte une rangée de fleurs de plus. Un `rnd()`
 * appelé dans cette boucle décalerait donc toute la suite dès qu'une rangée
 * s'ajoute, et la première fleur changerait de couleur d'un format à l'autre.
 * Les deux familles s'interdisent le tirage dans la boucle et interrogent une
 * clé par leurs coordonnées de grille ; ces tests le vérifient de l'extérieur,
 * en comparant des images de formats différents forme pour forme.
 *
 * Ils tiennent aussi le chenal, qui est le motif lui-même : le fond visible
 * entre deux pièces ne doit pas s'étaler d'un facteur trois d'un bout de
 * l'image à l'autre. Une pièce qui vient toucher sa voisine, un retrait mal
 * posé, un chenal oublié sur un bord ne lèvent aucune erreur et ne se voient
 * qu'à l'oeil, sur une image que personne ne regarde deux fois.
 *
 * Ils passent par le pinceau qui note, celui de `svg.ts` : c'est le même
 * `formes()` que le canevas, et il rend une description exacte de chaque forme
 * posée, teinte comprise. Aucun navigateur n'est nécessaire.
 */
import { describe, expect, it } from 'vitest'
import { estFracture, IDS_FRACTURES } from './fractures'
import { FAMILLES, type IdFamille, type Densite } from './moteur'
import { svgDuMotif } from './svg'

/** Les deux familles que la frontière courbe a apportées. */
const COURBES: IdFamille[] = ['lagon', 'floraison']

/** Les formes posées, teinte et chemin, dans l'ordre où elles le sont. */
function formes(
  famille: IdFamille, largeur: number, hauteur: number, densite: Densite = 1, graine = 7314,
): { fill: string; d: string }[] {
  const rendu = svgDuMotif({ famille, palette: 'lime', densite, graine }, largeur, hauteur, false)
  return [...rendu.texte.matchAll(/<path d="([^"]*)" fill="([^"]*)"/g)]
    .map((trouve) => ({ fill: trouve[2], d: trouve[1] }))
    /* La première est l'aplat de fond, posé par `svgDuMotif` avant le motif. */
    .slice(1)
}

/** Les nombres d'un chemin, dans l'ordre. */
function nombres(d: string): number[] {
  return (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
}

/** Les points d'un chemin, par paires. */
function points(d: string): [number, number][] {
  const plats = nombres(d)
  const sortie: [number, number][] = []
  for (let i = 0; i + 1 < plats.length; i += 2) sortie.push([plats[i], plats[i + 1]])
  return sortie
}

describe('liste des familles à frontière courbe', () => {
  it('les range dans le geste de la fracture', () => {
    for (const id of COURBES) {
      expect(IDS_FRACTURES.includes(id as never), id).toBe(true)
      expect(estFracture(id), id).toBe(true)
    }
  })

  it('range le lagon dans les abstraits et la floraison dans les figures', () => {
    /* Les deux ne se rangent pas au même endroit, et c'est le sens même des
       groupes : le lagon pose des formes libres dont rien ne revient, la
       floraison pose des objets qu'on reconnaît un par un. */
    expect(FAMILLES.find((f) => f.id === 'lagon')?.groupe).toBe('abs')
    expect(FAMILLES.find((f) => f.id === 'floraison')?.groupe).toBe('fig')
  })

  it('ne reconnaît que les siennes, jamais une clé héritée', () => {
    for (const valeur of ['vagues', 'meandres', 'constructor', '__proto__', '', 42, null]) {
      expect(estFracture(valeur), String(valeur)).toBe(false)
    }
  })
})

describe('déterminisme', () => {
  it('rend deux fois la même suite de formes pour une même graine', () => {
    for (const id of COURBES) {
      expect(formes(id, 360, 780), id).toEqual(formes(id, 360, 780))
    }
  })

  it('change avec la graine, sur les trois densités', () => {
    for (const id of COURBES) {
      for (const densite of [0, 1, 2] as const) {
        expect(formes(id, 360, 780, densite, 101), `${id}/d${densite}`)
          .not.toEqual(formes(id, 360, 780, densite, 4242))
      }
    }
  })
})

describe('indépendance à la résolution', () => {
  it('rend la même image, deux fois plus grande', () => {
    /* La garantie centrale du produit : la sonde mesure sur un petit canevas,
       la vignette dessine plus petit encore, et l'export sort en pleine
       résolution. Tous les trois doivent regarder le même motif.

       C'est ici que se contrôle la recherche du rayon, qui est la seule partie
       du geste à procéder par pas et par dichotomie plutôt que par formule :
       son pas et sa portée sont des longueurs de l'image, et le doublement doit
       donc traverser la recherche sans y perdre un centième de pixel. */
    for (const id of COURBES) {
      const petit = formes(id, 360, 780)
      const grand = formes(id, 720, 1560)
      expect(grand.length, id).toBe(petit.length)
      for (const [i, forme] of petit.entries()) {
        expect(grand[i].fill, `${id} forme ${i}`).toBe(forme.fill)
        const attendus = nombres(forme.d)
        const obtenus = nombres(grand[i].d)
        expect(obtenus.length, `${id} forme ${i}`).toBe(attendus.length)
        for (const [k, valeur] of attendus.entries()) {
          /* Les coordonnées sont écrites au centième de pixel : le doublement
             en hérite, jamais plus. */
          expect(Math.abs(obtenus[k] - valeur * 2), `${id} forme ${i}`).toBeLessThanOrEqual(0.03)
        }
      }
    }
  })
})

describe('grille et format', () => {
  it('ne redistribue pas le haut de l’image quand elle gagne des rangées', () => {
    /* Le défaut que ce test tient fermé, et la raison d'être de la clé : un
       `rnd()` appelé dans la boucle des germes décalerait toute la suite dès
       qu'une rangée s'ajoute, et la première pièce changerait avec.

       La comparaison porte sur le premier tiers : une pièce du haut peut
       toucher un germe de la rangée qu'on vient d'ajouter, et se retailler
       légitimement, mais pas la première. */
    for (const id of COURBES) {
      const court = formes(id, 360, 700)
      const long = formes(id, 360, 1400)
      expect(long.length, id).toBeGreaterThan(court.length)
      const commun = Math.floor(court.length / 3)
      expect(commun, id).toBeGreaterThan(3)
      expect(long.slice(0, commun).map((f) => f.fill), id)
        .toEqual(court.slice(0, commun).map((f) => f.fill))
    }
  })

  it('couvre le cadre en portrait comme en paysage', () => {
    /* Une grille calée sur le petit côté doit déborder du grand : sans cela,
       un fond d'écran d'ordinateur montrerait une bande de fond nu à droite.
       Le lagon couvre tout ; la floraison laisse le fond entre ses rosettes,
       mais elle en pose jusqu'aux quatre bords. */
    for (const id of COURBES) {
      for (const [W, H] of [[400, 900], [900, 400]]) {
        const posees = formes(id, W, H, 1)
        expect(posees.length, `${id} ${W}x${H}`).toBeGreaterThan(10)
        const tous = posees.flatMap((forme) => points(forme.d))
        expect(Math.max(...tous.map((p) => p[0])), `${id} ${W}x${H}`).toBeGreaterThan(W * 0.9)
        expect(Math.max(...tous.map((p) => p[1])), `${id} ${W}x${H}`).toBeGreaterThan(H * 0.9)
        expect(Math.min(...tous.map((p) => p[0])), `${id} ${W}x${H}`).toBeLessThan(W * 0.1)
        expect(Math.min(...tous.map((p) => p[1])), `${id} ${W}x${H}`).toBeLessThan(H * 0.1)
      }
    }
  })
})

describe('le chenal', () => {
  it('garde une largeur du même ordre partout', () => {
    /* Ce que ce test tient, et ce qu'il ne tient pas.

       Il tient le chenal : sur une image entière, la largeur du fond visible
       entre deux pièces ne doit pas s'étaler d'un facteur trois. C'est le motif
       lui-même, et rien d'autre ne le dirait : un retrait mal posé, un chenal
       oublié sur un bord, une pièce qui vient toucher sa voisine ne lèvent
       aucune erreur et se voient seulement à l'oeil, sur une image que
       personne ne regarde deux fois.

       Il ne tient pas le procédé. Le moteur divise l'écart des deux distances
       par sa pente avant de le comparer au retrait, ce qui rend au chenal une
       vraie longueur ; la mesure ci-dessous descend de 2,3 à 2,1 quand on
       ajoute cette division, ce qui est un progrès réel et un progrès que ce
       seuil ne distingue pas. Le seuil est là pour attraper une régression
       franche, pas pour départager deux versions proches.

       Les sommets près du bord de l'image sont écartés : une pièce coupée par
       le cadre n'a pas de voisine de ce côté, et la distance relevée y serait
       celle d'une pièce lointaine. */
    const W = 500
    const H = 1080
    const contours = formes('floraison', W, H, 1).map((forme) => points(forme.d))
    expect(contours.length).toBeGreaterThan(20)

    const largeurs: number[] = []
    for (const [i, contour] of contours.entries()) {
      for (const p of contour) {
        if (p[0] < 20 || p[1] < 20 || p[0] > W - 20 || p[1] > H - 20) continue
        let distance = Infinity
        for (const [j, autre] of contours.entries()) {
          if (j === i) continue
          for (const q of autre) distance = Math.min(distance, Math.hypot(q[0] - p[0], q[1] - p[1]))
        }
        if (distance < Infinity) largeurs.push(distance)
      }
    }
    expect(largeurs.length).toBeGreaterThan(400)

    largeurs.sort((a, b) => a - b)
    const centile = (part: number) => largeurs[Math.floor(largeurs.length * part)]
    expect(centile(0.1)).toBeGreaterThan(0)
    expect(centile(0.9) / centile(0.1)).toBeLessThan(3)
  })
})
