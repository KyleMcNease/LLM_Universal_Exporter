/**
 * ChatGPT-Specific Conversation Extractor
 * Specialized for chat.openai.com with enhanced code and math handling
 */

class ChatGPTExtractor extends UniversalExtractor {
    constructor(platformConfig) {
        super(platformConfig);
        
        // Updated selectors for 2025 UI
        this.chatgptSelectors = {
            conversation: '[role="main"], .conversation-container, .chat-container',
            messages: '[data-message-author-role], .group, .message-group',
            
            userMessages: '[data-message-author-role="user"], .group:has(.user-message)',
            assistantMessages: '[data-message-author-role="assistant"], .group:has(.assistant-message)',
            
            codeBlocks: 'pre code, .code-block, .hljs',
            mathBlocks: '.math, .katex, mjx-container',
            messageContent: '.prose, .message-content, .whitespace-pre-wrap',
            
            modelInfo: '.model-switcher, [data-model], .gpt-version',
            regenerateButton: '.regenerate-button, [aria-label*="regenerate"]',
            copyButtons: 'button[aria-label*="copy"], .copy-button',
            messageActions: '.message-actions, .action-buttons'
        };
        
        this.selectors = { ...this.selectors, ...this.chatgptSelectors };
        
        this.exportData.metadata.platform = 'chatgpt';
        this.exportData.metadata.gptModel = this.detectGPTModel();
        this.exportData.metadata.conversationId = this.extractConversationId();
        this.exportData.codeBlocks = [];
        this.exportData.mathExpressions = [];
        this.exportData.regeneratedMessages = [];
    }
    
    detectGPTModel() {
        const modelSelectors = [
            '.model-switcher .selected',
            '[data-model]',
            '.gpt-version',
            '.model-info'
        ];
        
        for (const selector of modelSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                const modelText = element.textContent || element.getAttribute('data-model') || '';
                if (modelText.toLowerCase().includes('gpt-4')) return 'gpt-4';
                if (modelText.toLowerCase().includes('gpt-3.5')) return 'gpt-3.5-turbo';
                return modelText.trim();
            }
        }
        
        const url = window.location.href;
        if (url.includes('gpt-4')) return 'gpt-4';
        
        if (document.querySelector('.file-upload, .image-upload, .dalle-image')) return 'gpt-4';
        
        return 'gpt-unknown';
    }
    
    extractConversationId() {
        const urlMatch = window.location.pathname.match(/\/c\/([a-f0-9-]+)/);
        if (urlMatch) return urlMatch[1];
        
        const conversationElement = document.querySelector('[data-conversation-id]');
        return conversationElement ? conversationElement.getAttribute('data-conversation-id') : null;
    }
    
    extractMessage(msgEl, index) {
        const message = super.extractMessage(msgEl, index);
        if (!message) return null;
        
        message.chatgpt = {
            messageId: this.extractMessageId(msgEl),
            isRegenerated: this.isRegeneratedMessage(msgEl),
            hasCodeBlocks: this.extractCodeBlocks(msgEl).length > 0,
            mathExpressions: this.extractMathExpressions(msgEl),
            messageActions: this.extractMessageActions(msgEl)
        };
        
        return message;
    }
    
    extractMessageId(msgEl) {
        const idSources = [
            msgEl.getAttribute('data-message-id'),
            msgEl.getAttribute('id'),
            msgEl.querySelector('[data-message-id]')?.getAttribute('data-message-id')
        ];
        
        for (const id of idSources) if (id) return id;
        return null;
    }
    
    isRegeneratedMessage(msgEl) {
        const regenerateIndicators = [
            msgEl.querySelector('.regenerate-button'),
            msgEl.querySelector('[aria-label*="regenerate"]'),
            msgEl.querySelector('.multiple-responses'),
            msgEl.querySelector('.response-selector')
        ];
        
        return regenerateIndicators.some(indicator => indicator !== null);
    }
    
    extractCodeBlocks(msgEl) {
        const codeBlocks = [];
        const codeElements = msgEl.querySelectorAll(this.selectors.codeBlocks);
        
        codeElements.forEach((codeEl, index) => {
            const language = this.detectCodeLanguage(codeEl);
            const content = codeEl.textContent || '';
            const isInline = codeEl.closest('p') && !codeEl.closest('pre');
            
            const codeBlock = {
                id: `chatgpt_code_${index}`,
                language,
                content,
                html: codeEl.outerHTML,
                isInline,
                lineCount: content.split('\n').length
            };
            
            codeBlocks.push(codeBlock);
            this.exportData.codeBlocks.push(codeBlock);
        });
        
        return codeBlocks;
    }
    
    detectCodeLanguage(codeEl) {
        const classList = codeEl.className;
        const hlMatch = classList.match(/(?:hljs-|language-)(\w+)/);
        if (hlMatch) return hlMatch[1];
        
        const preEl = codeEl.closest('pre');
        if (preEl) {
            const preMatch = preEl.className.match(/language-(\w+)/);
            if (preMatch) return preMatch[1];
        }
        
        const content = codeEl.textContent;
        const patterns = {
            javascript: /\b(function|const|let|var|=>|console\.log)\b/,
            python: /\b(def|import|print|if __name__)\b/,
            html: /<\/?[a-z][\s\S]*>/i,
            css: /[.#]?[a-zA-Z][a-zA-Z0-9-]*\s*{[^}]*}/,
            json: /^\s*[{[].*[}\]]}\s*$/s,
            sql: /\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE)\b/i
        };
        
        for (const [lang, pattern] of Object.entries(patterns)) {
            if (pattern.test(content)) return lang;
        }
        
        return 'text';
    }
    
    extractMathExpressions(msgEl) {
        const mathExpressions = [];
        const mathElements = msgEl.querySelectorAll(this.selectors.mathBlocks);
        
        mathElements.forEach((mathEl, index) => {
            const mathExpr = {
                id: `chatgpt_math_${index}`,
                content: mathEl.textContent || '',
                latex: mathEl.getAttribute('data-latex') || this.extractLatex(mathEl),
                html: mathEl.outerHTML,
                isInline: !mathEl.closest('.math-block, .display-math')
            };
            
            mathExpressions.push(mathExpr);
            this.exportData.mathExpressions.push(mathExpr);
        });
        
        return mathExpressions;
    }
    
    extractLatex(mathEl) {
        const latexSources = [
            mathEl.getAttribute('data-latex'),
            mathEl.getAttribute('title'),
            mathEl.querySelector('[data-latex]')?.getAttribute('data-latex'),
            mathEl.textContent
        ];
        
        for (const latex of latexSources) if (latex && latex.trim()) return latex.trim();
        return '';
    }
    
    extractMessageActions(msgEl) {
        const actions = [];
        const actionElements = msgEl.querySelectorAll(this.selectors.messageActions + ' button');
        
        actionElements.forEach(actionEl => {
            const ariaLabel = actionEl.getAttribute('aria-label') || '';
            const title = actionEl.getAttribute('title') || '';
            const actionText = actionEl.textContent || '';
            
            const actionType = this.determineActionType(ariaLabel, title, actionText);
            if (actionType) {
                actions.push({
                    type: actionType,
                    label: ariaLabel || title || actionText,
                    available: !actionEl.disabled
                });
            }
        });
        
        return actions;
    }
    
    determineActionType(ariaLabel, title, text) {
        const combined = (ariaLabel + ' ' + title + ' ' + text).toLowerCase();
        if (combined.includes('copy')) return 'copy';
        if (combined.includes('regenerate')) return 'regenerate';
        if (combined.includes('edit')) return 'edit';
        if (combined.includes('like') || combined.includes('thumbs up')) return 'like';
        if (combined.includes('dislike') || combined.includes('thumbs down')) return 'dislike';
        if (combined.includes('share')) return 'share';
        return null;
    }
    
    getTextContent(element) {
        const contentContainer = element.querySelector(this.selectors.messageContent);
        return contentContainer ? contentContainer.innerText || contentContainer.textContent || '' : super.getTextContent(element);
    }
    
    determineAuthor(msgEl) {
        const authorRole = msgEl.getAttribute('data-message-author-role');
        if (authorRole) return authorRole === 'user' ? 'user' : 'assistant';
        
        if (msgEl.querySelector('.user-avatar, .human-avatar')) return 'user';
        if (msgEl.querySelector('.assistant-avatar, .ai-avatar, .chatgpt-avatar')) return 'assistant';
        
        if (msgEl.classList.contains('user-message') || msgEl.querySelector('.user-message')) return 'user';
        if (msgEl.classList.contains('assistant-message') || msgEl.querySelector('.assistant-message')) return 'assistant';
        
        return super.determineAuthor(msgEl);
    }
    
    async postProcess() {
        await super.postProcess();
        
        this.exportData.metadata.chatgpt = {
            conversationId: this.exportData.metadata.conversationId,
            gptModel: this.exportData.metadata.gptModel,
            codeBlockCount: this.exportData.codeBlocks.length,
            mathExpressionCount: this.exportData.mathExpressions.length,
            regeneratedMessageCount: this.exportData.messages.filter(msg => msg.chatgpt?.isRegenerated).length,
            conversationType: this.determineConversationType(),
            programmingLanguages: this.identifyProgrammingLanguages()
        };
    }
    
    determineConversationType() {
        const hasCode = this.exportData.codeBlocks.length > 0;
        const hasMath = this.exportData.mathExpressions.length > 0;
        const hasRegeneration = this.exportData.messages.some(msg => msg.chatgpt?.isRegenerated);
        
        const codeLanguages = this.exportData.codeBlocks.map(block => block.language);
        const webLanguages = ['html', 'css', 'javascript', 'typescript'];
        const dataLanguages = ['python', 'sql', 'r'];
        
        if (hasCode && codeLanguages.some(lang => webLanguages.includes(lang))) return 'web-development';
        if (hasCode && codeLanguages.some(lang => dataLanguages.includes(lang))) return 'data-analysis';
        if (hasCode) return 'programming';
        if (hasMath) return 'mathematical';
        if (hasRegeneration) return 'iterative';
        return 'general';
    }
    
    identifyProgrammingLanguages() {
        const languages = {};
        this.exportData.codeBlocks.forEach(block => {
            const lang = block.language;
            if (lang && lang !== 'text') languages[lang] = (languages[lang] || 0) + 1;
        });
        
        return Object.entries(languages).sort(([,a], [,b]) => b - a).reduce((obj, [lang, count]) => ({ ...obj, [lang]: count }), {});
    }
}

window.ChatGPTExtractor = ChatGPTExtractor;