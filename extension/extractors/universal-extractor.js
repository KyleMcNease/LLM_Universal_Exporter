/**
 * Universal AI Conversation Extractor
 * Base class for extracting conversations from any AI platform
 */

class UniversalExtractor {
    constructor(platformConfig) {
        this.platform = platformConfig?.platform || 'unknown';
        this.selectors = { ...(platformConfig?.selectors || {}) };
        this.config = platformConfig || {};
        this.version = '1.0.0';
        this.timestamp = new Date().toISOString();
        
        this.exportData = {
            metadata: {
                platform: this.platform,
                url: window.location.href,
                title: this.extractConversationTitle(),
                rawDocumentTitle: document.title,
                exportDate: this.timestamp,
                exporterVersion: this.version,
                userAgent: navigator.userAgent,
                messageCount: 0,
                thinkingBlockCount: 0,
                hasThinkingBlocks: false,
                referenceCount: 0,
                linkCount: 0,
                attachmentCount: 0,
                citationCount: 0
            },
            messages: [],
            thinkingBlocks: [],
            rawHtml: {
                original: null,
                expanded: null
            }
        };
    }

    cleanTitleCandidate(value) {
        if (typeof value !== 'string') return '';
        let title = value.replace(/\s+/g, ' ').trim();
        if (!title) return '';

        // Remove common AI brand suffixes from document titles.
        title = title
            .replace(/\s+[-|:]\s*(ChatGPT|OpenAI)\s*$/i, '')
            .replace(/\s+[-|:]\s*Claude\s*$/i, '')
            .replace(/\s+[-|:]\s*Gemini\s*$/i, '')
            .replace(/\s+[-|:]\s*Perplexity\s*$/i, '')
            .replace(/\s+[-|:]\s*Grok\s*$/i, '')
            .replace(/\s+[-|:]\s*Qwen.*$/i, '')
            .replace(/\s+[-|:]\s*DeepSeek\s*$/i, '')
            .replace(/\s+[-|:]\s*Bing(?:\s+Chat)?\s*$/i, '')
            .trim();

        return title;
    }

    isPlaceholderTitle(value) {
        if (typeof value !== 'string') return true;
        const normalized = value.trim().toLowerCase();
        if (!normalized) return true;
        const placeholders = new Set([
            'chatgpt',
            'claude',
            'gemini',
            'perplexity',
            'grok',
            'qwen',
            'deepseek',
            'bing',
            'new chat',
            'new conversation',
            'untitled',
            'conversation'
        ]);
        return placeholders.has(normalized);
    }

    extractConversationTitle() {
        const selectors = [
            '[data-testid="conversation-title"]',
            '[data-testid*="conversation-title"]',
            '[data-testid*="chat-title"]',
            '[aria-label*="conversation title" i]',
            '.conversation-title',
            '.chat-title',
            '.thread-title',
            'main h1',
            'header h1',
            'h1'
        ];

        for (const selector of selectors) {
            const node = this.safeQuerySelector(selector);
            const text = this.cleanTitleCandidate(node?.textContent || '');
            if (text && !this.isPlaceholderTitle(text) && text.length > 2) {
                return text;
            }
        }

        const ogTitle = this.cleanTitleCandidate(
            document.querySelector('meta[property="og:title"]')?.getAttribute('content') || ''
        );
        if (ogTitle && !this.isPlaceholderTitle(ogTitle)) {
            return ogTitle;
        }

        const docTitle = this.cleanTitleCandidate(document.title || '');
        if (docTitle) {
            return docTitle;
        }

        return 'conversation-export';
    }

    isValidSelector(selector) {
        return typeof selector === 'string' && selector.trim().length > 0;
    }

    getSelector(selector) {
        return this.isValidSelector(selector) ? selector.trim() : null;
    }

    safeQuerySelector(selector, context = document) {
        const validSelector = this.getSelector(selector);
        if (!validSelector) return null;
        try {
            return context.querySelector(validSelector);
        } catch (error) {
            console.warn('⚠️ Invalid selector during extraction:', validSelector, error);
            return null;
        }
    }

    safeQuerySelectorAll(selector, context = document) {
        const validSelector = this.getSelector(selector);
        if (!validSelector) return [];
        try {
            return Array.from(context.querySelectorAll(validSelector));
        } catch (error) {
            console.warn('⚠️ Invalid selector during extraction (all):', validSelector, error);
            return [];
        }
    }

    truncate(text, length = 100) {
        if (typeof text !== 'string') return null;
        if (text.length <= length) return text;
        return `${text.substring(0, length)}...`;
    }

    async extractConversation(options = {}) {
        try {
            console.log('🚀 Starting Universal AI Exporter extraction...', {
                platform: this.platform,
                options
            });
            
            await this.captureOriginalState();
            
            const elements = await this.discoverElements();
            await this.expandElements(elements);
            
            await this.captureExpandedState();
            
            await this.extractContent(elements);
            
            await this.postProcess();
            
            console.log('✅ Extraction complete:', {
                messages: this.exportData.metadata.messageCount,
                thinkingBlocks: this.exportData.metadata.thinkingBlockCount
            });
            
            return this.exportData;
            
        } catch (error) {
            console.error('❌ Extraction failed:', error);
            throw new Error(`Extraction failed: ${error.message}`);
        }
    }
    
    async captureOriginalState() {
        const docClone = document.cloneNode(true);
        this.exportData.rawHtml.original = this.createCompleteHtml(docClone, 'original');
    }
    
    async captureExpandedState() {
        const docClone = document.cloneNode(true);
        this.exportData.rawHtml.expanded = this.createCompleteHtml(docClone, 'expanded');
    }
    
    createCompleteHtml(docClone, version) {
        docClone.querySelectorAll('script').forEach(s => s.remove());
        
        const meta = docClone.createElement('meta');
        meta.name = 'universal-ai-export';
        meta.content = `${version}-${this.timestamp}-${this.platform}`;
        
        if (docClone.head) {
            docClone.head.appendChild(meta);
        }
        
        return '<!DOCTYPE html>\n' + docClone.documentElement.outerHTML;
    }
    
    async discoverElements() {
        const elements = {
            conversation: null,
            messages: [],
            thinkingBlocks: [],
            userMessages: [],
            assistantMessages: []
        };

        elements.conversation = this.safeQuerySelector(this.selectors.conversation);
        if (!elements.conversation) {
            throw new Error('Conversation container not found');
        }

        elements.messages = this.safeQuerySelectorAll(this.selectors.messages, elements.conversation);
        if (elements.messages.length === 0) {
            elements.messages = this.safeQuerySelectorAll(this.selectors.messages);
        }
        elements.messages = this.normalizeMessageElements(elements.messages);

        if (this.selectors.thinkingBlocks) {
            const thinkingSelectors = this.selectors.thinkingBlocks
                .split(',')
                .map(s => s.trim())
                .filter(s => this.isValidSelector(s));
            for (const selector of thinkingSelectors) {
                const blocks = this.safeQuerySelectorAll(selector, elements.conversation);
                elements.thinkingBlocks.push(...blocks);
            }
            elements.thinkingBlocks = [...new Set(elements.thinkingBlocks)];
        }

        if (this.isValidSelector(this.selectors.userMessages)) {
            elements.userMessages = this.safeQuerySelectorAll(this.selectors.userMessages, elements.conversation);
        }

        if (this.isValidSelector(this.selectors.assistantMessages)) {
            elements.assistantMessages = this.safeQuerySelectorAll(this.selectors.assistantMessages, elements.conversation);
        }

        console.log('📊 Elements discovered:', {
            messages: elements.messages.length,
            thinkingBlocks: elements.thinkingBlocks.length,
            userMessages: elements.userMessages.length,
            assistantMessages: elements.assistantMessages.length
        });

        return elements;
    }

    normalizeMessageElements(messageElements) {
        if (!Array.isArray(messageElements) || messageElements.length === 0) {
            return [];
        }

        const unique = [...new Set(messageElements)].filter((el) => el && el.nodeType === Node.ELEMENT_NODE);
        if (unique.length <= 1) {
            return unique;
        }

        const normalized = unique.filter((el) => {
            const text = (el.innerText || el.textContent || '').trim();
            if (!text) return false;

            const tag = (el.tagName || '').toLowerCase();
            if (tag === 'script' || tag === 'style' || tag === 'noscript') {
                return false;
            }

            const dataTestId = el.getAttribute('data-testid') || '';
            if (dataTestId.startsWith('conversation-turn-')) {
                return true;
            }

            const hasRoleOnElement = Boolean(
                el.getAttribute('data-message-author-role') ||
                el.getAttribute('data-author') ||
                el.getAttribute('data-role')
            );
            if (hasRoleOnElement) {
                return true;
            }

            const hasRoleDescendant = Boolean(
                this.safeQuerySelector('[data-message-author-role], [data-author], [data-role]', el)
            );
            if (hasRoleDescendant) {
                return false;
            }

            const containsAnotherMessage = unique.some((other) => other !== el && el.contains(other));
            if (containsAnotherMessage && text.length > 2000) {
                return false;
            }

            return true;
        });

        return normalized.length > 0 ? normalized : unique;
    }

    async expandElements(elements) {
        if (!Array.isArray(elements.thinkingBlocks) || elements.thinkingBlocks.length === 0) {
            return;
        }
        console.log(`🔄 Expanding ${elements.thinkingBlocks.length} thinking blocks...`);
        
        for (let i = 0; i < elements.thinkingBlocks.length; i++) {
            try {
                await this.expandElement(elements.thinkingBlocks[i]);
                await this.wait(100);
            } catch (error) {
                console.warn(`⚠️ Failed to expand block ${i}:`, error);
            }
        }
        
        await this.wait(500);
    }
    
    async expandElement(element) {
        const methods = [
            () => {
                if (element.tagName === 'DETAILS') {
                    element.setAttribute('open', '');
                }
            },
            () => element.click(),
            () => {
                const button = element.querySelector('button');
                if (button) button.click();
            },
            () => {
                const toggle = element.querySelector('[aria-expanded="false"], details:not([open]), button[aria-expanded="false"]');
                if (!toggle) return;
                if (toggle.tagName === 'DETAILS') {
                    toggle.setAttribute('open', '');
                } else {
                    toggle.click();
                }
            },
            () => {
                if (element.getAttribute('aria-expanded') === 'false') {
                    element.setAttribute('aria-expanded', 'true');
                }
            },
            () => {
                const event = new MouseEvent('click', {bubbles: true});
                element.dispatchEvent(event);
            }
        ];
        
        for (const method of methods) {
            try {
                method();
                await this.wait(50);
                
                if (element.getAttribute('aria-expanded') === 'true' ||
                    element.classList.contains('expanded') ||
                    element.hasAttribute('open')) {
                    return;
                }
            } catch (error) {
                console.warn('Expansion method failed:', error);
            }
        }
    }
    
    async extractContent(elements) {
        this.exportData.metadata.messageCount = elements.messages.length;
        this.exportData.metadata.thinkingBlockCount = elements.thinkingBlocks.length;
        this.exportData.metadata.hasThinkingBlocks = elements.thinkingBlocks.length > 0;

        if (elements.messages.length === 0) {
            throw new Error('No messages found during extraction');
        }

        // Chunked message extraction
        const batchSize = 20;
        for (let i = 0; i < elements.messages.length; i += batchSize) {
            const batch = elements.messages.slice(i, i + batchSize);
            batch.forEach((msgEl, batchIndex) => {
                const message = this.extractMessage(msgEl, i + batchIndex);
                if (message) {
                    this.exportData.messages.push(message);
                }
            });
            await this.wait(200); // Throttle to prevent overload
        }
        
        // Extract thinking blocks
        elements.thinkingBlocks.forEach((thinkingEl, index) => {
            const thinking = this.extractThinkingBlock(thinkingEl, index);
            if (thinking) {
                this.exportData.thinkingBlocks.push(thinking);
            }
        });

        this.exportData.messages = this.dedupeMessages(this.exportData.messages);
    }

    dedupeMessages(messages) {
        if (!Array.isArray(messages) || messages.length <= 1) {
            return Array.isArray(messages) ? messages : [];
        }

        const deduped = [];
        let previousSignature = null;

        messages.forEach((message) => {
            const signature = [
                message.author || 'assistant',
                (message.content || '').trim().replace(/\s+/g, ' ').slice(0, 500)
            ].join('|');

            if (signature !== previousSignature) {
                deduped.push(message);
                previousSignature = signature;
            }
        });

        return deduped;
    }
    
    extractMessage(msgEl, index) {
        const author = this.determineAuthor(msgEl);
        const content = this.getTextContent(msgEl);

        if (!content.trim()) {
            return null;
        }

        const message = {
            id: `msg_${index}`,
            author: author,
            content: content,
            html: msgEl.outerHTML,
            timestamp: this.extractTimestamp(msgEl) || new Date().toISOString(),
            wordCount: content.split(/\s+/).length,
            characterCount: content.length
        };

        const embeddedThinking = this.extractEmbeddedThinking(msgEl);
        if (embeddedThinking.length > 0) {
            message.thinkingBlocks = embeddedThinking;
        }

        const references = this.extractReferences(msgEl);
        if (this.hasReferences(references)) {
            message.references = references;
        }

        return message;
    }
    
    extractThinkingBlock(thinkingEl, index) {
        const content = this.getTextContent(thinkingEl);
        
        if (!content.trim()) {
            return null;
        }
        
        return {
            id: `thinking_${index}`,
            content: content,
            html: thinkingEl.outerHTML,
            expanded: thinkingEl.getAttribute('aria-expanded') === 'true',
            wordCount: content.split(/\s+/).length,
            characterCount: content.length
        };
    }
    
    extractEmbeddedThinking(msgEl) {
        const embedded = [];
        
        if (this.selectors.thinkingBlocks) {
            const thinkingSelectors = this.selectors.thinkingBlocks
                .split(',')
                .map(s => s.trim())
                .filter(s => this.isValidSelector(s));

            const thinkingRegex = /Thinking:\s*([\s\S]*?)(?=User:|Assistant:|$)/i; // Heuristic for open-source
            const match = msgEl.textContent.match(thinkingRegex);
            if (match) {
                embedded.push({
                    id: 'embedded_thinking_regex',
                    content: match[1].trim(),
                    html: '',
                    expanded: true
                });
            }

            for (const selector of thinkingSelectors) {
                const blocks = this.safeQuerySelectorAll(selector, msgEl);
                blocks.forEach((block, index) => {
                    const content = this.getTextContent(block);
                    if (content.trim()) {
                        embedded.push({
                            id: `embedded_thinking_${index}`,
                            content: content,
                            html: block.outerHTML,
                            expanded: block.getAttribute('aria-expanded') === 'true'
                        });
                    }
                });
            }
        }

        return embedded;
    }

    determineAuthor(msgEl) {
        // First, check if the element itself matches user/assistant selectors
        if (this.isValidSelector(this.selectors.userMessages) && msgEl.matches(this.selectors.userMessages)) {
            return 'user';
        }

        if (this.isValidSelector(this.selectors.assistantMessages) && msgEl.matches(this.selectors.assistantMessages)) {
            return 'assistant';
        }

        // For turn wrappers, look INSIDE for user/assistant elements
        if (this.isValidSelector(this.selectors.userMessages)) {
            const userEl = this.safeQuerySelector(this.selectors.userMessages, msgEl);
            if (userEl) {
                return 'user';
            }
        }

        if (this.isValidSelector(this.selectors.assistantMessages)) {
            const assistantEl = this.safeQuerySelector(this.selectors.assistantMessages, msgEl);
            if (assistantEl) {
                return 'assistant';
            }
        }

        // Check data attributes on the element
        const authorAttr = msgEl.getAttribute('data-author') ||
                          msgEl.getAttribute('data-message-author-role') ||
                          msgEl.getAttribute('data-role');

        if (authorAttr) {
            return authorAttr.toLowerCase().includes('user') ? 'user' : 'assistant';
        }

        // Text-based heuristics as last resort
        const text = (msgEl.textContent || '').toLowerCase();
        if (text.includes('you:') || text.includes('user:')) {
            return 'user';
        }

        // Heuristic backups for open-source
        const userRegex = /^(You:|User:|Human:)/i;
        if (userRegex.test(text)) return 'user';

        const assistantRegex = /^(AI:|Assistant:|Bot:)/i;
        if (assistantRegex.test(text)) return 'assistant';

        return 'assistant';
    }
    
    getTextContent(element) {
        if (!element) return '';
        return element.innerText || element.textContent || '';
    }

    /**
     * Get response body content, attempting to exclude thinking block content
     * to prevent duplication. Falls back to full content if filtering fails.
     */
    getResponseContent(element) {
        if (!element) return '';

        // For now, just return full content - we'll handle deduplication
        // at the template level by checking if content matches thinking blocks
        return element.innerText || element.textContent || '';
    }

    extractTimestamp(msgEl) {
        const timeSelectors = [
            'time', '.timestamp', '[data-timestamp]', 
            '.time', '.date', '[datetime]'
        ];
        
        for (const selector of timeSelectors) {
            const timeEl = this.safeQuerySelector(selector, msgEl);
            if (timeEl) {
                const time = timeEl.getAttribute('datetime') || 
                           timeEl.getAttribute('data-timestamp') ||
                           timeEl.textContent;
                if (time) {
                    return new Date(time).toISOString();
                }
            }
        }
        
        return null;
    }

    hasReferences(refs) {
        if (!refs || typeof refs !== 'object') return false;
        return ['links', 'attachments', 'documents', 'citations'].some((key) =>
            Array.isArray(refs[key]) && refs[key].length > 0
        );
    }

    getFileExtension(value) {
        if (!value || typeof value !== 'string') return '';
        const clean = value.split('?')[0].split('#')[0];
        const match = clean.match(/\.([a-z0-9]+)$/i);
        return match ? match[1].toLowerCase() : '';
    }

    classifyDocumentType(nameOrUrl) {
        const ext = this.getFileExtension(nameOrUrl);
        if (!ext) return null;

        const docExt = new Set([
            'pdf', 'doc', 'docx', 'txt', 'md', 'rtf', 'odt',
            'csv', 'tsv', 'xls', 'xlsx', 'ppt', 'pptx',
            'json', 'xml', 'yaml', 'yml'
        ]);
        return docExt.has(ext) ? ext : null;
    }

    normalizeAbsoluteUrl(rawUrl) {
        if (!rawUrl || typeof rawUrl !== 'string') return null;
        try {
            const url = new URL(rawUrl, window.location.href);
            return url.href;
        } catch (error) {
            return null;
        }
    }

    dedupeObjectsBySignature(items, buildSignature) {
        const seen = new Set();
        const deduped = [];

        (items || []).forEach((item) => {
            const signature = buildSignature(item);
            if (!signature || seen.has(signature)) return;
            seen.add(signature);
            deduped.push(item);
        });

        return deduped;
    }

    extractReferences(element) {
        const references = {
            links: [],
            attachments: [],
            documents: [],
            citations: []
        };
        if (!element) return references;

        const anchors = this.safeQuerySelectorAll('a[href]', element);
        anchors.forEach((anchor) => {
            const href = this.normalizeAbsoluteUrl(anchor.getAttribute('href'));
            if (!href) return;

            const title = (anchor.innerText || anchor.textContent || '').trim();
            let domain = '';
            try {
                domain = new URL(href).hostname;
            } catch (error) {
                domain = '';
            }

            references.links.push({ url: href, title, domain });

            const docType = this.classifyDocumentType(href) || this.classifyDocumentType(title);
            if (docType) {
                references.documents.push({
                    name: title || href.split('/').pop() || href,
                    url: href,
                    type: docType
                });
            }
        });

        const attachmentSelectors = [
            '[data-file-name]',
            '[data-filename]',
            '[data-testid*="attachment"]',
            '[data-testid*="file"]',
            '.attachment',
            '.file-chip',
            '.uploaded-file'
        ].join(', ');

        const attachmentNodes = this.safeQuerySelectorAll(attachmentSelectors, element);
        attachmentNodes.forEach((node) => {
            const name = (
                node.getAttribute('data-file-name') ||
                node.getAttribute('data-filename') ||
                node.getAttribute('aria-label') ||
                node.innerText ||
                node.textContent ||
                ''
            ).trim();

            const linked = node.tagName === 'A'
                ? this.normalizeAbsoluteUrl(node.getAttribute('href'))
                : this.normalizeAbsoluteUrl(node.querySelector('a[href]')?.getAttribute('href'));

            if (!name && !linked) return;

            const type = this.classifyDocumentType(name || linked || '');
            references.attachments.push({
                name: name || (linked ? linked.split('/').pop() : 'attachment'),
                url: linked || null,
                type: type || 'file'
            });

            if (type) {
                references.documents.push({
                    name: name || (linked ? linked.split('/').pop() : 'document'),
                    url: linked || null,
                    type
                });
            }
        });

        const citationNodes = this.safeQuerySelectorAll(
            '[data-testid*="citation"], [data-testid*="source"], .citation, .reference-link',
            element
        );
        citationNodes.forEach((node) => {
            const text = (node.innerText || node.textContent || '').trim();
            const href = this.normalizeAbsoluteUrl(node.getAttribute('href') || node.querySelector('a[href]')?.getAttribute('href'));
            if (!text && !href) return;
            references.citations.push({ text, url: href || null });
        });

        const rawText = this.getTextContent(element);
        const urlRegex = /\bhttps?:\/\/[^\s<>"')]+/gi;
        const textUrls = rawText.match(urlRegex) || [];
        textUrls.forEach((urlText) => {
            const normalized = this.normalizeAbsoluteUrl(urlText);
            if (!normalized) return;
            let domain = '';
            try {
                domain = new URL(normalized).hostname;
            } catch (error) {
                domain = '';
            }
            references.links.push({
                url: normalized,
                title: '',
                domain
            });

            const docType = this.classifyDocumentType(normalized);
            if (docType) {
                references.documents.push({
                    name: normalized.split('/').pop() || normalized,
                    url: normalized,
                    type: docType
                });
            }
        });

        references.links = this.dedupeObjectsBySignature(
            references.links,
            (item) => `${item.url}|${item.title || ''}`
        );
        references.attachments = this.dedupeObjectsBySignature(
            references.attachments,
            (item) => `${item.name || ''}|${item.url || ''}|${item.type || ''}`
        );
        references.documents = this.dedupeObjectsBySignature(
            references.documents,
            (item) => `${item.name || ''}|${item.url || ''}|${item.type || ''}`
        );
        references.citations = this.dedupeObjectsBySignature(
            references.citations,
            (item) => `${item.text || ''}|${item.url || ''}`
        );

        return references;
    }

    mergeReferences(...referenceSets) {
        const merged = {
            links: [],
            attachments: [],
            documents: [],
            citations: []
        };

        referenceSets.forEach((set) => {
            if (!set || typeof set !== 'object') return;
            merged.links.push(...(set.links || []));
            merged.attachments.push(...(set.attachments || []));
            merged.documents.push(...(set.documents || []));
            merged.citations.push(...(set.citations || []));
        });

        merged.links = this.dedupeObjectsBySignature(merged.links, (item) => `${item.url}|${item.title || ''}`);
        merged.attachments = this.dedupeObjectsBySignature(merged.attachments, (item) => `${item.name || ''}|${item.url || ''}|${item.type || ''}`);
        merged.documents = this.dedupeObjectsBySignature(merged.documents, (item) => `${item.name || ''}|${item.url || ''}|${item.type || ''}`);
        merged.citations = this.dedupeObjectsBySignature(merged.citations, (item) => `${item.text || ''}|${item.url || ''}`);

        return merged;
    }

    buildReferenceIndex() {
        const fromMessages = this.exportData.messages
            .map((message) => message.references)
            .filter(Boolean);
        const referenceIndex = this.mergeReferences(...fromMessages);
        const totals = (
            referenceIndex.links.length +
            referenceIndex.attachments.length +
            referenceIndex.documents.length +
            referenceIndex.citations.length
        );

        return {
            ...referenceIndex,
            total: totals
        };
    }
    
    async postProcess() {
        this.exportData.metadata.messageCount = this.exportData.messages.length;
        this.exportData.metadata.thinkingBlockCount = this.exportData.thinkingBlocks.length;
        this.exportData.metadata.hasThinkingBlocks = this.exportData.thinkingBlocks.length > 0;

        this.exportData.metadata.totalWordCount = this.exportData.messages
            .reduce((sum, msg) => sum + (msg.wordCount || 0), 0);
        
        this.exportData.metadata.totalCharacterCount = this.exportData.messages
            .reduce((sum, msg) => sum + (msg.characterCount || 0), 0);
        
        this.exportData.metadata.userMessageCount = this.exportData.messages
            .filter(msg => msg.author === 'user').length;
        
        this.exportData.metadata.assistantMessageCount = this.exportData.messages
            .filter(msg => msg.author === 'assistant').length;

        const referenceIndex = this.buildReferenceIndex();
        this.exportData.metadata.referenceIndex = referenceIndex;
        this.exportData.metadata.referenceCount = referenceIndex.total;
        this.exportData.metadata.linkCount = referenceIndex.links.length;
        this.exportData.metadata.attachmentCount = referenceIndex.attachments.length;
        this.exportData.metadata.citationCount = referenceIndex.citations.length;
        
        const firstMessageContent = this.exportData.messages[0]?.content;
        const lastMessageContent = this.exportData.messages[this.exportData.messages.length - 1]?.content;

        this.exportData.metadata.conversationSummary = {
            firstMessage: this.truncate(firstMessageContent),
            lastMessage: this.truncate(lastMessageContent),
            duration: this.calculateConversationDuration()
        };
    }
    
    calculateConversationDuration() {
        const messages = this.exportData.messages.filter(msg => msg.timestamp);
        if (messages.length < 2) return null;
        
        const first = new Date(messages[0].timestamp);
        const last = new Date(messages[messages.length - 1].timestamp);
        
        return {
            start: first.toISOString(),
            end: last.toISOString(),
            durationMs: last.getTime() - first.getTime()
        };
    }
    
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    getExportData() {
        return this.exportData;
    }
}

window.UniversalExtractor = UniversalExtractor;
