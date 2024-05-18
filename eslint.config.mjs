import tseslint from 'typescript-eslint';

export default [
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    rules: {
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
];
