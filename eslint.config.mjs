import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
    {ignores: ['dist/', '.yarn/', '.pnp.cjs', '.pnp.loader.mjs']},
    js.configs.recommended,
    ...tsPlugin.configs['flat/recommended'],
    {
        files: ['**/*.ts'],
        languageOptions: {
            parserOptions: {
                project: './tsconfig.json',
            },
        },
        rules: {
            '@typescript-eslint/array-type': ['warn', {default: 'generic'}],
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
    },
];
