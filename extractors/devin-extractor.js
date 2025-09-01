/**
 * Devin-Specific Conversation Extractor
 * Specialized for devin.ai with software engineering focus
 */

class DevinExtractor extends UniversalExtractor {
    constructor(platformConfig) {
        super(platformConfig);
        
        // Devin-specific selectors
        this.devinSelectors = {
            conversation: '.devin-chat, [role="main"]',
            messages: '.code-message, .devin-entry',
            userMessages: '.user-code, [data-role="user"]',
            assistantMessages: '.devin-response, [data-role="devin"]',
            thinkingBlocks: '.planning-step, [aria-expanded="false"]',
            codeBlocks: 'pre code, .code-block',
            mathBlocks: '.math, .katex',
            messageContent: '.entry-text, .prose'
        };
        
        this.selectors = { ...this.selectors, ...this.devinSelectors };
        
        this.exportData.metadata.platform = 'devin';
        this.exportData.metadata.devinModel = this.detectDevinModel();
        this.exportData.metadata.conversationId = this.extractConversationId();
    }
    
    detectDevinModel() {
        return 'devin-ai';
    }
    
    extractConversationId() {
        const urlMatch = window.location.pathname.match(/\/demo\/([a-zA-Z0-9-]+)/);
        return urlMatch ? urlMatch[1] : null;
    }
    
    extractMessage(msgEl, index) {
        const message = super.extractMessage(msgEl, index);
        if (message) {
            message.devin = { stepType: this.extractStepType(msgEl) };
        }
        return message;
    }
    
    extractStepType(msgEl) {
        return msgEl.querySelector('.step-label')?.textContent || 'general';
    }
}

window.DevinExtractor = DevinExtractor;