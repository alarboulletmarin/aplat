// Construit le moteur seul, en un fichier qui pose `window.MOTEUR`.
// Hors livraison : rien de tout ceci n'entre dans dist/.
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

const ici = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  // Rien de public : le banc n'est qu'un fichier de script.
  publicDir: false,
  build: {
    outDir: `${ici}.banc`,
    emptyOutDir: true,
    minify: false,
    lib: {
      entry: `${ici}banc-entree.ts`,
      name: 'MOTEUR',
      formats: ['iife'],
      fileName: () => 'moteur.js',
    },
  },
})
