// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ces tests protègent : la page « /moteur » dit d'où vient chaque
 * famille, et rien ne l'empêche de se tromper en silence.
 *
 * Les fiches ne recopient aucune liste de familles : chacune prend celle que
 * son module publie, et la première, celle des aplats, est ce qui reste une
 * fois les autres retirées. Le défaut que cela laisse ouvert est celui d'un
 * module oublié dans `VENUES_DES_MODULES` : ses familles ne disparaissent pas,
 * elles retombent dans la fiche des aplats, où la page les présente comme
 * dessinées par `formes()` lui-même. La compilation ne dit rien, la page se
 * peint, et la seule chose qui aurait changé est qu'elle ment.
 *
 * C'est arrivé, et c'est pour cela que ces tests existent : trois gestes
 * ajoutés au moteur ont attendu leur fiche.
 */
import { describe, expect, it } from 'vitest'
import { FAMILLES, famille } from '../../lib/moteur'
import { MECANIQUES, DEPART } from './mecaniques'
import { fr } from '../../i18n/fr'
import { en } from '../../i18n/en'

describe('les fiches de gestes', () => {
  it('couvre le catalogue entier, chaque famille une fois et une seule', () => {
    const citees = MECANIQUES.flatMap((m) => m.familles)
    expect(new Set(citees).size, 'une famille citée par deux fiches').toBe(citees.length)
    expect([...citees].sort()).toEqual(FAMILLES.map((f) => f.id).sort())
  })

  it('ne range dans les aplats que ce que le moteur dessine lui-même', () => {
    /* La fiche des aplats est un reste, pas une liste : elle ramasse ce
       qu'aucun module ne réclame. Un module absent de `VENUES_DES_MODULES` s'y
       verrait donc, et nulle part ailleurs. `lib/moteur.ts` est le seul module
       qui ait le droit d'y figurer. */
    const aplats = MECANIQUES.find((m) => m.cle === 'semer')
    expect(aplats?.module).toBe('lib/moteur.ts')
    for (const m of MECANIQUES) {
      if (m.cle === 'semer') continue
      expect(m.module, m.cle).toMatch(/^lib\/[a-z]+\.ts$/)
      expect(m.familles.length, m.cle).toBeGreaterThan(0)
      for (const id of m.familles) {
        expect(aplats?.familles.includes(id), `${id} dans deux fiches`).toBe(false)
      }
    }
  })

  it('donne à chaque fiche un nom et une note, dans les deux langues', () => {
    /* Les libellés sont lus par une clé calculée, donc hors de portée du
       compilateur : une fiche ajoutée sans ses deux libellés afficherait
       « undefined » sur la page, en toutes lettres. */
    for (const dictionnaire of [fr, en]) {
      const D = dictionnaire.moteur.mecaniques as unknown as Record<string, string>
      for (const m of MECANIQUES) {
        expect(typeof D[`${m.cle}Nom`], `${m.cle}Nom`).toBe('string')
        expect(D[`${m.cle}Nom`].trim(), `${m.cle}Nom`).not.toBe('')
        expect(typeof D[`${m.cle}Note`], `${m.cle}Note`).toBe('string')
        expect(D[`${m.cle}Note`].trim(), `${m.cle}Note`).not.toBe('')
      }
    }
  })

  it('peint un exemple qui sort bien de la mécanique qu’il démontre', () => {
    for (const m of MECANIQUES) {
      expect(m.familles.includes(m.exemple.famille), m.cle).toBe(true)
      expect(famille(m.exemple.famille), m.cle).toBeDefined()
    }
  })

  it('ouvre la page sur un motif du catalogue', () => {
    expect(famille(DEPART.famille)).toBeDefined()
  })
})
