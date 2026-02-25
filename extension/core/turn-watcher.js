/**
 * TurnWatcher — Continuous real-time conversation capture
 * 
 * Architecture:
 *   MutationObserver watches conversation container for new turns.
 *   When DOM settles (debounce), compares current turn count against
 *   last-known count. New turns are extracted and dispatched to the
 *   background script, which stores locally and forwards to the
 *   Python stream receiver (localhost:7749).
 * 
 * This is the EPISODIC GROUND TRUTH layer — passive, complete,
 * continuous. It captures everything so retrieval can sort it out later.
 * 
 * Design:
 *   - Self-contained selectors (no dependency on ClaudeExtractor)
 *   - Lightweight extraction (text + thinking + metadata only)
 *   - Append-only mental model: never re-extracts captured turns
 *   - Graceful degradation: if background/receiver is down, logs to console
 *   - Platform-aware: currently Claude.ai, extensible to others
 */

class TurnWatcher {
    constructor(config = {}) {
        // ── Configuration ──
        this.config = {
            // How long to wait after last DOM mutation before extracting (ms)
            // This must exceed Claude's streaming render cycle
            debounceMs: config.debounceMs || 2500,

            // Minimum interval between extraction runs (ms) — prevents thrashing
            minIntervalMs: config.minIntervalMs || 1000,

            // Where to POST turns (Python stream receiver)
            receiverUrl: config.receiverUrl || 'http://localhost:7749/turn',

            // Enable/disable console logging
            debug: config.debug !== undefined ? config.debug : true,

            // Platform (extensible later)
            platform: config.platform || 'claude',

            enabled: config.enabled !== undefined ? config.enabled : true
        };

        // ── State ──
        this.observer = null;
        this.debounceTimer = null;
        this.lastExtractionTime = 0;
        this.capturedTurnCount = 0;
        this.capturedTurnHashes = new Set();  // content hashes to detect duplicates
        this.sessionId = this.generateSessionId();
        this.conversationUrl = window.location.href;
        this.isStreaming = false;
        this.started = false;

        // ── Selectors (Claude.ai 2026 DOM — self-contained) ──
        this.selectors = {
            // Conversation container candidates
            containers: [
                '.flex-1.flex.flex-col.px-4.max-w-3xl',
                '.max-w-3xl.mx-auto',
                '[class*="conversation"]'
            ],

            // Turn identification
            userMessage:    '[data-testid="user-message"]',
            assistantRoot:  '.font-claude-response',

            // Thinking blocks
            thinkingButton: 'button[class*="group/status"]',
            thinkingGrid:   '.grid.transition-\\[grid-template-rows\\]',

            // Response body
            responseMarkdown: '.standard-markdown',
            responseBody:     '.font-claude-response-body',

            // Streaming indicator — when this exists, response is still generating
            streamingIndicator: '[class*="stop"], [aria-label*="Stop"]',

            // Compaction banner — signals context was compressed
            compactionBanner: '[class*="compaction"], [class*="summary"], [data-testid*="compact"]',

            // Elements to exclude from text
            excludeFromText: [
                'button', 'time', '.timestamp', '[data-timestamp]',
                '.text-text-500.text-xs', '.text-text-400',
                'svg', '.sr-only',
                '[class*="action"]', '[class*="feedback"]', '[class*="copy"]'
            ].join(',')
        };

        this.log('TurnWatcher initialized', { sessionId: this.sessionId });
    }

    // ══════════════════════════════════════════════
    // PUBLIC API
    // ══════════════════════════════════════════════

    /**
     * Start watching. Call once after page load.
     */
    start() {
        if (this.started) {
            this.log('Already started');
            return;
        }

        if (!this.config.enabled) {
            this.log('TurnWatcher disabled by config');
            return;
        }

        const container = this.findContainer();
        if (!container) {
            this.log('⚠️ No conversation container found. Retrying in 3s...');
            setTimeout(() => this.start(), 3000);
            return;
        }

        // Capture any turns already on the page (conversation was in progress)
        this.captureExistingTurns(container);

        // Start observing
        this.observer = new MutationObserver((mutations) => {
            this.onMutation(mutations);
        });

        this.observer.observe(container, {
            childList: true,
            subtree: true,
            characterData: true
        });

        // Also watch for URL changes (SPA navigation to different conversation)
        this.watchUrlChanges();

        // Watch for compaction events
        this.watchForCompaction();

        this.started = true;
        this.log('✅ Watching conversation', {
            container: container.className.slice(0, 60),
            existingTurns: this.capturedTurnCount
        });
    }

    /**
     * Stop watching. Cleanup.
     */
    stop() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        this.started = false;
        this.log('⏹️ TurnWatcher stopped');
    }

    /**
     * Force an immediate capture of all turns (manual trigger).
     * Returns the full session as an array.
     */
    captureAll() {
        const container = this.findContainer();
        if (!container) return [];

        // Reset state and recapture everything
        const oldHashes = this.capturedTurnHashes;
        const oldCount = this.capturedTurnCount;
        this.capturedTurnHashes = new Set();
        this.capturedTurnCount = 0;

        const turns = this.discoverTurns(container);
        const extracted = [];

        turns.forEach((turn, i) => {
            const msg = this.extractTurn(turn, i);
            if (msg) extracted.push(msg);
        });

        // Restore state (don't double-dispatch already captured turns)
        this.capturedTurnHashes = oldHashes;
        this.capturedTurnCount = oldCount;

        return extracted;
    }

    // ══════════════════════════════════════════════
    // MUTATION HANDLING
    // ══════════════════════════════════════════════

    onMutation(mutations) {
        // Check if streaming is happening (stop button visible)
        const isStreaming = !!document.querySelector(this.selectors.streamingIndicator);

        if (isStreaming) {
            // While streaming, keep resetting the debounce timer
            this.isStreaming = true;
            this.resetDebounce();
            return;
        }

        // Streaming just stopped, or regular DOM update
        if (this.isStreaming) {
            this.isStreaming = false;
            // Streaming just ended — wait the full debounce then extract
            this.resetDebounce();
            return;
        }

        // Regular mutation (user typed, pasted, etc.)
        this.resetDebounce();
    }

    resetDebounce() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            this.onSettle();
        }, this.config.debounceMs);
    }

    /**
     * Called when DOM has settled (no mutations for debounceMs).
     * This is the extraction trigger.
     */
    onSettle() {
        const now = Date.now();
        if (now - this.lastExtractionTime < this.config.minIntervalMs) {
            return; // Too soon, skip
        }
        this.lastExtractionTime = now;

        const container = this.findContainer();
        if (!container) return;

        const turns = this.discoverTurns(container);
        const currentCount = turns.length;

        if (currentCount <= this.capturedTurnCount) {
            return; // No new turns
        }

        // Extract only the NEW turns
        const newTurns = turns.slice(this.capturedTurnCount);
        this.log(`📝 ${newTurns.length} new turn(s) detected`);

        newTurns.forEach((turn, offset) => {
            const index = this.capturedTurnCount + offset;
            const msg = this.extractTurn(turn, index);

            if (msg) {
                // Deduplicate by content hash
                const hash = this.hashContent(msg.content);
                if (this.capturedTurnHashes.has(hash)) {
                    this.log('⏭️ Skipping duplicate turn', { index, hash: hash.slice(0, 8) });
                    return;
                }
                this.capturedTurnHashes.add(hash);

                // Dispatch
                this.dispatchTurn(msg);
            }
        });

        this.capturedTurnCount = currentCount;
    }

    // ══════════════════════════════════════════════
    // TURN DISCOVERY & EXTRACTION
    // ══════════════════════════════════════════════

    findContainer() {
        for (const sel of this.selectors.containers) {
            const el = document.querySelector(sel);
            if (el) return el;
        }
        return null;
    }

    discoverTurns(container) {
        const turns = [];
        Array.from(container.children).forEach(child => {
            const hasUser = !!child.querySelector(this.selectors.userMessage);
            const hasAssistant = !!child.querySelector(this.selectors.assistantRoot);

            if (hasUser) {
                turns.push({ element: child, role: 'user' });
            } else if (hasAssistant) {
                turns.push({ element: child, role: 'assistant' });
            }
        });

        // Fallback: direct query
        if (turns.length === 0) {
            const all = document.querySelectorAll(
                `${this.selectors.userMessage}, ${this.selectors.assistantRoot}`
            );
            all.forEach(el => {
                const isUser = el.matches(this.selectors.userMessage);
                turns.push({ element: el, role: isUser ? 'user' : 'assistant' });
            });
        }

        return turns;
    }

    extractTurn(turn, index) {
        if (turn.role === 'user') {
            return this.extractUserTurn(turn.element, index);
        } else {
            return this.extractAssistantTurn(turn.element, index);
        }
    }

    extractUserTurn(wrapper, index) {
        const msgEl = wrapper.querySelector(this.selectors.userMessage) || wrapper;
        const content = this.getCleanText(msgEl);
        if (!content.trim()) return null;

        return {
            id: `turn_${index}`,
            role: 'user',
            content: content,
            timestamp: new Date().toISOString(),
            turnIndex: index,
            sessionId: this.sessionId,
            conversationUrl: this.conversationUrl,
            platform: this.config.platform,
            wordCount: content.split(/\s+/).filter(Boolean).length
        };
    }

    extractAssistantTurn(wrapper, index) {
        const respRoot = wrapper.querySelector(this.selectors.assistantRoot) || wrapper;

        // Extract thinking
        const thinking = this.extractThinking(respRoot);

        // Extract response body (excluding thinking)
        const content = this.extractResponseBody(respRoot);

        if (!content.trim() && thinking.length === 0) return null;

        return {
            id: `turn_${index}`,
            role: 'assistant',
            content: content,
            thinking: thinking.length > 0 ? thinking : undefined,
            timestamp: new Date().toISOString(),
            turnIndex: index,
            sessionId: this.sessionId,
            conversationUrl: this.conversationUrl,
            platform: this.config.platform,
            wordCount: content.split(/\s+/).filter(Boolean).length,
            thinkingWordCount: thinking.reduce((s, t) => s + (t.content?.split(/\s+/).length || 0), 0)
        };
    }

    extractThinking(respRoot) {
        const blocks = [];
        const buttons = respRoot.querySelectorAll(this.selectors.thinkingButton);

        buttons.forEach((btn, i) => {
            const summary = btn.textContent?.trim() || '';
            const grid = btn.nextElementSibling;
            let text = '';

            if (grid) {
                // Target .font-ui directly (avoids nested .overflow-hidden duplication)
                const fontUi = grid.querySelector('.font-ui');
                if (fontUi) {
                    const md = fontUi.querySelector('.standard-markdown');
                    text = this.getCleanText(md || fontUi);
                } else {
                    const allOH = grid.querySelectorAll('.overflow-hidden');
                    const innermost = allOH.length > 0 ? allOH[allOH.length - 1] : null;
                    if (innermost) text = this.getCleanText(innermost);
                }
            }

            const content = text.trim() || summary;
            if (content) {
                blocks.push({ id: `thinking_${i}`, summary, content });
            }
        });

        return blocks;
    }

    extractResponseBody(respRoot) {
        // Strategy 1: row-start-2 isolation
        const mainGrid = respRoot.querySelector('[class*="grid-rows"]');
        if (mainGrid) {
            const rows = Array.from(mainGrid.children);
            const responseRow = rows.find(r =>
                r.className.includes('row-start-2') ||
                (r.querySelector(this.selectors.responseMarkdown) &&
                 !r.querySelector(this.selectors.thinkingButton))
            );
            if (responseRow) {
                const md = responseRow.querySelector(this.selectors.responseMarkdown);
                if (md) return this.getCleanText(md);
                return this.getCleanText(responseRow);
            }
        }

        // Strategy 2: .standard-markdown not inside thinking
        const allMd = respRoot.querySelectorAll(this.selectors.responseMarkdown);
        for (const md of allMd) {
            const insideThinking = md.closest('.overflow-hidden')?.closest(
                '.grid.transition-\\[grid-template-rows\\]'
            );
            if (!insideThinking) return this.getCleanText(md);
        }

        // Strategy 3: response body class
        const body = respRoot.querySelector(this.selectors.responseBody);
        if (body) return this.getCleanText(body);

        // Strategy 4: full text minus thinking
        return this.getCleanText(respRoot);
    }

    getCleanText(element) {
        if (!element) return '';
        const clone = element.cloneNode(true);
        clone.querySelectorAll(this.selectors.excludeFromText).forEach(el => el.remove());
        let text = clone.innerText || clone.textContent || '';
        text = text
            .replace(/\bDone\b/g, '')
            .replace(/\bCopy\b/g, '')
            .replace(/\bRetry\b/g, '')
            .replace(/\bEdit\b/g, '')
            .replace(/^\s*\d{1,2}:\d{2}\s*(AM|PM)\s*/gmi, '')
            .replace(/^\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s*$/gmi, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        return text;
    }

    // ══════════════════════════════════════════════
    // DISPATCH — Send turns to background + receiver
    // ══════════════════════════════════════════════

    dispatchTurn(turn) {
        this.log('📤 Dispatching turn', { id: turn.id, role: turn.role, words: turn.wordCount });

        // 1. Send to background script (chrome.storage.local)
        this.sendToBackground(turn);

        // 2. POST to local Python receiver (best-effort)
        this.sendToReceiver(turn);
    }

    sendToBackground(turn) {
        try {
            const extApi = typeof chrome !== 'undefined' ? chrome :
                           typeof browser !== 'undefined' ? browser : null;

            if (extApi?.runtime?.sendMessage) {
                extApi.runtime.sendMessage({
                    action: 'turn_captured',
                    turn: turn
                }, (response) => {
                    if (extApi.runtime.lastError) {
                        this.log('⚠️ Background send failed:', extApi.runtime.lastError.message);
                    }
                });
            }
        } catch (err) {
            this.log('⚠️ Background dispatch error:', err.message);
        }
    }

    async sendToReceiver(turn) {
        try {
            const resp = await fetch(this.config.receiverUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(turn)
            });

            if (!resp.ok) {
                this.log('⚠️ Receiver returned', resp.status);
            }
        } catch (err) {
            // Receiver not running — totally fine, this is best-effort
            // Only log once per session to avoid console spam
            if (!this._receiverDownLogged) {
                this.log('ℹ️ Stream receiver not running (this is OK — turns stored in extension)');
                this._receiverDownLogged = true;
            }
        }
    }

    // ══════════════════════════════════════════════
    // CAPTURE EXISTING TURNS (page already has content)
    // ══════════════════════════════════════════════

    captureExistingTurns(container) {
        const turns = this.discoverTurns(container);
        this.log(`📋 Found ${turns.length} existing turns on page`);

        turns.forEach((turn, i) => {
            const msg = this.extractTurn(turn, i);
            if (msg) {
                const hash = this.hashContent(msg.content);
                this.capturedTurnHashes.add(hash);
                this.dispatchTurn(msg);
            }
        });

        this.capturedTurnCount = turns.length;
    }

    // ══════════════════════════════════════════════
    // URL CHANGE DETECTION (SPA navigation)
    // ══════════════════════════════════════════════

    watchUrlChanges() {
        let currentUrl = window.location.href;

        const check = () => {
            if (window.location.href !== currentUrl) {
                const oldUrl = currentUrl;
                currentUrl = window.location.href;
                this.log('🔀 Conversation changed', { from: oldUrl, to: currentUrl });

                // Reset for new conversation
                this.stop();
                this.capturedTurnCount = 0;
                this.capturedTurnHashes.clear();
                this.conversationUrl = currentUrl;
                this.sessionId = this.generateSessionId();
                this._receiverDownLogged = false;

                // Restart after page settles
                setTimeout(() => this.start(), 2000);
            }
        };

        // Patch history API
        const origPush = history.pushState;
        const origReplace = history.replaceState;
        history.pushState = function (...args) {
            origPush.apply(this, args);
            setTimeout(check, 100);
        };
        history.replaceState = function (...args) {
            origReplace.apply(this, args);
            setTimeout(check, 100);
        };
        window.addEventListener('popstate', () => setTimeout(check, 100));

        // Periodic fallback check
        setInterval(check, 3000);
    }

    // ══════════════════════════════════════════════
    // COMPACTION DETECTION
    // ══════════════════════════════════════════════

    watchForCompaction() {
        // Watch for the compaction/summary banner that Claude inserts
        // This is a secondary observer specifically for compaction signals
        const bodyObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== 1) continue;

                    // Check for compaction indicators
                    const text = node.textContent || '';
                    const isCompaction = (
                        text.includes('conversation was summarized') ||
                        text.includes('compacted') ||
                        text.includes('Context was compressed') ||
                        node.querySelector?.(this.selectors.compactionBanner)
                    );

                    if (isCompaction) {
                        this.log('⚠️ COMPACTION DETECTED — triggering full capture');
                        this.onCompaction();
                    }
                }
            }
        });

        bodyObserver.observe(document.body, { childList: true, subtree: true });
    }

    onCompaction() {
        // Emit compaction event with everything we've captured so far
        const event = {
            type: 'compaction_detected',
            sessionId: this.sessionId,
            conversationUrl: this.conversationUrl,
            timestamp: new Date().toISOString(),
            capturedTurns: this.capturedTurnCount
        };

        this.sendToBackground({ ...event, action: 'compaction_detected' });

        try {
            fetch(this.config.receiverUrl.replace('/turn', '/event'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(event)
            }).catch(() => {});
        } catch (e) {
            this.log('Compaction forward failed', e);
        }

        this.log('🚨 Compaction event dispatched');
    }

    // ══════════════════════════════════════════════
    // UTILITIES
    // ══════════════════════════════════════════════

    generateSessionId() {
        const ts = Date.now().toString(36);
        const rand = Math.random().toString(36).slice(2, 8);
        return `tw_${ts}_${rand}`;
    }

    hashContent(text) {
        // Simple FNV-1a hash for deduplication (not crypto)
        let hash = 2166136261;
        for (let i = 0; i < Math.min(text.length, 500); i++) {
            hash ^= text.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16);
    }

    log(...args) {
        if (this.config.debug) {
            console.log('[TurnWatcher]', ...args);
        }
    }
}

// ══════════════════════════════════════════════
// AUTO-START
// ══════════════════════════════════════════════

// Only activate on Claude.ai (extend this for other platforms later)
if (window.location.hostname === 'claude.ai') {
    // Wait for page to be ready, then start
    const startWatcher = () => {
        if (!window._turnWatcher) {
            window._turnWatcher = new TurnWatcher();
            window._turnWatcher.start();
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(startWatcher, 2000));
    } else {
        setTimeout(startWatcher, 2000);
    }
}

// Expose for debugging and manual control
window.TurnWatcher = TurnWatcher;
