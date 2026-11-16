import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Generated output: Vite build, Jest/Vitest coverage reports, Storybook build (Issue #251)
  globalIgnores(['dist', 'coverage', 'storybook-static']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Downgraded to 'warn' (Issue #251): nine data-fetch-on-mount effects still set loading
      // state synchronously. Issue #262 tracks refactoring them and restoring 'error'.
      'react-hooks/set-state-in-effect': 'warn',
      // ignoreRestSiblings: `({ node, ...props }) => <h1 {...props} />` (react-markdown
      // overrides in LessonViewer) destructures `node` on purpose to keep it off the DOM element.
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      // A context module exporting its provider and its hook (useSessions), and the Storybook-only
      // preset-wrapper object (StorybookSessionsProvider), are accepted exceptions to Fast Refresh's
      // components-only rule. allowConstantExport matches reactRefresh.configs.vite.
      'react-refresh/only-export-components': [
        'error',
        { allowConstantExport: true, allowExportNames: ['useSessions', 'StorybookSessionsProvider'] },
      ],
    },
  },
  {
    // Cypress custom-command typings use `declare global { namespace Cypress { ... } }`, the
    // documented augmentation pattern, which has no ES-module equivalent.
    files: ['cypress/**/*.ts'],
    rules: {
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
    },
  },
])
