import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import ts from 'typescript-eslint';
import solid from 'eslint-plugin-solid/configs/recommended';

/** @type {import('eslint').Linter.Config[]} */
export default [
	js.configs.recommended,
	...ts.configs.recommended,
	solid,
	prettier,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
	},
	{
		ignores: ['dist/'],
	},
	{
		rules: {
			"no-fallthrough": "off",
			"no-empty": "off",
			"semi": "error",
			"@typescript-eslint/no-unused-vars": "off",
			"@typescript-eslint/no-this-alias": "off"
		}
	}
];
