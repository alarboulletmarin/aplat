// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ces tests protègent : l'URL est la seule mémoire d'Aplat. Elle doit
 * relire exactement ce qu'elle a écrit, ne rien emporter d'autre que les
 * réglages, et ne jamais casser devant une adresse forgée à la main.
 *
 * La liste d'URL hostiles est courte ici, à dessein : `tools/fuzz-url.js` en
 * essaie 241 dans un vrai navigateur. Ce fichier garde les cas qui décrivent
 * une décision, comme la résolution traitée en couple ou la détection qui ne
 * part pas dans un lien.
 */
import { describe, expect, it } from 'vitest'
import {
  ecrireAffichage, ecrireUrl, langueParDefaut, lireAffichage, lireUrl,
  REGLAGES_PAR_DEFAUT,
} from './url'
import { enregistrerPalettes } from './moteur'
import { composer, versPalette } from './palettes'
import { depuisSaisie } from './resolution'

const DETECTE = { largeur: 1179, hauteur: 2556 }

describe('lecture de l’URL', () => {
  it('relit ce qu’elle a écrit', () => {
    const reglages = {
      ...REGLAGES_PAR_DEFAUT,
      famille: 'terrazzo' as const,
      palette: 'orage' as const,
      densite: 2 as const,
      graine: 4242,
      langue: 'en' as const,
      theme: 'sombre' as const,
      largeurSaisie: '2560',
      hauteurSaisie: '1440',
    }
    const requete = ecrireUrl(reglages, depuisSaisie('2560', '1440'), DETECTE)
    expect(lireUrl(requete, DETECTE)).toEqual(reglages)
  })

  it('retombe sur les valeurs par défaut devant n’importe quelle URL forgée', () => {
    const hostiles = [
      '',
      '?m=constructor&p=__proto__&d=99&s=-1&l=zz&t=neon',
      '?m=<script>&p=%00&d=NaN&s=1e9',
      '?d=1.5&s=99999999&r=abc',
      `?${'a'.repeat(2000)}=1`,
      '?m=vagues&m=blobs',
    ]
    for (const recherche of hostiles) {
      const lu = lireUrl(recherche, DETECTE, 'fr-FR')
      expect(lu.famille).toBeTruthy()
      expect(lu.palette).toBeTruthy()
      expect([0, 1, 2]).toContain(lu.densite)
      expect(lu.graine).toBeGreaterThan(0)
      expect(['fr', 'en']).toContain(lu.langue)
      expect(['clair', 'sombre', 'systeme']).toContain(lu.theme)
    }
  })

  it('traite la résolution comme un couple, jamais comme deux moitiés', () => {
    /* Une moitié illisible et on retombe entièrement sur la détection, plutôt
       que de mélanger l'écran de l'expéditeur et celui du destinataire. */
    expect(lireUrl('?r=2560x', DETECTE).largeurSaisie).toBe('1179')
    expect(lireUrl('?r=x1440', DETECTE).hauteurSaisie).toBe('2556')
    expect(lireUrl('?r=9x9', DETECTE).largeurSaisie).toBe('1179')
    expect(lireUrl('?r=2560x1440', DETECTE).largeurSaisie).toBe('2560')
  })

  it('choisit la langue du navigateur quand l’URL n’en porte pas', () => {
    expect(lireUrl('', DETECTE, 'fr-CA').langue).toBe('fr')
    expect(lireUrl('', DETECTE, 'en-GB').langue).toBe('en')
    expect(lireUrl('', DETECTE, 'de-DE').langue).toBe('en')
    expect(langueParDefaut(undefined)).toBe('fr')
  })
})

describe('écriture de l’URL', () => {
  it('n’emporte pas la résolution détectée', () => {
    /* Son absence veut dire « la résolution de l'appareil qui ouvre le lien »,
       ce qui sert mieux le destinataire que l'écran de l'expéditeur. */
    const requete = ecrireUrl(
      { ...REGLAGES_PAR_DEFAUT, largeurSaisie: '1179', hauteurSaisie: '2556' },
      DETECTE,
      DETECTE,
    )
    expect(requete).not.toContain('r=')
  })

  it('emporte une résolution saisie à la main', () => {
    const requete = ecrireUrl(
      { ...REGLAGES_PAR_DEFAUT, largeurSaisie: '2560', hauteurSaisie: '1440' },
      depuisSaisie('2560', '1440'),
      DETECTE,
    )
    expect(requete).toContain('r=2560x1440')
  })

  it('n’écrit le thème que lorsqu’il n’est pas celui du système', () => {
    expect(ecrireUrl(REGLAGES_PAR_DEFAUT, DETECTE, DETECTE)).not.toContain('t=')
    expect(
      ecrireUrl({ ...REGLAGES_PAR_DEFAUT, theme: 'sombre' }, DETECTE, DETECTE),
    ).toContain('t=sombre')
  })

  it('ne porte que les réglages, et rien d’autre', () => {
    const requete = ecrireUrl(REGLAGES_PAR_DEFAUT, DETECTE, DETECTE)
    const cles = [...new URLSearchParams(requete).keys()]
    expect(cles.sort()).toEqual(['d', 'l', 'm', 'p', 's'])
  })
})

/* La langue et le thème sont les deux seuls réglages que la page d'accueil
   partage avec l'application : ils se lisent et s'écrivent à part, et de la
   même façon des deux côtés. */
describe('les réglages d’affichage, communs aux deux pages', () => {
  it('relit ce qu’il a écrit', () => {
    for (const affichage of [
      { langue: 'fr', theme: 'sombre' },
      { langue: 'en', theme: 'clair' },
      { langue: 'en', theme: 'systeme' },
    ] as const) {
      expect(lireAffichage(ecrireAffichage(affichage))).toEqual(affichage)
    }
  })

  it('n’écrit pas « système » : l’absence de choix s’écrit par l’absence', () => {
    expect(ecrireAffichage({ langue: 'fr', theme: 'systeme' })).toBe('l=fr')
  })

  it('retombe sur la langue du navigateur et sur « système »', () => {
    expect(lireAffichage('?l=zz&t=neon', 'fr-FR')).toEqual({ langue: 'fr', theme: 'systeme' })
    expect(lireAffichage('', 'en-GB')).toEqual({ langue: 'en', theme: 'systeme' })
  })

  it('lit la même chose que la lecture complète de l’URL', () => {
    const recherche = '?m=terrazzo&p=orage&d=2&s=4242&l=en&t=sombre'
    const complet = lireUrl(recherche, DETECTE)
    const affichage = lireAffichage(recherche)
    expect(affichage).toEqual({ langue: complet.langue, theme: complet.theme })
  })
})

/**
 * Le voile est un réglage depuis qu'un interrupteur le commande : il change le
 * fichier, donc il est dans l'adresse. Son absence vaut « oui », parce que
 * c'est ce que le produit fait depuis toujours et que les liens écrits avant
 * lui doivent continuer d'ouvrir la même image.
 */
describe('voile de lisibilité', () => {
  it('vaut oui par défaut, et ne s’écrit que retiré', () => {
    expect(lireUrl('', DETECTE).voile).toBe(true)
    const avec = ecrireUrl(REGLAGES_PAR_DEFAUT, depuisSaisie('', ''), DETECTE)
    expect(avec).not.toContain('v=')
    const sans = ecrireUrl(
      { ...REGLAGES_PAR_DEFAUT, voile: false }, depuisSaisie('', ''), DETECTE,
    )
    expect(sans).toContain('v=0')
    expect(lireUrl(sans, DETECTE).voile).toBe(false)
  })

  it('ne se retire que sur « 0 », jamais sur une valeur abîmée', () => {
    /* Une adresse cassée ne doit pas rendre une image plus claire que celle
       qu'on croit avoir choisie. */
    for (const brut of ['v=', 'v=1', 'v=non', 'v=00', 'v=false']) {
      expect(lireUrl(`?${brut}`, DETECTE).voile, brut).toBe(true)
    }
  })
})

/**
 * Une palette composée n'existe que sur l'appareil qui l'a composée. Le lien
 * porte donc ses teintes, sans quoi il ouvrirait un autre motif chez la
 * personne qui le reçoit.
 */
describe('palette composée dans l’adresse', () => {
  const MIENNE = composer('Ma marque', ['#101010', '#DFF478', '#FF6648'])!

  it('écrit les teintes à côté du nom, et se relit', () => {
    enregistrerPalettes([versPalette(MIENNE)])
    const reglages = {
      ...REGLAGES_PAR_DEFAUT,
      palette: MIENNE.id as never,
      largeurSaisie: String(DETECTE.largeur),
      hauteurSaisie: String(DETECTE.hauteur),
    }
    const requete = ecrireUrl(reglages, DETECTE, DETECTE)
    expect(requete).toContain(`p=${MIENNE.id}`)
    expect(requete).toContain('k=101010-DFF478-FF6648')
    expect(lireUrl(requete, DETECTE)).toEqual(reglages)
    enregistrerPalettes([])
  })

  it('retombe sur la palette par défaut quand l’appareil ne la connaît pas', () => {
    enregistrerPalettes([])
    const lu = lireUrl(`?p=${MIENNE.id}&k=101010-DFF478-FF6648`, DETECTE)
    expect(lu.palette).toBe(REGLAGES_PAR_DEFAUT.palette)
  })

  it('n’écrit aucune teinte pour les palettes livrées', () => {
    expect(ecrireUrl(REGLAGES_PAR_DEFAUT, depuisSaisie('', ''), DETECTE)).not.toContain('k=')
  })
})
