// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ces tests protègent : le catalogue des palettes livrées.
 *
 * Il a grandi de onze à quarante-sept, et trois choses peuvent s'y défaire sans
 * qu'aucun autre test s'en aperçoive. Une palette peut sortir de tous les
 * groupes, et son onglet n'existe alors pas. Un identifiant peut se glisser
 * dans le préfixe des palettes composées. Et une couleur peut être choisie à
 * l'oeil, sur un écran qui ne montre pas ce que voit tout le monde.
 *
 * Le dernier point est le plus fragile, et c'est celui qui a motivé le lot : la
 * personne qui a demandé ces palettes est daltonienne. Une teinte ne vaut donc
 * que par ce qui la sépare des autres quand le rouge et le vert se confondent,
 * et ce test le mesure plutôt que de le supposer. La simulation est celle de
 * Machado, Oliveira et Fernandes (2009), à sévérité pleine, appliquée en RVB
 * linéaire ; l'écart est la distance dans CIELAB.
 *
 * Les onze palettes d'origine ne sont pas soumises à la mesure : elles existent
 * depuis le premier jour, des liens les portent, et aucune n'est à changer pour
 * un seuil. Le seuil, vingt, est ce que tiennent déjà la plupart d'entre elles.
 */
import { describe, expect, it } from 'vitest'
import {
  estPaletteLivree, GROUPES_PALETTES, groupeDePalette, ORDRE_PALETTES, PALETTES, PREFIXE_PERSO,
} from './moteur'

const ORIGINE = [
  'lime', 'soleil', 'argile', 'corail', 'menthe', 'ciel', 'ardoise', 'prune', 'nuit', 'orage', 'encre',
] as const

describe('le catalogue', () => {
  it('range chaque palette dans un groupe, et dans un seul', () => {
    const ids = Object.keys(PALETTES)
    for (const id of ids) {
      const dans = GROUPES_PALETTES.filter((g) => (g.ids as readonly string[]).includes(id))
      expect(dans.map((g) => g.id), id).toHaveLength(1)
    }
    const listees = GROUPES_PALETTES.flatMap((g) => g.ids)
    expect(new Set(listees).size).toBe(listees.length)
    expect([...listees].sort()).toEqual([...ids].sort())
    expect([...ORDRE_PALETTES]).toEqual(listees)
  })

  it('n’a aucun groupe vide, et trouve le groupe de chaque palette', () => {
    for (const g of GROUPES_PALETTES) {
      expect(g.ids.length, g.id).toBeGreaterThan(0)
      expect(g.fr, g.id).toBeTruthy()
      expect(g.en, g.id).toBeTruthy()
      for (const id of g.ids) expect(groupeDePalette(id), id).toBe(g.id)
    }
    expect(groupeDePalette('inconnue' as never)).toBeUndefined()
  })

  it('garde les onze d’origine en tête et dans leur ordre', () => {
    /* Des liens, des historiques et des tirages portent ces identifiants : les
       déplacer changerait ce qu'ils montrent. */
    expect(ORDRE_PALETTES.slice(0, ORIGINE.length)).toEqual([...ORIGINE])
    expect(GROUPES_PALETTES[0].ids).toEqual([...ORIGINE])
  })

  it('ne confond aucun identifiant livré avec une palette composée', () => {
    for (const id of ORDRE_PALETTES) {
      expect(id.startsWith(PREFIXE_PERSO), id).toBe(false)
      expect(estPaletteLivree(id), id).toBe(true)
    }
  })

  it('donne à chaque palette un nom par langue, qui n’en prend pas un autre', () => {
    for (const langue of ['fr', 'en'] as const) {
      const noms = ORDRE_PALETTES.map((id) => PALETTES[id][langue])
      for (const nom of noms) expect(nom.trim(), langue).not.toBe('')
      expect(new Set(noms).size, langue).toBe(noms.length)
    }
  })

  it('compose chaque palette d’un fond et de quatre encres distinctes', () => {
    for (const id of ORDRE_PALETTES) {
      const { fond, couleurs } = PALETTES[id]
      for (const teinte of [fond, ...couleurs]) expect(teinte, id).toMatch(/^#[0-9A-F]{6}$/)
      expect(couleurs, id).toHaveLength(4)
      expect(new Set(couleurs).size, id).toBe(4)
      expect(couleurs, id).not.toContain(fond)
    }
  })
})

/* ---------- daltonisme ----------------------------------------------------- */

const MATRICES = {
  protanopie: [
    [0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopie: [
    [0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881],
  ],
} as const

type Vision = 'normale' | keyof typeof MATRICES

const lineaire = (c: number) => {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

const canaux = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16))

/** CIELAB d'une teinte telle que la voit `vision`, d'illuminant D65. */
function lab(hex: string, vision: Vision): [number, number, number] {
  const l = canaux(hex).map(lineaire)
  const [r, g, b] = vision === 'normale'
    ? l
    : MATRICES[vision].map((m) => Math.min(1, Math.max(0, m[0] * l[0] + m[1] * l[1] + m[2] * l[2])))
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047)
  const y = f(0.2126 * r + 0.7152 * g + 0.0722 * b)
  const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883)
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}

function ecart(a: string, b: string, vision: Vision): number {
  const [la, aa, ba] = lab(a, vision)
  const [lb, ab, bb] = lab(b, vision)
  return Math.hypot(la - lb, aa - ab, ba - bb)
}

const SEUIL = 20

describe('le daltonisme', () => {
  it('mesure une distance nulle entre une teinte et elle-même, et grande entre noir et blanc', () => {
    expect(ecart('#17243F', '#17243F', 'deuteranopie')).toBe(0)
    expect(ecart('#000000', '#FFFFFF', 'protanopie')).toBeGreaterThan(90)
  })

  it('voit un rouge et un vert de même clarté se confondre, et c’est ce que le seuil écarte', () => {
    /* Le cas d'école, et la preuve que la mesure mord : sans elle, un test qui
       ne refuse jamais rien passerait pour une garantie. */
    expect(ecart('#B8542A', '#5E8A2E', 'normale')).toBeGreaterThan(SEUIL)
    expect(ecart('#B8542A', '#7F7A2E', 'deuteranopie')).toBeLessThan(SEUIL)
  })

  const nouvelles = ORDRE_PALETTES.filter((id) => !(ORIGINE as readonly string[]).includes(id))

  for (const vision of ['normale', 'protanopie', 'deuteranopie'] as const) {
    it(`garde chaque encre distincte du fond et des autres, en vision ${vision}`, () => {
      for (const id of nouvelles) {
        const { fond, couleurs } = PALETTES[id]
        const teintes = [fond, ...couleurs]
        for (let i = 0; i < teintes.length; i += 1) {
          for (let j = i + 1; j < teintes.length; j += 1) {
            expect(
              ecart(teintes[i], teintes[j], vision),
              `${id}: ${teintes[i]} contre ${teintes[j]}`,
            ).toBeGreaterThanOrEqual(SEUIL)
          }
        }
      }
    })
  }
})
