/**
 * Bing-Specific Conversation Extractor
 * Specialized for bing.com/chat with Copilot features
 */

class BingExtractor extends UniversalExtractor {
    constructor(platformConfig) {
        super(platformConfig);
        
        // Bing-specific selectors
        this.bingSelectors = {
            conversation: '#b_sydConvCont, .cib-serp-main',
            messages: '.ac-textBlock, .item',
            userMessages: '.from-user, [data-role="user"]',
            assistantMessages: '.from-bot, [data-role="assistant"]',
            thinkingBlocks: '.thinking, [aria-expanded="false"]',
            codeBlocks: 'pre code, .code-block',
            mathBlocks: '.math, .katex',
            messageContent: '.message-text, .prose'
        };
        
        this.selectors = { ...this.selectors, ...this.bingSelectors };
        
        this.exportData.metadata.platform = 'bing';
        this.exportData.metadata.bingModel = this.detectBingModel();
        this.exportData.metadata.conversationId = this.extractConversationId();
    }
    
    detectBingModel() {
        return 'copilot-model';
    }
    
    extractConversationId() {
        const urlMatch = window.location.search.match(/chatId=([a-zA-Z0-9-]+)/);
        return urlMatch ? urlMatch[1] : null;
    }
    
    extractMessage(msgEl, index) {
        const message = super.extractMessage(msgEl, index);
        if (message) {
            message.bing = { mode: this.detectBingMode(msgEl) };
        }
        return message;
    }
    
    detectBingMode(msgEl) {
        return msgEl.querySelector('.mode-indicator')?.textContent || 'balanced';
    }
}

window.BingExtractor = BingExtractor;