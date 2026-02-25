/**
 * Gemini-Specific Conversation Extractor
 * Uses UniversalExtractor with Gemini-oriented selectors and metadata.
 */

class GeminiExtractor extends UniversalExtractor {
    constructor(platformConfig) {
        super(platformConfig);

        this.geminiSelectors = {
            conversation: '.conversation-container, [role="main"], main',
            messages: '.model-response-text, .user-input, [data-role="user"], [data-role="model"], [data-message-author-role]',
            userMessages: '.user-input, [data-role="user"], [data-message-author-role="user"]',
            assistantMessages: '.model-response-text, [data-role="model"], [data-message-author-role="assistant"]',
            thinkingBlocks: '[data-thinking], [data-testid*="reasoning"], details'
        };

        this.selectors = { ...this.selectors, ...this.geminiSelectors };
        this.exportData.metadata.platform = 'gemini';
        this.exportData.metadata.conversationId = this.extractConversationId();
    }

    extractConversationId() {
        const urlMatch = window.location.pathname.match(/\/(?:app|chat)\/([^/]+)/);
        if (urlMatch) return urlMatch[1];
        return null;
    }

    async postProcess() {
        await super.postProcess();
        this.exportData.metadata.gemini = {
            conversationId: this.exportData.metadata.conversationId || null
        };
    }
}

window.GeminiExtractor = GeminiExtractor;
