// SPDX-License-Identifier: AGPL-3.0-only

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const { version } = JSON.parse(readFileSync('./package.json', 'utf8'))

/**
 * Le commit d'où sort ce build, pour que le pied de page puisse pointer la
 * source *exacte* du JavaScript servi : c'est ce que l'AGPL appelle la
 * « Corresponding Source », et un lien vers `main` ne la désigne pas.
 *
 * Un build depuis une archive n'a pas de dépôt git : on renvoie une chaîne
 * vide plutôt que d'échouer, et l'application n'affiche alors que la version.
 */
function commit() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

/**
 * La page promet « aucun réseau » : cette politique en fait une propriété du
 * document et non une simple phrase. `connect-src 'none'` coupe fetch, XHR,
 * WebSocket, EventSource et sendBeacon. L'application n'en émet aucun, le
 * moteur ne calcule qu'ici. Aucune directive ne porte sur les scripts, les
 * styles ni les images : la restriction doit dire quelque chose de vrai, pas
 * décorer.
 *
 * Injectée au build seulement. En développement, Vite parle à la page par un
 * WebSocket pour le rechargement à chaud, que cette même règle couperait ; la
 * politique n'a de sens que sur le fichier livré.
 */
function politiqueDeSecurite(): Plugin {
  return {
    name: 'aplat-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: 'meta',
            attrs: {
              'http-equiv': 'Content-Security-Policy',
              content:
                "connect-src 'none'; form-action 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'",
            },
            injectTo: 'head-prepend',
          },
        ],
      }
    },
  }
}

export default defineConfig({
  base: '/',
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_COMMIT__: JSON.stringify(commit()),
  },
  plugins: [
    politiqueDeSecurite(),
    react(),
    VitePWA({
      // 'prompt' plutôt que 'autoUpdate' : l'utilisateur décide quand
      // recharger, via la barre affichée par <MiseAJour />.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'polices/*.woff2'],
      manifest: {
        name: 'Aplat\u00a0: fonds d’écran génératifs',
        short_name: 'Aplat',
        description:
          'Des fonds d’écran génératifs calculés dans le navigateur, exportés à la résolution exacte de l’appareil.',
        lang: 'fr',
        dir: 'ltr',
        // `id` posé explicitement : sans lui, l'identité de l'application
        // installée dépend de `start_url`, et changer l'un reviendrait à
        // installer une seconde application à côté de la première. C'est
        // exactement ce qui s'est joué au moment où la page d'accueil a pris
        // la racine : `start_url` est passé à `/app`, `id` n'a pas bougé, et
        // les installations existantes ont suivi au lieu de se dédoubler.
        id: '/',
        // L'application, pas sa présentation : une application installée
        // s'ouvre sur l'outil. La page d'accueil reste à la racine, pour les
        // navigateurs.
        start_url: '/app',
        scope: '/',
        display: 'standalone',
        // 'any' et non 'portrait' : la maquette d'appareil est déduite du
        // rapport d'aspect et sert téléphone, tablette et ordinateur.
        // Verrouiller en portrait empêcherait de juger un fond d'écran
        // d'ordinateur, qui est précisément ce que le format 2560 × 1440 sert.
        orientation: 'any',
        background_color: '#F2EDDD',
        theme_color: '#F2EDDD',
        categories: ['graphics', 'personalization', 'utilities'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // `woff2` : les deux familles sont auto-hébergées, une application
        // hors ligne qui perdrait son display serait à moitié installée.
        // `txt` couvre THIRD-PARTY.txt et les licences OFL des polices, qui
        // doivent rester lisibles hors ligne comme le reste.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,txt,woff2}'],
        // Le même document sert les deux adresses : `/app` n'est pas un
        // fichier, c'est le chemin que `route.ts` lit au démarrage.
        navigateFallback: 'index.html',
        // Les `.txt` sont des documents, pas des routes : le pied de page
        // ouvre THIRD-PARTY.txt dans un onglet. Le précache les sert déjà,
        // mais il ne les sert que tant que `txt` reste dans `globPatterns` ;
        // sans cette liste, retirer l'extension là-haut ferait répondre
        // l'application à la place des licences, sans qu'aucun test ne le
        // dise.
        navigateFallbackDenylist: [/\.txt$/],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
