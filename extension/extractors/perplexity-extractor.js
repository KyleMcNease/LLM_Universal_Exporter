/**
 * Perplexity-Specific Conversation Extractor
 * Specialized for perplexity.ai with source citation handling
 */

class PerplexityExtractor extends UniversalExtractor {
    constructor(platformConfig) {
        super(platformConfig);
        
        // Perplexity-specific selectors
        this.perplexitySelectors = {
            conversation: '.conversation, [role="main"], .chat-container',
            messages: '.message-container, .prose, .response-container',
            
            // Perplexity message structure
            userMessages: '.user-message, [data-role="user"]',
            assistantMessages: '.assistant-message, [data-role="assistant"], .response-container',
            
            // Perplexity-specific elements
            sources: '.source, .citation, .reference-link',
            sourceNumbers: '.source-number, .citation-number',
            followUpQuestions: '.follow-up-question, .suggested-question',
            searchQuery: '.search-query, .query-text',
            
            // Content elements
            codeBlocks: 'pre code, .code-block',
            mathBlocks: '.math, .latex',
            messageContent: '.prose, .response-content, .message-text',
            
            // Perplexity UI elements
            sourcePanel: '.sources-panel, .references-panel',
            relatedQuestions: '.related-questions, .follow-up-questions',
            searchStatus: '.search-status, .thinking-indicator'
        };
        
        // Override selectors with Perplexity-specific ones
        this.selectors = { ...this.selectors, ...this.perplexitySelectors };
        
        // Perplexity-specific metadata
        this.exportData.metadata.platform = 'perplexity';
        this.exportData.metadata.searchModel = this.detectSearchModel();
        this.exportData.metadata.conversationId = this.extractConversationId();
        this.exportData.sources = [];
        this.exportData.followUpQuestions = [];
        this.exportData.searchQueries = [];
        this.exportData.relatedTopics = [];
    }
    
    /**
     * Detect Perplexity search model
     */
    detectSearchModel() {
        // Look for model indicators in the page
        const modelIndicators = [
            document.querySelector('[data-model]'),
            document.querySelector('.model-selector'),
            document.querySelector('.search-model')
        ];
        
        for (const indicator of modelIndicators) {
            if (indicator) {
                const modelText = indicator.textContent || indicator.getAttribute('data-model') || '';
                if (modelText.toLowerCase().includes('pro')) {
                    return 'perplexity-pro';
                } else if (modelText.toLowerCase().includes('gpt-4')) {
                    return 'perplexity-gpt4';
                } else if (modelText.toLowerCase().includes('claude')) {
                    return 'perplexity-claude';
                }
                return modelText.trim();
            }
        }
        
        // Check URL for indicators
        const url = window.location.href;
        if (url.includes('pro')) {
            return 'perplexity-pro';
        }
        
        return 'perplexity-standard';
    }
    
    /**
     * Extract conversation ID
     */
    extractConversationId() {
        // Perplexity URLs typically have format: perplexity.ai/search/{query-or-id}
        const urlMatch = window.location.pathname.match(/\/search\/([^/?]+)/);
        if (urlMatch) {
            return decodeURIComponent(urlMatch[1]);
        }
        
        // Look for conversation ID in data attributes
        const conversationElement = document.querySelector('[data-conversation-id], [data-search-id]');
        if (conversationElement) {
            return conversationElement.getAttribute('data-conversation-id') || 
                   conversationElement.getAttribute('data-search-id');
        }
        
        return null;
    }
    
    /**
     * Enhanced message extraction for Perplexity
     */
    extractMessage(msgEl, index) {
        const message = super.extractMessage(msgEl, index);
        if (!message) return null;
        
        // Perplexity-specific enhancements
        message.perplexity = {
            messageId: this.extractMessageId(msgEl),
            sources: this.extractMessageSources(msgEl),
            followUpQuestions: this.extractFollowUpQuestions(msgEl),
            searchQuery: this.extractSearchQuery(msgEl),
            isSearchResult: this.isSearchResultMessage(msgEl),
            sourceCount: this.countMessageSources(msgEl)
        };
        
        return message;
    }
    
    /**
     * Extract message ID for Perplexity
     */
    extractMessageId(msgEl) {
        const idSources = [
            msgEl.getAttribute('data-message-id'),
            msgEl.getAttribute('data-response-id'),
            msgEl.getAttribute('id'),
            msgEl.querySelector('[data-message-id]')?.getAttribute('data-message-id')
        ];
        
        for (const id of idSources) {
            if (id) return id;
        }
        
        return null;
    }
    
    /**
     * Extract sources from message
     */
    extractMessageSources(msgEl) {
        const sources = [];
        const sourceElements = msgEl.querySelectorAll(this.selectors.sources);
        
        sourceElements.forEach((sourceEl, index) => {
            const source = {
                id: `source_${index}`,
                title: this.extractSourceTitle(sourceEl),
                url: this.extractSourceUrl(sourceEl),
                domain: this.extractSourceDomain(sourceEl),
                snippet: this.extractSourceSnippet(sourceEl),
                sourceNumber: this.extractSourceNumber(sourceEl),
                trustScore: this.extractTrustScore(sourceEl)
            };
            
            sources.push(source);
            this.exportData.sources.push(source);
        });
        
        return sources;
    }
    
    /**
     * Extract source title
     */
    extractSourceTitle(sourceEl) {
        const titleSources = [
            sourceEl.getAttribute('title'),
            sourceEl.querySelector('.source-title')?.textContent,
            sourceEl.querySelector('.title')?.textContent,
            sourceEl.textContent
        ];
        
        for (const title of titleSources) {
            if (title && title.trim()) {
                return title.trim();
            }
        }
        
        return '';
    }
    
    /**
     * Extract source URL
     */
    extractSourceUrl(sourceEl) {
        const urlSources = [
            sourceEl.href,
            sourceEl.getAttribute('data-url'),
            sourceEl.querySelector('a')?.href,
            sourceEl.closest('a')?.href
        ];
        
        for (const url of urlSources) {
            if (url) return url;
        }
        
        return '';
    }
    
    /**
     * Extract source domain
     */
    extractSourceDomain(sourceEl) {
        const url = this.extractSourceUrl(sourceEl);
        if (!url) return '';
        
        try {
            return new URL(url).hostname;
        } catch {
            return '';
        }
    }
    
    /**
     * Extract source snippet
     */
    extractSourceSnippet(sourceEl) {
        const snippetSources = [
            sourceEl.getAttribute('data-snippet'),
            sourceEl.querySelector('.snippet')?.textContent,
            sourceEl.querySelector('.description')?.textContent,
            sourceEl.nextElementSibling?.textContent
        ];
        
        for (const snippet of snippetSources) {
            if (snippet && snippet.trim()) {
                return snippet.trim();
            }
        }
        
        return '';
    }
    
    /**
     * Extract source number (citation number)
     */
    extractSourceNumber(sourceEl) {
        const numberSources = [
            sourceEl.getAttribute('data-source-number'),
            sourceEl.querySelector('.source-number')?.textContent,
            sourceEl.querySelector('.citation-number')?.textContent
        ];
        
        for (const number of numberSources) {
            if (number) {
                const parsed = parseInt(number);
                if (!isNaN(parsed)) return parsed;
            }
        }
        
        return null;
    }
    
    /**
     * Extract trust score (if available)
     */
    extractTrustScore(sourceEl) {
        const scoreElements = [
            sourceEl.querySelector('.trust-score'),
            sourceEl.querySelector('.reliability-score'),
            sourceEl.querySelector('[data-trust-score]')
        ];
        
        for (const scoreEl of scoreElements) {
            if (scoreEl) {
                const score = scoreEl.textContent || scoreEl.getAttribute('data-trust-score');
                const parsed = parseFloat(score);
                if (!isNaN(parsed)) return parsed;
            }
        }
        
        return null;
    }
    
    /**
     * Extract follow-up questions
     */
    extractFollowUpQuestions(msgEl) {
        const questions = [];
        const questionElements = msgEl.querySelectorAll(this.selectors.followUpQuestions);
        
        questionElements.forEach((questionEl, index) => {
            const question = {
                id: `followup_${index}`,
                text: questionEl.textContent || '',
                url: questionEl.href || '',
                category: this.categorizeQuestion(questionEl.textContent)
            };
            
            questions.push(question);
            this.exportData.followUpQuestions.push(question);
        });
        
        return questions;
    }
    
    /**
     * Categorize follow-up question
     */
    categorizeQuestion(questionText) {
        const text = questionText.toLowerCase();
        
        if (text.includes('how') || text.includes('why') || text.includes('what')) {
            return 'explanatory';
        }
        
        if (text.includes('when') || text.includes('where')) {
            return 'factual';
        }
        
        if (text.includes('compare') || text.includes('vs') || text.includes('difference')) {
            return 'comparative';
        }
        
        if (text.includes('example') || text.includes('instance')) {
            return 'example';
        }
        
        return 'general';
    }
    
    /**
     * Extract search query
     */
    extractSearchQuery(msgEl) {
        const queryElements = msgEl.querySelectorAll(this.selectors.searchQuery);
        
        for (const queryEl of queryElements) {
            const query = queryEl.textContent || queryEl.value || '';
            if (query.trim()) {
                this.exportData.searchQueries.push({
                    query: query.trim(),
                    timestamp: new Date().toISOString()
                });
                return query.trim();
            }
        }
        
        return '';
    }
    
    /**
     * Check if message is a search result
     */
    isSearchResultMessage(msgEl) {
        // Check for search result indicators
        const indicators = [
            msgEl.querySelector('.search-result'),
            msgEl.querySelector('.sources'),
            msgEl.querySelector('.citation'),
            msgEl.classList.contains('search-response'),
            msgEl.classList.contains('ai-response')
        ];
        
        return indicators.some(indicator => indicator !== null);
    }
    
    /**
     * Count sources in message
     */
    countMessageSources(msgEl) {
        return msgEl.querySelectorAll(this.selectors.sources).length;
    }
    
    /**
     * Enhanced author detection for Perplexity
     */
    determineAuthor(msgEl) {
        // Check Perplexity-specific patterns
        if (msgEl.matches(this.selectors.userMessages)) {
            return 'user';
        }
        
        if (msgEl.matches(this.selectors.assistantMessages)) {
            return 'assistant';
        }
        
        // Check for Perplexity's specific class patterns
        const classList = msgEl.className.toLowerCase();
        if (classList.includes('user') || classList.includes('human') || classList.includes('query')) {
            return 'user';
        }
        
        if (classList.includes('assistant') || classList.includes('ai') || 
            classList.includes('response') || classList.includes('answer')) {
            return 'assistant';
        }
        
        // Check for search-related indicators (usually assistant responses)
        if (msgEl.querySelector(this.selectors.sources) || 
            classList.includes('search-result')) {
            return 'assistant';
        }
        
        // Fallback to parent method
        return super.determineAuthor(msgEl);
    }
    
    /**
     * Enhanced content extraction for Perplexity
     */
    getTextContent(element) {
        // Perplexity often has specific content containers
        const contentContainer = element.querySelector(this.selectors.messageContent);
        if (contentContainer) {
            return contentContainer.innerText || contentContainer.textContent || '';
        }
        
        // Handle Perplexity's prose content
        const proseContainer = element.querySelector('.prose');
        if (proseContainer) {
            return proseContainer.innerText || proseContainer.textContent || '';
        }
        
        // Fallback to parent method
        return super.getTextContent(element);
    }
    
    /**
     * Enhanced post-processing for Perplexity
     */
    async postProcess() {
        await super.postProcess();
        
        // Extract additional elements
        await this.extractRelatedTopics();
        
        // Perplexity-specific metadata
        this.exportData.metadata.perplexity = {
            conversationId: this.exportData.metadata.conversationId,
            searchModel: this.exportData.metadata.searchModel,
            sourceCount: this.exportData.sources.length,
            followUpQuestionCount: this.exportData.followUpQuestions.length,
            searchQueryCount: this.exportData.searchQueries.length,
            conversationType: this.determineConversationType(),
            sourceAnalysis: this.analyzeSourceQuality(),
            searchPatterns: this.analyzeSearchPatterns()
        };
    }
    
    /**
     * Extract related topics
     */
    async extractRelatedTopics() {
        const relatedElements = document.querySelectorAll(this.selectors.relatedQuestions);
        
        relatedElements.forEach((relatedEl, index) => {
            const topic = {
                id: `related_${index}`,
                text: relatedEl.textContent || '',
                url: relatedEl.href || '',
                category: this.categorizeQuestion(relatedEl.textContent)
            };
            
            this.exportData.relatedTopics.push(topic);
        });
    }
    
    /**
     * Determine conversation type for Perplexity
     */
    determineConversationType() {
        const hasManySources = this.exportData.sources.length > 5;
        const hasFollowUps = this.exportData.followUpQuestions.length > 0;
        const hasCode = this.exportData.codeBlocks.length > 0;
        const hasMath = this.exportData.mathExpressions.length > 0;
        
        // Analyze search queries
        const queries = this.exportData.searchQueries.map(q => q.query.toLowerCase());
        const isResearch = queries.some(q => 
            q.includes('research') || q.includes('study') || q.includes('analysis')
        );
        const isComparison = queries.some(q => 
            q.includes('vs') || q.includes('compare') || q.includes('difference')
        );
        const isTechnical = queries.some(q => 
            q.includes('code') || q.includes('programming') || q.includes('algorithm')
        );
        
        if (isTechnical || hasCode) return 'technical';
        if (isResearch || hasManySources) return 'research';
        if (isComparison) return 'comparative';
        if (hasMath) return 'mathematical';
        if (hasFollowUps) return 'exploratory';
        
        return 'informational';
    }
    
    /**
     * Analyze source quality and diversity
     */
    analyzeSourceQuality() {
        const domains = {};
        const sourceTypes = {};
        
        this.exportData.sources.forEach(source => {
            // Count domains
            if (source.domain) {
                domains[source.domain] = (domains[source.domain] || 0) + 1;
            }
            
            // Categorize source types
            const type = this.categorizeSourceType(source.domain);
            sourceTypes[type] = (sourceTypes[type] || 0) + 1;
        });
        
        return {
            totalSources: this.exportData.sources.length,
            uniqueDomains: Object.keys(domains).length,
            domainDistribution: domains,
            sourceTypes: sourceTypes,
            diversity: Object.keys(domains).length / Math.max(this.exportData.sources.length, 1),
            averageTrustScore: this.calculateAverageTrustScore()
        };
    }
    
    /**
     * Categorize source type
     */
    categorizeSourceType(domain) {
        if (!domain) return 'unknown';
        
        const categories = {
            'academic': ['.edu', 'scholar.google', 'arxiv.org', 'pubmed', 'jstor', 'academia.edu'],
            'news': ['bbc.com', 'cnn.com', 'reuters.com', 'ap.org', 'nytimes.com', 'wsj.com', 'guardian.com'],
            'technical': ['stackoverflow.com', 'github.com', 'docs.', 'developer.', 'tech.', 'api.'],
            'reference': ['wikipedia.org', 'britannica.com', 'merriam-webster.com', 'dictionary.com'],
            'government': ['.gov', '.mil', '.org'],
            'commercial': ['.com', '.net'],
            'social': ['reddit.com', 'twitter.com', 'facebook.com', 'linkedin.com']
        };
        
        for (const [category, patterns] of Object.entries(categories)) {
            if (patterns.some(pattern => domain.includes(pattern))) {
                return category;
            }
        }
        
        return 'other';
    }
    
    /**
     * Calculate average trust score
     */
    calculateAverageTrustScore() {
        const sourcesWithScores = this.exportData.sources.filter(s => s.trustScore !== null);
        if (sourcesWithScores.length === 0) return null;
        
        const sum = sourcesWithScores.reduce((acc, source) => acc + source.trustScore, 0);
        return sum / sourcesWithScores.length;
    }
    
    /**
     * Analyze search patterns
     */
    analyzeSearchPatterns() {
        const queries = this.exportData.searchQueries;
        
        return {
            totalQueries: queries.length,
            averageQueryLength: queries.reduce((sum, q) => sum + q.query.length, 0) / Math.max(queries.length, 1),
            queryTypes: this.categorizeQueries(),
            searchEvolution: this.analyzeSearchEvolution()
        };
    }
    
    /**
     * Categorize search queries
     */
    categorizeQueries() {
        const categories = {
            'factual': 0,
            'explanatory': 0,
            'comparative': 0,
            'procedural': 0,
            'research': 0
        };
        
        this.exportData.searchQueries.forEach(queryObj => {
            const query = queryObj.query.toLowerCase();
            
            if (query.includes('what') || query.includes('who') || query.includes('when')) {
                categories.factual++;
            } else if (query.includes('how') || query.includes('why')) {
                categories.explanatory++;
            } else if (query.includes('vs') || query.includes('compare') || query.includes('difference')) {
                categories.comparative++;
            } else if (query.includes('step') || query.includes('guide') || query.includes('tutorial')) {
                categories.procedural++;
            } else if (query.includes('research') || query.includes('study') || query.includes('analysis')) {
                categories.research++;
            }
        });
        
        return categories;
    }
    
    /**
     * Analyze search evolution
     */
    analyzeSearchEvolution() {
        const queries = this.exportData.searchQueries;
        if (queries.length < 2) return null;
        
        return {
            queryProgression: queries.map((q, index) => ({
                index,
                query: q.query,
                length: q.query.length,
                complexity: this.calculateQueryComplexity(q.query)
            })),
            becomingMoreSpecific: this.isBecomingMoreSpecific(queries),
            topicShifts: this.countTopicShifts(queries)
        };
    }
    
    /**
     * Calculate query complexity
     */
    calculateQueryComplexity(query) {
        const complexWords = ['analyze', 'compare', 'evaluate', 'synthesize', 'examine'];
        const wordCount = query.split(' ').length;
        const hasComplexWords = complexWords.some(word => query.toLowerCase().includes(word));
        
        return wordCount + (hasComplexWords ? 5 : 0);
    }
    
    /**
     * Check if queries are becoming more specific
     */
    isBecomingMoreSpecific(queries) {
        if (queries.length < 2) return false;
        
        const firstHalf = queries.slice(0, Math.floor(queries.length / 2));
        const secondHalf = queries.slice(Math.floor(queries.length / 2));
        
        const avgFirstLength = firstHalf.reduce((sum, q) => sum + q.query.length, 0) / firstHalf.length;
        const avgSecondLength = secondHalf.reduce((sum, q) => sum + q.query.length, 0) / secondHalf.length;
        
        return avgSecondLength > avgFirstLength;
    }
    
    /**
     * Count topic shifts in queries
     */
    countTopicShifts(queries) {
        let shifts = 0;
        
        for (let i = 1; i < queries.length; i++) {
            const prevWords = new Set(queries[i-1].query.toLowerCase().split(' '));
            const currWords = new Set(queries[i].query.toLowerCase().split(' '));
            
            const overlap = new Set([...prevWords].filter(word => currWords.has(word)));
            const overlapRatio = overlap.size / Math.max(prevWords.size, currWords.size);
            
            if (overlapRatio < 0.3) { // Less than 30% overlap suggests topic shift
                shifts++;
            }
        }
        
        return shifts;
    }
}

// Make globally available
window.PerplexityExtractor = PerplexityExtractor;