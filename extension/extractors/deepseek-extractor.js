/**
 * DeepSeek-Specific Conversation Extractor
 * Specialized for deepseek.com with coding focus
 */

class DeepSeekExtractor extends UniversalExtractor {
    constructor(platformConfig) {
        super(platformConfig);
        
        // DeepSeek-specific selectors
        this.deepseekSelectors = {
            conversation: '.chat-window, [role="main"]',
            messages: '.response-container, .chat-entry',
            userMessages: '.user-entry, [data-role="user"]',
            assistantMessages: '.deepseek-response, [data-role="deepseek"]',
            thinkingBlocks: '.computing, [aria-expanded="false"]',
            codeBlocks: 'pre code, .code-block',
            mathBlocks: '.math, .katex',
            messageContent: '.entry-content, .prose'
        };
        
        this.selectors = { ...this.selectors, ...this.deepseekSelectors };
        
        this.exportData.metadata.platform = 'deepseek';
        this.exportData.metadata.deepseekModel = this.detectDeepSeekModel();
        this.exportData.metadata.conversationId = this.extractConversationId();
    }
    
    detectDeepSeekModel() {
        return 'deepseek-coder';
    }
    
    extractConversationId() {
        const urlMatch = window.location.pathname.match(/\/chat\/([a-zA-Z0-9-]+)/);
        return urlMatch ? urlMatch[1] : null;
    }
    
    extractMessage(msgEl, index) {
        const message = super.extractMessage(msgEl, index);
        if (message) {
            message.deepseek = { codeFocus: this.isCodeFocused(msgEl) };
        }
        return message;
    }
    
    isCodeFocused(msgEl) {
        return msgEl.querySelector('pre code') !== null;
    }
}

window.DeepSeekExtractor = DeepSeekExtractor;