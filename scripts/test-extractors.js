// scripts/test-extractors.js
// Static robustness checks for extractor wiring and platform configuration.

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const extensionDir = path.join(root, 'extension');
const extractorsDir = path.join(extensionDir, 'extractors');

function read(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

function parseJson(filePath) {
    return JSON.parse(read(filePath));
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function getExtractorFiles() {
    return fs.readdirSync(extractorsDir)
        .filter((file) => file.endsWith('.js'))
        .filter((file) => !file.includes(' feb '))
        .map((file) => path.join('extractors', file));
}

function collectPlatformExtractors(platformDetectorSource) {
    const names = new Set();
    const regex = /extractor:\s*'([A-Za-z0-9_]+)'/g;
    let match;
    while ((match = regex.exec(platformDetectorSource)) !== null) {
        names.add(match[1]);
    }
    return Array.from(names);
}

function main() {
    const manifestPath = path.join(extensionDir, 'manifest.json');
    const detectorPath = path.join(extensionDir, 'core', 'platform-detector.js');

    const manifest = parseJson(manifestPath);
    const detectorSource = read(detectorPath);

    const contentScript = manifest.content_scripts?.[0];
    assert(contentScript, 'Manifest missing primary content_script entry');

    const contentJs = new Set(contentScript.js || []);
    const extractorFiles = getExtractorFiles();

    extractorFiles.forEach((extractorPath) => {
        assert(contentJs.has(extractorPath), `Manifest content_scripts.js missing ${extractorPath}`);
    });

    const platformExtractors = collectPlatformExtractors(detectorSource);
    const extractorSources = extractorFiles.map((relativePath) => ({
        relativePath,
        absolutePath: path.join(extensionDir, relativePath),
        source: read(path.join(extensionDir, relativePath))
    }));

    platformExtractors.forEach((extractorName) => {
        if (extractorName === 'UniversalExtractor') {
            return;
        }

        const owner = extractorSources.find(({ source }) => source.includes(`class ${extractorName}`));
        assert(owner, `Platform detector references missing class implementation: ${extractorName}`);

        const { source, relativePath } = owner;
        assert(
            source.includes(`window.${extractorName} = ${extractorName};`),
            `Extractor ${extractorName} is not exported to window in ${relativePath}`
        );
    });

    const hostPermissions = new Set(manifest.host_permissions || []);
    const matches = new Set(contentScript.matches || []);
    hostPermissions.forEach((host) => {
        if (!host.startsWith('http://localhost:')) {
            assert(matches.has(host), `Host permission missing in content script matches: ${host}`);
        }
    });

    assert(
        hostPermissions.has('https://chatgpt.com/*'),
        'chatgpt.com host permission missing'
    );
    assert(
        matches.has('https://chatgpt.com/*'),
        'chatgpt.com content script match missing'
    );

    console.log('✅ Extractor and platform wiring checks passed');
}

try {
    main();
} catch (error) {
    console.error(`❌ Extractor wiring check failed: ${error.message}`);
    process.exit(1);
}
