// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ces tests protègent : la discipline sans laquelle une famille de
 * grille ment sur ce qu'elle montre.
 *
 * Une grille compte ses colonnes et ses rangées d'après le format. Un tirage
 * fait dans la boucle des cases dépendrait donc du format : une image d'une
 * rangée de plus consommerait un tirage de plus, et tout ce qui suit
 * changerait, y compris la première ligne. La sonde de lisibilité regarderait
 * une image, le fichier en porterait une autre, et l'aperçu cesserait d'être
 * le fichier.
 *
 * Le carreau s'interdit donc tout tirage dans la boucle : la graine fabrique
 * une clé, et chaque case interroge cette clé par ses propres coordonnées.
 * C'est invisible à l'oeil, ça ne lève aucune erreur, et ça ne se voit qu'en
 * dessinant deux fois le même motif à deux formats. C'est ce que font ces
 * tests.
 *
 * Ils passent par le pinceau qui note, celui de `svg.ts` : c'est le même
 * `formes()` que le canevas, et il rend une description exacte de chaque forme
 * posée, teinte comprise. Aucun navigateur n'est nécessaire.
 */
import { describe, expect, it } from 'vitest'
import { estCarreau, IDS_CARREAUX } from './carreaux'
import { estCoulee, IDS_COULEES } from './coulees'
import { FAMILLES, type IdFamille, type Densite } from './moteur'
import { svgDuMotif } from './svg'

const NEUVES = [...IDS_CARREAUX, ...IDS_COULEES]

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

/** Les abscisses d'un chemin : un nombre sur deux, le premier compris. */
function abscisses(d: string): number[] {
  return nombres(d).filter((_, i) => i % 2 === 0)
}

describe('liste des familles neuves', () => {
  it('range le carreau dans les pavages et la coulée dans les abstraits', () => {
    /* Les deux gestes ne rangent pas au même endroit, et c'est le sens même
       des groupes : le carreau pose une maille qui revient, la coulée fait
       serpenter des rubans dont rien ne se répète. */
    for (const id of IDS_CARREAUX) {
      expect(FAMILLES.find((f) => f.id === id)?.groupe, id).toBe('pav')
    }
    for (const id of IDS_COULEES) {
      expect(FAMILLES.find((f) => f.id === id)?.groupe, id).toBe('abs')
    }
  })

  it('ne reconnaît que les siennes, jamais une clé héritée', () => {
    expect(estCarreau('bauhaus')).toBe(true)
    expect(estCoulee('meandres')).toBe(true)
    expect(estCarreau('meandres')).toBe(false)
    expect(estCoulee('bauhaus')).toBe(false)
    for (const valeur of ['vagues', 'constructor', '__proto__', '', 42, null]) {
      expect(estCarreau(valeur), String(valeur)).toBe(false)
      expect(estCoulee(valeur), String(valeur)).toBe(false)
    }
  })
})

describe('déterminisme', () => {
  it('rend deux fois la même suite de formes pour une même graine', () => {
    for (const id of NEUVES) {
      expect(formes(id, 360, 780), id).toEqual(formes(id, 360, 780))
    }
  })

  it('change avec la graine, sur les trois densités', () => {
    for (const id of NEUVES) {
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
       résolution. Tous les trois doivent regarder le même motif. */
    for (const id of NEUVES) {
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
       `rnd()` appelé dans la boucle des cases décalerait toute la suite dès
       qu'une rangée s'ajoute, et la première ligne changerait avec.

       La comparaison s'arrête avant la fin : seule la dernière rangée de blocs
       peut différer légitimement, un bloc de quatre cases ne se formant que
       s'il tient tout entier dans la grille. */
    for (const id of IDS_CARREAUX) {
      const court = formes(id, 360, 780)
      const long = formes(id, 360, 1400)
      expect(long.length, id).toBeGreaterThan(court.length)
      const commun = Math.floor(court.length * 0.6)
      expect(commun, id).toBeGreaterThan(4)
      expect(long.slice(0, commun), id).toEqual(court.slice(0, commun))
    }
  })

  it('ne redistribue pas la gauche de l’image quand elle gagne des colonnes', () => {
    /* Le même défaut, pris par l'autre bout, et c'est celui-ci qui mord.

       En portrait, la grille compte toujours autant de colonnes, et les cases
       se posent de haut en bas : un tirage fait dans la boucle donnerait quand
       même le même début, et le contrôle ci-dessus le laisserait passer. En
       paysage, la grille se cale sur la hauteur et le nombre de colonnes suit
       la largeur ; une rangée plus large consomme alors plus de tirages, et
       tout ce qui vient après se décale, y compris la colonne de gauche.

       On compare donc, à hauteur égale, la partie gauche de deux images de
       largeurs différentes : elle doit être identique, forme pour forme. */
    for (const id of IDS_CARREAUX) {
      const limite = 560
      const gauche = (largeur: number) =>
        formes(id, largeur, 400, 1).filter((forme) => Math.max(...abscisses(forme.d)) < limite)
      const etroite = gauche(700)
      expect(etroite.length, id).toBeGreaterThan(6)
      expect(gauche(1100), id).toEqual(etroite)
    }
  })

  it('couvre le cadre en portrait comme en paysage', () => {
    /* Une grille calée sur le petit côté doit déborder du grand : sans cela,
       un fond d'écran d'ordinateur montrerait une bande de fond nu à droite. */
    for (const id of NEUVES) {
      for (const [W, H] of [[400, 900], [900, 400]]) {
        const posees = formes(id, W, H, 2)
        expect(posees.length, `${id} ${W}x${H}`).toBeGreaterThan(10)
        const tous = posees.flatMap((forme) => nombres(forme.d))
        const pairs = tous.filter((_, i) => i % 2 === 0)
        const impairs = tous.filter((_, i) => i % 2 === 1)
        expect(Math.max(...pairs), `${id} ${W}x${H}`).toBeGreaterThan(W * 0.8)
        expect(Math.max(...impairs), `${id} ${W}x${H}`).toBeGreaterThan(H * 0.8)
      }
    }
  })
})

describe('rubans de la coulée', () => {
  it('donne une seule teinte à un ruban, sur toute sa longueur', () => {
    /* Le point de la famille. Chaque arc est un quart d'anneau, et deux arcs
       bout à bout appartiennent au même ruban dès qu'ils partagent le milieu
       d'un côté. Ce test retrouve les rubans par leurs bouts et vérifie
       qu'aucun ne change de couleur en route : sans l'union-trouve, le motif
       redevient un damier bariolé, et rien d'autre ne le dirait. */
    const posees = formes('meandres', 400, 880, 1)
    expect(posees.length).toBeGreaterThan(20)

    /* Le bout d'un arc, arrondi au dixième de pixel : deux arcs voisins
       écrivent le même point, à l'écriture au centième près. */
    const bouts = (d: string): string[] => {
      const n = nombres(d)
      const cle = (x: number, y: number) => `${Math.round(x * 10)},${Math.round(y * 10)}`
      return [cle(n[0], n[1]), cle(n[n.length - 2], n[n.length - 1])]
    }
    const teinteDuBout = new Map<string, string>()
    for (const forme of posees) {
      for (const bout of bouts(forme.d)) {
        const vue = teinteDuBout.get(bout)
        if (vue === undefined) teinteDuBout.set(bout, forme.fill)
        else expect(vue, bout).toBe(forme.fill)
      }
    }
    /* Et le motif emploie bien plusieurs teintes, sans quoi le test ci-dessus
       passerait sur une image d'une seule couleur. */
    expect(new Set(posees.map((forme) => forme.fill)).size).toBeGreaterThan(1)
  })
})
