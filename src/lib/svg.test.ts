// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ces tests protègent : la sortie vectorielle passe par le même
 * `formes()` que le PNG, avec un pinceau qui note au lieu de peindre. La
 * promesse est donc la même que celle du reste du produit, le déterminisme :
 * une graine donnée rend toujours le même document.
 *
 * Ils portent aussi sur ce qu'un SVG ne doit jamais contenir : un attribut mal
 * fermé, une coordonnée qui n'est pas un nombre, un `NaN` venu d'un arc mal
 * converti. Un seul suffit à rendre le fichier illisible, et rien ne le dirait
 * avant qu'on l'ouvre ailleurs.
 *
 * Ni le voile ni l'ombre de la version sombre ne sont demandés ici : les deux
 * passent par la sonde de lisibilité, qui réclame un canevas, donc un
 * navigateur. C'est `tools/e2e.mjs` qui les éprouve, sur le document
 * réellement téléchargé.
 */
import { describe, expect, it } from 'vitest'
import { FAMILLES, type Motif } from './moteur'
import { couleurSVG, ELEMENTS_MAX, svgDuMotif } from './svg'

const BASE: Motif = { famille: 'vagues', palette: 'lime', densite: 1, graine: 7314 }

/**
 * Le voile est peint en `rgba()`, notation que les navigateurs acceptent dans un
 * attribut `fill` mais qui n'appartient pas au SVG 1.1 : un fichier ouvert dans
 * un outil de dessin y perdrait ses bandes. C'est la seule couleur du moteur qui
 * ne soit pas hexadécimale, et c'est donc le seul endroit où ça peut casser.
 */
describe('couleurs', () => {
  it('sort l’opacité de la couleur, et rend six chiffres', () => {
    expect(couleurSVG('rgba(11,18,33,0.3)')).toEqual({ teinte: '#0B1221', alpha: 0.3 })
    expect(couleurSVG('rgba(250, 247, 236, 0.0812)')).toEqual({ teinte: '#FAF7EC', alpha: 0.0812 })
    expect(couleurSVG('rgb(255,0,0)')).toEqual({ teinte: '#FF0000', alpha: 1 })
  })

  it('accepte les notations hexadécimales, longue et courte', () => {
    expect(couleurSVG('#dff478')).toEqual({ teinte: '#DFF478', alpha: 1 })
    expect(couleurSVG('#f0a')).toEqual({ teinte: '#FF00AA', alpha: 1 })
  })

  it('retombe sur le noir plutôt que d’écrire un attribut illisible', () => {
    expect(couleurSVG('rebeccapurple').teinte).toBe('#000000')
    expect(couleurSVG('').teinte).toBe('#000000')
  })

  it('borne les canaux', () => {
    expect(couleurSVG('rgba(300,-4,0,1)').teinte).toBe('#FF0000')
  })
})

describe('document SVG', () => {
  it('ouvre et ferme un document complet, à la taille demandée', () => {
    const rendu = svgDuMotif(BASE, 1179, 2556, false)
    expect(rendu.texte.startsWith('<?xml version="1.0" encoding="UTF-8"?><svg ')).toBe(true)
    expect(rendu.texte.endsWith('</svg>')).toBe(true)
    expect(rendu.texte).toContain('viewBox="0 0 1179 2556"')
    expect(rendu.texte).toContain('width="1179"')
    expect(rendu.elements).toBeGreaterThan(0)
  })

  it('dit dans sa description ce qu’il ne porte pas', () => {
    /* Le grain est une trame d'image : il n'a pas d'équivalent vectoriel, et
       le fichier est donc plus lisse que le PNG. On l'écrit plutôt que de
       laisser croire à une copie exacte. */
    const rendu = svgDuMotif(BASE, 400, 800, false)
    expect(rendu.texte).toMatch(/<desc>[^<]*grain/)
  })

  it('rend deux fois le même document pour la même graine', () => {
    const a = svgDuMotif(BASE, 800, 600, false)
    const b = svgDuMotif(BASE, 800, 600, false)
    expect(a.texte).toBe(b.texte)
    const autre = svgDuMotif({ ...BASE, graine: 7315 }, 800, 600, false)
    expect(autre.texte).not.toBe(a.texte)
  })

  it('n’écrit jamais NaN, Infinity ni undefined dans un chemin', () => {
    /* Les arcs et les ellipses passent par une conversion en courbes ; une
       division par zéro y produirait un fichier que rien ne signale avant de
       l'ouvrir ailleurs. */
    for (const famille of FAMILLES) {
      for (const densite of [0, 2] as const) {
        const rendu = svgDuMotif(
          { famille: famille.id, palette: 'nuit', densite, graine: 4242 },
          360, 640, false,
        )
        expect(rendu.texte.includes('NaN'), famille.id).toBe(false)
        expect(rendu.texte.includes('Infinity'), famille.id).toBe(false)
        expect(rendu.texte.includes('undefined'), famille.id).toBe(false)
        expect(rendu.elements, famille.id).toBeGreaterThan(0)
      }
    }
  })

  it('ne pose que des couleurs hexadécimales, jamais un attribut ouvert', () => {
    for (const famille of ['terrazzo', 'fleurs', 'lunes', 'tournesol'] as const) {
      const rendu = svgDuMotif(
        { famille, palette: 'corail', densite: 1, graine: 99 },
        500, 500, false,
      )
      const remplissages = [...rendu.texte.matchAll(/fill="([^"]*)"/g)].map((t) => t[1])
      expect(remplissages.length).toBeGreaterThan(0)
      for (const teinte of remplissages) {
        expect(teinte, famille).toMatch(/^#[0-9A-Fa-f]{6}$/)
      }
      expect(rendu.texte.includes('"" ')).toBe(false)
    }
  })

  it('garde les familles dessinées sous le plafond, à toutes les densités', () => {
    /* Le plafond n'est pas décoratif : au-delà, le fichier passe la dizaine de
       mégaoctets et s'ouvre mal. Aucune famille dessinée n'en approche, et
       c'est ce test qui le dit : une famille ajoutée un jour qui le
       dépasserait ferait échouer ici plutôt que de livrer un SVG inouvrable.

       Les lieux ne sont pas dans la boucle, et c'est un choix : une gravure
       tramée compte ses points par milliers et joue avec le plafond, dessous
       sur la plupart des tirages, dessus sur les plus denses. C'est le cas
       prévu par le garde-fou : le panneau des formats éprouve chaque motif et
       retire le SVG quand celui-là ne passe pas. */
    let record = 0
    for (const famille of FAMILLES.filter((f) => f.groupe !== 'lieu')) {
      const rendu = svgDuMotif(
        { famille: famille.id, palette: 'nuit', densite: 2, graine: 7314 },
        2560, 1440, false,
      )
      expect(rendu.elements, famille.id).toBeLessThan(ELEMENTS_MAX)
      record = Math.max(record, rendu.elements)
    }
    expect(record).toBeGreaterThan(100)
  })

  it('fusionne les points d’une gravure en rangées : le fichier reste ouvrable', () => {
    /* Une gravure naïve écrirait un chemin par cellule, cent mille et plus.
       La fusion par rangées les ramène à l'ordre du plafond : c'est elle qui
       rend le vectoriel seulement possible sur la plupart des tirages, et ce
       test dit qu'elle tient. */
    for (const famille of FAMILLES.filter((f) => f.groupe === 'lieu')) {
      const rendu = svgDuMotif(
        { famille: famille.id, palette: 'nuit', densite: 1, graine: 7314 },
        2560, 1440, false,
      )
      expect(rendu.elements, famille.id).toBeGreaterThan(1000)
      expect(rendu.elements, famille.id).toBeLessThan(ELEMENTS_MAX)
    }
  })

  it('ne dépend pas de la résolution pour le nombre de formes', () => {
    /* Toutes les tailles du moteur se rapportent au petit côté : c'est ce qui
       rend le motif indépendant de la résolution, et c'est aussi ce qui permet
       de juger la faisabilité du SVG sans la refaire à chaque format. */
    const petit = svgDuMotif({ ...BASE, densite: 2 }, 600, 1300, false)
    const grand = svgDuMotif({ ...BASE, densite: 2 }, 1200, 2600, false)
    expect(petit.elements).toBe(grand.elements)
  })

  it('garde les formes dans le cadre, à quelques débordements voulus près', () => {
    /* Les familles débordent volontiers du cadre, c'est ce qui fait qu'un motif
       n'a pas de bord ; mais aucune ne doit partir à dix fois la taille de
       l'image, ce qui signalerait une transformation mal appliquée. */
    const rendu = svgDuMotif(BASE, 400, 800, false)
    /* Les seuls nombres à lire sont ceux des chemins : une couleur comme
       #17243F se lit sinon comme dix-sept mille. */
    const nombres = [...rendu.texte.matchAll(/ d="([^"]*)"/g)]
      .flatMap((chemin) => chemin[1].match(/-?\d+(?:\.\d+)?/g) ?? [])
      .map(Number)
      .filter((valeur) => Number.isFinite(valeur))
    expect(nombres.length).toBeGreaterThan(20)
    expect(Math.max(...nombres)).toBeLessThan(8000)
    expect(Math.min(...nombres)).toBeGreaterThan(-8000)
  })
})
