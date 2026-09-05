// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ces tests protègent : l'URL est la mémoire du motif. Elle doit
 * relire exactement ce qu'elle a écrit, ne rien emporter d'autre que ce qui
 * décrit l'image, et ne jamais casser devant une adresse forgée à la main.
 * La langue et le thème n'y sont plus : ils vivent sur l'appareil, et leurs
 * tests avec eux (`affichage.test.ts`).
 *
 * La liste d'URL hostiles est courte ici, à dessein : `tools/fuzz-url.js` en
 * essaie 241 dans un vrai navigateur. Ce fichier garde les cas qui décrivent
 * une décision, comme la résolution traitée en couple ou la détection qui ne
 * part pas dans un lien.
 */
import { describe, expect, it } from 'vitest'
import { ecrireUrl, lienAppDuMotif, lireUrl, REGLAGES_PAR_DEFAUT } from './url'
import { enregistrerPalettes, MOT_PAR_DEFAUT } from './moteur'
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
    /* L'affichage ne voyage pas dans la requête : il est fourni à part, et la
       relecture doit rendre le reste à l'identique. */
    expect(lireUrl(requete, DETECTE, { langue: 'en', theme: 'sombre' })).toEqual(reglages)
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
      const lu = lireUrl(recherche, DETECTE)
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

  it('reprend l’affichage fourni, tel quel', () => {
    /* Il vient de l'appareil, pas de l'adresse : cette fonction n'a pas à le
       revalider, seulement à l'assembler avec le motif. */
    const lu = lireUrl('', DETECTE, { langue: 'en', theme: 'clair' })
    expect(lu.langue).toBe('en')
    expect(lu.theme).toBe('clair')
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

  it('n’emporte ni la langue ni le thème : l’affichage n’est pas l’image', () => {
    const requete = ecrireUrl(
      { ...REGLAGES_PAR_DEFAUT, langue: 'en', theme: 'sombre' }, DETECTE, DETECTE,
    )
    expect(requete).not.toContain('l=')
    expect(requete).not.toContain('t=')
  })

  it('ne porte que les réglages, et rien d’autre', () => {
    const requete = ecrireUrl(REGLAGES_PAR_DEFAUT, DETECTE, DETECTE)
    const cles = [...new URLSearchParams(requete).keys()]
    expect(cles.sort()).toEqual(['d', 'm', 'p', 's'])
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
 * Le mot de l'affiche voyage comme le reste, et c'est la seule chaîne libre que
 * l'adresse porte : elle vient du dehors, elle est donc assainie des deux
 * côtés.
 */
describe('mot de l’affiche', () => {
  it('vaut le mot par défaut, et ne s’écrit que s’il en diffère', () => {
    expect(lireUrl('', DETECTE).mot).toBe(MOT_PAR_DEFAUT)
    const defaut = ecrireUrl(REGLAGES_PAR_DEFAUT, depuisSaisie('', ''), DETECTE)
    expect(defaut).not.toContain('t=')
    const choisi = ecrireUrl(
      { ...REGLAGES_PAR_DEFAUT, mot: 'CIAO' }, depuisSaisie('', ''), DETECTE,
    )
    expect(choisi).toContain('t=CIAO')
    expect(lireUrl(choisi, DETECTE).mot).toBe('CIAO')
  })

  it('assainit ce qui arrive de l’adresse', () => {
    /* Une adresse hostile ne doit ni casser la composition ni faire passer un
       signe que la fonte ignore. Rien n'est rejeté : on garde ce qui se
       dessine, et un mot devenu vide retombe sur celui par défaut. */
    expect(lireUrl('?t=ciao', DETECTE).mot).toBe('CIAO')
    expect(lireUrl('?t=' + encodeURIComponent('<img src=x>'), DETECTE).mot).toBe('IMG SRCX')
    expect(lireUrl('?t=' + encodeURIComponent('   '), DETECTE).mot).toBe(MOT_PAR_DEFAUT)
    expect(lireUrl('?t=' + 'A'.repeat(200), DETECTE).mot.length).toBeLessThanOrEqual(24)
  })

  it('fait l’aller-retour sans se déformer', () => {
    for (const mot of ['CIAO', 'OH MY GOODNESS', 'VOILÀ !', 'ÇA Y EST']) {
      const ecrit = ecrireUrl({ ...REGLAGES_PAR_DEFAUT, mot }, depuisSaisie('', ''), DETECTE)
      expect(lireUrl(ecrit, DETECTE).mot, mot).toBe(mot)
    }
  })
})

/**
 * L'écran sur lequel on juge est un fichier lui aussi, et c'est pour cela qu'il
 * voyage. La sonde ne mesure pas la même bande selon l'écran, elle dose donc un
 * autre voile, et ce voile est brûlé dans le PNG : un lien qui ne le porterait
 * pas rendrait chez le destinataire une image plus claire ou plus foncée que
 * celle qu'on lui a envoyée.
 */
describe('écran de jugement', () => {
  it('vaut l’accueil par défaut, et ne s’écrit qu’au verrouillage', () => {
    expect(lireUrl('', DETECTE).ecran).toBe('accueil')
    const accueil = ecrireUrl(REGLAGES_PAR_DEFAUT, depuisSaisie('', ''), DETECTE)
    expect(accueil).not.toContain('e=')
    const verrou = ecrireUrl(
      { ...REGLAGES_PAR_DEFAUT, ecran: 'verrou' }, depuisSaisie('', ''), DETECTE,
    )
    expect(verrou).toContain('e=1')
    expect(lireUrl(verrou, DETECTE).ecran).toBe('verrou')
  })

  it('ne bascule que sur « 1 », jamais sur une valeur abîmée', () => {
    /* Même prudence que le voile et la version, et pour la même raison : une
       adresse abîmée doit rendre ce que le produit a toujours rendu, jamais
       une image dosée pour une bande que personne n'a demandée. */
    for (const brut of ['e=', 'e=0', 'e=verrou', 'e=true', 'e=01']) {
      expect(lireUrl(`?${brut}`, DETECTE).ecran, brut).toBe('accueil')
    }
  })

  it('n’a jamais existé avant, donc un vieux lien ouvre l’accueil', () => {
    /* La garantie de compatibilité : tous les liens écrits avant ce réglage
       rendent exactement le fichier qu'ils rendaient. */
    expect(lireUrl('?m=vagues&p=lime&d=1&s=7314&n=1&v=0', DETECTE).ecran).toBe('accueil')
  })
})

/**
 * La version sombre est un fichier, pas un aperçu : elle voyage donc dans
 * l'adresse comme le voile. Elle a remplacé un rideau qu'on tirait sur
 * l'aperçu, qui ne voyageait nulle part parce qu'il ne montrait rien qu'on pût
 * télécharger.
 */
describe('version sombre', () => {
  it('vaut claire par défaut, et ne s’écrit que sombre', () => {
    expect(lireUrl('', DETECTE).sombre).toBe(false)
    const claire = ecrireUrl(REGLAGES_PAR_DEFAUT, depuisSaisie('', ''), DETECTE)
    expect(claire).not.toContain('n=')
    const sombre = ecrireUrl(
      { ...REGLAGES_PAR_DEFAUT, sombre: true }, depuisSaisie('', ''), DETECTE,
    )
    expect(sombre).toContain('n=1')
    expect(lireUrl(sombre, DETECTE).sombre).toBe(true)
  })

  it('ne s’allume que sur « 1 », jamais sur une valeur abîmée', () => {
    for (const brut of ['n=', 'n=0', 'n=oui', 'n=true', 'n=01']) {
      expect(lireUrl(`?${brut}`, DETECTE).sombre, brut).toBe(false)
    }
  })

  it('ne se confond pas avec le thème de l’application', () => {
    /* Deux réglages voisins par le nom et étrangers par l'effet : `t=sombre`
       habillait la page (il vit désormais sur l'appareil), `n=1` assombrit le
       fichier. Un vieux lien qui porte `t=` ne doit pas foncer l'image, et
       `n=1` ne doit pas habiller la page. */
    const vieuxLien = lireUrl('?t=sombre', DETECTE)
    expect(vieuxLien.sombre).toBe(false)
    const seuleLImage = lireUrl('?n=1', DETECTE)
    expect(seuleLImage.theme).toBe('systeme')
    expect(seuleLImage.sombre).toBe(true)
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

/* La page du mécanisme construit un motif d'étape en étape et le rend en lien.
   Ce que ces trois cas protègent : le lien ouvre bien l'application, il porte
   exactement les quatre réglages qu'on vient de composer, et il n'emporte pas
   la résolution de celui qui l'a fabriqué. */
describe('le lien de la page du mécanisme', () => {
  const MOTIF = { famille: 'kintsugi', palette: 'nuit', densite: 2, graine: 4242 } as const

  it('mène à l’application et relit les quatre réglages', () => {
    const lien = lienAppDuMotif(MOTIF)
    expect(lien.startsWith('/app?')).toBe(true)
    const lu = lireUrl(lien.slice(lien.indexOf('?')), DETECTE)
    expect(lu.famille).toBe(MOTIF.famille)
    expect(lu.palette).toBe(MOTIF.palette)
    expect(lu.densite).toBe(MOTIF.densite)
    expect(lu.graine).toBe(MOTIF.graine)
  })

  /* Une résolution transmise imposerait au destinataire l'écran de
     l'expéditeur, alors que la page vient d'expliquer que la taille est
     détectée sur l'appareil qui ouvre le lien. */
  it('n’emporte ni résolution, ni voile, ni version', () => {
    const lien = lienAppDuMotif(MOTIF)
    expect(lien).not.toContain('r=')
    expect(lien).not.toContain('v=')
    expect(lien).not.toContain('n=')
  })

  it('retombe sur l’image que l’application ouvre quand rien n’a été touché', () => {
    const lien = lienAppDuMotif(REGLAGES_PAR_DEFAUT)
    const lu = lireUrl(lien.slice(lien.indexOf('?')), DETECTE)
    expect(lu.famille).toBe(REGLAGES_PAR_DEFAUT.famille)
    expect(lu.graine).toBe(REGLAGES_PAR_DEFAUT.graine)
  })
})
