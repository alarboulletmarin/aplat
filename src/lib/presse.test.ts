// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ces tests protègent : le hors repère, qui ne lève jamais d'erreur
 * quand il ne marche pas.
 *
 * Une seconde couche qui tombe pile sur la première rend une image plausible,
 * seulement identique au tirage tramé, et personne ne s'en aperçoit avant
 * d'avoir comparé deux fichiers côte à côte. Le piège a une adresse précise :
 * l'élagueur du verrouillage repeint en coordonnées d'image après avoir remis
 * la transformation à l'identité, et un décalage posé sur le contexte y meurt
 * en silence. C'est ce que le pinceau décalé évite, et c'est ce qui se vérifie
 * ici, sur les deux écrans.
 *
 * L'encre de dessous est protégée pour la même raison : prendre la plus sombre
 * du lot aurait marché sur huit palettes et rendu un liseré invisible sur les
 * trois autres, sans rien casser nulle part.
 *
 * Ce que ces tests ne couvrent pas : à quoi ressemble le mouchetis. Il demande
 * un canevas, donc un navigateur, et `tools/dither-check.mjs` en mesure
 * l'amplitude là où elle se mesure.
 */
import { describe, expect, it } from 'vitest'
import {
  celluleDuTirage, decalageDuTirage, decaler, estTirage, MOUCHETIS, TIRAGES,
} from './presse'
import { encreDeDessous, luminanceHex, ORDRE_PALETTES, palette, plaqueDeDessous } from './moteur'
import { svgDuMotif } from './svg'

describe('les trois tirages', () => {
  it('sont nommés, et rien d’autre ne passe', () => {
    expect(TIRAGES).toEqual(['net', 'trame', 'decale'])
    for (const nom of TIRAGES) expect(estTirage(nom), nom).toBe(true)
    for (const valeur of ['NET', 'trame ', 'serigraphie', '', 1, null, undefined, {}]) {
      expect(estTirage(valeur), String(valeur)).toBe(false)
    }
  })
})

describe('les mesures de la presse', () => {
  it('donne une cellule qui suit le petit côté, et jamais moins d’un pixel', () => {
    /* Le grain du tirage se compte en parts du motif : c'est ce qui fait que
       l'aperçu montre la texture du fichier, et non une texture plus fine. */
    expect(celluleDuTirage(1179)).toBeGreaterThan(celluleDuTirage(390))
    expect(celluleDuTirage(3840) / celluleDuTirage(960)).toBeCloseTo(4, 0)
    for (const unite of [0, 1, 12, 80]) {
      expect(celluleDuTirage(unite), String(unite)).toBeGreaterThanOrEqual(1)
    }
  })

  it('décale vers le bas et vers la gauche, proportionnellement', () => {
    const petit = decalageDuTirage(1000)
    const grand = decalageDuTirage(2000)
    expect(petit.x).toBeLessThan(0)
    expect(petit.y).toBeGreaterThan(0)
    expect(grand.x).toBeCloseTo(petit.x * 2, 6)
    expect(grand.y).toBeCloseTo(petit.y * 2, 6)
  })

  it('mouchette assez pour se voir, assez peu pour rester un aplat', () => {
    expect(MOUCHETIS).toBeGreaterThan(0.02)
    expect(MOUCHETIS).toBeLessThan(0.2)
  })
})

describe('le pinceau décalé', () => {
  /** Un pinceau qui note la dernière transformation posée, et rien d'autre. */
  function temoin() {
    const pose: number[][] = []
    const faux = {
      fillStyle: '#000',
      globalAlpha: 1,
      globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
      save() {}, restore() {},
      translate() {}, rotate() {}, scale() {},
      setTransform(...m: number[]) { pose.push(m) },
      beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
      quadraticCurveTo() {}, arc() {}, arcTo() {}, ellipse() {},
      fill() {}, fillRect() {},
    }
    return { faux, pose }
  }

  it('ajoute le décalage à la translation, et ne touche pas au reste', () => {
    const { faux, pose } = temoin()
    decaler(faux, -9, 12).setTransform(1, 0, 0, 1, 100, 200)
    expect(pose).toEqual([[1, 0, 0, 1, 91, 212]])
  })

  it('laisse passer l’échelle et la rotation de la matrice', () => {
    const { faux, pose } = temoin()
    decaler(faux, 3, 4).setTransform(2, 0.5, -0.5, 2, 0, 0)
    expect(pose).toEqual([[2, 0.5, -0.5, 2, 3, 4]])
  })

  it('transmet la teinte au pinceau du dessous', () => {
    const { faux } = temoin()
    const decale = decaler(faux, 1, 1)
    decale.fillStyle = '#17243F'
    expect(faux.fillStyle).toBe('#17243F')
    expect(decale.fillStyle).toBe('#17243F')
  })
})

describe('l’encre de dessous', () => {
  it('est toujours une encre de la palette', () => {
    for (const id of ORDRE_PALETTES) {
      const P = palette(id)
      expect(P.couleurs, id).toContain(encreDeDessous(P))
    }
  })

  it('est la plus éloignée du fond, donc visible sur toutes', () => {
    for (const id of ORDRE_PALETTES) {
      const P = palette(id)
      const fond = luminanceHex(P.fond)
      const choisie = Math.abs(luminanceHex(encreDeDessous(P)) - fond)
      for (const encre of P.couleurs) {
        expect(choisie, `${id} contre ${encre}`)
          .toBeGreaterThanOrEqual(Math.abs(luminanceHex(encre) - fond))
      }
      /* Le liseré ne se voit que contre le fond : un écart nul rendrait le
         hors repère invisible sur toute une palette. */
      expect(choisie, id).toBeGreaterThan(0.02)
    }
  })

  it('garde le nombre de teintes de la palette', () => {
    /* Plusieurs familles lisent la longueur de la liste pour décider ce
       qu'elles dessinent, et l'une d'elles laisse un ruban sans encre quand le
       tirage tombe au-delà : une plaque plus courte n'aurait pas été la
       silhouette de la couche du dessus. */
    for (const id of ORDRE_PALETTES) {
      const P = palette(id)
      const plaque = plaqueDeDessous(P)
      expect(plaque.couleurs, id).toHaveLength(P.couleurs.length)
      expect(new Set(plaque.couleurs).size, id).toBe(1)
      expect(plaque.fond, id).toBe(P.fond)
    }
  })
})

describe('la seconde couche dans le fichier', () => {
  const motif = { famille: 'blobs', palette: 'lime', densite: 1, graine: 7314 } as const

  it('double les formes du vectoriel, et rien de plus', () => {
    const net = svgDuMotif(motif, 600, 1200, false, false, 'accueil', 'net')
    const trame = svgDuMotif(motif, 600, 1200, false, false, 'accueil', 'trame')
    const decale = svgDuMotif(motif, 600, 1200, false, false, 'accueil', 'decale')
    /* Le tramé est du bruit : il n'a pas d'équivalent vectoriel, et le fichier
       est donc celui du tirage net, au caractère près. */
    expect(trame.elements).toBe(net.elements)
    expect(decale.elements).toBe(net.elements * 2 - 1)
  })

  it('pose la seconde couche avant la première, dans l’encre de dessous', () => {
    const rendu = svgDuMotif(motif, 600, 1200, false, false, 'accueil', 'decale')
    const teintes = [...rendu.texte.matchAll(/fill="([^"]*)"/g)].map((t) => t[1].toUpperCase())
    const encre = encreDeDessous(palette('lime')).toUpperCase()
    /* La première teinte est l'aplat de fond, la suivante ouvre la plaque. */
    expect(teintes[1]).toBe(encre)
    const dessus = teintes.slice(1 + (teintes.length - 1) / 2)
    expect(dessus.some((teinte) => teinte !== encre)).toBe(true)
  })

  it('décale la couche sur les deux écrans, verrouillage compris', () => {
    /* Le vrai piège : sur le verrouillage, l'élagueur repeint en coordonnées
       d'image après avoir remis la transformation à l'identité. Une seconde
       couche posée par un `translate` y serait tombée pile sur la première. */
    for (const ecran of ['accueil', 'verrou'] as const) {
      const decale = svgDuMotif(motif, 600, 1200, false, false, ecran, 'decale')
      const chemins = [...decale.texte.matchAll(/<path d="([^"]*)"/g)].map((t) => t[1])
      const moitie = (chemins.length - 1) / 2
      const dessous = chemins.slice(1, 1 + moitie)
      const dessus = chemins.slice(1 + moitie)
      expect(dessous.length, ecran).toBe(dessus.length)
      expect(dessous.some((d, i) => d !== dessus[i]), ecran).toBe(true)
    }
  })
})
