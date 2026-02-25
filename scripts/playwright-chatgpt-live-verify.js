/*
 * Live ChatGPT verification using Playwright + loaded extension.
 *
 * Usage:
 *   npm run test-chatgpt-live
 *   CHATGPT_URL="https://chatgpt.com/c/<conversation-id>" npm run test-chatgpt-live
 *   UAE_HEADLESS=false UAE_MANUAL_WAIT=true CHATGPT_URL="https://chatgpt.com/c/<conversation-id>" npm run test-chatgpt-live
 *
 * Environment variables:
 *   UAE_HEADLESS=true|false         Default: true
 *   UAE_TIMEOUT_MS=45000            Timeout for async waits
 *   UAE_ALLOW_PARTIAL=true|false    If true, non-critical failures do not fail process
 *   UAE_MANUAL_WAIT=true|false      Pause and wait for user to finish Cloudflare/login/navigation
 *   UAE_MANUAL_WAIT_MS=180000       Max wait time while paused
 *   UAE_VERIFY_DOWNLOADS=true|false Validate actual exports are downloaded
 *   UAE_VERIFY_FORMATS=markdown,json Comma-separated formats to verify
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { chromium } = require('playwright');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function toBool(value, fallback = false) {
  if (typeof value === 'undefined') return fallback;
  return String(value).toLowerCase() === 'true';
}

function sanitizeFilename(input) {
  return input.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

async function waitForManualContinue(manualWaitMs) {
  if (!process.stdin.isTTY) {
    throw new Error('Manual wait requested but no interactive TTY is available.');
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    await Promise.race([
      new Promise((resolve) => {
        rl.question('\nManual mode: complete Cloudflare/login and open a ChatGPT conversation, then press Enter to continue...\n', () => resolve());
      }),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Manual wait timed out after ${manualWaitMs}ms`)), manualWaitMs);
      })
    ]);
  } finally {
    rl.close();
  }
}

async function detectInjection(page) {
  return page.evaluate(() => Boolean(window.UniversalAIExporterLoaded));
}

async function getConversationDiagnostics(page) {
  return page.evaluate(() => {
    const statusText = document.querySelector('#uae-status .uae-status-text')?.textContent || '';
    const statsRaw = Array.from(document.querySelectorAll('#uae-stats .uae-stat')).map((node) => node.textContent || '');
    const messagesStat = statsRaw.find((item) => /messages/i.test(item)) || '';
    const messageMatch = messagesStat.match(/(\d+)/);
    const messageCount = messageMatch ? Number(messageMatch[1]) : null;

    return {
      statusText,
      messageCount,
      statsRaw
    };
  });
}

async function verifyDownloads(page, artifactsDir, formats, timeoutMs) {
  const results = [];

  for (const format of formats) {
    const selector = `.uae-format-btn[data-format="${format}"]`;
    const hasButton = await page.locator(selector).count();
    if (!hasButton) {
      results.push({ format, ok: false, reason: 'Format button not found', filename: null, bytes: 0 });
      continue;
    }

    try {
      const downloadPromise = page.waitForEvent('download', { timeout: timeoutMs });
      await page.click(selector);
      const download = await downloadPromise;

      const suggested = download.suggestedFilename();
      const outputPath = path.join(artifactsDir, `${nowStamp()}-${sanitizeFilename(suggested)}`);
      await download.saveAs(outputPath);

      const stat = fs.statSync(outputPath);
      results.push({
        format,
        ok: stat.size > 0,
        reason: stat.size > 0 ? '' : 'Downloaded file is empty',
        filename: outputPath,
        bytes: stat.size
      });
    } catch (error) {
      results.push({ format, ok: false, reason: `Download failed: ${error.message}`, filename: null, bytes: 0 });
    }
  }

  return results;
}

async function run() {
  const rootDir = path.resolve(__dirname, '..');
  const extensionDir = fs.existsSync(path.join(rootDir, 'dist', 'manifest.json'))
    ? path.join(rootDir, 'dist')
    : path.join(rootDir, 'extension');

  const artifactsDir = path.join(rootDir, 'artifacts', 'playwright');
  ensureDir(artifactsDir);

  const targetUrl = process.env.CHATGPT_URL || 'https://chatgpt.com/';
  const headless = toBool(process.env.UAE_HEADLESS, true);
  const timeoutMs = Number(process.env.UAE_TIMEOUT_MS || 45000);
  const allowPartial = toBool(process.env.UAE_ALLOW_PARTIAL, false);
  const manualWait = toBool(process.env.UAE_MANUAL_WAIT, false);
  const manualWaitMs = Number(process.env.UAE_MANUAL_WAIT_MS || 180000);
  const verifyDownloadsEnabled = toBool(process.env.UAE_VERIFY_DOWNLOADS, true);
  const verifyFormats = (process.env.UAE_VERIFY_FORMATS || 'markdown,json')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (manualWait && headless) {
    throw new Error('UAE_MANUAL_WAIT=true requires UAE_HEADLESS=false.');
  }

  const runId = nowStamp();
  const screenshotPath = path.join(artifactsDir, `chatgpt-live-${runId}.png`);
  const reportPath = path.join(artifactsDir, `chatgpt-live-${runId}.json`);
  const userDataDir = path.join(rootDir, '.playwright-profile', 'chatgpt-live');

  const report = {
    runAt: new Date().toISOString(),
    targetUrl,
    extensionDir,
    headless,
    timeoutMs,
    manualWait,
    verifyDownloadsEnabled,
    verifyFormats,
    checks: {
      pageLoaded: false,
      extensionInjected: false,
      uiOpened: false,
      analysisTriggered: false,
      analysisCompleted: false,
      extractedMessageCount: null,
      downloadsVerified: false
    },
    challengeDetected: false,
    finalUrl: null,
    downloads: [],
    notes: [],
    screenshotPath,
    pass: false
  };

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless,
    acceptDownloads: true,
    args: [
      `--disable-extensions-except=${extensionDir}`,
      `--load-extension=${extensionDir}`
    ]
  });

  try {
    const page = context.pages()[0] || await context.newPage();
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    report.checks.pageLoaded = true;

    if (manualWait) {
      await waitForManualContinue(manualWaitMs);
    }

    await page.waitForTimeout(2000);
    report.finalUrl = page.url();

    const title = await page.title();
    if (page.url().includes('__cf_chl_rt_tk') || /just a moment/i.test(title)) {
      report.challengeDetected = true;
      report.notes.push('Cloudflare challenge detected before ChatGPT app load. Complete challenge in headed mode and rerun.');
    }

    let extensionInjected = await detectInjection(page);
    if (!extensionInjected) {
      // Retry once with reload because content script injection can race on dynamic routes.
      await page.reload({ waitUntil: 'domcontentloaded', timeout: timeoutMs });
      await page.waitForTimeout(1500);
      extensionInjected = await detectInjection(page);
    }

    report.checks.extensionInjected = extensionInjected;

    if (!extensionInjected) {
      report.notes.push('Extension content script did not inject on this page.');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      return finalize(report, reportPath, allowPartial);
    }

    const isConversationPage = /\/c\//.test(page.url());
    if (!isConversationPage) {
      report.notes.push('Loaded page is not a conversation route (/c/*). Provide CHATGPT_URL for full extraction + download verification.');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      report.pass = allowPartial;
      return finalize(report, reportPath, allowPartial);
    }

    const openResult = await page.evaluate(() => {
      if (!window.UniversalAIExporter || !window.UniversalAIExporter.showExportInterface) {
        return { ok: false, reason: 'Global debug handle not available in content script.' };
      }
      window.UniversalAIExporter.showExportInterface();
      return { ok: true };
    });

    if (!openResult.ok) {
      report.notes.push(openResult.reason);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      return finalize(report, reportPath, allowPartial);
    }

    await page.waitForSelector('#universal-ai-exporter-ui', { timeout: 8000 });
    report.checks.uiOpened = true;

    await page.click('#analyze-btn');
    report.checks.analysisTriggered = true;

    await page.waitForFunction(() => {
      const el = document.querySelector('#uae-status .uae-status-text');
      if (!el) return false;
      const text = (el.textContent || '').toLowerCase();
      return text.includes('analysis complete') || text.includes('failed');
    }, { timeout: timeoutMs });

    const analysisSnapshot = await getConversationDiagnostics(page);
    report.checks.analysisCompleted = /analysis complete/i.test(analysisSnapshot.statusText);
    report.checks.extractedMessageCount = analysisSnapshot.messageCount;

    if (!report.checks.analysisCompleted) {
      report.notes.push(`Analysis did not complete successfully. Status: ${analysisSnapshot.statusText}`);
    }

    if (!analysisSnapshot.messageCount || analysisSnapshot.messageCount <= 0) {
      report.notes.push('No extracted messages detected in exporter stats.');
    }

    if (verifyDownloadsEnabled && report.checks.analysisCompleted) {
      report.downloads = await verifyDownloads(page, artifactsDir, verifyFormats, timeoutMs);
      const allDownloadsPassed = report.downloads.length > 0 && report.downloads.every((item) => item.ok);
      report.checks.downloadsVerified = allDownloadsPassed;
      if (!allDownloadsPassed) {
        report.notes.push('One or more export downloads failed verification.');
      }
    }

    await page.screenshot({ path: screenshotPath, fullPage: true });

    const downloadGate = verifyDownloadsEnabled ? report.checks.downloadsVerified : true;

    report.pass = Boolean(
      report.checks.pageLoaded &&
      report.checks.extensionInjected &&
      report.checks.uiOpened &&
      report.checks.analysisCompleted &&
      report.checks.extractedMessageCount > 0 &&
      downloadGate
    );

    return finalize(report, reportPath, allowPartial);
  } finally {
    await context.close();
  }
}

function finalize(report, reportPath, allowPartial) {
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const summary = [
    report.pass ? '✅ PASS' : '❌ FAIL',
    `Final URL: ${report.finalUrl}`,
    `Challenge detected: ${report.challengeDetected}`,
    `Page loaded: ${report.checks.pageLoaded}`,
    `Extension injected: ${report.checks.extensionInjected}`,
    `UI opened: ${report.checks.uiOpened}`,
    `Analysis completed: ${report.checks.analysisCompleted}`,
    `Extracted message count: ${report.checks.extractedMessageCount}`,
    `Downloads verified: ${report.checks.downloadsVerified}`,
    `Report: ${reportPath}`,
    `Screenshot: ${report.screenshotPath}`
  ];

  summary.forEach((line) => console.log(line));

  if (report.downloads.length > 0) {
    report.downloads.forEach((item) => {
      const mark = item.ok ? '✅' : '❌';
      console.log(`${mark} download ${item.format}: ${item.filename || item.reason} (${item.bytes} bytes)`);
    });
  }

  report.notes.forEach((note) => console.log(`ℹ️ ${note}`));

  if (!report.pass && !allowPartial) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('❌ Live ChatGPT Playwright verify crashed:', error.message);
  process.exit(1);
});
