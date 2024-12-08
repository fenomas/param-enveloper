// import globals from 'globals';
// import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
// import tseslint from '@typescript-eslint/parser';

export default [
  // { languageOptions: { globals: globals.browser } },
  // pluginJs.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  // ...tseslint.configs.recommendedTypeChecked,
  {
    rules: {
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
];
 