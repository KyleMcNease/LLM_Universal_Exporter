/*
 * Simulate extension execution on ChatGPT web app using fixture HTML.
 * This exercises: platform detection contract -> UI init -> ChatGPT extraction -> format generation.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

async function runSimulation() {
  const rootDir = path.resolve(__dirname, '..');
  const fixturePath = path.join(rootDir, 'tests', 'fixtures', 'chatgpt.html');
  const universalExtractorPath = path.join(rootDir, 'extension', 'extractors', 'universal-extractor.js');
  const chatgptExtractorPath = path.join(rootDir, 'extension', 'extractors', 'chatgpt-extractor.js');
  const exportInterfacePath = path.join(rootDir, 'extension', 'ui', 'export-interface.js');

  const fixtureHtml = read(fixturePath);

  const dom = new JSDOM(fixtureHtml, {
    url: 'https://chatgpt.com/c/simulated-webapp-conversation',
    pretendToBeVisual: true,
    runScripts: 'outside-only'
  });

  try {
    const context = dom.getInternalVMContext();
    context.console = console;
    context.navigator = dom.window.navigator;
    context.setTimeout = setTimeout;
    context.clearTimeout = clearTimeout;

    context.PlatformDetector = class PlatformDetector {
      detectPlatform() {
        return this.waitForPlatform();
      }

      async waitForPlatform() {
        return {
          platform: 'chatgpt',
          config: {
            extractor: 'ChatGPTExtractor'
          }
        };
      }
    };

    vm.runInContext(read(universalExtractorPath), context, { filename: universalExtractorPath });
    vm.runInContext(read(chatgptExtractorPath), context, { filename: chatgptExtractorPath });
    vm.runInContext(read(exportInterfacePath), context, { filename: exportInterfacePath });

    const ExportInterface = dom.window.ExportInterface;
    if (!ExportInterface) {
      throw new Error('ExportInterface not loaded');
    }

    const ui = new ExportInterface();
    await ui.initialize();
    await ui.analyzeConversation();

    if (!ui.exportData || !Array.isArray(ui.exportData.messages) || ui.exportData.messages.length === 0) {
      throw new Error('No messages were extracted from ChatGPT simulation');
    }

    const jsonExport = ui.generateJSON(ui.getExportOptions());
    const textExport = ui.generateText(ui.getExportOptions());

    if (!jsonExport.includes('"platform": "chatgpt"')) {
      throw new Error('JSON export missing ChatGPT platform metadata');
    }

    if (!textExport.includes('AI Conversation Export')) {
      throw new Error('Text export content did not render as expected');
    }

    console.log('✅ ChatGPT webapp simulation passed');
    console.log(`   Messages extracted: ${ui.exportData.metadata.messageCount}`);
    console.log(`   Thinking blocks: ${ui.exportData.metadata.thinkingBlockCount}`);
    console.log(`   UI injected: ${Boolean(dom.window.document.getElementById('universal-ai-exporter-ui'))}`);
  } finally {
    dom.window.close();
  }
}

runSimulation().catch((error) => {
  console.error('❌ ChatGPT webapp simulation failed:', error.message);
  process.exit(1);
});
