/**
 * Llama-Specific Conversation Extractor
 * Specialized for llama.meta.com or hosted interfaces
 */

class LlamaExtractor extends UniversalExtractor {
    constructor(platformConfig) {
        super(platformConfig);
        
        // Llama-specific selectors (often Hugging Face style)
        this.llamaSelectors = {
            conversation: '.chat-interface, [role="main"]',
            messages: '.message-text, .chat-message',
            userMessages: '.prompt-message, [data-role="user"]',
            assistantMessages: '.response-message, [data-role="llama"]',
            thinkingBlocks: '.generation-indicator, [aria-expanded="false"]',
            codeBlocks: 'pre code, .code-block',
            mathBlocks: '.math, .katex',
            messageContent: '.message-body, .prose'
        };
        
        this.selectors = { ...this.selectors, ...this.llamaSelectors };
        
        this.exportData.metadata.platform = 'llama';
        this.exportData.metadata.llamaModel = this.detectLlamaModel();
        this.exportData.metadata.conversationId = this.extractConversationId();
    }
    
    detectLlamaModel() {
        return 'llama-3';
    }
    
    extractConversationId() {
        const urlMatch = window.location.search.match(/session=([a-zA-Z0-9-]+)/);
        return urlMatch ? urlMatch[1] : null;
    }
    
    extractMessage(msgEl, index) {
        const message = super.extractMessage(msgEl, index);
        if (message) {
            message.llama = { generationParams: this.extractGenerationParams(msgEl) };
        }
        return message;
    }
    
    extractGenerationParams(msgEl) {
        return msgEl.querySelector('.params')?.textContent || '';
    }
}

window.LlamaExtractor = LlamaExtractor;