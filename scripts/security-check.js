// scripts/security-check.js
// Basic security check using eslint and simple vuln scan (add deps like eslint-plugin-security if needed)

const { ESLint } = require('eslint');
const fs = require('fs');
const path = require('path');

function isSecurityPluginAvailable() {
    try {
        require.resolve('eslint-plugin-security');
        return true;
    } catch (error) {
        return false;
    }
}

function walkFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.flatMap((entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            return walkFiles(fullPath);
        }
        return entry.isFile() ? [fullPath] : [];
    });
}

async function runSecurityCheck() {
    const securityPluginAvailable = isSecurityPluginAvailable();
    const eslint = new ESLint({
        useEslintrc: false,
        overrideConfig: {
            ignorePatterns: ['extension/libs/**'],
            env: { browser: true, es2021: true },
            parserOptions: { ecmaVersion: 2021, sourceType: 'module' },
            plugins: securityPluginAvailable ? ['security'] : [],
            extends: securityPluginAvailable ? ['plugin:security/recommended'] : [],
            rules: securityPluginAvailable ? {
                'security/detect-object-injection': 'error',
                'security/detect-non-literal-regexp': 'error',
                'security/detect-unsafe-regex': 'error'
            } : {}
        }
    });

    const results = await eslint.lintFiles(['extension/**/*.js']);

    const formatter = await eslint.loadFormatter('stylish');
    const resultText = formatter.format(results);

    console.log(resultText);

    // Simple custom check for hard-coded secrets (e.g., API keys)
    const extensionRoot = path.join(__dirname, '../extension');
    const files = walkFiles(extensionRoot).filter((filePath) => {
        if (!filePath.endsWith('.js')) return false;
        return !filePath.includes(`${path.sep}libs${path.sep}`);
    });
    files.forEach(filePath => {
        const content = fs.readFileSync(filePath, 'utf-8');
        const secretRegex = /(api_key|token|password)\s*=\s*['"][a-zA-Z0-9+/=]{20,}['"]/gi;
        if (secretRegex.test(content)) {
            console.warn(`Potential secret found in ${path.relative(extensionRoot, filePath)}`);
        }
    });

    if (results.some(result => result.errorCount > 0)) {
        process.exit(1);
    }
}

runSecurityCheck().catch(err => {
    console.error('Security check failed:', err);
    process.exit(1);
});
