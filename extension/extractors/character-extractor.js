/**
 * Character.ai-Specific Conversation Extractor
 * Specialized for character.ai with character-based chats
 */

class CharacterExtractor extends UniversalExtractor {
    constructor(platformConfig) {
        super(platformConfig);
        
        // Character.ai-specific selectors
        this.characterSelectors = {
            conversation: '.chat-container, [role="main"]',
            messages: '.msg-row, .chat-message',
            userMessages: '.user-msg, [data-role="user"]',
            assistantMessages: '.char-msg, [data-role="character"]',
            thinkingBlocks: '.thinking-indicator, [aria-expanded="false"]',
            codeBlocks: 'pre code, .code-block',
            mathBlocks: '.math, .katex',
            messageContent: '.message-text, .prose'
        };
        
        this.selectors = { ...this.selectors, ...this.characterSelectors };
        
        this.exportData.metadata.platform = 'character';
        this.exportData.metadata.characterModel = this.detectCharacterModel();
        this.exportData.metadata.conversationId = this.extractConversationId();
    }
    
    detectCharacterModel() {
        return 'character-ai-model';
    }
    
    extractConversationId() {
        const urlMatch = window.location.pathname.match(/\/chat\/([a-zA-Z0-9]+)/);
        return urlMatch ? urlMatch[1] : null;
    }
    
    extractMessage(msgEl, index) {
        const message = super.extractMessage(msgEl, index);
        if (message) {
            message.character = { role: this.detectCharacterRole(msgEl) };
        }
        return message;
    }
    
    detectCharacterRole(msgEl) {
        return msgEl.querySelector('.char-name')?.textContent || 'unknown';
    }
}

window.CharacterExtractor = CharacterExtractor;