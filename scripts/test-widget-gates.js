// Widget gates: floating icon exists, is clickable, and draggable across core platforms.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const rootDir = path.resolve(__dirname, '..');

const cases = [
  { platform: 'claude', url: 'https://claude.ai/chat/widget-test' },
  { platform: 'chatgpt', url: 'https://chatgpt.com/c/widget-test' },
  { platform: 'grok', url: 'https://grok.x.ai/chat/widget-test' }
];

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function dispatchPointer(target, type, props) {
  const event = new target.ownerDocument.defaultView.Event(type, { bubbles: true, cancelable: true });
  Object.entries(props).forEach(([key, value]) => {
    Object.defineProperty(event, key, { configurable: true, enumerable: true, value });
  });
  target.dispatchEvent(event);
}

async function runCase(testCase) {
  const dom = new JSDOM('<!doctype html><html><body><main></main></body></html>', {
    url: testCase.url,
    pretendToBeVisual: true,
    runScripts: 'outside-only'
  });

  try {
    const context = dom.getInternalVMContext();
    context.console = console;

    dom.window.HTMLElement.prototype.setPointerCapture = function setPointerCapture() {};

    context.chrome = {
      runtime: { onMessage: { addListener: () => {} } },
      storage: {
        sync: {
          get: (_, cb) => cb({}),
          set: () => {}
        },
        local: {
          get: (_, cb) => cb({}),
          set: () => {}
        }
      }
    };

    context.PlatformDetector = class PlatformDetector {
      detectPlatform() {
        return {
          platform: testCase.platform,
          hostname: new URL(testCase.url).hostname,
          pathname: new URL(testCase.url).pathname,
          config: {
            extractor: 'UniversalExtractor',
            selectors: {}
          }
        };
      }

      getPlatformDisplayName() {
        return testCase.platform;
      }
    };

    context.UniversalExtractor = class UniversalExtractor {};

    context.ExportInterface = class ExportInterface {
      async initialize() {
        const el = dom.window.document.createElement('div');
        el.id = 'universal-ai-exporter-ui';
        dom.window.document.body.appendChild(el);
      }

      hideUI() {}
    };

    vm.runInContext(read(path.join(rootDir, 'extension', 'content-script.js')), context);

    await new Promise((resolve) => setTimeout(resolve, 1600));

    const button = dom.window.document.getElementById('uae-floating-button');
    if (!button) {
      throw new Error(`Widget missing for ${testCase.platform}`);
    }

    const beforeLeft = parseFloat(button.style.left || '0');
    const beforeTop = parseFloat(button.style.top || '0');

    dispatchPointer(button, 'pointerdown', { button: 0, pointerId: 1, clientX: 200, clientY: 300 });
    dispatchPointer(button, 'pointermove', { pointerId: 1, clientX: 260, clientY: 360 });
    dispatchPointer(button, 'pointerup', { pointerId: 1, clientX: 260, clientY: 360 });

    const afterLeft = parseFloat(button.style.left || '0');
    const afterTop = parseFloat(button.style.top || '0');

    if (!(afterLeft !== beforeLeft || afterTop !== beforeTop)) {
      throw new Error(`Widget drag did not update position for ${testCase.platform}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
    button.click();

    const ui = dom.window.document.getElementById('universal-ai-exporter-ui');
    if (!ui) {
      throw new Error(`Widget click did not open UI for ${testCase.platform}`);
    }

    console.log(`✅ widget gate ${testCase.platform}: visible + draggable + clickable`);
  } finally {
    dom.window.close();
  }
}

(async () => {
  for (const testCase of cases) {
    await runCase(testCase);
  }
  console.log('✅ Widget gates passed');
})().catch((error) => {
  console.error('❌ Widget gate failure:', error.message);
  process.exit(1);
});
