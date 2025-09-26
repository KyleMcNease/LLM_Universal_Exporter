/**
 * Universal AI Exporter - User Interface and Export Controls
 * Provides the UI for selecting export formats and managing exports
 */

class ExportInterface {
    constructor() {
        this.version = '1.0.0';
        this.ui = null;
        this.extractor = null;
        this.exportData = null;
        this.platformInfo = null;
        
        this.formats = {
            'pdf': {
                name: 'PDF',
                icon: '📄',
                description: 'Professional PDF with formatting',
                premium: false,
                clientSide: true
            },
            'markdown': {
                name: 'Markdown',
                icon: '📝',
                description: 'Clean markdown format',
                premium: false,
                clientSide: true
            },
            'json': {
                name: 'JSON',
                icon: '📊',
                description: 'Structured data with metadata',
                premium: false,
                clientSide: true
            },
            'csv': {
                name: 'CSV',
                icon: '📈',
                description: 'Spreadsheet-compatible format',
                premium: false,
                clientSide: true
            },
            'html': {
                name: 'HTML',
                icon: '🌐',
                description: 'Complete web page',
                premium: false,
                clientSide: true
            },
            'txt': {
                name: 'Text',
                icon: '📄',
                description: 'Plain text format',
                premium: false,
                clientSide: true
            },
            'research': {
                name: 'Research Archive',
                icon: '🔬',
                description: 'Complete research package',
                premium: true,
                clientSide: true
            }
        };
        
        this.bindEvents();
    }
    
    async initialize() {
        try {
            const detector = new PlatformDetector();
            this.platformInfo = await detector.waitForPlatform();
            
            console.log('🚀 Universal AI Exporter initialized for:', this.platformInfo.platform);
            
            this.createUI();
            this.showUI();
            
        } catch (error) {
            console.error('❌ Failed to initialize export interface:', error);
            this.showError('Failed to initialize: ' + error.message);
        }
    }
    
    createUI() {
        this.ui = document.createElement('div');
        this.ui.id = 'universal-ai-exporter-ui';
        this.ui.innerHTML = `
            <div class="uae-container" role="dialog" aria-modal="true" aria-labelledby="uae-title-label">
                <div class="uae-header">
                    <div class="uae-title">
                        <span class="uae-icon">🚀</span>
                        <h3 id="uae-title-label">Universal AI Exporter</h3>
                        <span class="uae-platform">${this.platformInfo.platform}</span>
                    </div>
                    <button class="uae-close" id="uae-close" aria-label="Close exporter">×</button>
                </div>
                
                <div class="uae-status" id="uae-status">
                    <div class="uae-status-text">Ready to export your conversation</div>
                    <div class="uae-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Export progress">
                        <div class="uae-progress" id="uae-progress"></div>
                    </div>
                </div>
                
                <div class="uae-options" id="uae-options">
                    <div class="uae-option-group">
                        <label class="uae-checkbox" for="include-thinking">
                            <input type="checkbox" id="include-thinking" checked>
                            <span class="checkmark"></span>
                            Include thinking blocks
                        </label>
                        
                        <label class="uae-checkbox" for="include-metadata">
                            <input type="checkbox" id="include-metadata" checked>
                            <span class="checkmark"></span>
                            Include metadata
                        </label>
                        
                        <label class="uae-checkbox" for="include-html">
                            <input type="checkbox" id="include-html" checked>
                            <span class="checkmark"></span>
                            Include raw HTML
                        </label>
                    </div>
                    
                    <div class="uae-filename-group">
                        <label for="export-filename">Filename:</label>
                        <input type="text" id="export-filename" placeholder="conversation-export" aria-label="Export filename" />
                    </div>
                </div>
                
                <div class="uae-formats" id="uae-formats">
                    ${this.createFormatButtons()}
                </div>
                
                <div class="uae-actions">
                    <button class="uae-btn uae-btn-primary" id="analyze-btn" aria-label="Analyze conversation">
                        📊 Analyze Conversation
                    </button>
                    
                    <button class="uae-btn uae-btn-secondary" id="export-all-btn" aria-label="Export all formats">
                        📦 Export All Formats
                    </button>
                </div>
                
                <div class="uae-results" id="uae-results" style="display: none;">
                    <h4>📊 Analysis Results</h4>
                    <div class="uae-stats" id="uae-stats"></div>
                    
                    <h4>📥 Downloads</h4>
                    <div class="uae-downloads" id="uae-downloads"></div>
                </div>
                
                <div class="uae-footer">
                    <div class="uae-version">v${this.version}</div>
                    <div class="uae-privacy">🔒 Privacy-first • No data stored</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.ui);
    }
    
    createFormatButtons() {
        return Object.entries(this.formats).map(([key, format]) => `
            <button class="uae-format-btn ${format.premium ? 'premium' : ''}" 
                    data-format="${key}" 
                    title="${format.description}" aria-label="Export as ${format.name}">
                <span class="format-icon">${format.icon}</span>
                <span class="format-name">${format.name}</span>
                ${format.premium ? '<span class="premium-badge">PRO</span>' : ''}
            </button>
        `).join('');
    }
    
    showUI() {
        this.ui.classList.add('uae-visible');
        
        requestAnimationFrame(() => {
            this.ui.style.opacity = '1';
            this.ui.style.transform = 'translateY(0)';
        });
    }
    
    hideUI() {
        this.ui.style.opacity = '0';
        this.ui.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            if (this.ui && this.ui.parentNode) {
                this.ui.parentNode.removeChild(this.ui);
            }
        }, 300);
    }
    
    bindEvents() {
        document.addEventListener('click', (e) => {
            if (e.target.id === 'uae-close') {
                this.hideUI();
            }
            
            if (e.target.id === 'analyze-btn') {
                this.analyzeConversation();
            }
            
            if (e.target.id === 'export-all-btn') {
                this.exportAllFormats();
            }
            
            if (e.target.classList.contains('uae-format-btn')) {
                const format = e.target.getAttribute('data-format');
                this.exportFormat(format);
            }
            
            if (e.target.classList.contains('uae-download-btn')) {
                const format = e.target.getAttribute('data-format');
                const content = e.target.getAttribute('data-content');
                this.downloadFile(content, this.getFilename(format), this.getMimeType(format));
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.ui && this.ui.classList.contains('uae-visible')) {
                this.hideUI();
            }
        });
    }
    
    async analyzeConversation() {
        try {
            this.updateStatus('Analyzing conversation...', 10);
            
            const ExtractorClass = window[this.platformInfo.config.extractor] || UniversalExtractor;
            this.extractor = new ExtractorClass(this.platformInfo);
            
            this.exportData = await this.extractor.extractConversation();
            
            this.updateStatus('Analysis complete!', 100);
            this.showResults();
            
        } catch (error) {
            console.error('❌ Analysis failed:', error);
            this.showError('Analysis failed: ' + error.message);
        }
    }
    
    async exportFormat(format) {
        try {
            if (!this.exportData) {
                await this.analyzeConversation();
            }
            
            this.updateStatus(`Generating ${format.toUpperCase()}...`, 50);
            
            const content = await this.generateFormat(format);
            const filename = this.getFilename(format);
            const mimeType = this.getMimeType(format);
            
            this.downloadFile(content, filename, mimeType);
            this.updateStatus(`${format.toUpperCase()} exported!`, 100);
            
        } catch (error) {
            console.error(`❌ ${format} export failed:`, error);
            this.showError(`${format} export failed: ` + error.message);
        }
    }
    
    async exportAllFormats() {
        try {
            if (!this.exportData) {
                await this.analyzeConversation();
            }
            
            const formats = Object.keys(this.formats);
            for (let i = 0; i < formats.length; i++) {
                const format = formats[i];
                this.updateStatus(`Generating ${format.toUpperCase()}... (${i + 1}/${formats.length})`, 
                                (i / formats.length) * 100);
                
                const content = await this.generateFormat(format);
                const filename = this.getFilename(format);
                const mimeType = this.getMimeType(format);
                
                await new Promise(resolve => setTimeout(resolve, 500));
                this.downloadFile(content, filename, mimeType);
            }
            
            this.updateStatus('All formats exported!', 100);
            
        } catch (error) {
            console.error('❌ Bulk export failed:', error);
            this.showError('Bulk export failed: ' + error.message);
        }
    }
    
    async generateFormat(format) {
        const options = this.getExportOptions();
        
        switch (format) {
            case 'pdf':
                return await this.generatePDF(options);
            case 'markdown':
                return this.generateMarkdown(options);
            case 'json':
                return this.generateJSON(options);
            case 'csv':
                return this.generateCSV(options);
            case 'html':
                return this.generateHTML(options);
            case 'txt':
                return this.generateText(options);
            case 'research':
                return this.generateResearchArchive(options);
            default:
                throw new Error(`Unknown format: ${format}`);
        }
    }
    
    async generatePDF(options) {
        try {
            // Verify jsPDF is available
            if (!window.jspdf || !window.jspdf.jsPDF) {
                throw new Error('PDF library not available');
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Add metadata
            doc.setProperties({
                title: `AI Conversation - ${this.exportData.metadata.platform}`,
                creator: 'Universal AI Exporter',
                subject: 'AI Conversation Export'
            });
            
            // Header
            doc.setFontSize(16);
            doc.text('AI Conversation Export', 20, 20);
            
            // Metadata section
            doc.setFontSize(12);
            doc.text(`Platform: ${this.exportData.metadata.platform}`, 20, 40);
            doc.text(`Date: ${this.exportData.metadata.exportDate}`, 20, 50);
            doc.text(`Messages: ${this.exportData.metadata.messageCount}`, 20, 60);
            
            if (options.includeThinking && this.exportData.metadata.thinkingBlockCount > 0) {
                doc.text(`Thinking Blocks: ${this.exportData.metadata.thinkingBlockCount}`, 20, 70);
            }
            
            let yPosition = 90;
            let pageCount = 1;
            
            // Process messages in chunks to avoid memory issues
            const batchSize = 10;
            for (let i = 0; i < this.exportData.messages.length; i += batchSize) {
                const batch = this.exportData.messages.slice(i, i + batchSize);
                
                for (const message of batch) {
                    // Check if we need a new page
                    if (yPosition > 250) {
                        doc.addPage();
                        yPosition = 20;
                        pageCount++;
                        
                        // Progress update for large PDFs
                        if (pageCount % 5 === 0) {
                            const progress = Math.min(85, 40 + (i / this.exportData.messages.length) * 40);
                            this.updateStatus(`Generating PDF... page ${pageCount}`, progress);
                            await new Promise(resolve => setTimeout(resolve, 10)); // Allow UI update
                        }
                    }
                    
                    // Message header
                    doc.setFontSize(10);
                    doc.setFont(undefined, 'bold');
                    doc.text(`${message.author.toUpperCase()}:`, 20, yPosition);
                    
                    // Message content
                    doc.setFont(undefined, 'normal');
                    const lines = doc.splitTextToSize(message.content, 170);
                    doc.text(lines, 20, yPosition + 10);
                    
                    yPosition += 10 + (lines.length * 5) + 10;
                    
                    // Thinking blocks if enabled
                    if (options.includeThinking && message.thinkingBlocks) {
                        for (const thinking of message.thinkingBlocks) {
                            if (yPosition > 240) {
                                doc.addPage();
                                yPosition = 20;
                                pageCount++;
                            }
                            
                            doc.setFontSize(8);
                            doc.setFont(undefined, 'italic');
                            doc.text('💭 THINKING:', 25, yPosition);
                            
                            const thinkingLines = doc.splitTextToSize(thinking.content, 165);
                            doc.text(thinkingLines, 25, yPosition + 8);
                            
                            yPosition += 8 + (thinkingLines.length * 4) + 5;
                        }
                    }
                }
                
                // Small delay between batches to prevent blocking
                if (i + batchSize < this.exportData.messages.length) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }
            
            // Footer with page numbers
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.text(`Page ${i} of ${totalPages}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 10);
            }
            
            console.log(`✅ PDF generated successfully: ${pageCount} pages, ${this.exportData.messages.length} messages`);
            return doc.output('blob');
            
        } catch (error) {
            console.error('💥 PDF generation failed:', error);
            
            // Attempt HTML fallback
            try {
                console.log('🔄 Attempting HTML fallback...');
                const htmlContent = await this.generateHTML(options);
                
                // Convert HTML to blob with PDF MIME type for download
                const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
                
                // Show warning to user
                this.showError('PDF generation failed, exported as HTML instead');
                
                return htmlBlob;
                
            } catch (fallbackError) {
                console.error('💥 HTML fallback also failed:', fallbackError);
                throw new Error(`PDF generation failed: ${error.message}. HTML fallback also failed: ${fallbackError.message}`);
            }
        }
    }
    
    generateMarkdown(options) {
        let md = `# AI Conversation Export\n\n`;
        md += `**Platform:** ${this.exportData.metadata.platform}\n`;
        md += `**Date:** ${this.exportData.metadata.exportDate}\n`;
        md += `**Messages:** ${this.exportData.metadata.messageCount}\n`;
        
        if (options.includeThinking && this.exportData.metadata.thinkingBlockCount > 0) {
            md += `**Thinking Blocks:** ${this.exportData.metadata.thinkingBlockCount}\n`;
        }
        
        md += `\n---\n\n`;
        
        this.exportData.messages.forEach(message => {
            md += `## ${message.author.charAt(0).toUpperCase() + message.author.slice(1)}\n\n`;
            
            if (options.includeThinking && message.thinkingBlocks && message.thinkingBlocks.length > 0) {
                md += `### 🤔 Thinking Process\n\n`;
                message.thinkingBlocks.forEach(thinking => {
                    md += `\`\`\`thinking\n${thinking.content}\n\`\`\`\n\n`;
                });
            }
            
            md += `${message.content}\n\n---\n\n`;
        });
        
        if (options.includeMetadata) {
            md += `\n## Export Metadata\n\n`;
            md += `\`\`\`json\n${JSON.stringify(this.exportData.metadata, null, 2)}\n\`\`\`\n`;
        }
        
        return md;
    }
    
    generateJSON(options) {
        let data = { ...this.exportData };
        
        if (!options.includeThinking) {
            data.messages = data.messages.map(msg => {
                const { thinkingBlocks, ...rest } = msg;
                return rest;
            });
            data.thinkingBlocks = [];
        }
        
        if (!options.includeHtml) {
            data.rawHtml = null;
            data.messages = data.messages.map(msg => {
                const { html, ...rest } = msg;
                return rest;
            });
        }
        
        if (!options.includeMetadata) {
            data.metadata = {
                platform: data.metadata.platform,
                exportDate: data.metadata.exportDate,
                messageCount: data.metadata.messageCount
            };
        }
        
        return JSON.stringify(data, null, 2);
    }
    
    generateCSV(options) {
        let csv = 'id,author,type,content,word_count,timestamp\n';
        
        this.exportData.messages.forEach(message => {
            const content = message.content.replace(/"/g, '""');
            csv += `"${message.id}","${message.author}","message","${content}","${message.wordCount || 0}","${message.timestamp}"\n`;
            
            if (options.includeThinking && message.thinkingBlocks) {
                message.thinkingBlocks.forEach(thinking => {
                    const thinkingContent = thinking.content.replace(/"/g, '""');
                    csv += `"${thinking.id}","${message.author}","thinking","${thinkingContent}","${thinking.wordCount || 0}","${message.timestamp}"\n`;
                });
            }
        });
        
        return csv;
    }
    
    generateHTML(options) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Conversation Export - ${this.exportData.metadata.exportDate}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        .message { margin: 20px 0; padding: 15px; border-radius: 8px; }
        .user { background: #f0f8ff; border-left: 4px solid #007bff; }
        .assistant { background: #f8f9fa; border-left: 4px solid #28a745; }
        .thinking { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 10px; margin: 10px 0; font-family: monospace; font-size: 0.9em; }
        .metadata { background: #e9ecef; padding: 10px; border-radius: 4px; font-size: 0.8em; color: #6c757d; margin-bottom: 20px; }
        h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        h2 { color: #007bff; margin-top: 30px; }
        .thinking-header { color: #856404; font-weight: bold; margin-bottom: 5px; }
    </style>
</head>
<body>
    <h1>🤖 AI Conversation Export</h1>
    
    <div class="metadata">
        <strong>Platform:</strong> ${this.exportData.metadata.platform}<br>
        <strong>Date:</strong> ${this.exportData.metadata.exportDate}<br>
        <strong>Messages:</strong> ${this.exportData.metadata.messageCount}<br>
        ${options.includeThinking ? `<strong>Thinking Blocks:</strong> ${this.exportData.metadata.thinkingBlockCount}<br>` : ''}
    </div>
    
    ${this.exportData.messages.map(message => `
        <div class="message ${message.author}">
            <h2>${message.author === 'user' ? '👤 User' : '🤖 Assistant'}</h2>
            
            ${options.includeThinking && message.thinkingBlocks && message.thinkingBlocks.length > 0 ? `
                <div class="thinking-header">🤔 Thinking Process:</div>
                ${message.thinkingBlocks.map(thinking => `
                    <div class="thinking">${this.escapeHtml(thinking.content)}</div>
                `).join('')}
            ` : ''}
            
            <div>${this.escapeHtml(message.content)}</div>
        </div>
    `).join('')}
    
    <div class="metadata">
        Generated by Universal AI Exporter v${this.version}
    </div>
</body>
</html>`;
    }
    
    generateText(options) {
        let text = `AI Conversation Export\n`;
        text += `Platform: ${this.exportData.metadata.platform}\n`;
        text += `Date: ${this.exportData.metadata.exportDate}\n`;
        text += `Messages: ${this.exportData.metadata.messageCount}\n\n`;
        text += `${'='.repeat(50)}\n\n`;
        
        this.exportData.messages.forEach(message => {
            text += `${message.author.toUpperCase()}:\n`;
            
            if (options.includeThinking && message.thinkingBlocks && message.thinkingBlocks.length > 0) {
                text += `\n[THINKING]\n`;
                message.thinkingBlocks.forEach(thinking => {
                    text += `${thinking.content}\n`;
                });
                text += `[/THINKING]\n\n`;
            }
            
            text += `${message.content}\n\n`;
            text += `${'-'.repeat(30)}\n\n`;
        });
        
        return text;
    }
    
    generateResearchArchive(options) {
        const archive = {
            version: this.version,
            timestamp: new Date().toISOString(),
            platform: this.exportData.metadata.platform,
            
            conversation: this.exportData,
            
            research: {
                thinkingAnalysis: this.analyzeThinkingPatterns(),
                conversationFlow: this.analyzeConversationFlow(),
                topicEvolution: this.analyzeTopicEvolution(),
                complexityMetrics: this.calculateComplexityMetrics()
            },
            
            rawData: options.includeHtml ? {
                originalHtml: this.exportData.rawHtml.original,
                expandedHtml: this.exportData.rawHtml.expanded
            } : null
        };
        
        return JSON.stringify(archive, null, 2);
    }
    
    analyzeThinkingPatterns() {
        if (!this.exportData.thinkingBlocks.length) return null;
        
        return {
            totalBlocks: this.exportData.thinkingBlocks.length,
            averageLength: this.exportData.thinkingBlocks.reduce((sum, block) => 
                sum + (block.wordCount || 0), 0) / this.exportData.thinkingBlocks.length,
            patterns: this.extractThinkingPatterns()
        };
    }
    
    extractThinkingPatterns() {
        const patterns = {
            reasoning: 0,
            questioning: 0,
            correction: 0,
            exploration: 0
        };
        
        this.exportData.thinkingBlocks.forEach(block => {
            const text = block.content.toLowerCase();
            
            if (text.includes('because') || text.includes('therefore') || text.includes('since')) {
                patterns.reasoning++;
            }
            
            if (text.includes('?') || text.includes('what if') || text.includes('should i')) {
                patterns.questioning++;
            }
            
            if (text.includes('actually') || text.includes('wait') || text.includes('correction')) {
                patterns.correction++;
            }
            
            if (text.includes('let me try') || text.includes('alternative') || text.includes('explore')) {
                patterns.exploration++;
            }
        });
        
        return patterns;
    }
    
    analyzeConversationFlow() {
        const flow = {
            turnCount: this.exportData.messages.length,
            userInitiated: this.exportData.messages[0]?.author === 'user',
            averageResponseLength: 0,
            topicShifts: 0
        };
        
        const assistantMessages = this.exportData.messages.filter(m => m.author === 'assistant');
        flow.averageResponseLength = assistantMessages.reduce((sum, msg) => 
            sum + (msg.wordCount || 0), 0) / assistantMessages.length;
        
        return flow;
    }
    
    analyzeTopicEvolution() {
        const keywordsByMessage = this.exportData.messages.map(msg => {
            const words = msg.content.toLowerCase().split(/\W+/);
            return words.filter(word => word.length > 4);
        });
        
        return {
            messageCount: keywordsByMessage.length,
            vocabularyEvolution: keywordsByMessage.map((keywords, index) => ({
                messageIndex: index,
                uniqueWords: [...new Set(keywords)].length,
                totalWords: keywords.length
            }))
        };
    }
    
    calculateComplexityMetrics() {
        return {
            averageMessageLength: this.exportData.metadata.totalWordCount / this.exportData.metadata.messageCount,
            vocabularyRichness: this.calculateVocabularyRichness(),
            structuralComplexity: this.calculateStructuralComplexity()
        };
    }
    
    calculateVocabularyRichness() {
        const allWords = this.exportData.messages
            .flatMap(msg => msg.content.toLowerCase().split(/\W+/))
            .filter(word => word.length > 3);
        
        const uniqueWords = new Set(allWords);
        
        return {
            totalWords: allWords.length,
            uniqueWords: uniqueWords.size,
            richness: uniqueWords.size / allWords.length
        };
    }
    
    calculateStructuralComplexity() {
        const hasCode = this.exportData.codeBlocks?.length > 0;
        const hasMath = this.exportData.mathExpressions?.length > 0;
        const hasArtifacts = this.exportData.artifacts?.length > 0;
        const hasThinking = this.exportData.thinkingBlocks.length > 0;
        
        return {
            hasCode,
            hasMath,
            hasArtifacts,
            hasThinking,
            complexityScore: [hasCode, hasMath, hasArtifacts, hasThinking].filter(Boolean).length
        };
    }
    
    updateStatus(text, progress) {
        const statusText = document.getElementById('uae-status')?.querySelector('.uae-status-text');
        const progressBar = document.getElementById('uae-progress');
        
        if (statusText) statusText.textContent = text;
        if (progressBar) progressBar.style.width = progress + '%';
    }
    
    showResults() {
        const resultsDiv = document.getElementById('uae-results');
        const statsDiv = document.getElementById('uae-stats');
        
        if (!resultsDiv || !statsDiv) return;
        
        statsDiv.innerHTML = `
            <div class="uae-stat">
                <span class="stat-label">Messages:</span>
                <span class="stat-value">${this.exportData.metadata.messageCount}</span>
            </div>
            <div class="uae-stat">
                <span class="stat-label">Words:</span>
                <span class="stat-value">${this.exportData.metadata.totalWordCount || 0}</span>
            </div>
            <div class="uae-stat">
                <span class="stat-label">Thinking Blocks:</span>
                <span class="stat-value">${this.exportData.metadata.thinkingBlockCount}</span>
            </div>
            <div class="uae-stat">
                <span class="stat-label">Platform:</span>
                <span class="stat-value">${this.exportData.metadata.platform}</span>
            </div>
        `;
        
        resultsDiv.style.display = 'block';
    }
    
    showError(message) {
        this.updateStatus(`❌ ${message}`, 0);
        
        setTimeout(() => {
            this.updateStatus('Ready to export your conversation', 0);
        }, 5000);
    }
    
    getExportOptions() {
        return {
            includeThinking: document.getElementById('include-thinking')?.checked ?? true,
            includeMetadata: document.getElementById('include-metadata')?.checked ?? true,
            includeHtml: document.getElementById('include-html')?.checked ?? true,
            filename: document.getElementById('export-filename')?.value || 'conversation-export'
        };
    }
    
    getFilename(format) {
        const options = this.getExportOptions();
        const base = options.filename || 'conversation-export';
        const timestamp = new Date().toISOString().slice(0, 10);
        
        const extensions = {
            'pdf': 'pdf',
            'markdown': 'md',
            'json': 'json',
            'csv': 'csv',
            'html': 'html',
            'txt': 'txt',
            'research': 'research.json'
        };
        
        return `${base}-${timestamp}.${extensions[format] || 'txt'}`;
    }
    
    getMimeType(format) {
        const mimeTypes = {
            'pdf': 'application/pdf',
            'markdown': 'text/markdown',
            'json': 'application/json',
            'csv': 'text/csv',
            'html': 'text/html',
            'txt': 'text/plain',
            'research': 'application/json'
        };
        
        return mimeTypes[format] || 'text/plain';
    }
    
    downloadFile(content, filename, mimeType) {
        // Legacy method maintained for backwards compatibility
        // New exports should use atomicDownload instead
        try {
            const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            
            document.body.appendChild(a);
            a.click();
            
            // Cleanup with delay to ensure download starts
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 1000);
            
            console.log(`📥 Downloaded: ${filename} (${blob.size} bytes)`);
            
        } catch (error) {
            console.error(`💥 Download failed for ${filename}:`, error);
            throw error;
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

window.ExportInterface = ExportInterface;
