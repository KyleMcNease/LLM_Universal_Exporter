/**
 * Manus-Specific Conversation Extractor
 * Specialized for manus.im with agent features
 */

class ManusExtractor extends UniversalExtractor {
    constructor(platformConfig) {
        super(platformConfig);
        
        // Manus-specific selectors (niche, using general patterns)
        this.manusSelectors = {
            conversation: '.agent-chat, [role="main"]',
            messages: '.chat-bubble, .task-message',
            userMessages: '.user-bubble, [data-role="user"]',
            assistantMessages: '.agent-bubble, [data-role="agent"]',
            thinkingBlocks: '.processing, [aria-expanded="false"]',
            codeBlocks: 'pre code, .code-block',
            mathBlocks: '.math, .katex',
            messageContent: '.bubble-text, .prose'
        };
        
        this.selectors = { ...this.selectors, ...this.manusSelectors };
        
        this.exportData.metadata.platform = 'manus';
        this.exportData.metadata.manusModel = this.detectManusModel();
        this.exportData.metadata.conversationId = this.extractConversationId();
    }
    
    detectManusModel() {
        return 'manus-agent';
    }
    
    extractConversationId() {
        const urlMatch = window.location.pathname.match(/\/session\/([a-zA-Z0-9-]+)/);
        return urlMatch ? urlMatch[1] : null;
    }
    
    extractMessage(msgEl, index) {
        const message = super.extractMessage(msgEl, index);
        if (message) {
            message.manus = { taskStatus: this.extractTaskStatus(msgEl) };
        }
        return message;
    }
    
    extractTaskStatus(msgEl) {
        return msgEl.querySelector('.task-status')?.textContent || 'complete';
    }
}

window.ManusExtractor = ManusExtractor;