// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ces tests protègent : les creux, et la discipline de la grille.
 *
 * Un maillot sans encolure, un dossard sans ses trous d'épingle, un bonnet dont
 * la sangle déborde : aucun de ces défauts ne lève quoi que ce soit. Le dessin
 * reste juste au pixel près, la compilation passe, et l'objet cesse simplement
 * d'être reconnaissable. Le creux, surtout, est fragile : il ne tient qu'à ce
 * que le contour et son trou entrent dans le **même** chemin, rempli par la
 * règle paire et impaire. Séparés en deux chemins, le trou se remplit de la
 * même teinte que la forme et disparaît sans bruit. Un test le relit.
 *
 * S'y ajoutent les garanties communes à toute famille de grille, celles que le
 * carreau et le relief éprouvent déjà pour les leurs : la même image pour une
 * même graine, la même image à deux résolutions, une grille qui ne se
 * redistribue pas quand le cadre s'élargit, et un cadre couvert d'un bord à
 * l'autre.
 *
 * Tout passe par le pinceau qui note, celui de `svg.ts` : c'est le même
 * `formes()` que le canevas, et aucun navigateur n'est nécessaire.
 */
import { describe, expect, it } from 'vitest'
import { estPanoplie, IDS_PANOPLIES } from './panoplies'
import { FAMILLES, type Densite, type IdFamille } from './moteur'
import { svgDuMotif } from './svg'

/** Les formes posées, teinte, règle de remplissage et chemin, dans l'ordre. */
function formes(
  famille: IdFamille, largeur: number, hauteur: number, densite: Densite = 1, graine = 7314,
): { fill: string; d: string; pair: boolean }[] {
  const rendu = svgDuMotif({ famille, palette: 'lime', densite, graine }, largeur, hauteur, false)
  return [...rendu.texte.matchAll(/<path d="([^"]*)" fill="([^"]*)"([^/]*)\/>/g)]
    .map((trouve) => ({ fill: trouve[2], d: trouve[1], pair: trouve[3].includes('evenodd') }))
    /* La première est l'aplat de fond, posé par `svgDuMotif` avant le motif. */
    .slice(1)
}

function nombres(d: string): number[] {
  return (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
}

function abscisses(d: string): number[] {
  return nombres(d).filter((_, i) => i % 2 === 0)
}

describe('liste des panoplies', () => {
  it('range chacune dans le catalogue, chez les figures', () => {
    for (const id of IDS_PANOPLIES) {
      const entree = FAMILLES.find((f) => f.id === id)
      expect(entree, id).toBeDefined()
      expect(entree?.groupe, id).toBe('fig')
    }
  })

  it('ne reconnaît que les siennes, jamais une clé héritée', () => {
    expect(estPanoplie('maillots')).toBe(true)
    expect(estPanoplie('dossards')).toBe(true)
    expect(estPanoplie('bonnets')).toBe(true)
    for (const valeur of ['vagues', 'jetons', 'couloirs', 'constructor', '__proto__', '', 7, null]) {
      expect(estPanoplie(valeur), String(valeur)).toBe(false)
    }
  })
})

describe('les creux sont de vrais creux', () => {
  /* L'encolure du maillot et les quatre trous du dossard sont évidés par la
     règle paire et impaire, dans le même chemin que la forme qui les porte.
     C'est ce qui laisse voir le fond de la palette au travers. Séparés en deux
     chemins, ils se rempliraient de la teinte du vêtement, et personne ne le
     verrait avant de changer de palette. */
  it('perce le maillot et le dossard dans un seul chemin', () => {
    for (const id of ['maillots', 'dossards'] as const) {
      const perces = formes(id, 360, 780).filter((forme) => forme.pair)
      expect(perces.length, id).toBeGreaterThan(4)
      for (const forme of perces) {
        /* Deux sous-chemins au moins : le contour, puis ce qu'il perce. */
        expect((forme.d.match(/M/g) ?? []).length, `${id} ${forme.d.slice(0, 30)}`)
          .toBeGreaterThan(1)
      }
    }
  })

  it('donne quatre trous au dossard, jamais trois ni cinq', () => {
    /* Le dossard s'épingle par ses quatre coins. Un trou perdu dans une
       refonte du contour ne se verrait qu'en regardant de près une vignette de
       quatre-vingts pixels. */
    const perces = formes('dossards', 360, 780).filter((forme) => forme.pair)
    expect(perces.length).toBeGreaterThan(4)
    for (const forme of perces) {
      /* Le rectangle du papier, puis ses quatre trous : cinq sous-chemins. */
      expect((forme.d.match(/M/g) ?? []).length).toBe(5)
    }
  })
})

describe('déterminisme', () => {
  it('rend deux fois la même suite de formes pour une même graine', () => {
    for (const id of IDS_PANOPLIES) {
      expect(formes(id, 360, 780), id).toEqual(formes(id, 360, 780))
    }
  })

  it('change avec la graine, sur les trois densités', () => {
    for (const id of IDS_PANOPLIES) {
      for (const densite of [0, 1, 2] as const) {
        expect(formes(id, 360, 780, densite, 101), `${id}/d${densite}`)
          .not.toEqual(formes(id, 360, 780, densite, 4242))
      }
    }
  })
})

describe('indépendance à la résolution', () => {
  it('rend la même image, deux fois plus grande', () => {
    for (const id of IDS_PANOPLIES) {
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
    /* La discipline du carreau : la grille se cale sur le coin de l'image et
       chaque case s'interroge par ses coordonnées entières, si bien qu'un cadre
       plus large n'ajoute que des objets à droite. Sans elle, la sonde de
       lisibilité, qui mesure sur un canevas au format approché, regarderait une
       autre image que celle qu'on exporte. */
    for (const id of IDS_PANOPLIES) {
      const limite = 420
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
    for (const id of IDS_PANOPLIES) {
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
    /* La grille déborde d'une case dans les quatre directions : un objet est
       coupé par le bord, jamais arrêté avant. Une rangée qui s'arrêterait au
       ras du cadre ferait une planche encadrée, et un fond d'écran n'a pas de
       marge. */
    for (const id of IDS_PANOPLIES) {
      const tous = formes(id, 420, 900, 1).flatMap((forme) => nombres(forme.d))
      expect(Math.min(...tous.filter((_, i) => i % 2 === 0)), id).toBeLessThan(0)
      expect(Math.min(...tous.filter((_, i) => i % 2 === 1)), id).toBeLessThan(0)
    }
  })
})
