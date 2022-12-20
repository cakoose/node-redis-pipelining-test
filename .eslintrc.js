module.exports = {
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: './tsconfig.json',
    },
    plugins: ['@typescript-eslint'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    rules: {
        '@typescript-eslint/array-type': ['warn', {default: 'generic'}],
        '@typescript-eslint/prefer-interface': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-use-before-define': ['warn', {
            functions: false,
        }],
        '@typescript-eslint/explicit-function-return-type': ['warn', {
            allowExpressions: true,
        }],
        '@typescript-eslint/no-unused-vars': ['warn', {
            args: 'all',
            // Starts with an underscore, but don't match double underscore.
            argsIgnorePattern: '^_(?!_)',
            varsIgnorePattern: '^_(?!_)',
        }],
    },
};
