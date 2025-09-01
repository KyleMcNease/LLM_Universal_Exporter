/**
 * Qwen3-Specific Conversation Extractor
 * Specialized for qwen.aliyun.com with multilingual support
 */

class Qwen3Extractor extends UniversalExtractor {
    constructor(platformConfig) {
        super(platformConfig);
        
        // Qwen3-specific selectors
        this.qwen3Selectors = {
            conversation: '.qwen-chat, [role="main"]',
            messages: '.qwen-message, .chat-item',
            userMessages: '.user-item, [data-role="user"]',
            assistantMessages: '.assistant-reply, [data-role="qwen"]',
            thinkingBlocks: '.reasoning, [aria-expanded="false"]',
            codeBlocks: 'pre code, .code-block',
            mathBlocks: '.math, .katex',
            messageContent: '.item-content, .prose'
        };
        
        this.selectors = { ...this.selectors, ...this.qwen3Selectors };
        
        this.exportData.metadata.platform = 'qwen3';
        this.exportData.metadata.qwen3Model = this.detectQwen3Model();
        this.exportData.metadata.conversationId = this.extractConversationId();
    }
    
    detectQwen3Model() {
        return 'qwen-3';
    }
    
    extractConversationId() {
        const urlMatch = window.location.pathname.match(/\/session\/([a-zA-Z0-9-]+)/);
        return urlMatch ? urlMatch[1] : null;
    }
    
    extractMessage(msgEl, index) {
        const message = super.extractMessage(msgEl, index);
        if (message) {
            message.qwen3 = { language: this.detectLanguage(msgEl) };
        }
        return message;
    }
    
    detectLanguage(msgEl) {
        return msgEl.getAttribute('lang') || 'en';
    }
}

window.Qwen3Extractor = Qwen3Extractor;