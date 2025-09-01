// scripts/security-check.js
// Basic security check using eslint and simple vuln scan (add deps like eslint-plugin-security if needed)

const { ESLint } = require('eslint');
const fs = require('fs');
const path = require('path');

async function runSecurityCheck() {
    const eslint = new ESLint({
        useEslintrc: false,
        overrideConfig: {
            plugins: ['security'], // Assume eslint-plugin-security installed as dev dep
            rules: {
                'security/detect-object-injection': 'error',
                'security/detect-non-literal-regexp': 'error',
                'security/detect-unsafe-regex': 'error',
                // Add more security rules
            }
        }
    });

    const results = await eslint.lintFiles(['extension/**/*.js']);

    const formatter = await eslint.loadFormatter('stylish');
    const resultText = formatter.format(results);

    console.log(resultText);

    // Simple custom check for hard-coded secrets (e.g., API keys)
    const files = fs.readdirSync(path.join(__dirname, '../extension'), { recursive: true });
    files.forEach(file => {
        if (file.endsWith('.js')) {
            const content = fs.readFileSync(file, 'utf-8');
            const secretRegex = /(api_key|token|password)\s*=\s*['"][a-zA-Z0-9+/=]{20,}['"]/gi;
            if (secretRegex.test(content)) {
                console.warn(`Potential secret found in ${file}`);
            }
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