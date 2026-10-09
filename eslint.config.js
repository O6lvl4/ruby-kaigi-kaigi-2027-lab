import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/', 'experiments/', 'node_modules/', 'public/'] },
  js.configs.recommended,
  {
    files: ['app/javascript/**/*.js'],
    languageOptions: { globals: { ...globals.browser, ...globals.worker } }
  },
  {
    files: ['tests/**/*.mjs', 'scripts/**/*.mjs', '*.config.js', '.dependency-cruiser.cjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } }
  },
  {
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      complexity: ['warn', 10],
      'max-lines-per-function': ['warn', { max: 60, skipBlankLines: true, skipComments: true }]
    }
  }
];
