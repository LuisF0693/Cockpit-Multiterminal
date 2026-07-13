import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/out/**',
      '**/node_modules/**',
      '.aiox-core/**',
      '.aiox/**',
      '.claude/**',
      '.gemini/**',
      '.agent/**',
      '.codex/**',
      '.cursor/**',
      '.antigravity/**',
      'docs/**'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/adapters/*', '@cockpit/adapter-*'],
              message:
                'Provider isolation (NFR7): adapters só podem ser importados dentro do PTY Host (packages/pty-host).'
            }
          ]
        }
      ]
    }
  },
  {
    // Único lugar autorizado a importar adapters (Story 2.1+)
    files: ['packages/pty-host/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off'
    }
  },
  {
    // Scripts utilitários CommonJS (smoke ABI roda direto no Electron, sem bundle)
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off'
    }
  }
);
