// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ces tests protègent : la promesse « copier le lien suffit à retrouver
 * exactement la même image » a survécu au déménagement de l'application sous
 * `/app`. Un lien partagé du temps où elle vivait à la racine doit encore
 * ouvrir son motif, et une adresse nue doit encore ouvrir la présentation.
 */
import { describe, expect, it } from 'vitest'
import { CHEMIN_APP, lienAccueil, lienApp, lienMoteur, redirection, route } from './route'

describe('le chemin décide de la page', () => {
  it('donne l’application sous /app, à la barre oblique et à la casse près', () => {
    for (const chemin of ['/app', '/app/', '/app//', '/APP', '/App/']) {
      expect(route(chemin)).toBe('app')
    }
  })

  it('donne la page du moteur sous /moteur, aux mêmes tolérances', () => {
    for (const chemin of ['/moteur', '/moteur/', '/moteur//', '/MOTEUR', '/Moteur/']) {
      expect(route(chemin)).toBe('moteur')
    }
  })

  it('donne l’accueil partout ailleurs', () => {
    for (const chemin of [
      '/', '', '/apps', '/app/reglages', '/accueil', '/index.html',
      '/moteurs', '/moteur/couches',
    ]) {
      expect(route(chemin)).toBe('accueil')
    }
  })
})

describe('les liens partagés d’avant', () => {
  it('reconduit un motif posé à la racine vers l’application, requête intacte', () => {
    const recherche = '?m=vagues&p=lime&d=1&s=7314&l=fr&r=1179x2556'
    expect(redirection('/', recherche)).toBe(`${CHEMIN_APP}${recherche}`)
  })

  it('reconduit dès qu’un seul paramètre de motif est là', () => {
    for (const cle of ['m', 'p', 'd', 's', 'r']) {
      expect(redirection('/', `?${cle}=x`)).toBe(`${CHEMIN_APP}?${cle}=x`)
    }
  })

  /* La langue et le thème valent pour les deux pages : `/?l=en` désigne
     l'accueil en anglais, et le reconduire viderait la page d'accueil de ses
     visiteurs anglophones. */
  it('laisse l’accueil tranquille quand la requête est nue, ou d’affichage seulement', () => {
    for (const recherche of ['', '?', '?l=en', '?t=sombre', '?l=fr&t=clair', '?utm_source=x']) {
      expect(redirection('/', recherche)).toBeNull()
    }
  })

  it('ne reconduit jamais depuis l’application elle-même', () => {
    expect(redirection('/app', '?m=vagues')).toBeNull()
  })

  /* La page du moteur part toujours du même motif choisi : un lien qui la
     désigne mène à l'explication, et la reconduire vers l'outil rendrait la
     page inatteignable dès qu'un paramètre traîne dans l'adresse. */
  it('ne reconduit jamais depuis la page du moteur', () => {
    expect(redirection('/moteur', '?m=vagues&p=lime&s=7314')).toBeNull()
  })
})

/* Les trois liens internes sont nus : l'affichage vit sur l'appareil
   (`affichage.ts`), il n'a rien à faire transporter par un lien. */
describe('les liens internes', () => {
  it('mènent aux trois pages, sans rien emporter', () => {
    expect(lienApp()).toBe('/app')
    expect(lienAccueil()).toBe('/')
    expect(lienMoteur()).toBe('/moteur')
  })

  /* La marque de l'application mène à l'accueil : si ce lien portait un
     paramètre de motif, `redirection()` le renverrait aussitôt sous `/app`
     et le retour n'aurait jamais lieu. */
  it('ramènent bien à l’accueil, sans reconduite vers l’application', () => {
    expect(route(lienAccueil())).toBe('accueil')
    expect(redirection(lienAccueil(), '')).toBeNull()
  })
})
