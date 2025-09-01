/**
 * Universal AI Conversation Extractor
 * Base class for extracting conversations from any AI platform
 */

class UniversalExtractor {
    constructor(platformConfig) {
        this.platform = platformConfig?.platform || 'unknown';
        this.selectors = platformConfig?.selectors || {};
        this.config = platformConfig || {};
        this.version = '1.0.0';
        this.timestamp = new Date().toISOString();
        
        this.exportData = {
            metadata: {
                platform: this.platform,
                url: window.location.href,
                title: document.title,
                exportDate: this.timestamp,
                exporterVersion: this.version,
                userAgent: navigator.userAgent,
                messageCount: 0,
                thinkingBlockCount: 0,
                hasThinkingBlocks: false
            },
            messages: [],
            thinkingBlocks: [],
            rawHtml: {
                original: null,
                expanded: null
            }
        };
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
        
        elements.conversation = document.querySelector(this.selectors.conversation);
        if (!elements.conversation) {
            throw new Error('Conversation container not found');
        }
        
        elements.messages = Array.from(document.querySelectorAll(this.selectors.messages));
        
        if (this.selectors.thinkingBlocks) {
            const thinkingSelectors = this.selectors.thinkingBlocks.split(',').map(s => s.trim());
            for (const selector of thinkingSelectors) {
                const blocks = Array.from(document.querySelectorAll(selector));
                elements.thinkingBlocks.push(...blocks);
            }
            elements.thinkingBlocks = [...new Set(elements.thinkingBlocks)];
        }
        
        elements.userMessages = Array.from(document.querySelectorAll(this.selectors.userMessages || ''));
        elements.assistantMessages = Array.from(document.querySelectorAll(this.selectors.assistantMessages || ''));
        
        console.log('📊 Elements discovered:', {
            messages: elements.messages.length,
            thinkingBlocks: elements.thinkingBlocks.length,
            userMessages: elements.userMessages.length,
            assistantMessages: elements.assistantMessages.length
        });
        
        return elements;
    }
    
    async expandElements(elements) {
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
            () => element.click(),
            () => {
                const button = element.querySelector('button');
                if (button) button.click();
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
                    element.classList.contains('expanded')) {
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
            const thinkingSelectors = this.selectors.thinkingBlocks.split(',').map(s => s.trim());
            
            const thinkingRegex = /Thinking:\s*([\s\S]*?)(?=User:|Assistant:|$)/i; // Heuristic for open-source
            const match = msgEl.textContent.match(thinkingRegex);
            if (match) {
                embedded.push({
                    id: 'embedded_thinking_regex',
                    content: match[1].trim(),
                    html: '', // No HTML for regex fallback
                    expanded: true
                });
            }
            
            for (const selector of thinkingSelectors) {
                const blocks = msgEl.querySelectorAll(selector);
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
        if (msgEl.matches(this.selectors.userMessages || '')) {
            return 'user';
        }
        
        if (msgEl.matches(this.selectors.assistantMessages || '')) {
            return 'assistant';
        }
        
        const authorAttr = msgEl.getAttribute('data-author') || 
                          msgEl.getAttribute('data-message-author-role') ||
                          msgEl.getAttribute('data-role');
        
        if (authorAttr) {
            return authorAttr.toLowerCase().includes('user') ? 'user' : 'assistant';
        }
        
        const text = msgEl.textContent.toLowerCase();
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
        return element.innerText || element.textContent || '';
    }
    
    extractTimestamp(msgEl) {
        const timeSelectors = [
            'time', '.timestamp', '[data-timestamp]', 
            '.time', '.date', '[datetime]'
        ];
        
        for (const selector of timeSelectors) {
            const timeEl = msgEl.querySelector(selector);
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
    
    async postProcess() {
        this.exportData.metadata.totalWordCount = this.exportData.messages
            .reduce((sum, msg) => sum + (msg.wordCount || 0), 0);
        
        this.exportData.metadata.totalCharacterCount = this.exportData.messages
            .reduce((sum, msg) => sum + (msg.characterCount || 0), 0);
        
        this.exportData.metadata.userMessageCount = this.exportData.messages
            .filter(msg => msg.author === 'user').length;
        
        this.exportData.metadata.assistantMessageCount = this.exportData.messages
            .filter(msg => msg.author === 'assistant').length;
        
        this.exportData.metadata.conversationSummary = {
            firstMessage: this.exportData.messages[0]?.content.substring(0, 100) + '...',
            lastMessage: this.exportData.messages[this.exportData.messages.length - 1]?.content.substring(0, 100) + '...',
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