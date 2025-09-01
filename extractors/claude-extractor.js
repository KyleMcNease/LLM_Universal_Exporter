/**
 * Claude-Specific Conversation Extractor
 * Specialized for Claude.ai with enhanced thinking handling
 */

class ClaudeExtractor extends UniversalExtractor {
    constructor(platformConfig) {
        super(platformConfig);
        
        // Updated selectors for 2025 UI
        this.claudeSelectors = {
            conversation: '[data-testid="conversation"], .conversation-container, [role="main"]',
            messages: '[data-testid="message"], .message, [data-message-id]',
            
            thinkingBlocks: [
                '.thinking-block',
                '[data-thinking]',
                '[aria-expanded]',
                '.transition-all[style*="max-height"]',
                '.collapsible-content',
                '.prose [style*="max-height"]',
                '.overflow-hidden[style*="max-height"]'
            ].join(','),
            
            userMessages: '[data-author="user"], .user-message',
            assistantMessages: '[data-author="assistant"], .assistant-message',
            
            thinkingTriggers: 'button[aria-expanded], .expand-button, .toggle-button',
            codeBlocks: 'pre code, .code-block',
            mathBlocks: '.math-block, .katex',
            artifacts: '[data-testid="artifact"], .artifact-container'
        };
        
        this.selectors = { ...this.selectors, ...this.claudeSelectors };
        
        this.exportData.metadata.platform = 'claude';
        this.exportData.metadata.claudeVersion = this.detectClaudeVersion();
        this.exportData.artifacts = [];
        this.exportData.codeBlocks = [];
        this.exportData.mathExpressions = [];
    }
    
    detectClaudeVersion() {
        const indicators = [
            document.querySelector('[data-model]'),
            document.querySelector('.model-info'),
            document.querySelector('.claude-version')
        ];
        
        for (const indicator of indicators) {
            if (indicator) return indicator.textContent || indicator.getAttribute('data-model') || 'unknown';
        }
        
        if (document.querySelector('.thinking-block')) return 'claude-3-with-thinking';
        return 'claude-unknown';
    }
    
    async expandElements(elements) {
        console.log(`🧠 Claude: Expanding ${elements.thinkingBlocks.length} thinking blocks with enhanced detection...`);
        
        await super.expandElements(elements);
        
        await this.advancedThinkingDetection();
        
        const newElements = await this.discoverElements();
        if (newElements.thinkingBlocks.length > elements.thinkingBlocks.length) {
            console.log(`🔍 Found ${newElements.thinkingBlocks.length - elements.thinkingBlocks.length} additional thinking blocks`);
            
            const newBlocks = newElements.thinkingBlocks.slice(elements.thinkingBlocks.length);
            for (const block of newBlocks) {
                try {
                    await this.expandElement(block);
                    await this.wait(100);
                } catch (error) {
                    console.warn('Failed to expand newly discovered block:', error);
                }
            }
            
            elements.thinkingBlocks = newElements.thinkingBlocks;
        }
    }
    
    async advancedThinkingDetection() {
        const advancedSelectors = [
            '.overflow-hidden[style*="max-height: 0"]',
            '.overflow-hidden[style*="height: 0"]',
            '.transition-all[style*="max-height"]',
            '[aria-expanded="false"]',
            '[class*="thinking"]',
            '[class*="collapse"]',
            '[class*="expand"]'
        ];
        
        for (const selector of advancedSelectors) {
            const elements = document.querySelectorAll(selector);
            
            for (const el of elements) {
                if (this.isLikelyThinkingBlock(el)) {
                    try {
                        await this.expandElement(el);
                        await this.wait(100);
                    } catch (error) {
                        console.warn('Advanced thinking expansion failed:', error);
                    }
                }
            }
        }
    }
    
    isLikelyThinkingBlock(element) {
        const textContent = element.textContent.toLowerCase();
        const thinkingPatterns = [
            'thinking',
            'let me think',
            'i need to',
            'actually',
            'wait',
            'hmm',
            'let me consider',
            'on second thought'
        ];
        
        const hasThinkingText = thinkingPatterns.some(pattern => textContent.includes(pattern));
        const hasCollapseStyles = element.style.maxHeight === '0px' || 
                                  element.style.height === '0px' ||
                                  element.classList.contains('overflow-hidden');
        const hasAriaExpanded = element.hasAttribute('aria-expanded');
        const isInMessageContext = element.closest('[data-testid="message"]') !== null;
        
        return (hasThinkingText || hasCollapseStyles || hasAriaExpanded) && isInMessageContext;
    }
    
    extractMessage(msgEl, index) {
        const message = super.extractMessage(msgEl, index);
        if (!message) return null;
        
        message.claude = {
            hasArtifacts: this.extractArtifacts(msgEl).length > 0,
            codeBlocks: this.extractCodeBlocks(msgEl),
            mathExpressions: this.extractMathExpressions(msgEl),
            messageType: this.determineClaudeMessageType(msgEl)
        };
        
        return message;
    }
    
    extractArtifacts(msgEl) {
        const artifacts = [];
        const artifactElements = msgEl.querySelectorAll(this.selectors.artifacts);
        
        artifactElements.forEach((artifactEl, index) => {
            const artifact = {
                id: `artifact_${index}`,
                type: artifactEl.getAttribute('data-type') || 'unknown',
                title: artifactEl.getAttribute('data-title') || `Artifact ${index + 1}`,
                content: this.getTextContent(artifactEl),
                html: artifactEl.outerHTML
            };
            
            artifacts.push(artifact);
            this.exportData.artifacts.push(artifact);
        });
        
        return artifacts;
    }
    
    extractCodeBlocks(msgEl) {
        const codeBlocks = [];
        const codeElements = msgEl.querySelectorAll(this.selectors.codeBlocks);
        
        codeElements.forEach((codeEl, index) => {
            const language = this.detectCodeLanguage(codeEl);
            const codeBlock = {
                id: `code_${index}`,
                language,
                content: codeEl.textContent || '',
                html: codeEl.outerHTML
            };
            
            codeBlocks.push(codeBlock);
            this.exportData.codeBlocks.push(codeBlock);
        });
        
        return codeBlocks;
    }
    
    extractMathExpressions(msgEl) {
        const mathExpressions = [];
        const mathElements = msgEl.querySelectorAll(this.selectors.mathBlocks);
        
        mathElements.forEach((mathEl, index) => {
            const mathExpr = {
                id: `math_${index}`,
                content: mathEl.textContent || '',
                latex: mathEl.getAttribute('data-latex') || '',
                html: mathEl.outerHTML
            };
            
            mathExpressions.push(mathExpr);
            this.exportData.mathExpressions.push(mathExpr);
        });
        
        return mathExpressions;
    }
    
    detectCodeLanguage(codeEl) {
        const classList = codeEl.className;
        const languageMatch = classList.match(/language-(\w+)/);
        if (languageMatch) return languageMatch[1];
        
        const parent = codeEl.parentElement;
        if (parent) {
            const parentMatch = parent.className.match(/language-(\w+)/);
            if (parentMatch) return parentMatch[1];
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
    
    determineClaudeMessageType(msgEl) {
        if (msgEl.querySelector(this.selectors.artifacts)) return 'artifact';
        if (msgEl.querySelector(this.selectors.codeBlocks)) return 'code';
        if (msgEl.querySelector(this.selectors.mathBlocks)) return 'math';
        if (msgEl.querySelector(this.selectors.thinkingBlocks)) return 'thinking';
        return 'text';
    }
    
    async postProcess() {
        await super.postProcess();
        
        this.exportData.metadata.claude = {
            artifactCount: this.exportData.artifacts.length,
            codeBlockCount: this.exportData.codeBlocks.length,
            mathExpressionCount: this.exportData.mathExpressions.length,
            thinkingIntensity: this.calculateThinkingIntensity(),
            conversationType: this.determineConversationType()
        };
    }
    
    calculateThinkingIntensity() {
        const totalMessages = this.exportData.messages.length;
        const messagesWithThinking = this.exportData.messages.filter(msg => 
            msg.thinkingBlocks && msg.thinkingBlocks.length > 0
        ).length;
        
        const totalThinkingWords = this.exportData.thinkingBlocks
            .reduce((sum, block) => sum + (block.wordCount || 0), 0);
        
        const totalWords = this.exportData.metadata.totalWordCount || 1;
        
        return {
            thinkingRatio: messagesWithThinking / Math.max(totalMessages, 1),
            thinkingWordRatio: totalThinkingWords / totalWords,
            averageThinkingLength: totalThinkingWords / Math.max(this.exportData.thinkingBlocks.length, 1)
        };
    }
    
    determineConversationType() {
        const hasCode = this.exportData.codeBlocks.length > 0;
        const hasMath = this.exportData.mathExpressions.length > 0;
        const hasArtifacts = this.exportData.artifacts.length > 0;
        const hasThinking = this.exportData.thinkingBlocks.length > 0;
        
        if (hasCode && hasArtifacts) return 'development';
        if (hasMath) return 'mathematical';
        if (hasThinking && !hasCode && !hasMath) return 'reasoning';
        if (hasArtifacts) return 'creative';
        return 'general';
    }
}

window.ClaudeExtractor = ClaudeExtractor;