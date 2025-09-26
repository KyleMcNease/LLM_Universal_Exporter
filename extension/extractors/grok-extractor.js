/**
 * Grok-Specific Conversation Extractor
 * Specialized for grok.x.ai with real-time features
 */

class GrokExtractor extends UniversalExtractor {
    constructor(platformConfig) {
        super(platformConfig);
        
        // Grok-specific selectors
        this.grokSelectors = {
            conversation: '.conversation-container, [role="main"]',
            messages: '.message, .post-message',
            userMessages: '.user-message, [data-role="user"]',
            assistantMessages: '.grok-message, [data-role="grok"]',
            thinkingBlocks: '.thinking-block, [aria-expanded="false"]',
            codeBlocks: 'pre code, .code-block',
            mathBlocks: '.math, .katex',
            messageContent: '.message-content, .prose'
        };
        
        this.selectors = { ...this.selectors, ...this.grokSelectors };
        
        this.exportData.metadata.platform = 'grok';
        this.exportData.metadata.grokModel = this.detectGrokModel();
        this.exportData.metadata.conversationId = this.extractConversationId();
    }
    
    detectGrokModel() {
        return 'grok-beta';
    }
    
    extractConversationId() {
        const urlMatch = window.location.pathname.match(/\/chat\/([a-zA-Z0-9-]+)/);
        return urlMatch ? urlMatch[1] : null;
    }
    
    extractMessage(msgEl, index) {
        const message = super.extractMessage(msgEl, index);
        if (message) {
            message.grok = { realTimeData: this.extractRealTimeData(msgEl) };
        }
        return message;
    }
    
    extractRealTimeData(msgEl) {
        return msgEl.querySelector('.real-time-info')?.textContent || '';
    }
}

window.GrokExtractor = GrokExtractor;