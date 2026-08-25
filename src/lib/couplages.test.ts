// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ces tests protègent : les nombres que le TypeScript recopie de la
 * feuille de style. Ils sont documentés des deux côtés (« doit rester égale
 * à... »), mais un commentaire n'échoue pas quand une seule des deux valeurs
 * bouge ; ces tests, si. Ils lisent le CSS comme du texte : pas de navigateur,
 * pas d'interprétation, juste la présence de la valeur promise à l'endroit
 * promis.
 *
 * Ce qu'ils ne couvrent pas : les sommes composées comme `ENTETE_PAYSAGE`,
 * bâties sur plusieurs règles à la fois. Elles restent tenues par
 * `tools/reach.mjs`, qui mesure le résultat dans un vrai navigateur.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BORDURE_APPAREIL, PAYSAGE_COURT } from './geometrie'

const ecrans = readFileSync(new URL('../styles/ecrans.css', import.meta.url), 'utf8')
const scene = readFileSync(new URL('../components/Scene.tsx', import.meta.url), 'utf8')
const collantes = readFileSync(
  new URL('../hooks/useHauteursCollantes.ts', import.meta.url),
  'utf8',
)

describe('les nombres recopiés du CSS', () => {
  it('la bordure de l’appareil est celle de `.appareil`', () => {
    const regle = ecrans.match(/\.appareil \{[^}]*border: (\d+)px solid/)
    expect(regle).not.toBeNull()
    expect(Number(regle![1])).toBe(BORDURE_APPAREIL)
  })

  it('le paysage court bascule à la même hauteur que la feuille de style', () => {
    expect(ecrans).toContain(
      `@media (orientation: landscape) and (max-height: ${PAYSAGE_COURT}px)`,
    )
  })

  it('le seuil du repli est le même des trois côtés', () => {
    /* 360 px : la seule largeur où la scène recouvre les réglages. Le CSS le
       dit en `min-width`, les deux TypeScript en `< 360` ; si l'un bouge sans
       les autres, la réserve de défilement est calculée pour une mise en page
       qui n'existe pas. */
    expect(ecrans).toContain('@media (min-width: 360px)')
    expect(scene).toContain('fenetre.largeur < 360')
    expect(collantes).toContain('window.innerWidth < 360')
  })
})
