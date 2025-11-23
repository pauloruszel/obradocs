module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['universe/native', 'plugin:@typescript-eslint/recommended'],
  rules: {
    // Relaxamos regras de formatacao/imports para evitar falsos positivos ate integrar Prettier.
    'prettier/prettier': 'off',
    'import/order': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
  }
};
