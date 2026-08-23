// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ce que ces tests protègent : la promesse « copier le lien suffit à retrouver
 * exactement la même image » a survécu au déménagement de l'application sous
 * `/app`. Un lien partagé du temps où elle vivait à la racine doit encore
 * ouvrir son motif, et une adresse nue doit encore ouvrir la présentation.
 */
import { describe, expect, it } from 'vitest'
import { CHEMIN_APP, lienApp, redirection, route } from './route'

describe('le chemin décide de la page', () => {
  it('donne l’application sous /app, à la barre oblique et à la casse près', () => {
    for (const chemin of ['/app', '/app/', '/app//', '/APP', '/App/']) {
      expect(route(chemin)).toBe('app')
    }
  })

  it('donne l’accueil partout ailleurs', () => {
    for (const chemin of ['/', '', '/apps', '/app/reglages', '/accueil', '/index.html']) {
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
})

describe('le lien vers l’application', () => {
  it('emporte la langue et le thème choisis sur l’accueil', () => {
    expect(lienApp({ l: 'en', t: 'sombre' })).toBe('/app?l=en&t=sombre')
  })

  it('reste nu quand il n’y a rien à emporter', () => {
    expect(lienApp({})).toBe('/app')
  })
})
