export default {
    presets: [
        ['@babel/preset-env', {
            modules: false,
            loose: true,
        }],
        '@babel/preset-typescript',
    ],
    plugins: [
        [ "@babel/plugin-transform-react-jsx", {
            pragma: "VM.h",
            pragmaFrag: "VM.Fragment",
            throwIfNamespace: false,
        }]
    ]
};
