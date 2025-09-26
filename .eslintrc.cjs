module.exports = {
    root: true,
    env: {
        browser: true,
        es2021: true,
        webextensions: true
    },
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module'
    },
    extends: [
        'eslint:recommended'
    ],
    ignorePatterns: [
        'dist/',
        'extension/libs/**/*.js'
    ],
    globals: {
        chrome: 'readonly',
        browser: 'readonly',
        PlatformDetector: 'readonly',
        ExportInterface: 'readonly',
        UniversalExtractor: 'readonly'
    },
    rules: {
        'no-unused-vars': ['warn', { args: 'none', ignoreRestSiblings: true }],
        'no-console': 'off'
    }
};
