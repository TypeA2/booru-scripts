import babelPlugin from '@rollup/plugin-babel';
import commonjsPlugin from '@rollup/plugin-commonjs';
import jsonPlugin from '@rollup/plugin-json';
import resolvePlugin from '@rollup/plugin-node-resolve';
import replacePlugin from '@rollup/plugin-replace';
import { isAbsolute, relative, resolve } from 'path';
import { readPackageUp } from 'read-package-up';
import { defineConfig } from 'rollup';
import postcssPlugin from 'rollup-plugin-postcss';
import userscript from 'rollup-plugin-userscript';

const { packageJson } = await readPackageUp();
const extensions = ['.ts', '.tsx', '.mjs', '.js', '.jsx'];

const is_production = (process.env.NODE_ENV === "production");

const extra_plugins = [];

if (is_production) {
    // TODO: this removes the userscript header, which is bad
    // extra_plugins.push(terser());
}

export default defineConfig(
    Object.entries({
        'Awoobooru4': 'src/Awoobooru4/index.ts',
    }).map(([name, entry]) => ({
        input: entry,
        plugins: [
            postcssPlugin({
                inject: false,
                minimize: true,
                use: {
                    sass: {
                        silenceDeprecations: ["legacy-js-api"]
                    }
                },
            }),
            babelPlugin({
                // import helpers from '@babel/runtime'
                babelHelpers: 'runtime',
                plugins: [
                    [
                        import.meta.resolve('@babel/plugin-transform-runtime'),
                        {
                            useESModules: true,
                            version: '^7.5.0', // see https://github.com/babel/babel/issues/10261#issuecomment-514687857
                        },
                    ],
                ],
                exclude: 'node_modules/**',
                extensions,
            }),
            replacePlugin({
                values: {
                    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
                },
                preventAssignment: true,
            }),
            resolvePlugin({ browser: false, extensions }),
            commonjsPlugin(),
            jsonPlugin(),
            userscript((meta) =>
                meta.replace('process.env.AUTHOR', packageJson.author.name),
            ),

            ...extra_plugins
        ],
        external: defineExternal([
            "@violentmonkey/dom",
            "alpinejs"
        ]),
        output: {
            format: 'iife',
            file: `dist/${name}.user.js`,
            globals: {
                "@violentmonkey/dom": "VM",
                "alpinejs": "Alpine"
            },
            indent: false,
            compact: is_production
        },
    })),
);

function defineExternal(externals) {
    return (id) =>
        externals.some((pattern) => {
            if (typeof pattern === 'function') return pattern(id);
            if (pattern && typeof pattern.test === 'function')
                return pattern.test(id);
            if (isAbsolute(pattern))
                return !relative(pattern, resolve(id)).startsWith('..');
            return id === pattern || id.startsWith(pattern + '/');
        });
}
