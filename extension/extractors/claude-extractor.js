/**
 * Claude-Specific Conversation Extractor — Enhanced Edition
 * Turn-based extraction for Claude.ai (2026 DOM)
 *
 * Captures the FULL richness of Claude conversations including:
 *   - Extended thinking / reasoning traces
 *   - Web search results with queries, titles, and URLs
 *   - Tool calls with commands, outputs, and error traces
 *   - Code artifacts and file creation
 *   - File edits (diffs)
 *   - Skill/instruction loading
 *
 * DOM Structure (verified Feb 2026):
 *   .mb-1.mt-6.group                      <- Turn wrapper
 *     [data-testid="user-message"]         <- User message text
 *     .font-claude-response                <- Assistant response root
 *       div > div.grid.grid-rows-[auto_auto]
 *         div.row-start-1                  <- COLLAPSIBLE BLOCKS section
 *           button[class*="group/status"]    <- Toggle (one per block)
 *           div.grid.transition-*            <- Collapsible container
 *             div.overflow-hidden            <- Content wrapper
 *               div.font-ui                 <- Extended thinking text
 *               [other structures]           <- Search results, tool output, code, etc.
 *         div.row-start-2                  <- RESPONSE section
 *           .standard-markdown              <- Response body
 *
 * Key insight: .font-ui only exists for extended thinking blocks.
 * Web searches, tool calls, code artifacts, and file edits use different
 * DOM structures inside the same collapsible container. The previous version
 * fell back to button summary text when .font-ui was absent, losing all the
 * rich content. This version uses getBlockText() with minimal stripping to
 * capture ALL content from every block type.
 */

class ClaudeExtractor extends UniversalExtractor {
    constructor(platformConfig) {
        super(platformConfig);

        this.claude = {
            // Turn-level
            turnWrapper:      '.mb-1.mt-6.group',

            // User
            userMessage:      '[data-testid="user-message"]',

            // Assistant root
            assistantRoot:    '.font-claude-response',

            // Collapsible blocks (inside assistant root)
            thinkingButton:   'button[class*="group/status"]',
            thinkingGrid:     '.grid.transition-\\[grid-template-rows\\]',
            thinkingContent:  '.overflow-hidden .font-ui, .overflow-hidden .flex.flex-col.font-ui',
            thinkingRow:      '[class*="row-start-1"]',

            // Response body (inside assistant root)
            responseRow:      '[class*="row-start-2"]',
            responseMarkdown: '.standard-markdown',
            responseBody:     '.font-claude-response-body',

            // Elements to EXCLUDE from RESPONSE text (aggressive — clean output)
            excludeFromText: [
                'button',
                'time',
                '.timestamp',
                '[data-timestamp]',
                '.text-text-500.text-xs',
                '.text-text-400',
                'svg',
                '.sr-only',
                '[class*="action"]',
                '[class*="feedback"]',
                '[class*="copy"]'
            ].join(','),

            // Elements to EXCLUDE from BLOCK content (minimal — preserve everything)
            excludeFromBlock: [
                'svg',
                '.sr-only',
                '[class*="feedback"]',
                'button[aria-label*="opy"]',
                'button[aria-label*="lose"]',
            ].join(','),

            // Code & artifacts
            codeBlocks:    'pre code, .code-block, .standard-markdown pre',
            artifacts:     '[data-testid="artifact"], .artifact-container',
            mathBlocks:    '.math-block, .katex'
        };

        this.exportData.metadata.platform = 'claude';
        this.exportData.artifacts = [];
        this.exportData.codeBlocks = [];
    }

    // ================================================================
    //  MAIN EXTRACTION PIPELINE
    // ================================================================

    async extractConversation(options = {}) {
        try {
            console.log('🚀 Claude Extractor (Enhanced): Starting turn-based extraction...');

            await this.hydrateConversationHistory();

            await this.captureOriginalState();

            // Step 1 — expand ALL collapsible blocks before extraction
            await this.expandAllThinkingBlocks();
            await this.captureExpandedState();

            // Step 2 — walk turns in DOM order
            const turns = this.discoverTurns();
            console.log(`📊 Found ${turns.length} conversation turns`);

            // Step 3 — extract each turn
            turns.forEach((turn, index) => {
                const message = this.extractTurn(turn, index);
                if (message) {
                    this.exportData.messages.push(message);
                }
            });

            // Step 4 — metadata
            this.exportData.metadata.messageCount = this.exportData.messages.length;
            this.exportData.metadata.thinkingBlockCount = this.exportData.thinkingBlocks.length;
            this.exportData.metadata.hasThinkingBlocks = this.exportData.thinkingBlocks.length > 0;

            await this.postProcess();

            const typeCounts = this.summarizeBlockTypes();
            console.log('✅ Claude extraction complete:', {
                messages: this.exportData.messages.length,
                thinkingBlocks: this.exportData.thinkingBlocks.length,
                blockTypes: typeCounts,
                userMessages: this.exportData.messages.filter(m => m.author === 'user').length,
                assistantMessages: this.exportData.messages.filter(m => m.author === 'assistant').length
            });

            return this.exportData;

        } catch (error) {
            console.error('❌ Claude extraction failed:', error);
            throw new Error(`Claude extraction failed: ${error.message}`);
        }
    }

    // ================================================================
    //  STEP 1: EXPAND ALL COLLAPSIBLE BLOCKS
    // ================================================================

    async expandAllThinkingBlocks() {
        const buttons = document.querySelectorAll(this.claude.thinkingButton);
        console.log(`🧠 Found ${buttons.length} collapsible block toggles`);

        for (const btn of buttons) {
            if (!btn.closest(this.claude.assistantRoot)) continue;

            try {
                const grid = btn.nextElementSibling;
                const contentEl = grid?.querySelector('.overflow-hidden');

                if (contentEl) {
                    const style = window.getComputedStyle(contentEl);
                    const isCollapsed = style.maxHeight === '0px' ||
                                        style.height === '0px' ||
                                        contentEl.scrollHeight === 0;

                    if (isCollapsed) {
                        btn.click();
                        await this.wait(250);
                    }
                } else {
                    // No .overflow-hidden found — click anyway, DOM may differ
                    btn.click();
                    await this.wait(250);
                }
            } catch (err) {
                console.warn('⚠️ Failed to expand block:', err);
            }
        }

        // Extra time for animations and lazy-loaded content
        await this.wait(500);
    }

    // ================================================================
    //  STEP 2: DISCOVER TURNS
    // ================================================================

    discoverTurns() {
        const turns = [];

        const container = document.querySelector(
            '.flex-1.flex.flex-col.px-4.max-w-3xl'
        ) || document.querySelector('.max-w-3xl.mx-auto');

        if (container) {
            Array.from(container.children).forEach(child => {
                const hasUser = !!child.querySelector(this.claude.userMessage);
                const hasAssistant = !!child.querySelector(this.claude.assistantRoot);

                if (hasUser) {
                    turns.push({ element: child, role: 'user' });
                } else if (hasAssistant) {
                    turns.push({ element: child, role: 'assistant' });
                }
            });
        }

        if (turns.length === 0) {
            console.log('⚠️ Container walk found 0 turns, falling back to querySelectorAll');
            const all = document.querySelectorAll(
                `${this.claude.userMessage}, ${this.claude.assistantRoot}`
            );
            all.forEach(el => {
                const isUser = el.matches(this.claude.userMessage);
                turns.push({ element: el, role: isUser ? 'user' : 'assistant' });
            });
        }

        return turns;
    }

    // ================================================================
    //  STEP 3: EXTRACT INDIVIDUAL TURNS
    // ================================================================

    extractTurn(turn, index) {
        if (turn.role === 'user') {
            return this.extractUserTurn(turn.element, index);
        } else {
            return this.extractAssistantTurn(turn.element, index);
        }
    }

    extractUserTurn(wrapper, index) {
        const msgEl = wrapper.querySelector
            ? wrapper.querySelector(this.claude.userMessage) || wrapper
            : wrapper;

        const content = this.getCleanText(msgEl);
        if (!content.trim()) return null;

        const references = this.extractReferences(msgEl);

        const message = {
            id: `msg_${index}`,
            author: 'user',
            content: content,
            html: msgEl.outerHTML,
            timestamp: this.extractTimestamp(wrapper) || new Date().toISOString(),
            wordCount: content.split(/\s+/).filter(Boolean).length,
            characterCount: content.length
        };

        if (this.hasReferences(references)) {
            message.references = references;
        }

        return message;
    }

    extractAssistantTurn(wrapper, index) {
        const respRoot = wrapper.querySelector
            ? wrapper.querySelector(this.claude.assistantRoot) || wrapper
            : wrapper;

        // Extract all collapsible blocks (thinking, search, tool calls, etc.)
        const thinkingData = this.extractBlocksFromResponse(respRoot);

        // Extract response body (EXCLUDING collapsible blocks)
        const responseContent = this.extractResponseBody(respRoot);

        if (!responseContent.trim() && thinkingData.length === 0) return null;

        // Store blocks in top-level array
        thinkingData.forEach(t => {
            this.exportData.thinkingBlocks.push(t);
        });

        const message = {
            id: `msg_${index}`,
            author: 'assistant',
            content: responseContent,
            html: respRoot.outerHTML,
            timestamp: this.extractTimestamp(wrapper) || new Date().toISOString(),
            wordCount: responseContent.split(/\s+/).filter(Boolean).length,
            characterCount: responseContent.length
        };

        if (thinkingData.length > 0) {
            message.thinkingBlocks = thinkingData;
        }

        const blockReferenceSets = thinkingData
            .map((block) => block.references)
            .filter(Boolean);
        const mergedReferences = this.mergeReferences(
            this.extractReferences(respRoot),
            ...blockReferenceSets
        );
        if (this.hasReferences(mergedReferences)) {
            message.references = mergedReferences;
        }

        message.claude = {
            codeBlocks: this.extractCodeBlocks(respRoot),
            hasArtifacts: !!respRoot.querySelector(this.claude.artifacts)
        };

        return message;
    }

    // ================================================================
    //  COLLAPSIBLE BLOCK EXTRACTION (the core enhancement)
    // ================================================================

    /**
     * Extract ALL collapsible blocks from an assistant response.
     * Each block may be: extended thinking, web search, tool call, code, or file edit.
     */
    extractBlocksFromResponse(respRoot) {
        const blocks = [];
        const buttons = respRoot.querySelectorAll(this.claude.thinkingButton);

        buttons.forEach((btn, i) => {
            const summary = btn.textContent?.trim() || '';
            const grid = btn.nextElementSibling;

            const block = this.extractSingleBlock(grid, summary, i);
            if (block) {
                blocks.push(block);
            }
        });

        return blocks;
    }

    /**
     * Extract rich content from a single collapsible block.
     * Uses multiple strategies to find content, then detects type and
     * parses structured data where possible.
     */
    extractSingleBlock(container, summary, index) {
        let content = '';
        let richHtml = '';

        if (container) {
            // ── Strategy 1: .font-ui (extended thinking text) ──
            const fontUi = container.querySelector('.font-ui');
            if (fontUi) {
                const md = fontUi.querySelector('.standard-markdown');
                const source = md || fontUi;
                content = this.getCleanText(source);
                richHtml = this.getBlockHtml(source);
            }

            // ── Strategy 2: .overflow-hidden with BLOCK text (preserves content) ──
            // This is the key fix: web search results, tool call outputs, code,
            // etc. do NOT use .font-ui. We use getBlockText() which does NOT
            // strip buttons or content-bearing elements.
            if (!content.trim()) {
                const overflows = container.querySelectorAll('.overflow-hidden');
                for (const oh of overflows) {
                    if (oh.scrollHeight === 0) continue;

                    const text = this.getBlockText(oh);
                    if (text.trim()) {
                        content = text;
                        richHtml = this.getBlockHtml(oh);
                        break;
                    }
                }
            }

            // ── Strategy 3: entire container ──
            if (!content.trim()) {
                content = this.getBlockText(container);
                richHtml = this.getBlockHtml(container);
            }
        }

        // Detect what type of block this is
        const type = this.detectBlockType(content, summary, richHtml);

        // Parse structured data for specific types
        let structuredData = null;
        if (type === 'web_search') {
            structuredData = this.parseWebSearchContent(content, richHtml);
        } else if (type === 'tool_call') {
            structuredData = this.parseToolCallContent(content);
        } else if (type === 'prompt_chain') {
            structuredData = this.parsePromptChainContent(content);
        }

        // Fall back to summary ONLY if truly empty
        const finalContent = content.trim() || summary;
        if (!finalContent) return null;

        return {
            id: `thinking_${index}`,
            type: type,
            summary: summary,
            content: finalContent,
            richHtml: richHtml,
            structuredData: structuredData,
            references: this.extractReferences(container),
            expanded: true,
            wordCount: finalContent.split(/\s+/).filter(Boolean).length,
            characterCount: finalContent.length
        };
    }

    // ================================================================
    //  TEXT EXTRACTION METHODS
    // ================================================================

    /**
     * getBlockText — MINIMAL stripping for collapsible block content.
     *
     * Unlike getCleanText(), this does NOT strip buttons (which may be search
     * result entries), does NOT strip links, and does NOT remove "Done",
     * "Output", etc. which are meaningful status indicators in tool calls.
     *
     * It preserves:
     *   - Button text (search result titles rendered as buttons)
     *   - Links with URLs (converted to text + URL)
     *   - Code blocks (converted to fenced markdown)
     *   - Status text like "Done", "Output", "Error"
     *   - All structural content
     */
    getBlockText(element) {
        if (!element) return '';

        const clone = element.cloneNode(true);

        // Remove ONLY definitively non-content UI elements
        clone.querySelectorAll(this.claude.excludeFromBlock).forEach(el => el.remove());

        // Convert <a href="..."> to "text (url)" so URLs survive innerText
        clone.querySelectorAll('a[href]').forEach(a => {
            const href = a.getAttribute('href');
            const text = a.textContent?.trim();
            if (href && text && href.startsWith('http')) {
                const marker = document.createTextNode(`${text} (${href})`);
                a.replaceWith(marker);
            }
        });

        // Convert code blocks to fenced markdown so they survive innerText
        clone.querySelectorAll('pre code, pre').forEach(pre => {
            const code = pre.textContent || '';
            const lang = pre.className?.match(/language-(\w+)/)?.[1] || '';
            const marker = document.createTextNode(
                `\n\`\`\`${lang}\n${code}\n\`\`\`\n`
            );
            pre.replaceWith(marker);
        });

        let text = clone.innerText || clone.textContent || '';

        // Very light cleanup — only collapse extreme whitespace
        text = text
            .replace(/\n{4,}/g, '\n\n\n')
            .trim();

        return text;
    }

    /**
     * getBlockHtml — Extract preserved HTML from a block for rich rendering.
     * Strips only UI chrome, keeps links, code, headings, structure.
     */
    getBlockHtml(element) {
        if (!element) return '';

        const clone = element.cloneNode(true);

        // Remove UI chrome only
        clone.querySelectorAll(this.claude.excludeFromBlock).forEach(el => el.remove());

        // Strip inline styles that would break export layout
        clone.querySelectorAll('[style]').forEach(el => {
            const display = el.style.display;
            const visibility = el.style.visibility;
            el.removeAttribute('style');
            if (display === 'none') el.style.display = 'none';
            if (visibility === 'hidden') el.style.visibility = 'hidden';
        });

        return clone.innerHTML || '';
    }

    /**
     * getCleanText — AGGRESSIVE stripping for response body text.
     * Strips all buttons, timestamps, icons, etc.
     * Used for the main response body, NOT for collapsible block content.
     */
    getCleanText(element) {
        if (!element) return '';

        const clone = element.cloneNode(true);
        clone.querySelectorAll(this.claude.excludeFromText).forEach(el => el.remove());

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

    // ================================================================
    //  BLOCK TYPE DETECTION
    // ================================================================

    /**
     * Detect the type of a collapsible block from its content and summary.
     * Returns: 'thinking' | 'web_search' | 'tool_call' | 'code' | 'file_edit'
     */
    detectBlockType(content, summary, richHtml) {
        const lower = (content || '').toLowerCase();
        const sumLower = (summary || '').toLowerCase();
        const html = (richHtml || '').toLowerCase();

        // ── Web search ──
        if (lower.includes('searched the web') ||
            lower.includes('search results') ||
            sumLower.includes('searched') ||
            this.looksLikeSearchResults(content, summary) ||
            (html.includes('href=') && this.countDomains(lower) >= 3)) {
            return 'web_search';
        }

        // ── Tool call ──
        if (sumLower.match(/^(ran |created |viewed |read |edited |wrote |deleted |executed |installed |checked )/i) ||
            sumLower.match(/^(find |check |test |run |get |install |search )/i) ||
            lower.match(/\noutput\n/i) ||
            lower.includes('```bash') ||
            lower.includes('```shell') ||
            (lower.includes('$ ') && lower.includes('\n'))) {
            return 'tool_call';
        }

        // ── Prompt chains / instruction traces ──
        if (sumLower.includes('prompt chain') ||
            sumLower.includes('prompt') ||
            sumLower.includes('system prompt') ||
            lower.includes('system prompt') ||
            lower.includes('instruction chain') ||
            lower.includes('prompt chain')) {
            return 'prompt_chain';
        }

        // ── File edit ──
        if (sumLower.match(/^\+\d+.*-\d+/) ||
            lower.match(/^\+\d+-\d+/)) {
            return 'file_edit';
        }

        // ── Code / artifact ──
        if (sumLower.match(/\.(js|ts|py|rs|go|java|css|html|json|yaml|toml|md|jsx|tsx|vue|svelte)\b/) ||
            (lower.includes('```') && lower.split('```').length > 2)) {
            return 'code';
        }

        return 'thinking';
    }

    /**
     * Heuristic: does the summary look like concatenated search result titles?
     */
    looksLikeSearchResults(content, summary) {
        if (!summary || summary.length < 80) return false;

        const capitals = (summary.match(/[A-Z][a-z]+/g) || []).length;
        const words = summary.split(/\s+/).length;
        if (capitals / Math.max(words, 1) > 0.5 && words > 10) return true;

        const domains = this.countDomains(summary);
        if (domains >= 2) return true;

        if (summary.endsWith('Done') && summary.length > 100) return true;

        return false;
    }

    /**
     * Count domain-like patterns in text (e.g., "github.com", "arxiv.org").
     */
    countDomains(text) {
        return (text.match(/[\w-]+\.(com|org|net|io|ai|edu|gov|dev|app|co)\b/gi) || []).length;
    }

    // ================================================================
    //  STRUCTURED DATA PARSING
    // ================================================================

    /**
     * Parse web search content into structured results.
     */
    parseWebSearchContent(content, richHtml) {
        const data = { queries: [], results: [] };
        if (!content) return data;

        // Extract search queries (text before "N results")
        const queryMatches = content.match(/(?:^|\n)(.+?)\n\s*\d+\s+results?\b/gmi);
        if (queryMatches) {
            queryMatches.forEach(m => {
                const parts = m.trim().split('\n');
                if (parts.length >= 1) {
                    const q = parts[0].replace(/^searched\s+(the\s+web\s+)?/i, '').trim();
                    if (q) data.queries.push(q);
                }
            });
        }

        // Extract results from HTML links
        if (richHtml) {
            const linkPattern = /href="(https?:\/\/[^"]+)"[^>]*>([^<]*)</gi;
            let match;
            while ((match = linkPattern.exec(richHtml)) !== null) {
                const url = match[1];
                const title = match[2].trim();
                if (title && url) {
                    data.results.push({ title, url });
                }
            }
        }

        // Fallback: parse title + domain patterns from text
        if (data.results.length === 0) {
            const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
            for (let i = 0; i < lines.length - 1; i++) {
                const nextLine = lines[i + 1];
                if (nextLine && nextLine.match(/^[\w.-]+\.\w{2,4}$/)) {
                    data.results.push({
                        title: lines[i],
                        domain: nextLine
                    });
                    i++;
                }
            }
        }

        return data;
    }

    /**
     * Parse tool call content into structured command/output.
     */
    parseToolCallContent(content) {
        const data = { description: '', commands: [], outputs: [] };
        if (!content) return data;

        // Extract fenced code blocks (likely commands)
        const codeBlocks = content.match(/```(?:bash|shell|sh)?\n([\s\S]*?)```/g);
        if (codeBlocks) {
            codeBlocks.forEach(block => {
                const cmd = block.replace(/```(?:bash|shell|sh)?\n/, '').replace(/```$/, '').trim();
                data.commands.push(cmd);
            });
        }

        // Extract output sections
        const outputParts = content.split(/\nOutput\n/i);
        if (outputParts.length > 1) {
            for (let i = 1; i < outputParts.length; i++) {
                // Output ends at next code block or end
                const output = outputParts[i].split(/```/)[0].trim();
                if (output) data.outputs.push(output);
            }
        }

        // First meaningful line is often the description
        const firstLine = content.split('\n').find(l => l.trim() && !l.trim().startsWith('```'));
        if (firstLine) {
            data.description = firstLine.trim();
        }

        return data;
    }

    parsePromptChainContent(content) {
        const data = { steps: [] };
        if (!content) return data;

        const lines = content
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);

        lines.forEach((line) => {
            const stepMatch = line.match(/^(\d+[).]|[-*])\s*(.+)$/);
            if (stepMatch) {
                data.steps.push(stepMatch[2]);
            }
        });

        if (data.steps.length === 0 && lines.length > 0) {
            data.steps = lines.slice(0, 12);
        }

        return data;
    }

    // ================================================================
    //  RESPONSE BODY EXTRACTION
    // ================================================================

    extractResponseBody(respRoot) {
        // Strategy 1: Find response row (row-start-2)
        const mainGrid = respRoot.querySelector('[class*="grid-rows"]');
        if (mainGrid) {
            const rows = Array.from(mainGrid.children);
            const responseRow = rows.find(r =>
                r.className.includes('row-start-2') ||
                (r.querySelector(this.claude.responseMarkdown) &&
                 !r.querySelector(this.claude.thinkingButton))
            );

            if (responseRow) {
                const md = responseRow.querySelector(this.claude.responseMarkdown);
                if (md) return this.getCleanText(md);
                return this.getCleanText(responseRow);
            }
        }

        // Strategy 2: .standard-markdown NOT inside thinking
        const allMarkdown = respRoot.querySelectorAll(this.claude.responseMarkdown);
        for (const md of allMarkdown) {
            const isInsideThinking = md.closest('.overflow-hidden')?.closest(
                '.grid.transition-\\[grid-template-rows\\]'
            );
            if (!isInsideThinking) {
                return this.getCleanText(md);
            }
        }

        // Strategy 3: .font-claude-response-body
        const responseBody = respRoot.querySelector(this.claude.responseBody);
        if (responseBody) {
            return this.getCleanText(responseBody);
        }

        // Strategy 4: full text minus block text
        const fullText = this.getCleanText(respRoot);
        const blockTexts = this.extractBlocksFromResponse(respRoot).map(t => t.content);

        let result = fullText;
        for (const bt of blockTexts) {
            result = result.replace(bt, '');
        }
        return result.trim();
    }

    // ================================================================
    //  CODE BLOCK EXTRACTION
    // ================================================================

    extractCodeBlocks(container) {
        const blocks = [];
        const codeElements = container.querySelectorAll(this.claude.codeBlocks);

        codeElements.forEach((codeEl, index) => {
            const language = this.detectCodeLanguage(codeEl);
            blocks.push({
                id: `code_${index}`,
                language,
                content: codeEl.textContent || ''
            });
            this.exportData.codeBlocks.push(blocks[blocks.length - 1]);
        });

        return blocks;
    }

    detectCodeLanguage(codeEl) {
        const classList = codeEl.className;
        const langMatch = classList.match(/language-(\w+)/);
        if (langMatch) return langMatch[1];

        const parent = codeEl.parentElement;
        if (parent) {
            const parentMatch = parent.className.match(/language-(\w+)/);
            if (parentMatch) return parentMatch[1];
        }

        return 'text';
    }

    // ================================================================
    //  TIMESTAMP EXTRACTION
    // ================================================================

    extractTimestamp(turnEl) {
        const timeSelectors = ['time', '[datetime]', '[data-timestamp]'];
        for (const sel of timeSelectors) {
            const el = turnEl.querySelector?.(sel);
            if (el) {
                const dt = el.getAttribute('datetime') || el.getAttribute('data-timestamp');
                if (dt) {
                    try { return new Date(dt).toISOString(); } catch (e) { /* skip */ }
                }
            }
        }
        return null;
    }

    // ================================================================
    //  POST-PROCESSING & ANALYTICS
    // ================================================================

    async postProcess() {
        await super.postProcess();

        this.exportData.metadata.claude = {
            codeBlockCount: this.exportData.codeBlocks.length,
            thinkingIntensity: this.calculateThinkingIntensity(),
            conversationType: this.determineConversationType(),
            blockTypeBreakdown: this.summarizeBlockTypes()
        };
    }

    calculateThinkingIntensity() {
        const total = this.exportData.messages.length;
        const withThinking = this.exportData.messages.filter(m =>
            m.thinkingBlocks && m.thinkingBlocks.length > 0
        ).length;

        const thinkingWords = this.exportData.thinkingBlocks
            .reduce((sum, b) => sum + (b.wordCount || 0), 0);
        const totalWords = this.exportData.metadata.totalWordCount || 1;

        return {
            thinkingRatio: withThinking / Math.max(total, 1),
            thinkingWordRatio: thinkingWords / totalWords,
            averageThinkingLength: thinkingWords / Math.max(this.exportData.thinkingBlocks.length, 1)
        };
    }

    summarizeBlockTypes() {
        const counts = { thinking: 0, web_search: 0, tool_call: 0, prompt_chain: 0, code: 0, file_edit: 0 };
        this.exportData.thinkingBlocks.forEach(b => {
            const type = b.type || 'thinking';
            counts[type] = (counts[type] || 0) + 1;
        });
        return counts;
    }

    determineConversationType() {
        const hasCode = this.exportData.codeBlocks.length > 0;
        const hasThinking = this.exportData.thinkingBlocks.length > 0;
        const hasSearch = this.exportData.thinkingBlocks.some(b => b.type === 'web_search');
        const hasToolCalls = this.exportData.thinkingBlocks.some(b => b.type === 'tool_call');

        if (hasCode || hasToolCalls) return 'development';
        if (hasSearch) return 'research';
        if (hasThinking) return 'reasoning';
        return 'general';
    }
}

window.ClaudeExtractor = ClaudeExtractor;
