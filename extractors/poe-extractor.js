/**
 * Poe-Specific Conversation Extractor
 * Specialized for poe.com with multi-model handling
 */

class PoeExtractor extends UniversalExtractor {
    constructor(platformConfig) {
        super(platformConfig);
        
        // Poe-specific selectors (based on common UI patterns)
        this.poeSelectors = {
            conversation: '.chat-container, [role="main"]',
            messages: '.ChatMessage_messageRow__xIMF4, .message-container',
            userMessages: '.user-message, [data-role="user"]',
            assistantMessages: '.bot-message, [data-role="assistant"], .ChatMessage_botMessage__HcCta',
            thinkingBlocks: '.reasoning-block, [data-thinking], [aria-expanded="false"]',
            codeBlocks: 'pre code, .code-block',
            mathBlocks: '.math, .katex',
            messageContent: '.message-text, .prose'
        };
        
        // Override selectors
        this.selectors = { ...this.selectors, ...this.poeSelectors };
        
        // Poe-specific metadata
        this.exportData.metadata.platform = 'poe';
        this.exportData.metadata.poeModel = this.detectPoeModel();
        this.exportData.metadata.conversationId = this.extractConversationId();
    }
    
    detectPoeModel() {
        // Placeholder for model detection
        return 'poe-multi-model';
    }
    
    extractConversationId() {
        // Poe URL patterns
        const urlMatch = window.location.pathname.match(/\/chat\/([a-zA-Z0-9]+)/);
        return urlMatch ? urlMatch[1] : null;
    }
    
    // Inherit and extend other methods as needed
    extractMessage(msgEl, index) {
        const message = super.extractMessage(msgEl, index);
        if (message) {
            // Poe-specific: Check for model tags
            message.poe = { model: this.detectPoeModel() };
        }
        return message;
    }
    
    // Test for thinking blocks inherited from super
}

window.PoeExtractor = PoeExtractor;