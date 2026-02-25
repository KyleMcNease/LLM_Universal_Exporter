// Deterministic paid-grade gates: research analysis + export generation across key platforms.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const rootDir = path.resolve(__dirname, '..');

const cases = [
  {
    platform: 'claude',
    url: 'https://claude.ai/chat/fixture-claude',
    fixture: path.join(rootDir, 'tests', 'fixtures', 'claude.html'),
    extractor: path.join(rootDir, 'extension', 'extractors', 'claude-extractor.js'),
    extractorClass: 'ClaudeExtractor'
  },
  {
    platform: 'chatgpt',
    url: 'https://chatgpt.com/c/fixture-chatgpt',
    fixture: path.join(rootDir, 'tests', 'fixtures', 'chatgpt.html'),
    extractor: path.join(rootDir, 'extension', 'extractors', 'chatgpt-extractor.js'),
    extractorClass: 'ChatGPTExtractor'
  },
  {
    platform: 'grok',
    url: 'https://grok.x.ai/chat/fixture-grok',
    fixture: path.join(rootDir, 'tests', 'fixtures', 'grok.html'),
    extractor: path.join(rootDir, 'extension', 'extractors', 'grok-extractor.js'),
    extractorClass: 'GrokExtractor'
  }
];

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function installDocxStub(dom) {
  const BlobCtor = dom.window.Blob;
  dom.window.docx = {
    HeadingLevel: { HEADING_1: 'h1', HEADING_2: 'h2' },
    TextRun: class TextRun {
      constructor(value) {
        this.value = value;
      }
    },
    Paragraph: class Paragraph {
      constructor(value) {
        this.value = value;
      }
    },
    Document: class Document {
      constructor(config) {
        this.config = config;
      }
    },
    Packer: {
      async toBlob(doc) {
        return new BlobCtor([JSON.stringify(doc.config)], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
      }
    }
  };
}

async function runCase(testCase) {
  const html = read(testCase.fixture);
  const dom = new JSDOM(html, {
    url: testCase.url,
    pretendToBeVisual: true,
    runScripts: 'outside-only'
  });

  try {
    const context = dom.getInternalVMContext();
    context.console = console;

    installDocxStub(dom);

    context.PlatformDetector = class PlatformDetector {
      async waitForPlatform() {
        return {
          platform: testCase.platform,
          config: {
            extractor: testCase.extractorClass,
            selectors: {}
          }
        };
      }
    };

    vm.runInContext(read(path.join(rootDir, 'extension', 'extractors', 'universal-extractor.js')), context);
    vm.runInContext(read(testCase.extractor), context);
    vm.runInContext(read(path.join(rootDir, 'extension', 'ui', 'export-interface.js')), context);

    const ui = new dom.window.ExportInterface();
    await ui.initialize();
    await ui.analyzeConversation();

    const statsText = dom.window.document.getElementById('uae-stats')?.textContent || '';
    if (!/Complexity Score/i.test(statsText)) {
      throw new Error('Research Mode stats missing complexity score');
    }

    const formats = ['markdown', 'json', 'graph', 'memorypack', 'txt', 'docx'];
    for (const format of formats) {
      const content = await ui.generateFormat(format);
      if (content instanceof dom.window.Blob) {
        if (content.size <= 0) throw new Error(`${format} blob is empty`);
      } else if (typeof content === 'string') {
        if (content.trim().length < 20) throw new Error(`${format} output too small`);
        if (format === 'graph') {
          const parsed = JSON.parse(content);
          if (!Array.isArray(parsed?.graph?.nodes) || parsed.graph.nodes.length === 0) {
            throw new Error('graph export missing nodes');
          }
          if (!Array.isArray(parsed?.graph?.edges) || parsed.graph.edges.length === 0) {
            throw new Error('graph export missing edges');
          }
        }
        if (format === 'memorypack') {
          const parsed = JSON.parse(content);
          if (!Array.isArray(parsed?.canonical?.messages) || parsed.canonical.messages.length === 0) {
            throw new Error('memorypack canonical messages missing');
          }
          if (!Array.isArray(parsed?.graph?.nodes) || parsed.graph.nodes.length === 0) {
            throw new Error('memorypack graph nodes missing');
          }
        }
      } else {
        throw new Error(`${format} returned unexpected output type`);
      }
    }

    const originalJson = await ui.generateFormat('json');
    const redactCheckbox = dom.window.document.getElementById('redact-sensitive');
    if (!redactCheckbox) throw new Error('Redaction option missing from UI');
    redactCheckbox.checked = true;
    const signatureCheckbox = dom.window.document.getElementById('include-signature');
    if (!signatureCheckbox) throw new Error('Signed manifest option missing from UI');

    const redactedJson = await ui.generateFormat('json');
    if (typeof redactedJson !== 'string' || redactedJson.length < 20) {
      throw new Error('redacted json output invalid');
    }
    if (originalJson.includes('.pdf') || originalJson.includes('.docx') || originalJson.includes('.md')) {
      if (redactedJson.includes('memory-system.pdf') || redactedJson.includes('architecture-paper.pdf') || redactedJson.includes('runbook.docx')) {
        throw new Error('redaction did not sanitize sensitive reference names');
      }
      if (!redactedJson.includes('[REDACTED_')) {
        throw new Error('redaction markers were not found in redacted export');
      }
    }

    console.log(`✅ paid gate ${testCase.platform}: analysis + formats`);
  } finally {
    dom.window.close();
  }
}

(async () => {
  for (const testCase of cases) {
    await runCase(testCase);
  }
  console.log('✅ Paid-grade analysis/export gates passed');
})().catch((error) => {
  console.error('❌ Paid-grade gate failure:', error.message);
  process.exit(1);
});
