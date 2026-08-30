// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ces tests protègent : l'opacité du tricot, l'ajour du cannage, et
 * l'ordre de pose qui fait le tissage.
 *
 * Les deux familles de ce module se sont trompées deux fois chacune avant de
 * tenir, et jamais sur un calcul : le tricot posé à même le fond faisait un
 * filet, épaissi il faisait des tuiles ; le cannage à brins écartés perçait un
 * trou de plus à chaque noeud, et à diagonales larges il perdait ses octogones.
 * Aucune de ces quatre versions n'aurait levé un test. Ce qu'on peut protéger
 * en revanche, ce sont les mesures dont ces réglages dépendent, et surtout le
 * fait qu'un brin est bien un ruban plein posé dans un ordre, et non un trait.
 *
 * S'y ajoutent les garanties communes à toute famille de grille, celles que le
 * carreau, le relief et la panoplie éprouvent déjà pour les leurs : la même
 * image pour une même graine, la même image à deux résolutions, une grille qui
 * ne se redistribue pas quand le cadre s'élargit, et un cadre couvert d'un bord
 * à l'autre.
 *
 * Tout passe par le pinceau qui note, celui de `svg.ts` : c'est le même
 * `formes()` que le canevas, et aucun navigateur n'est nécessaire.
 */
import { describe, expect, it } from 'vitest'
import { estTissu, IDS_TISSUS } from './tissus'
import { FAMILLES, type Densite, type IdFamille } from './moteur'
import { svgDuMotif } from './svg'

/** Les formes posées, teinte et chemin, dans l'ordre. */
function formes(
  famille: IdFamille, largeur: number, hauteur: number, densite: Densite = 1, graine = 7314,
): { fill: string; d: string }[] {
  const rendu = svgDuMotif({ famille, palette: 'lime', densite, graine }, largeur, hauteur, false)
  return [...rendu.texte.matchAll(/<path d="([^"]*)" fill="([^"]*)"([^/]*)\/>/g)]
    .map((trouve) => ({ fill: trouve[2], d: trouve[1] }))
    /* La première est l'aplat de fond, posé par `svgDuMotif` avant le motif. */
    .slice(1)
}

function nombres(d: string): number[] {
  return (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
}

function abscisses(d: string): number[] {
  return nombres(d).filter((_, i) => i % 2 === 0)
}

describe('liste des tissus', () => {
  it('range chacun dans le catalogue, chez les matières', () => {
    for (const id of IDS_TISSUS) {
      const entree = FAMILLES.find((f) => f.id === id)
      expect(entree, id).toBeDefined()
      expect(entree?.groupe, id).toBe('mat')
    }
  })

  it('ne reconnaît que les siens, jamais une clé héritée', () => {
    expect(estTissu('tricot')).toBe(true)
    expect(estTissu('cannage')).toBe(true)
    for (const valeur of ['tresse', 'drape', 'moire', 'constructor', '__proto__', '', 7, null]) {
      expect(estTissu(valeur), String(valeur)).toBe(false)
    }
  })
})

describe('le tissage tient à l’ordre de pose', () => {
  it('donne au tricot un fond de rangée sous chaque maille', () => {
    /* Le jersey est opaque parce que la rangée pose d'abord une bande pleine,
       la teinte du fil dans l'ombre, et les mailles par-dessus. Sans cette
       bande, le papier passe entre les V en losanges et le tricot devient une
       résille. La bande se reconnaît à ce qu'elle traverse toute l'image ;
       aucune maille ne le fait. */
    const posees = formes('tricot', 400, 900)
    const bandes = posees.filter((forme) => {
      const x = abscisses(forme.d)
      return Math.min(...x) < 0 && Math.max(...x) > 400
    })
    expect(bandes.length).toBeGreaterThan(8)
    /* Et chaque bande vient avant les mailles qu'elle porte. */
    const premiere = posees.findIndex((forme) => forme === bandes[0])
    expect(premiere).toBe(0)
  })

  it('pose le cannage en quatre couches, les biais en dernier', () => {
    /* Le pinceau ne sait pas glisser un brin sous un autre : le tissage est
       l'ordre, et rien d'autre. Les montants d'abord, les traverses ensuite,
       les deux biais pour finir. Un biais posé avant une traverse passerait
       dessous, ce qui n'est pas un cannage. */
    const posees = formes('cannage', 400, 900)
    const penche = (forme: { d: string }) => {
      const n = nombres(forme.d)
      const xs = n.filter((_, i) => i % 2 === 0)
      const ys = n.filter((_, i) => i % 2 === 1)
      return Math.max(...xs) - Math.min(...xs) > 40 && Math.max(...ys) - Math.min(...ys) > 40
    }
    const premierBiais = posees.findIndex(penche)
    expect(premierBiais).toBeGreaterThan(4)
    /* Passé le premier biais, plus aucun brin droit. */
    expect(posees.slice(premierBiais).every(penche)).toBe(true)
  })
})

describe('déterminisme', () => {
  it('rend deux fois la même suite de formes pour une même graine', () => {
    for (const id of IDS_TISSUS) {
      expect(formes(id, 360, 780), id).toEqual(formes(id, 360, 780))
    }
  })

  it('change avec la graine, sur les trois densités', () => {
    for (const id of IDS_TISSUS) {
      for (const densite of [0, 1, 2] as const) {
        expect(formes(id, 360, 780, densite, 101), `${id}/d${densite}`)
          .not.toEqual(formes(id, 360, 780, densite, 4242))
      }
    }
  })
})

describe('indépendance à la résolution', () => {
  it('rend la même image, deux fois plus grande', () => {
    for (const id of IDS_TISSUS) {
      const petit = formes(id, 360, 780)
      const grand = formes(id, 720, 1560)
      expect(grand.length, id).toBe(petit.length)
      for (const [i, forme] of petit.entries()) {
        expect(grand[i].fill, `${id} forme ${i}`).toBe(forme.fill)
        const attendus = nombres(forme.d)
        const obtenus = nombres(grand[i].d)
        expect(obtenus.length, `${id} forme ${i}`).toBe(attendus.length)
        for (const [k, valeur] of attendus.entries()) {
          expect(Math.abs(obtenus[k] - valeur * 2), `${id} forme ${i}`).toBeLessThanOrEqual(0.03)
        }
      }
    }
  })

  it('ne redistribue pas la gauche de l’image quand elle gagne des colonnes', () => {
    /* La discipline du carreau : ce qui est à gauche ne bouge pas quand le cadre
       s'élargit. Sans elle, la sonde de lisibilité, qui mesure sur un canevas
       au format approché, regarderait une autre image que celle qu'on exporte.
       Les brins qui traversent tout le cadre en sont exclus d'office : ils
       changent de longueur avec lui, et c'est leur métier. */
    for (const id of IDS_TISSUS) {
      const limite = 300
      const gauche = (largeur: number) =>
        formes(id, largeur, 420, 1).filter((forme) => Math.max(...abscisses(forme.d)) < limite)
      const etroite = gauche(700)
      expect(etroite.length, id).toBeGreaterThan(3)
      expect(gauche(1100), id).toEqual(etroite)
    }
  })
})

describe('couverture du cadre', () => {
  it('remplit le cadre en portrait comme en paysage', () => {
    for (const id of IDS_TISSUS) {
      for (const [W, H] of [[400, 900], [900, 400]]) {
        const posees = formes(id, W, H, 1)
        expect(posees.length, `${id} ${W}x${H}`).toBeGreaterThan(10)
        const tous = posees.flatMap((forme) => nombres(forme.d))
        const pairs = tous.filter((_, i) => i % 2 === 0)
        const impairs = tous.filter((_, i) => i % 2 === 1)
        expect(Math.max(...pairs), `${id} ${W}x${H}`).toBeGreaterThan(W * 0.8)
        expect(Math.max(...impairs), `${id} ${W}x${H}`).toBeGreaterThan(H * 0.8)
        expect(Math.min(...pairs), `${id} ${W}x${H}`).toBeLessThan(W * 0.2)
      }
    }
  })

  it('déborde du cadre plutôt que de s’arrêter avant lui', () => {
    /* Un fond d'écran n'a pas de marge : le tissu est coupé par le bord, jamais
       arrêté avant. */
    for (const id of IDS_TISSUS) {
      const tous = formes(id, 420, 900, 1).flatMap((forme) => nombres(forme.d))
      expect(Math.min(...tous.filter((_, i) => i % 2 === 0)), id).toBeLessThan(0)
      expect(Math.min(...tous.filter((_, i) => i % 2 === 1)), id).toBeLessThan(0)
    }
  })
})
