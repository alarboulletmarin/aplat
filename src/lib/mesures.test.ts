// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ces tests protègent : la fonte, et ce qu'un instrument promet.
 *
 * La fonte est le seul endroit du moteur où une donnée écrite à la main se
 * transforme en dessin. Une case oubliée dans un glyphe ne lève rien, ne
 * change rien à la compilation, et fait qu'un tapis de coupe affiche `20` là
 * où il devrait afficher `26`. Personne ne relit un nombre de graduation sur
 * un fond d'écran ; il faut donc que le test le fasse.
 *
 * Le reste est ce que toute famille de grille doit tenir, et que le carreau et
 * le relief éprouvent déjà pour les leurs : la même image pour une même
 * graine, la même image à deux résolutions, et un cadre couvert d'un bord à
 * l'autre.
 *
 * Le fond, lui, mérite son propre contrôle. Un tapis de coupe est sombre et du
 * papier millimétré est clair, quelle que soit la palette : c'est ce que sont
 * ces objets, et c'est la seule chose que ce geste refuse de laisser décider
 * par la palette.
 */
import { describe, expect, it } from 'vitest'
import { estMesure, GLYPHES, IDS_MESURES } from './mesures'
import { FAMILLES, PALETTES, ORDRE_PALETTES, type Densite, type IdFamille } from './moteur'
import { luminanceHex } from './trace'
import { svgDuMotif } from './svg'

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

describe('liste des mesures', () => {
  it('range chacune dans le catalogue, chez les abstraits', () => {
    for (const id of IDS_MESURES) {
      const entree = FAMILLES.find((f) => f.id === id)
      expect(entree, id).toBeDefined()
      expect(entree?.groupe, id).toBe('abs')
    }
  })

  it('ne reconnaît que les siennes, jamais une clé héritée', () => {
    expect(estMesure('tapis')).toBe(true)
    expect(estMesure('mire')).toBe(true)
    for (const valeur of ['vagues', 'cubes', 'constructor', '__proto__', '', 42, null]) {
      expect(estMesure(valeur), String(valeur)).toBe(false)
    }
  })
})

describe('la fonte des graduations', () => {
  /* La table est relue case par case. C'est le seul endroit du moteur où une
     donnée saisie à la main devient un dessin, et une rangée trop courte, un
     caractère de trop ou deux chiffres au même dessin ne lèvent rien : ils
     font seulement afficher un autre nombre que celui qui est demandé. */
  it('donne à chaque glyphe cinq rangées de trois cases, pleines ou vides', () => {
    for (const [caractere, glyphe] of Object.entries(GLYPHES)) {
      expect(glyphe, caractere).toHaveLength(5)
      for (const [rang, rangee] of glyphe.entries()) {
        expect(rangee, `${caractere} rangée ${rang}`).toMatch(/^[01]{3}$/)
      }
    }
  })

  it('sait les dix chiffres, et leur donne dix dessins différents', () => {
    for (const chiffre of '0123456789') {
      expect(Object.keys(GLYPHES), chiffre).toContain(chiffre)
    }
    const dessins = [...'0123456789'].map((c) => GLYPHES[c].join('/'))
    expect(new Set(dessins).size, 'deux chiffres au même dessin').toBe(10)
  })

  it('ne laisse aucun glyphe vide, ni aucun tout plein', () => {
    /* Un glyphe vide s'efface, un glyphe plein fait un pavé : dans les deux
       cas la graduation perd son nombre sans que rien ne le signale. */
    for (const [caractere, glyphe] of Object.entries(GLYPHES)) {
      const cases = glyphe.join('')
      expect(cases.includes('1'), caractere).toBe(true)
      expect(cases.includes('0'), caractere).toBe(true)
    }
  })

  it('garde le degré au-dessus de la ligne des chiffres', () => {
    /* Le degré est un exposant : il occupe les rangées hautes et laisse les
       deux dernières vides, sans quoi il se lirait comme un zéro. */
    const degre = GLYPHES['°']
    expect(degre).toBeDefined()
    expect(degre.slice(3).join('')).toBe('000000')
  })

  it('écrit vraiment ses graduations sur le motif', () => {
    /* Et la table sert : un tapis deux fois plus haut écrit deux fois plus de
       nombres le long de sa réglette, donc pose plus de formes. Si la fonte ne
       dessinait rien, les deux motifs auraient le même compte. */
    const court = formes('tapis', 400, 500, 1)
    const long = formes('tapis', 400, 1400, 1)
    expect(long.length).toBeGreaterThan(court.length)
  })
})

describe('le fond d’un instrument', () => {
  it('garde le tapis sombre et le papier clair, sur les onze palettes', () => {
    /* C'est la promesse du geste : la palette teinte le fond, elle ne décide
       pas de sa clarté. Sans ce contrôle, quatre palettes sur onze rendraient
       un tapis de coupe en papier blanc, et le motif cesserait d'être l'objet
       qu'il dit être. */
    for (const palette of ORDRE_PALETTES) {
      const sombre = svgDuMotif({ famille: 'tapis', palette, densite: 1, graine: 7314 },
        300, 600, false)
      const clair = svgDuMotif({ famille: 'millimetre', palette, densite: 1, graine: 7314 },
        300, 600, false)
      /* Le premier chemin de chaque document est l'aplat du fond de la
         palette ; le second est celui que la famille peint par-dessus. */
      const fond = (texte: string) =>
        [...texte.matchAll(/fill="(#[0-9A-F]{6})"/g)].map((t) => t[1])[1]
      expect(luminanceHex(fond(sombre.texte)), `tapis ${palette}`).toBeLessThan(0.1)
      expect(luminanceHex(fond(clair.texte)), `millimetre ${palette}`).toBeGreaterThan(0.6)
      /* Et le fond n'est jamais la teinte de fond de la palette elle-même :
         un instrument apporte sa propre surface. */
      expect(fond(sombre.texte), `tapis ${palette}`).not.toBe(PALETTES[palette].fond)
    }
  })
})

describe('déterminisme', () => {
  it('rend deux fois la même suite de formes pour une même graine', () => {
    for (const id of IDS_MESURES) {
      expect(formes(id, 360, 780), id).toEqual(formes(id, 360, 780))
    }
  })

  it('change avec la graine, sur les trois densités', () => {
    for (const id of IDS_MESURES) {
      for (const densite of [0, 1, 2] as const) {
        expect(formes(id, 360, 780, densite, 101), `${id}/d${densite}`)
          .not.toEqual(formes(id, 360, 780, densite, 4242))
      }
    }
  })
})

describe('indépendance à la résolution', () => {
  it('rend la même image, deux fois plus grande', () => {
    for (const id of IDS_MESURES) {
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
})

describe('couverture du cadre', () => {
  it('remplit le cadre en portrait comme en paysage', () => {
    for (const id of IDS_MESURES) {
      for (const [W, H] of [[400, 900], [900, 400]]) {
        const posees = formes(id, W, H, 1)
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
