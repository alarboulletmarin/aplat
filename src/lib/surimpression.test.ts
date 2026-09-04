// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ces tests protègent : la troisième couleur, qui est toute la famille.
 *
 * L'affiche pose deux encres et une troisième là où elles se croisent. Cette
 * troisième n'est ni tirée de la palette ni mélangée : c'est le produit canal
 * par canal des deux autres, posé sur l'intersection géométrique des formes,
 * découpée avant d'être peinte. Rien de tout cela ne lève d'erreur si ça casse.
 * Un `couperConvexe` qui rendrait le sujet entier au lieu de son intersection
 * donnerait une image plausible, seulement plus sombre ; une découpe qui
 * rendrait toujours vide donnerait une image plausible, seulement sans
 * croisements. Les deux se voient ici, et nulle part ailleurs.
 *
 * Ce qu'ils ne couvrent pas : la discipline de la grille. Les lignes et les
 * cases n'appellent aucun tirage, elles interrogent une clé par leurs
 * coordonnées ; cela se lit dans le module et ne se mesure pas de l'extérieur,
 * cette famille recomposant sa page à chaque cadre plutôt que de l'étendre.
 */
import { describe, expect, it } from 'vitest'
import { estSurimpression, IDS_SURIMPRESSIONS, surimprimer } from './surimpression'
import { FAMILLES, PALETTES, type Densite } from './moteur'
import { svgDuMotif } from './svg'

/** Les formes posées, teinte et chemin, dans l'ordre où elles le sont. */
function formes(
  largeur: number, hauteur: number, densite: Densite = 1, graine = 3120, palette = 'lime' as const,
): { fill: string; d: string }[] {
  const rendu = svgDuMotif({ famille: 'affiche', palette, densite, graine }, largeur, hauteur, false)
  return [...rendu.texte.matchAll(/<path d="([^"]*)" fill="([^"]*)"/g)]
    .map((trouve) => ({ fill: trouve[2], d: trouve[1] }))
    /* La première est l'aplat de fond, posé par `svgDuMotif` avant le motif. */
    .slice(1)
}

function nombres(d: string): number[] {
  return (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
}

/** L'aire d'un polygone écrit en `M`, `L`, `Z` : le lacet de Gauss. */
function aire(d: string): number {
  const n = nombres(d)
  let somme = 0
  for (let i = 0; i + 1 < n.length; i += 2) {
    const j = (i + 2) % n.length
    somme += n[i] * n[j + 1] - n[j] * n[i + 1]
  }
  return Math.abs(somme) / 2
}

describe('la famille', () => {
  it('se range dans les pavages, et ne reconnaît que la sienne', () => {
    expect(FAMILLES.find((f) => f.id === 'affiche')?.groupe).toBe('pav')
    expect(IDS_SURIMPRESSIONS).toEqual(['affiche'])
    expect(estSurimpression('affiche')).toBe(true)
    for (const valeur of ['vagues', 'lagon', 'constructor', '__proto__', '', 42, null]) {
      expect(estSurimpression(valeur), String(valeur)).toBe(false)
    }
  })
})

describe('le produit des encres', () => {
  it('ne fait jamais monter un canal', () => {
    /* La loi de l'encre : elle absorbe, elle n'émet pas. Un croisement plus
       clair que l'une des deux encres serait un fondu, pas une surimpression. */
    const canaux = (teinte: string) =>
      [1, 3, 5].map((i) => Number.parseInt(teinte.slice(i, i + 2), 16))
    for (const p of Object.values(PALETTES)) {
      for (const a of p.couleurs) {
        for (const b of p.couleurs) {
          const produit = canaux(surimprimer(a, b))
          const [ca, cb] = [canaux(a), canaux(b)]
          for (const [i, valeur] of produit.entries()) {
            expect(valeur, `${a} x ${b}`).toBeLessThanOrEqual(Math.min(ca[i], cb[i]))
          }
        }
      }
    }
  })

  it('rend le blanc neutre et le noir absorbant', () => {
    expect(surimprimer('#FF6648', '#FFFFFF')).toBe('#FF6648')
    expect(surimprimer('#FF6648', '#000000')).toBe('#000000')
  })

  it('laisse passer une teinte qui n’en est pas une', () => {
    expect(surimprimer('rouge', '#FFFFFF')).toBe('rouge')
  })
})

describe('les croisements', () => {
  it('pose une troisième teinte, et seulement là où les deux encres se croisent', () => {
    /* Le contrôle qui vaut la famille.

       Trois teintes exactement, et la troisième est le produit des deux autres.
       Son aire totale est bornée des deux côtés : au dessus de zéro, sans quoi
       la découpe rend toujours vide et l'affiche n'a plus que deux encres ; en
       dessous de l'aire de l'encre la plus rare, sans quoi la découpe rend le
       sujet entier au lieu de son intersection. Les deux pannes rendent une
       image plausible, et c'est pour cela qu'elles sont testées plutôt que
       regardées. */
    const posees = formes(700, 1000)
    const parTeinte = new Map<string, number>()
    for (const forme of posees) {
      parTeinte.set(forme.fill, (parTeinte.get(forme.fill) ?? 0) + aire(forme.d))
    }
    expect(parTeinte.size).toBe(3)

    const teintes = [...parTeinte.keys()]
    const produits = teintes.filter((t) =>
      teintes.some((a) => teintes.some((b) => a !== b && surimprimer(a, b) === t)))
    expect(produits, 'aucune des trois teintes n’est le produit des deux autres').toHaveLength(1)

    const croisement = produits[0]
    const encres = teintes.filter((t) => t !== croisement)
    const aireCroisement = parTeinte.get(croisement) ?? 0
    expect(aireCroisement).toBeGreaterThan(0)
    const plusRare = Math.min(...encres.map((t) => parTeinte.get(t) ?? 0))
    expect(aireCroisement).toBeLessThan(plusRare)
  })
})

describe('déterminisme et format', () => {
  it('rend deux fois la même suite de formes pour une même graine', () => {
    expect(formes(360, 780)).toEqual(formes(360, 780))
  })

  it('change avec la graine, sur les trois densités', () => {
    for (const densite of [0, 1, 2] as const) {
      expect(formes(360, 780, densite, 101)).not.toEqual(formes(360, 780, densite, 4242))
    }
  })

  it('rend la même image, deux fois plus grande', () => {
    const petit = formes(360, 780)
    const grand = formes(720, 1560)
    expect(grand.length).toBe(petit.length)
    for (const [i, forme] of petit.entries()) {
      expect(grand[i].fill, `forme ${i}`).toBe(forme.fill)
      const attendus = nombres(forme.d)
      const obtenus = nombres(grand[i].d)
      expect(obtenus.length, `forme ${i}`).toBe(attendus.length)
      for (const [k, valeur] of attendus.entries()) {
        expect(Math.abs(obtenus[k] - valeur * 2), `forme ${i}`).toBeLessThanOrEqual(0.03)
      }
    }
  })

  it('recompose la page quand le cadre change, et tient sur tous les cadres', () => {
    /* Cette famille n'est pas un pavage, et le test le dit plutôt que de
       l'exiger. Les lignes se partagent la hauteur disponible et le compte de
       cases suit la hauteur de la ligne : un cadre deux fois plus haut ne
       montre donc pas la même page avec des lignes en plus, il montre la même
       affiche composée pour ce cadre, avec des signes plus grands et moins
       nombreux. C'est ce qu'une affiche fait, et c'est ce qu'on veut ; la
       garantie du produit, elle, porte sur le rapport de côtés, et c'est le
       contrôle du doublement juste au dessus qui la tient.

       Ce qui est contrôlé ici, c'est que la composition survit à tous les
       cadres : un panoramique très plat donne des lignes basses, donc des
       cases nombreuses et étroites, et c'est là que la découpe travaille le
       plus mal. Trois teintes doivent sortir de chacun, et les croisements ne
       doivent jamais disparaître.

       La discipline de la grille, elle, n'est pas testée ici et ne peut pas
       l'être de l'extérieur : les lignes n'appellent aucun `rnd()`, elles
       interrogent une clé par leurs coordonnées, et cela se lit dans le
       module. */
    expect(formes(360, 1400).length).not.toBe(formes(360, 700).length)

    for (const [W, H] of [[360, 700], [1400, 360], [900, 900], [320, 1600]]) {
      for (const densite of [0, 1, 2] as const) {
        const posees = formes(W, H, densite)
        const teintes = new Set(posees.map((f) => f.fill))
        expect(teintes.size, `${W}x${H} d${densite}`).toBe(3)
      }
    }
  })
})
