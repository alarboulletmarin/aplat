// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ces tests protègent : le relief tient tout entier dans l'ordre des
 * valeurs, et rien d'autre ne le dit.
 *
 * Un cube n'est un cube que si son dessus est plus clair que son flanc gauche,
 * qui est lui-même plus clair que son flanc droit. Inversez deux des trois et
 * le dessin reste juste, les contours ne bougent pas, aucune erreur n'est
 * levée, et le volume se retourne comme un masque creux. C'est le genre de
 * défaut qu'on ne voit pas en relisant le code et qu'on ne voit plus une fois
 * qu'on s'y est habitué : il faut un test.
 *
 * S'y ajoutent les garanties communes à toute famille de grille, celles que le
 * carreau éprouve déjà pour les siennes : deux fois la même image pour une
 * même graine, la même image à deux résolutions, et une grille dont le
 * contenu ne se redistribue pas quand le cadre s'élargit.
 *
 * Comme pour le carreau, tout passe par le pinceau qui note, celui de
 * `svg.ts` : c'est le même `formes()` que le canevas, et il rend la teinte
 * exacte de chaque face. Aucun navigateur n'est nécessaire.
 */
import { describe, expect, it } from 'vitest'
import { estRelief, IDS_RELIEFS } from './reliefs'
import { FAMILLES, type Densite, type IdFamille } from './moteur'
import { luminanceHex } from './trace'
import { svgDuMotif } from './svg'

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

function nombres(d: string): number[] {
  return (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
}

function abscisses(d: string): number[] {
  return nombres(d).filter((_, i) => i % 2 === 0)
}

/** Les familles dont la grille est calée sur le coin de l'image. */
const CALEES = IDS_RELIEFS.filter((id) => id !== 'fuite')

describe('liste des reliefs', () => {
  it('range chacun dans le catalogue, chez les abstraits', () => {
    for (const id of IDS_RELIEFS) {
      const entree = FAMILLES.find((f) => f.id === id)
      expect(entree, id).toBeDefined()
      expect(entree?.groupe, id).toBe('abs')
    }
  })

  it('ne reconnaît que les siens, jamais une clé héritée', () => {
    expect(estRelief('cubes')).toBe(true)
    expect(estRelief('fuite')).toBe(true)
    for (const valeur of ['vagues', 'bauhaus', 'constructor', '__proto__', '', 42, null]) {
      expect(estRelief(valeur), String(valeur)).toBe(false)
    }
  })
})

describe('les trois faces d’un cube', () => {
  it('descend toujours du dessus au flanc droit, jamais l’inverse', () => {
    /* Les faces sortent par trois, dans l'ordre où le cube les pose : le
       losange du dessus, le flanc gauche, le flanc droit. Si l'une des trois
       passait devant une autre en clarté, le tas de cubes se creuserait au
       lieu de saillir, et le dessin resterait juste au pixel près. */
    for (const densite of [0, 1, 2] as const) {
      const faces = formes('cubes', 360, 780, densite)
      expect(faces.length, `d${densite}`).toBeGreaterThan(30)
      expect(faces.length % 3, `d${densite}`).toBe(0)
      for (let i = 0; i < faces.length; i += 3) {
        const [dessus, gauche, droite] = faces.slice(i, i + 3).map((f) => luminanceHex(f.fill))
        expect(dessus, `cube ${i / 3} d${densite}`).toBeGreaterThan(gauche)
        expect(gauche, `cube ${i / 3} d${densite}`).toBeGreaterThan(droite)
      }
    }
  })

  it('éclaire toutes les palettes, y compris celles qui n’ont pas de teinte sombre', () => {
    /* Le jour et l'ombre sont pris hors de la palette, un cran au-delà de ses
       deux bouts : c'est ce qui garantit qu'une teinte déjà claire s'éclaire
       encore, et qu'une teinte déjà sombre s'assombrit encore. Nuit n'a que
       des teintes claires, Encre que des vives : les deux doivent rendre trois
       valeurs distinctes par cube comme les autres. */
    for (const palette of ['nuit', 'encre', 'lime'] as const) {
      const rendu = svgDuMotif({ famille: 'cubes', palette, densite: 1, graine: 99 },
        320, 700, false)
      const teintes = [...rendu.texte.matchAll(/fill="([^"]*)"/g)].map((t) => t[1]).slice(1)
      for (let i = 0; i < teintes.length - 2; i += 3) {
        expect(luminanceHex(teintes[i]), `${palette} ${i}`)
          .toBeGreaterThan(luminanceHex(teintes[i + 2]))
      }
    }
  })
})

describe('déterminisme', () => {
  it('rend deux fois la même suite de faces pour une même graine', () => {
    for (const id of IDS_RELIEFS) {
      expect(formes(id, 360, 780), id).toEqual(formes(id, 360, 780))
    }
  })

  it('change avec la graine, sur les trois densités', () => {
    for (const id of IDS_RELIEFS) {
      for (const densite of [0, 1, 2] as const) {
        expect(formes(id, 360, 780, densite, 101), `${id}/d${densite}`)
          .not.toEqual(formes(id, 360, 780, densite, 4242))
      }
    }
  })
})

describe('indépendance à la résolution', () => {
  it('rend la même image, deux fois plus grande', () => {
    for (const id of IDS_RELIEFS) {
      const petit = formes(id, 360, 780)
      const grand = formes(id, 720, 1560)
      expect(grand.length, id).toBe(petit.length)
      for (const [i, forme] of petit.entries()) {
        expect(grand[i].fill, `${id} face ${i}`).toBe(forme.fill)
        const attendus = nombres(forme.d)
        const obtenus = nombres(grand[i].d)
        expect(obtenus.length, `${id} face ${i}`).toBe(attendus.length)
        for (const [k, valeur] of attendus.entries()) {
          expect(Math.abs(obtenus[k] - valeur * 2), `${id} face ${i}`).toBeLessThanOrEqual(0.03)
        }
      }
    }
  })

  it('ne redistribue pas la gauche de l’image quand elle gagne des colonnes', () => {
    /* La même discipline que pour le carreau : la grille se cale sur le coin
       de l'image et chaque case interroge la clé par ses coordonnées, si bien
       qu'un cadre plus large n'ajoute que des cases à droite.

       Point de fuite en est exclue, et c'est réglementaire : son point de
       fuite est posé en fraction de la largeur, donc toute la scène se déplace
       avec le cadre. C'est ce que fait une perspective. */
    for (const id of CALEES) {
      const limite = 520
      const gauche = (largeur: number) =>
        formes(id, largeur, 420, 1).filter((forme) => Math.max(...abscisses(forme.d)) < limite)
      const etroite = gauche(700)
      expect(etroite.length, id).toBeGreaterThan(6)
      expect(gauche(1100), id).toEqual(etroite)
    }
  })
})

describe('couverture du cadre', () => {
  it('remplit le cadre en portrait comme en paysage', () => {
    for (const id of IDS_RELIEFS) {
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

  it('déborde du cadre là où la nappe et les cubes doivent le couvrir', () => {
    /* Le défaut que ce contrôle tient fermé : les sommets de la nappe sont
       bousculés, et celui de l'origine partait parfois vers l'intérieur, ce
       qui laissait voir la page en filet le long des bords haut et gauche. Un
       fond d'écran ne peut pas avoir de bord. */
    for (const id of ['plis', 'cubes'] as const) {
      const tous = formes(id, 420, 900, 1).flatMap((forme) => nombres(forme.d))
      expect(Math.min(...tous.filter((_, i) => i % 2 === 0)), id).toBeLessThanOrEqual(0)
      expect(Math.min(...tous.filter((_, i) => i % 2 === 1)), id).toBeLessThanOrEqual(0)
    }
  })
})
