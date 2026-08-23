// Le dépôt n'a pas de formateur : `.editorconfig` tient l'indentation, et le
// reste de la forme se lit dans le code existant. ESLint est ici pour ce que
// `tsc` ne voit pas, c'est-à-dire les règles des hooks React. `exhaustive-deps`
// en particulier : une dépendance oubliée dans un `useEffect` ne casse ni la
// compilation ni un test, elle laisse simplement l'aperçu se figer sur un
// réglage périmé.
//
// Volontairement sans `recommendedTypeChecked` : le moteur indexe des tableaux
// par des index calculés d'un bout à l'autre, et les règles typées y
// réclameraient des assertions non nulles qui rendraient le code moins lisible
// sans le rendre plus juste.
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'node_modules', 'design', 'tools/.banc'] },

  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/ban-ts-comment': 'error',
      eqeqeq: ['error', 'smart'],
    },
  },

  // Les fichiers de configuration et les générateurs d'actifs tournent dans
  // Node, pas dans le navigateur.
  {
    files: ['vite.config.ts', 'eslint.config.js', 'scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },

  // L'outillage de vérification : des scripts Node qui évaluent aussi du code
  // dans la page, d'où les deux jeux de variables globales. Il n'est jamais
  // servi à l'utilisateur.
  {
    files: ['tools/**/*.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
)
