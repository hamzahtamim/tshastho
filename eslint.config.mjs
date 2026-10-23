import nextPlugin from '@next/eslint-plugin-next';
import tseslintPlugin from '@typescript-eslint/eslint-plugin';

export default [
  {
    plugins: {
      '@next/next': nextPlugin,
      '@typescript-eslint': tseslintPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...tseslintPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
  {
    files: ['**/*.js'], // Allow require() in plain JS scripts
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts'],
  },
];
