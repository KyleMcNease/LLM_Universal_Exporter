// scripts/test-fixture-snapshots.js
// Fixture-based snapshot tests for platform extractors.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const rootDir = path.resolve(__dirname, '..');
const fixturesDir = path.join(rootDir, 'tests', 'fixtures');
const snapshotsDir = path.join(rootDir, 'tests', 'snapshots');

const updateSnapshots = process.argv.includes('--update');

const testCases = [
    {
        name: 'claude',
        platform: 'claude',
        extractorFile: path.join(rootDir, 'extension', 'extractors', 'claude-extractor.js'),
        extractorClass: 'ClaudeExtractor',
        fixtureFile: path.join(fixturesDir, 'claude.html'),
        snapshotFile: path.join(snapshotsDir, 'claude.snapshot.json'),
        url: 'https://claude.ai/chat/fixture-claude'
    },
    {
        name: 'chatgpt',
        platform: 'chatgpt',
        extractorFile: path.join(rootDir, 'extension', 'extractors', 'chatgpt-extractor.js'),
        extractorClass: 'ChatGPTExtractor',
        fixtureFile: path.join(fixturesDir, 'chatgpt.html'),
        snapshotFile: path.join(snapshotsDir, 'chatgpt.snapshot.json'),
        url: 'https://chatgpt.com/c/fixture-chatgpt'
    },
    {
        name: 'gemini',
        platform: 'gemini',
        extractorFile: path.join(rootDir, 'extension', 'extractors', 'gemini-extractor.js'),
        extractorClass: 'GeminiExtractor',
        fixtureFile: path.join(fixturesDir, 'gemini.html'),
        snapshotFile: path.join(snapshotsDir, 'gemini.snapshot.json'),
        url: 'https://gemini.google.com/app/fixture-gemini'
    }
];

function read(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

function write(filePath, content) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
}

function normalizeBlock(block) {
    return {
        type: block.type || 'thinking',
        summary: block.summary || '',
        content: (block.content || '').trim()
    };
}

function dedupeBlocks(blocks) {
    const seen = new Set();
    const deduped = [];

    blocks.forEach((block) => {
        const normalized = normalizeBlock(block);
        if (!normalized.content && !normalized.summary) return;
        const signature = `${normalized.summary}|${normalized.content.slice(0, 600)}`;
        if (seen.has(signature)) return;
        seen.add(signature);
        deduped.push(normalized);
    });

    return deduped;
}

function normalizeExportData(data) {
    const normalizeReferences = (refs) => ({
        links: (refs?.links || []).map((item) => ({
            url: item.url || '',
            title: item.title || '',
            domain: item.domain || ''
        })),
        attachments: (refs?.attachments || []).map((item) => ({
            name: item.name || '',
            url: item.url || '',
            type: item.type || ''
        })),
        documents: (refs?.documents || []).map((item) => ({
            name: item.name || '',
            url: item.url || '',
            type: item.type || ''
        })),
        citations: (refs?.citations || []).map((item) => ({
            text: item.text || '',
            url: item.url || ''
        }))
    });

    const topLevelBlocks = dedupeBlocks(data?.thinkingBlocks || []);
    const messages = (data?.messages || []).map((message) => ({
        author: message.author,
        content: (message.content || '').trim(),
        thinkingBlocks: dedupeBlocks(message.thinkingBlocks || []),
        references: normalizeReferences(message.references || {})
    }));

    const blockTypeBreakdown =
        data?.metadata?.blockTypeBreakdown ||
        data?.metadata?.claude?.blockTypeBreakdown ||
        topLevelBlocks.reduce((acc, block) => {
            const type = block.type || 'thinking';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

    return {
        platform: data?.metadata?.platform || 'unknown',
        messageCount: messages.length,
        thinkingBlockCount: topLevelBlocks.length,
        blockTypeBreakdown,
        referenceIndex: normalizeReferences(data?.metadata?.referenceIndex || {}),
        messages,
        thinkingBlocks: topLevelBlocks
    };
}

function compareSnapshot(snapshotPath, actualObject) {
    const actual = `${JSON.stringify(actualObject, null, 2)}\n`;
    if (updateSnapshots) {
        write(snapshotPath, actual);
        return { ok: true, updated: true };
    }

    if (!fs.existsSync(snapshotPath)) {
        return { ok: false, reason: `Snapshot missing: ${snapshotPath}` };
    }

    const expected = read(snapshotPath);
    if (expected === actual) {
        return { ok: true, updated: false };
    }

    const actualPath = snapshotPath.replace('.snapshot.json', '.actual.json');
    write(actualPath, actual);
    return {
        ok: false,
        reason: `Snapshot mismatch: ${snapshotPath} (wrote ${actualPath})`
    };
}

async function runExtractorCase(testCase) {
    const html = read(testCase.fixtureFile);
    const universalExtractorPath = path.join(rootDir, 'extension', 'extractors', 'universal-extractor.js');
    const universalExtractorSource = read(universalExtractorPath);
    const extractorSource = read(testCase.extractorFile);

    const dom = new JSDOM(html, {
        url: testCase.url,
        pretendToBeVisual: true,
        runScripts: 'outside-only'
    });

    try {
        const context = dom.getInternalVMContext();
        context.console = console;
        context.navigator = dom.window.navigator;
        context.chrome = undefined;
        context.browser = undefined;

        vm.runInContext(universalExtractorSource, context, { filename: universalExtractorPath });
        vm.runInContext(extractorSource, context, { filename: testCase.extractorFile });

        const ExtractorClass = dom.window[testCase.extractorClass];
        if (!ExtractorClass) {
            throw new Error(`Extractor class not found on window: ${testCase.extractorClass}`);
        }

        const extractor = new ExtractorClass({
            platform: testCase.platform,
            selectors: {}
        });

        const data = await extractor.extractConversation();
        const normalized = normalizeExportData(data);
        return compareSnapshot(testCase.snapshotFile, normalized);
    } finally {
        dom.window.close();
    }
}

async function main() {
    let failures = 0;

    for (const testCase of testCases) {
        try {
            const result = await runExtractorCase(testCase);
            if (!result.ok) {
                failures += 1;
                console.error(`❌ ${testCase.name}: ${result.reason}`);
            } else if (result.updated) {
                console.log(`📝 ${testCase.name}: snapshot updated`);
            } else {
                console.log(`✅ ${testCase.name}: snapshot matched`);
            }
        } catch (error) {
            failures += 1;
            console.error(`❌ ${testCase.name}: ${error.message}`);
        }
    }

    if (failures > 0) {
        process.exit(1);
    }

    console.log('✅ Fixture snapshot tests passed');
}

main();
