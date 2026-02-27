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
        this.filenameManuallyEdited = false;
        
        this.formats = {
            'pdf': {
                name: 'PDF',
                icon: '📄',
                description: 'Professional PDF with formatting',
                premium: false,
                clientSide: true
            },
            'docx': {
                name: 'DOCX',
                icon: '📘',
                description: 'Editable Word document',
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
            'graph': {
                name: 'Graph JSON',
                icon: '🕸️',
                description: 'Memory graph nodes and edges',
                premium: true,
                clientSide: true
            },
            'memorypack': {
                name: 'Memory Pack',
                icon: '🧠',
                description: 'Bundle: graph + research + canonical',
                premium: true,
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
                        <div class="uae-brand-mark">U</div>
                        <div class="uae-title-copy">
                            <span class="uae-kicker">Conversation Capture</span>
                            <h3 id="uae-title-label">Universal AI Exporter</h3>
                        </div>
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

                        <label class="uae-checkbox" for="redact-sensitive">
                            <input type="checkbox" id="redact-sensitive">
                            <span class="checkmark"></span>
                            Redact sensitive data (emails, phones, tokens)
                        </label>

                        <label class="uae-checkbox" for="include-signature">
                            <input type="checkbox" id="include-signature">
                            <span class="checkmark"></span>
                            Include signed manifest (SHA-256)
                        </label>
                    </div>

                    <div class="uae-filename-group">
                        <label for="export-scope">Export Scope:</label>
                        <select id="export-scope" aria-label="Export scope">
                            <option value="all" selected>All messages</option>
                            <option value="single">Single message</option>
                            <option value="range">Message range</option>
                        </select>
                    </div>
                    
                    <div class="uae-range-group" id="uae-range-group">
                        <div class="uae-range-item">
                            <label for="scope-start">Start #</label>
                            <input type="number" id="scope-start" min="1" step="1" placeholder="1" />
                        </div>
                        <div class="uae-range-item">
                            <label for="scope-end">End #</label>
                            <input type="number" id="scope-end" min="1" step="1" placeholder="5" />
                        </div>
                    </div>
                    
                    <div class="uae-filename-group">
                        <label for="export-filename">Filename:</label>
                        <input type="text" id="export-filename" placeholder="conversation-export" aria-label="Export filename" />
                    </div>

                    <div class="uae-filename-group">
                        <label for="filename-template">Filename Template:</label>
                        <input type="text" id="filename-template" value="{base}" aria-label="Filename template" />
                        <small class="uae-helper">{base} {platform} {date} {time} {scope}</small>
                    </div>

                    <div class="uae-pdf-settings">
                        <div class="uae-section-title">PDF Options</div>
                        <div class="uae-range-group">
                            <div class="uae-range-item">
                                <label for="pdf-page-size">Page Size</label>
                                <select id="pdf-page-size">
                                    <option value="a4" selected>A4</option>
                                    <option value="letter">Letter</option>
                                </select>
                            </div>
                            <div class="uae-range-item">
                                <label for="pdf-orientation">Orientation</label>
                                <select id="pdf-orientation">
                                    <option value="portrait" selected>Portrait</option>
                                    <option value="landscape">Landscape</option>
                                </select>
                            </div>
                        </div>
                        <div class="uae-filename-group">
                            <label for="pdf-font-scale">Font Scale</label>
                            <input type="range" id="pdf-font-scale" min="0.8" max="1.4" step="0.1" value="1.0" />
                        </div>
                    </div>
                </div>
                
                <div class="uae-formats" id="uae-formats">
                    <div class="uae-section-title">Formats</div>
                    ${this.createFormatButtons()}
                </div>
                
                <div class="uae-actions">
                    <button class="uae-btn uae-btn-primary" id="analyze-btn" aria-label="Analyze conversation">
                        📊 Research Analysis
                    </button>
                    
                    <button class="uae-btn uae-btn-secondary" id="export-all-btn" aria-label="Export all formats">
                        📦 Export All Formats
                    </button>
                </div>
                
                <div class="uae-results" id="uae-results" style="display: none;">
                    <h4>📊 Research Mode</h4>
                    <div class="uae-stats" id="uae-stats"></div>
                    
                    <h4>📥 Downloads</h4>
                    <div class="uae-downloads" id="uae-downloads"></div>

                    <h4>🕘 Recent Exports</h4>
                    <div class="uae-history" id="uae-history-list"></div>
                </div>
                
                <div class="uae-footer">
                    <div class="uae-version">v${this.version}</div>
                    <div class="uae-privacy">🔒 Privacy-first • No data stored</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.ui);
        this.updateScopeControls();
    }
    
    createFormatButtons() {
        return Object.entries(this.formats).map(([key, format]) => `
            <button class="uae-format-btn ${format.premium ? 'premium' : ''}" 
                    data-format="${key}" 
                    title="${format.description}" aria-label="Export as ${format.name}">
                <span class="format-icon">${format.icon}</span>
                <span class="format-name">${format.name}</span>
                <span class="format-description">${format.description}</span>
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
            
            const formatButton = e.target.closest?.('.uae-format-btn');
            if (formatButton) {
                const format = formatButton.getAttribute('data-format');
                this.exportFormat(format);
            }
            
            const downloadButton = e.target.closest?.('.uae-download-btn');
            if (downloadButton) {
                const format = downloadButton.getAttribute('data-format');
                const content = downloadButton.getAttribute('data-content');
                this.downloadFile(content, this.getFilename(format), this.getMimeType(format));
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.ui && this.ui.classList.contains('uae-visible')) {
                this.hideUI();
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target?.id === 'export-scope') {
                this.updateScopeControls();
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target?.id === 'export-filename') {
                this.filenameManuallyEdited = true;
            }
        });
    }
    
    async analyzeConversation() {
        try {
            this.updateStatus('Analyzing conversation...', 10);
            
            const ExtractorClass = window[this.platformInfo.config.extractor] || UniversalExtractor;
            this.extractor = new ExtractorClass(this.platformInfo);
            
            this.exportData = await this.extractor.extractConversation();
            this.normalizeAndValidateExportData();
            this.autoPopulateFilenameFromTitle();
            
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
            this.normalizeAndValidateExportData();
            
            this.updateStatus(`Generating ${format.toUpperCase()}...`, 50);
            
            const content = await this.generateFormat(format);
            const filename = this.getFilename(format);
            const mimeType = this.getMimeType(format);
            
            await this.downloadFile(content, filename, mimeType);
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
            this.normalizeAndValidateExportData();
            
            const formats = Object.keys(this.formats);
            for (let i = 0; i < formats.length; i++) {
                const format = formats[i];
                this.updateStatus(`Generating ${format.toUpperCase()}... (${i + 1}/${formats.length})`, 
                                (i / formats.length) * 100);
                
                const content = await this.generateFormat(format);
                const filename = this.getFilename(format);
                const mimeType = this.getMimeType(format);
                
                await new Promise(resolve => setTimeout(resolve, 500));
                await this.downloadFile(content, filename, mimeType);
            }
            
            this.updateStatus('All formats exported!', 100);
            
        } catch (error) {
            console.error('❌ Bulk export failed:', error);
            this.showError('Bulk export failed: ' + error.message);
        }
    }
    
    async generateFormat(format) {
        this.normalizeAndValidateExportData();
        const options = this.getExportOptions();
        
        switch (format) {
            case 'pdf':
                return await this.generatePDF(options);
            case 'docx':
                return await this.generateDOCX(options);
            case 'markdown':
                return this.generateMarkdown(options);
            case 'json':
                return this.generateJSON(options);
            case 'graph':
                return this.generateGraphJSON(options);
            case 'memorypack':
                return this.generateMemoryPack(options);
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

    updateScopeControls() {
        const scope = document.getElementById('export-scope')?.value || 'all';
        const rangeGroup = document.getElementById('uae-range-group');
        if (!rangeGroup) return;
        rangeGroup.style.display = scope === 'all' ? 'none' : 'grid';
    }

    parsePositiveInt(value) {
        const parsed = parseInt(String(value || '').trim(), 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }

    resolveMessageRange(options, totalMessages) {
        const scope = options.scope || 'all';

        if (scope === 'single') {
            const index = this.parsePositiveInt(options.scopeStart) || totalMessages;
            const oneBased = Math.min(totalMessages, Math.max(1, index));
            return { start: oneBased - 1, end: oneBased - 1, label: `message-${oneBased}` };
        }

        if (scope === 'range') {
            const start = this.parsePositiveInt(options.scopeStart) || 1;
            const end = this.parsePositiveInt(options.scopeEnd) || totalMessages;
            const clampedStart = Math.min(totalMessages, Math.max(1, start));
            const clampedEnd = Math.min(totalMessages, Math.max(clampedStart, end));
            return { start: clampedStart - 1, end: clampedEnd - 1, label: `range-${clampedStart}-${clampedEnd}` };
        }

        return { start: 0, end: totalMessages - 1, label: 'all' };
    }

    buildScopedExportData(options) {
        const totalMessages = this.exportData.messages.length;
        const range = this.resolveMessageRange(options, totalMessages);
        const scopedMessages = this.exportData.messages.slice(range.start, range.end + 1);
        const scopedThinkingBlocks = scopedMessages.flatMap((message) => message.thinkingBlocks || []);
        const totalWordCount = scopedMessages.reduce((sum, message) => sum + (message.wordCount || 0), 0);

        const scopedMetadata = {
            ...this.exportData.metadata,
            messageCount: scopedMessages.length,
            thinkingBlockCount: scopedThinkingBlocks.length,
            totalWordCount,
            scope: range.label
        };

        scopedMetadata.blockTypeBreakdown = scopedThinkingBlocks.reduce((acc, block) => {
            const type = block.type || 'thinking';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        const referenceIndex = this.computeReferenceIndexFromMessages(scopedMessages);
        scopedMetadata.referenceIndex = referenceIndex;
        scopedMetadata.referenceCount = referenceIndex.total;
        scopedMetadata.linkCount = referenceIndex.links.length;
        scopedMetadata.attachmentCount = referenceIndex.attachments.length;
        scopedMetadata.citationCount = referenceIndex.citations.length;
        scopedMetadata.uploadedDocuments = this.computeUploadedDocumentsFromMessages(scopedMessages);
        scopedMetadata.uploadedDocumentCount = scopedMetadata.uploadedDocuments.length;

        return {
            ...this.exportData,
            messages: scopedMessages,
            thinkingBlocks: scopedThinkingBlocks,
            metadata: scopedMetadata
        };
    }

    normalizeReferenceSet(refs) {
        return {
            links: Array.isArray(refs?.links) ? refs.links : [],
            attachments: Array.isArray(refs?.attachments) ? refs.attachments : [],
            documents: Array.isArray(refs?.documents) ? refs.documents : [],
            citations: Array.isArray(refs?.citations) ? refs.citations : []
        };
    }

    dedupeBySignature(items, signatureFn) {
        const seen = new Set();
        const deduped = [];
        (items || []).forEach((item) => {
            const signature = signatureFn(item);
            if (!signature || seen.has(signature)) return;
            seen.add(signature);
            deduped.push(item);
        });
        return deduped;
    }

    computeReferenceIndexFromMessages(messages) {
        const combined = {
            links: [],
            attachments: [],
            documents: [],
            citations: []
        };

        (messages || []).forEach((message) => {
            const refs = this.normalizeReferenceSet(message.references);
            combined.links.push(...refs.links);
            combined.attachments.push(...refs.attachments);
            combined.documents.push(...refs.documents);
            combined.citations.push(...refs.citations);
        });

        combined.links = this.dedupeBySignature(combined.links, (item) => `${item.url || ''}|${item.title || ''}`);
        combined.attachments = this.dedupeBySignature(combined.attachments, (item) => `${item.name || ''}|${item.url || ''}|${item.type || ''}`);
        combined.documents = this.dedupeBySignature(combined.documents, (item) => `${item.name || ''}|${item.url || ''}|${item.type || ''}`);
        combined.citations = this.dedupeBySignature(combined.citations, (item) => `${item.text || ''}|${item.url || ''}`);

        const total = combined.links.length + combined.attachments.length + combined.documents.length + combined.citations.length;
        return { ...combined, total };
    }

    computeUploadedDocumentsFromMessages(messages) {
        const docs = [];
        (messages || []).forEach((message) => {
            if ((message.author || '').toLowerCase() !== 'user') return;
            const refs = this.normalizeReferenceSet(message.references);
            const combined = [...refs.attachments, ...refs.documents];
            combined.forEach((item) => {
                const name = (item?.name || '').trim();
                const url = item?.url || null;
                const type = item?.type || 'file';
                if (!name && !url) return;
                docs.push({
                    messageId: message.id || null,
                    author: 'user',
                    name: name || (url ? String(url).split('/').pop() : 'document'),
                    type,
                    url,
                    sizeLabel: item?.sizeLabel || null
                });
            });
        });

        return this.dedupeBySignature(
            docs,
            (item) => `${item.messageId || ''}|${item.name || ''}|${item.url || ''}|${item.type || ''}|${item.sizeLabel || ''}`
        );
    }

    formatPlatformName(value) {
        const normalized = String(value || '').trim().toLowerCase();
        const map = {
            chatgpt: 'GPT',
            claude: 'Claude',
            gemini: 'Gemini',
            grok: 'Grok',
            perplexity: 'Perplexity',
            qwen3: 'Qwen',
            deepseek: 'DeepSeek',
            llama: 'Llama',
            bing: 'Bing',
            poe: 'Poe',
            manus: 'Manus',
            devin: 'Devin',
            character: 'Character.AI'
        };
        if (map[normalized]) return map[normalized];
        if (!normalized) return 'Assistant';
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }

    getAssistantLabel(sourceData = this.exportData) {
        const platform = sourceData?.metadata?.platform || this.platformInfo?.platform || '';
        return this.formatPlatformName(platform);
    }

    getAuthorLabel(author, sourceData = this.exportData) {
        const normalized = String(author || '').trim().toLowerCase();
        if (normalized === 'user') return 'User';
        return this.getAssistantLabel(sourceData);
    }
    
    async generatePDF(options) {
        try {
            // Verify jsPDF is available
            if (!window.jspdf || !window.jspdf.jsPDF) {
                throw new Error('PDF library not available');
            }
            
            const { jsPDF } = window.jspdf;
            const scoped = this.getPreparedExportData(options);
            const doc = new jsPDF({
                orientation: options.pdfOrientation || 'portrait',
                format: options.pdfPageSize || 'a4'
            });
            const scale = Math.max(0.8, Math.min(1.4, Number(options.pdfFontScale || 1)));
            const lineWidth = options.pdfOrientation === 'landscape' ? 245 : 170;
            
            // Add metadata
            doc.setProperties({
                title: `AI Conversation - ${scoped.metadata.platform}`,
                creator: 'Universal AI Exporter',
                subject: 'AI Conversation Export'
            });
            
            // Header
            doc.setFontSize(Math.round(16 * scale));
            doc.text('AI Conversation Export', 20, 20);
            
            // Metadata section
            doc.setFontSize(Math.round(12 * scale));
            doc.text(`Platform: ${scoped.metadata.platform}`, 20, 40);
            doc.text(`Date: ${scoped.metadata.exportDate}`, 20, 50);
            doc.text(`Messages: ${scoped.metadata.messageCount}`, 20, 60);
            
            if (options.includeThinking && scoped.metadata.thinkingBlockCount > 0) {
                doc.text(`Thinking Blocks: ${scoped.metadata.thinkingBlockCount}`, 20, 70);
            }
            
            let yPosition = 90;
            let pageCount = 1;
            
            // Process messages in chunks to avoid memory issues
            const batchSize = 10;
            for (let i = 0; i < scoped.messages.length; i += batchSize) {
                const batch = scoped.messages.slice(i, i + batchSize);
                
                for (const message of batch) {
                    // Check if we need a new page
                    if (yPosition > 250) {
                        doc.addPage();
                        yPosition = 20;
                        pageCount++;
                        
                        // Progress update for large PDFs
                        if (pageCount % 5 === 0) {
                            const progress = Math.min(85, 40 + (i / scoped.messages.length) * 40);
                            this.updateStatus(`Generating PDF... page ${pageCount}`, progress);
                            await new Promise(resolve => setTimeout(resolve, 10)); // Allow UI update
                        }
                    }
                    
                    // Message header
                    doc.setFontSize(Math.round(10 * scale));
                    doc.setFont(undefined, 'bold');
                    doc.text(`${this.getAuthorLabel(message.author, scoped).toUpperCase()}:`, 20, yPosition);
                    
                    // Message content
                    doc.setFont(undefined, 'normal');
                    const lines = doc.splitTextToSize(message.content, lineWidth);
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
                            
                            doc.setFontSize(Math.round(8 * scale));
                            doc.setFont(undefined, 'italic');
                            doc.text('💭 THINKING:', 25, yPosition);
                            
                            const thinkingLines = doc.splitTextToSize(thinking.content, lineWidth - 5);
                            doc.text(thinkingLines, 25, yPosition + 8);
                            
                            yPosition += 8 + (thinkingLines.length * 4) + 5;
                        }
                    }
                }
                
                // Small delay between batches to prevent blocking
                if (i + batchSize < scoped.messages.length) {
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
            
            console.log(`✅ PDF generated successfully: ${pageCount} pages, ${scoped.messages.length} messages`);
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

    async generateDOCX(options) {
        if (!window.docx) {
            throw new Error('DOCX library not available');
        }

        const scoped = this.getPreparedExportData(options);
        const { Document, Packer, Paragraph, TextRun, HeadingLevel } = window.docx;
        const children = [];

        children.push(
            new Paragraph({
                heading: HeadingLevel.HEADING_1,
                children: [new TextRun('AI Conversation Export')]
            }),
            new Paragraph(`Platform: ${scoped.metadata.platform}`),
            new Paragraph(`Date: ${scoped.metadata.exportDate}`),
            new Paragraph(`Messages: ${scoped.metadata.messageCount}`),
            new Paragraph('')
        );

        scoped.messages.forEach((message) => {
            children.push(
                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    children: [new TextRun(this.getAuthorLabel(message.author, scoped).toUpperCase())]
                }),
                new Paragraph(message.content || '')
            );

            if (options.includeThinking && Array.isArray(message.thinkingBlocks)) {
                message.thinkingBlocks.forEach((block) => {
                    children.push(
                        new Paragraph({
                            children: [
                                new TextRun({ text: `[${(block.type || 'thinking').toUpperCase()}] `, bold: true }),
                                new TextRun(block.content || '')
                            ]
                        })
                    );
                });
            }

            children.push(new Paragraph(''));
        });

        const doc = new Document({
            sections: [{ children }]
        });

        return Packer.toBlob(doc);
    }

    applySensitiveRedaction(text) {
        if (!text || typeof text !== 'string') return text;

        return text
            .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
            .replace(/\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?){2}\d{4}\b/g, '[REDACTED_PHONE]')
            .replace(/\b(?:sk-[A-Za-z0-9]{12,}|xox[baprs]-[A-Za-z0-9-]{10,}|ghp_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z-_]{20,})\b/g, '[REDACTED_TOKEN]')
            .replace(/\b(?:password|passwd|api[_-]?key|secret|token)\s*[:=]\s*[^\s]+/gi, '[REDACTED_CREDENTIAL]')
            .replace(/\b[\w.-]+\.(pdf|doc|docx|txt|md|csv|xlsx|xls|ppt|pptx|json|xml|yaml|yml)\b/gi, '[REDACTED_FILE].$1');
    }

    redactFilename(value) {
        if (!value || typeof value !== 'string') return value;
        const extMatch = value.trim().match(/\.([a-z0-9]+)$/i);
        const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '';
        return `[REDACTED_FILE]${ext}`;
    }

    redactUrl(value) {
        if (!value || typeof value !== 'string') return value;
        try {
            const url = new URL(value);
            return `${url.origin}/[REDACTED_PATH]`;
        } catch (error) {
            return this.applySensitiveRedaction(value);
        }
    }

    redactReferenceSet(refs) {
        const source = this.normalizeReferenceSet(refs);
        return {
            links: source.links.map((item) => ({
                ...item,
                title: this.redactFilename(this.applySensitiveRedaction(item.title || '')),
                url: this.redactUrl(item.url || '')
            })),
            attachments: source.attachments.map((item) => ({
                ...item,
                name: this.redactFilename(this.applySensitiveRedaction(item.name || '')),
                url: this.redactUrl(item.url || ''),
                sizeLabel: this.applySensitiveRedaction(item.sizeLabel || '')
            })),
            documents: source.documents.map((item) => ({
                ...item,
                name: this.redactFilename(this.applySensitiveRedaction(item.name || '')),
                url: this.redactUrl(item.url || ''),
                sizeLabel: this.applySensitiveRedaction(item.sizeLabel || '')
            })),
            citations: source.citations.map((item) => ({
                ...item,
                text: this.applySensitiveRedaction(item.text || ''),
                url: this.redactUrl(item.url || '')
            }))
        };
    }

    sanitizeExportDataForOptions(sourceData, options) {
        if (!options.redactSensitive) {
            return sourceData;
        }

        const clone = JSON.parse(JSON.stringify(sourceData));

        clone.messages = (clone.messages || []).map((message) => ({
            ...message,
            content: this.applySensitiveRedaction(message.content || ''),
            html: this.applySensitiveRedaction(message.html || ''),
            references: this.redactReferenceSet(message.references),
            thinkingBlocks: (message.thinkingBlocks || []).map((block) => ({
                ...block,
                content: this.applySensitiveRedaction(block.content || ''),
                summary: this.applySensitiveRedaction(block.summary || ''),
                html: this.applySensitiveRedaction(block.html || ''),
                richHtml: this.applySensitiveRedaction(block.richHtml || '')
            }))
        }));

        clone.thinkingBlocks = (clone.thinkingBlocks || []).map((block) => ({
            ...block,
            content: this.applySensitiveRedaction(block.content || ''),
            summary: this.applySensitiveRedaction(block.summary || ''),
            html: this.applySensitiveRedaction(block.html || ''),
            richHtml: this.applySensitiveRedaction(block.richHtml || '')
        }));

        if (clone.metadata && clone.metadata.referenceIndex) {
            clone.metadata.referenceIndex = this.redactReferenceSet(clone.metadata.referenceIndex);
        }

        if (clone.metadata && Array.isArray(clone.metadata.uploadedDocuments)) {
            clone.metadata.uploadedDocuments = clone.metadata.uploadedDocuments.map((item) => ({
                ...item,
                name: this.redactFilename(this.applySensitiveRedaction(item.name || '')),
                url: this.redactUrl(item.url || ''),
                sizeLabel: this.applySensitiveRedaction(item.sizeLabel || '')
            }));
        }

        if (clone.rawHtml) {
            clone.rawHtml = {
                original: options.includeHtml ? this.applySensitiveRedaction(clone.rawHtml.original || '') : null,
                expanded: options.includeHtml ? this.applySensitiveRedaction(clone.rawHtml.expanded || '') : null
            };
        }

        return clone;
    }

    getPreparedExportData(options) {
        const scoped = this.buildScopedExportData(options);
        return this.sanitizeExportDataForOptions(scoped, options);
    }
    
    generateMarkdown(options) {
        const scoped = this.getPreparedExportData(options);
        let md = `# AI Conversation Export\n\n`;
        md += `**Platform:** ${scoped.metadata.platform}\n`;
        md += `**Date:** ${scoped.metadata.exportDate}\n`;
        md += `**Messages:** ${scoped.metadata.messageCount}\n`;

        if (options.includeThinking && scoped.metadata.thinkingBlockCount > 0) {
            md += `**Blocks:** ${scoped.metadata.thinkingBlockCount} (${this.formatBlockBreakdown(scoped)})\n`;
        }
        if ((scoped.metadata.uploadedDocumentCount || 0) > 0) {
            md += `**Uploaded Documents:** ${scoped.metadata.uploadedDocumentCount}\n`;
        }

        md += `\n---\n\n`;

        scoped.messages.forEach(message => {
            md += `## ${this.getAuthorLabel(message.author, scoped)}\n\n`;

            if (options.includeThinking && message.thinkingBlocks && message.thinkingBlocks.length > 0) {
                message.thinkingBlocks.forEach(block => {
                    md += this.renderBlockMarkdown(block);
                });
            }

            md += `${message.content}\n\n---\n\n`;
        });

        if (options.includeMetadata) {
            md += `\n## Export Metadata\n\n`;
            md += `\`\`\`json\n${JSON.stringify(scoped.metadata, null, 2)}\n\`\`\`\n`;
        }

        if ((scoped.metadata.uploadedDocumentCount || 0) > 0) {
            md += `\n## Uploaded Documents\n\n`;
            scoped.metadata.uploadedDocuments.forEach((doc) => {
                const size = doc.sizeLabel ? ` • ${doc.sizeLabel}` : '';
                const url = doc.url || '';
                if (url) {
                    md += `- ${doc.name} (${doc.type}${size}) — ${url}\n`;
                } else {
                    md += `- ${doc.name} (${doc.type}${size})\n`;
                }
            });
            md += '\n';
        }

        return md;
    }

    /**
     * Render a block as Markdown based on its type.
     */
    renderBlockMarkdown(block) {
        const type = block.type || 'thinking';
        const labels = {
            thinking: 'Extended Thinking',
            web_search: 'Web Search',
            tool_call: 'Tool Call',
            prompt_chain: 'Prompt Chain',
            code: 'Code',
            file_edit: 'File Edit'
        };
        let md = '';

        md += `### ${labels[type] || 'Block'}\n\n`;

        if (type === 'web_search' && block.structuredData) {
            const data = block.structuredData;
            if (data.queries?.length > 0) {
                data.queries.forEach(q => { md += `**Searched:** "${q}"\n\n`; });
            }
            if (data.results?.length > 0) {
                data.results.forEach(r => {
                    const url = r.url || r.domain || '';
                    if (url.startsWith('http')) {
                        md += `- [${r.title}](${url})\n`;
                    } else {
                        md += `- ${r.title} — ${url}\n`;
                    }
                });
                md += '\n';
            } else {
                md += `${block.content}\n\n`;
            }
        } else if (type === 'tool_call') {
            const data = block.structuredData;
            if (data?.description) md += `> ${data.description}\n\n`;
            if (data?.commands?.length > 0) {
                data.commands.forEach(cmd => { md += `\`\`\`bash\n${cmd}\n\`\`\`\n\n`; });
            }
            if (data?.outputs?.length > 0) {
                data.outputs.forEach(out => { md += `**Output:**\n\`\`\`\n${out}\n\`\`\`\n\n`; });
            }
            if ((!data?.commands || data.commands.length === 0) && (!data?.outputs || data.outputs.length === 0)) {
                md += `\`\`\`\n${block.content}\n\`\`\`\n\n`;
            }
        } else if (type === 'code') {
            md += `\`\`\`\n${block.content}\n\`\`\`\n\n`;
        } else {
            // thinking or file_edit — use fenced block
            md += `\`\`\`${type}\n${block.content}\n\`\`\`\n\n`;
        }

        return md;
    }
    
    generateJSON(options) {
        let data = this.getPreparedExportData(options);
        
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

    generateGraphJSON(options) {
        const scoped = this.getPreparedExportData(options);
        const nodes = [];
        const edges = [];

        const conversationId = `conversation:${scoped.metadata.platform}:${scoped.metadata.exportDate}`;
        nodes.push({
            id: conversationId,
            type: 'conversation',
            label: `Conversation (${scoped.metadata.platform})`,
            metadata: {
                platform: scoped.metadata.platform,
                exportDate: scoped.metadata.exportDate,
                scope: scoped.metadata.scope || 'all'
            }
        });

        const pushNode = (node) => {
            if (!nodes.some((existing) => existing.id === node.id)) {
                nodes.push(node);
            }
        };

        scoped.messages.forEach((message, msgIndex) => {
            const messageId = `message:${message.id || msgIndex}`;
            pushNode({
                id: messageId,
                type: 'message',
                label: `${message.author} #${msgIndex + 1}`,
                metadata: {
                    author: message.author,
                    timestamp: message.timestamp || null,
                    wordCount: message.wordCount || 0
                }
            });
            edges.push({ from: conversationId, to: messageId, type: 'contains' });

            (message.thinkingBlocks || []).forEach((block, blockIndex) => {
                const blockId = `block:${messageId}:${block.id || blockIndex}`;
                pushNode({
                    id: blockId,
                    type: block.type || 'thinking',
                    label: (block.summary || block.type || 'thinking').slice(0, 120),
                    metadata: {
                        wordCount: block.wordCount || 0
                    }
                });
                edges.push({ from: messageId, to: blockId, type: 'has_trace' });
            });

            const refs = this.normalizeReferenceSet(message.references);
            refs.links.forEach((link, refIndex) => {
                const refId = `ref:link:${messageId}:${refIndex}:${link.url || link.title || 'unknown'}`;
                pushNode({
                    id: refId,
                    type: 'link',
                    label: link.title || link.url || 'link',
                    metadata: { url: link.url || '', domain: link.domain || '' }
                });
                edges.push({ from: messageId, to: refId, type: 'references' });
            });

            refs.documents.forEach((doc, refIndex) => {
                const refId = `ref:document:${messageId}:${refIndex}:${doc.url || doc.name || 'unknown'}`;
                pushNode({
                    id: refId,
                    type: 'document',
                    label: doc.name || doc.url || 'document',
                    metadata: { url: doc.url || '', docType: doc.type || '' }
                });
                edges.push({ from: messageId, to: refId, type: 'references' });
            });

            refs.attachments.forEach((attachment, refIndex) => {
                const refId = `ref:attachment:${messageId}:${refIndex}:${attachment.name || 'attachment'}`;
                pushNode({
                    id: refId,
                    type: 'attachment',
                    label: attachment.name || 'attachment',
                    metadata: { url: attachment.url || '', attachmentType: attachment.type || '' }
                });
                edges.push({ from: messageId, to: refId, type: 'attached' });
            });
        });

        return JSON.stringify({
            schemaVersion: '1.0',
            generatedAt: new Date().toISOString(),
            graph: { nodes, edges }
        }, null, 2);
    }

    generateMemoryPack(options) {
        const scoped = this.getPreparedExportData(options);
        const graphPayload = JSON.parse(this.generateGraphJSON(options));
        const research = {
            thinkingAnalysis: this.analyzeThinkingPatterns(),
            conversationFlow: this.analyzeConversationFlow(),
            topicEvolution: this.analyzeTopicEvolution(),
            complexityMetrics: this.calculateComplexityMetrics()
        };

        return JSON.stringify({
            schemaVersion: '1.0',
            generatedAt: new Date().toISOString(),
            platform: scoped.metadata.platform,
            metadata: scoped.metadata,
            canonical: {
                messages: scoped.messages,
                thinkingBlocks: scoped.thinkingBlocks
            },
            graph: graphPayload.graph,
            research
        }, null, 2);
    }
    
    generateCSV(options) {
        const scoped = this.getPreparedExportData(options);
        let csv = 'id,author,type,content,word_count,timestamp\n';
        
        scoped.messages.forEach(message => {
            const content = message.content.replace(/"/g, '""');
            const authorLabel = this.getAuthorLabel(message.author, scoped).replace(/"/g, '""');
            csv += `"${message.id}","${authorLabel}","message","${content}","${message.wordCount || 0}","${message.timestamp}"\n`;
            
            if (options.includeThinking && message.thinkingBlocks) {
                message.thinkingBlocks.forEach(block => {
                    const thinkingContent = block.content.replace(/"/g, '""');
                    const type = block.type || 'thinking';
                    csv += `"${block.id}","${authorLabel}","${type}","${thinkingContent}","${block.wordCount || 0}","${message.timestamp}"\n`;
                });
            }
        });

        (scoped.metadata.uploadedDocuments || []).forEach((doc, index) => {
            const content = [doc.name || 'document', doc.type || 'file', doc.sizeLabel || '', doc.url || '']
                .filter(Boolean)
                .join(' | ')
                .replace(/"/g, '""');
            csv += `"upload_${index}","User","uploaded_document","${content}","0",""\n`;
        });
        
        return csv;
    }
    
    generateHTML(options) {
        const scoped = this.getPreparedExportData(options);
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Conversation Export - ${scoped.metadata.exportDate}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #1a1a2e; }
        .message { margin: 24px 0; padding: 18px; border-radius: 8px; }
        .user { background: #f0f8ff; border-left: 4px solid #007bff; }
        .assistant { background: #f8f9fa; border-left: 4px solid #28a745; }
        .metadata { background: #e9ecef; padding: 12px 16px; border-radius: 6px; font-size: 0.85em; color: #6c757d; margin-bottom: 24px; }
        h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        h2 { color: #007bff; margin-top: 30px; }

        /* ── Block type styles ── */
        .block-container { margin: 12px 0; border-radius: 6px; overflow: hidden; }
        .block-label { font-size: 0.75em; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; padding: 6px 12px; }
        .block-content { padding: 12px 14px; font-size: 0.9em; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word; }

        /* Thinking */
        .block-thinking { background: #fff3cd; border: 1px solid #ffeaa7; }
        .block-thinking .block-label { color: #856404; background: #ffeaa7; }
        .block-thinking .block-content { font-family: 'Georgia', serif; color: #5a4e1a; }

        /* Web Search */
        .block-web_search { background: #e8f4fd; border: 1px solid #b8daff; }
        .block-web_search .block-label { color: #004085; background: #b8daff; }
        .block-web_search .block-content { font-family: -apple-system, sans-serif; color: #1a3a5c; }
        .search-result { margin: 6px 0; padding: 6px 0; border-bottom: 1px solid #d4e6f5; }
        .search-result:last-child { border-bottom: none; }
        .search-result .result-title { font-weight: 600; color: #1a0dab; }
        .search-result .result-url { font-size: 0.8em; color: #006621; }

        /* Tool Call */
        .block-tool_call { background: #1e1e2e; border: 1px solid #333; }
        .block-tool_call .block-label { color: #a6e3a1; background: #181825; }
        .block-tool_call .block-content { font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace; color: #cdd6f4; font-size: 0.85em; }

        /* Code */
        .block-code { background: #282c34; border: 1px solid #3e4451; }
        .block-code .block-label { color: #e5c07b; background: #21252b; }
        .block-code .block-content { font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace; color: #abb2bf; font-size: 0.85em; }

        /* File Edit */
        .block-file_edit { background: #f0fff4; border: 1px solid #c6f6d5; }
        .block-file_edit .block-label { color: #276749; background: #c6f6d5; }
        .block-file_edit .block-content { font-family: 'SF Mono', monospace; color: #2d3748; font-size: 0.85em; }

        /* Summary toggle (for long blocks) */
        .block-summary { font-size: 0.8em; color: #6c757d; font-style: italic; padding: 4px 12px; cursor: pointer; }
        .block-summary:hover { color: #495057; }

        /* Response content */
        .response-content { white-space: pre-wrap; word-wrap: break-word; }
    </style>
</head>
<body>
    <h1>AI Conversation Export</h1>

    <div class="metadata">
        <strong>Platform:</strong> ${scoped.metadata.platform}<br>
        <strong>Date:</strong> ${scoped.metadata.exportDate}<br>
        <strong>Messages:</strong> ${scoped.metadata.messageCount}<br>
        ${options.includeThinking ? `<strong>Blocks:</strong> ${scoped.metadata.thinkingBlockCount} (${this.formatBlockBreakdown(scoped)})<br>` : ''}
        ${(scoped.metadata.uploadedDocumentCount || 0) > 0 ? `<strong>Uploaded Documents:</strong> ${scoped.metadata.uploadedDocumentCount}<br>` : ''}
    </div>

    ${scoped.messages.map(message => `
        <div class="message ${message.author}">
            <h2>${this.escapeHtml(this.getAuthorLabel(message.author, scoped))}</h2>

            ${options.includeThinking && message.thinkingBlocks && message.thinkingBlocks.length > 0 ?
                message.thinkingBlocks.map(block => this.renderBlock(block)).join('')
            : ''}

            <div class="response-content">${this.escapeHtml(message.content)}</div>
        </div>
    `).join('')}

    ${(scoped.metadata.uploadedDocumentCount || 0) > 0 ? `
    <h2>Uploaded Documents</h2>
    <div class="metadata">
        ${(scoped.metadata.uploadedDocuments || []).map((doc) => {
            const size = doc.sizeLabel ? ` • ${this.escapeHtml(doc.sizeLabel)}` : '';
            const label = `${this.escapeHtml(doc.name || 'document')} (${this.escapeHtml(doc.type || 'file')}${size})`;
            if (doc.url) {
                return `<div><a href="${this.escapeHtml(doc.url)}" target="_blank" rel="noopener">${label}</a></div>`;
            }
            return `<div>${label}</div>`;
        }).join('')}
    </div>
    ` : ''}

    <div class="metadata">
        Generated by Universal AI Exporter v${this.version} (Enhanced)
    </div>
</body>
</html>`;
    }

    /**
     * Render a single thinking/tool/search block as HTML based on its type.
     */
    renderBlock(block) {
        const type = block.type || 'thinking';
        const labels = {
            thinking: 'Extended Thinking',
            web_search: 'Web Search',
            tool_call: 'Tool Call',
            prompt_chain: 'Prompt Chain',
            code: 'Code',
            file_edit: 'File Edit'
        };

        let contentHtml = '';

        // Render structured content when available
        if (type === 'web_search' && block.structuredData) {
            contentHtml = this.renderWebSearchBlock(block);
        } else if (type === 'tool_call' && block.structuredData) {
            contentHtml = this.renderToolCallBlock(block);
        } else {
            // Default: render the full text content
            contentHtml = `<div class="block-content">${this.escapeHtml(block.content)}</div>`;
        }

        return `
            <div class="block-container block-${type}">
                <div class="block-label">${labels[type] || 'Block'}</div>
                ${contentHtml}
            </div>
        `;
    }

    /**
     * Render a web search block with structured results.
     */
    renderWebSearchBlock(block) {
        const data = block.structuredData;
        let html = '<div class="block-content">';

        // Show search queries
        if (data.queries && data.queries.length > 0) {
            data.queries.forEach(q => {
                html += `<div style="font-weight:600; margin-bottom:8px;">Searched: "${this.escapeHtml(q)}"</div>`;
            });
        }

        // Show results with links
        if (data.results && data.results.length > 0) {
            html += `<div style="font-size:0.85em; color:#666; margin-bottom:8px;">${data.results.length} results</div>`;
            data.results.forEach(r => {
                const url = r.url || r.domain || '';
                const displayUrl = url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
                html += `<div class="search-result">`;
                if (url.startsWith('http')) {
                    html += `<div class="result-title"><a href="${this.escapeHtml(url)}" target="_blank" rel="noopener">${this.escapeHtml(r.title)}</a></div>`;
                } else {
                    html += `<div class="result-title">${this.escapeHtml(r.title)}</div>`;
                }
                html += `<div class="result-url">${this.escapeHtml(displayUrl)}</div>`;
                html += `</div>`;
            });
        } else {
            // No structured results parsed — show raw content
            html += this.escapeHtml(block.content);
        }

        html += '</div>';
        return html;
    }

    /**
     * Render a tool call block with command and output sections.
     */
    renderToolCallBlock(block) {
        const data = block.structuredData;
        let html = '<div class="block-content">';

        if (data.description) {
            html += `<div style="color:#a6e3a1; margin-bottom:8px;"># ${this.escapeHtml(data.description)}</div>`;
        }

        if (data.commands && data.commands.length > 0) {
            data.commands.forEach(cmd => {
                html += `<div style="color:#89b4fa;">$ ${this.escapeHtml(cmd)}</div>`;
            });
        }

        if (data.outputs && data.outputs.length > 0) {
            data.outputs.forEach(out => {
                html += `<div style="color:#9399b2; margin-top:4px; border-top:1px solid #333; padding-top:4px;">${this.escapeHtml(out)}</div>`;
            });
        }

        // If no structured data was parsed, show raw content
        if ((!data.commands || data.commands.length === 0) && (!data.outputs || data.outputs.length === 0)) {
            html += this.escapeHtml(block.content);
        }

        html += '</div>';
        return html;
    }

    /**
     * Format block type breakdown for metadata display.
     */
    formatBlockBreakdown(sourceData = this.exportData) {
        const metadataCounts = sourceData?.metadata?.claude?.blockTypeBreakdown || sourceData?.metadata?.blockTypeBreakdown;
        let counts = metadataCounts || null;

        if (!counts) {
            counts = (sourceData?.thinkingBlocks || []).reduce((acc, block) => {
                const type = block.type || 'thinking';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {});
        }

        const parts = [];
        if (counts.thinking) parts.push(`${counts.thinking} thinking`);
        if (counts.web_search) parts.push(`${counts.web_search} search`);
        if (counts.tool_call) parts.push(`${counts.tool_call} tool`);
        if (counts.prompt_chain) parts.push(`${counts.prompt_chain} prompt`);
        if (counts.code) parts.push(`${counts.code} code`);
        if (counts.file_edit) parts.push(`${counts.file_edit} edit`);
        return parts.join(', ') || 'none';
    }
    
    generateText(options) {
        const scoped = this.getPreparedExportData(options);
        let text = `AI Conversation Export\n`;
        text += `Platform: ${scoped.metadata.platform}\n`;
        text += `Date: ${scoped.metadata.exportDate}\n`;
        text += `Messages: ${scoped.metadata.messageCount}\n`;
        if (options.includeThinking && scoped.metadata.thinkingBlockCount > 0) {
            text += `Blocks: ${scoped.metadata.thinkingBlockCount} (${this.formatBlockBreakdown(scoped)})\n`;
        }
        if ((scoped.metadata.uploadedDocumentCount || 0) > 0) {
            text += `Uploaded Documents: ${scoped.metadata.uploadedDocumentCount}\n`;
        }
        text += `\n${'='.repeat(60)}\n\n`;

        scoped.messages.forEach(message => {
            text += `${this.getAuthorLabel(message.author, scoped).toUpperCase()}:\n`;

            if (options.includeThinking && message.thinkingBlocks && message.thinkingBlocks.length > 0) {
                message.thinkingBlocks.forEach(block => {
                    const type = block.type || 'thinking';
                    const label = type.toUpperCase().replace('_', ' ');
                    text += `\n[${label}]\n`;

                    if (type === 'web_search' && block.structuredData?.results?.length > 0) {
                        if (block.structuredData.queries?.length > 0) {
                            block.structuredData.queries.forEach(q => { text += `Searched: "${q}"\n`; });
                        }
                        block.structuredData.results.forEach(r => {
                            const url = r.url || r.domain || '';
                            text += `  - ${r.title} | ${url}\n`;
                        });
                    } else if (type === 'tool_call' && block.structuredData) {
                        const data = block.structuredData;
                        if (data.description) text += `${data.description}\n`;
                        if (data.commands?.length > 0) {
                            data.commands.forEach(cmd => { text += `$ ${cmd}\n`; });
                        }
                        if (data.outputs?.length > 0) {
                            text += `Output:\n`;
                            data.outputs.forEach(out => { text += `${out}\n`; });
                        }
                        if ((!data.commands || data.commands.length === 0) && (!data.outputs || data.outputs.length === 0)) {
                            text += `${block.content}\n`;
                        }
                    } else {
                        text += `${block.content}\n`;
                    }

                    text += `[/${label}]\n`;
                });
                text += `\n`;
            }

            text += `${message.content}\n\n`;
            text += `${'-'.repeat(40)}\n\n`;
        });

        if ((scoped.metadata.uploadedDocumentCount || 0) > 0) {
            text += `UPLOADED DOCUMENTS:\n`;
            (scoped.metadata.uploadedDocuments || []).forEach((doc) => {
                const size = doc.sizeLabel ? ` | ${doc.sizeLabel}` : '';
                const url = doc.url ? ` | ${doc.url}` : '';
                text += `- ${doc.name || 'document'} | ${doc.type || 'file'}${size}${url}\n`;
            });
            text += '\n';
        }

        return text;
    }
    
    generateResearchArchive(options) {
        this.normalizeAndValidateExportData();
        const scoped = this.getPreparedExportData(options);

        const archive = {
            version: this.version,
            timestamp: new Date().toISOString(),
            platform: scoped.metadata.platform,
            
            conversation: scoped,
            
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
            sum + (msg.wordCount || 0), 0) / Math.max(assistantMessages.length, 1);
        
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
            richness: uniqueWords.size / Math.max(allWords.length, 1)
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

    normalizeAndValidateExportData() {
        if (!this.exportData || !Array.isArray(this.exportData.messages)) {
            throw new Error('No export data available');
        }

        // Ensure top-level thinkingBlocks includes every message-level block.
        const aggregate = [];
        if (Array.isArray(this.exportData.thinkingBlocks)) {
            aggregate.push(...this.exportData.thinkingBlocks);
        }
        this.exportData.messages.forEach((message) => {
            if (Array.isArray(message.thinkingBlocks)) {
                aggregate.push(...message.thinkingBlocks);
            }
        });

        const dedupedBlocks = [];
        const seen = new Set();
        aggregate.forEach((block, index) => {
            if (!block || typeof block !== 'object') return;
            const content = (block.content || '').trim();
            const summary = (block.summary || '').trim();
            const signature = `${summary}|${content.slice(0, 600)}`;
            if (!content && !summary) return;
            if (seen.has(signature)) return;
            seen.add(signature);
            dedupedBlocks.push({
                id: block.id || `thinking_${index}`,
                type: block.type || 'thinking',
                content: content || summary,
                summary,
                wordCount: block.wordCount || (content || summary).split(/\s+/).filter(Boolean).length,
                characterCount: block.characterCount || (content || summary).length,
                html: block.html || '',
                structuredData: block.structuredData || null
            });
        });

        this.exportData.thinkingBlocks = dedupedBlocks;

        // Keep message-level blocks normalized too.
        this.exportData.messages = this.exportData.messages
            .filter((message) => message && typeof message.content === 'string')
            .map((message, index) => {
                const content = message.content.trim();
                const blocks = Array.isArray(message.thinkingBlocks)
                    ? message.thinkingBlocks.filter((block) => block && (block.content || '').trim())
                    : [];
                const dedupedMessageBlocks = [];
                const seenBlocks = new Set();
                blocks.forEach((block) => {
                    const signature = `${(block.summary || '').trim()}|${(block.content || '').trim().slice(0, 600)}`;
                    if (seenBlocks.has(signature)) return;
                    seenBlocks.add(signature);
                    dedupedMessageBlocks.push(block);
                });

                if (!content && dedupedMessageBlocks.length === 0) {
                    return null;
                }

                return {
                    ...message,
                    id: message.id || `msg_${index}`,
                    content,
                    wordCount: message.wordCount || content.split(/\s+/).filter(Boolean).length || 0,
                    characterCount: message.characterCount || content.length || 0,
                    references: this.normalizeReferenceSet(message.references),
                    thinkingBlocks: dedupedMessageBlocks
                };
            })
            .filter(Boolean);

        const metadata = this.exportData.metadata || {};
        metadata.messageCount = this.exportData.messages.length;
        metadata.thinkingBlockCount = this.exportData.thinkingBlocks.length;
        metadata.hasThinkingBlocks = this.exportData.thinkingBlocks.length > 0;

        if (!metadata.blockTypeBreakdown || Object.keys(metadata.blockTypeBreakdown).length === 0) {
            metadata.blockTypeBreakdown = this.exportData.thinkingBlocks.reduce((acc, block) => {
                const type = block.type || 'thinking';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {});
        }

        const referenceIndex = this.computeReferenceIndexFromMessages(this.exportData.messages);
        metadata.referenceIndex = referenceIndex;
        metadata.referenceCount = referenceIndex.total;
        metadata.linkCount = referenceIndex.links.length;
        metadata.attachmentCount = referenceIndex.attachments.length;
        metadata.citationCount = referenceIndex.citations.length;
        metadata.uploadedDocuments = this.computeUploadedDocumentsFromMessages(this.exportData.messages);
        metadata.uploadedDocumentCount = metadata.uploadedDocuments.length;

        this.exportData.metadata = metadata;

        if (this.exportData.messages.length === 0) {
            throw new Error('No messages found to export');
        }
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

        const complexity = this.calculateComplexityMetrics();
        const avgMessageLength = Number.isFinite(complexity?.averageMessageLength)
            ? Math.round(complexity.averageMessageLength)
            : 0;
        const blockBreakdown = this.formatBlockBreakdown() || 'none';
        
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
                <span class="stat-label">References:</span>
                <span class="stat-value">${this.exportData.metadata.referenceCount || 0}</span>
            </div>
            <div class="uae-stat">
                <span class="stat-label">Uploads:</span>
                <span class="stat-value">${this.exportData.metadata.uploadedDocumentCount || 0}</span>
            </div>
            <div class="uae-stat">
                <span class="stat-label">Platform:</span>
                <span class="stat-value">${this.exportData.metadata.platform}</span>
            </div>
            <div class="uae-stat">
                <span class="stat-label">Avg Msg Length:</span>
                <span class="stat-value">${avgMessageLength}</span>
            </div>
            <div class="uae-stat">
                <span class="stat-label">Block Mix:</span>
                <span class="stat-value">${blockBreakdown}</span>
            </div>
            <div class="uae-stat">
                <span class="stat-label">Complexity Score:</span>
                <span class="stat-value">${complexity.structuralComplexity?.complexityScore || 0}/4</span>
            </div>
            <div class="uae-stat">
                <span class="stat-label">Vocab Richness:</span>
                <span class="stat-value">${((complexity.vocabularyRichness?.richness || 0) * 100).toFixed(1)}%</span>
            </div>
        `;
        
        resultsDiv.style.display = 'block';
        this.renderExportHistory();
    }
    
    showError(message) {
        this.updateStatus(`❌ ${message}`, 0);
        
        setTimeout(() => {
            this.updateStatus('Ready to export your conversation', 0);
        }, 5000);
    }
    
    getExportOptions() {
        const scope = document.getElementById('export-scope')?.value || 'all';
        const scopeStart = this.parsePositiveInt(document.getElementById('scope-start')?.value);
        const scopeEnd = this.parsePositiveInt(document.getElementById('scope-end')?.value);
        const template = document.getElementById('filename-template')?.value || '{base}';
        return {
            includeThinking: document.getElementById('include-thinking')?.checked ?? true,
            includeMetadata: document.getElementById('include-metadata')?.checked ?? true,
            includeHtml: document.getElementById('include-html')?.checked ?? true,
            redactSensitive: document.getElementById('redact-sensitive')?.checked ?? false,
            filename: document.getElementById('export-filename')?.value || this.getConversationTitleBase() || 'conversation-export',
            filenameTemplate: template,
            scope,
            scopeStart,
            scopeEnd,
            includeSignature: document.getElementById('include-signature')?.checked ?? false,
            pdfPageSize: document.getElementById('pdf-page-size')?.value || 'a4',
            pdfOrientation: document.getElementById('pdf-orientation')?.value || 'portrait',
            pdfFontScale: Number(document.getElementById('pdf-font-scale')?.value || '1')
        };
    }

    sanitizeFilenameBase(value) {
        if (typeof value !== 'string') return '';
        return value
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^a-zA-Z0-9._-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^[-_.]+|[-_.]+$/g, '');
    }

    getConversationTitleBase() {
        const title = this.exportData?.metadata?.title || this.exportData?.metadata?.rawDocumentTitle || '';
        const sanitized = this.sanitizeFilenameBase(title);
        return sanitized || 'conversation-export';
    }

    autoPopulateFilenameFromTitle() {
        const input = document.getElementById('export-filename');
        if (!input || this.filenameManuallyEdited) return;
        const suggestedBase = this.getConversationTitleBase();
        if (!suggestedBase || suggestedBase === 'conversation-export') return;
        input.value = suggestedBase;
        input.placeholder = suggestedBase;
    }
    
    getFilename(format) {
        const options = this.getExportOptions();
        const base = (options.filename || 'conversation-export').trim() || 'conversation-export';
        const now = new Date();
        const date = now.toISOString().slice(0, 10);
        const time = now.toISOString().slice(11, 19).replace(/:/g, '-');
        const scopeLabel = this.resolveMessageRange(options, this.exportData?.messages?.length || 1).label;
        const platform = this.exportData?.metadata?.platform || this.platformInfo?.platform || 'platform';
        const template = options.filenameTemplate || '{base}';
        
        const extensions = {
            'pdf': 'pdf',
            'docx': 'docx',
            'markdown': 'md',
            'json': 'json',
            'graph': 'graph.json',
            'memorypack': 'memorypack.json',
            'csv': 'csv',
            'html': 'html',
            'txt': 'txt',
            'research': 'research.json'
        };

        const coreName = template
            .replace(/\{base\}/g, base)
            .replace(/\{platform\}/g, platform)
            .replace(/\{date\}/g, date)
            .replace(/\{time\}/g, time)
            .replace(/\{scope\}/g, scopeLabel)
            .replace(/\s+/g, '-')
            .replace(/[^a-zA-Z0-9._-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        return `${coreName || base}.${extensions[format] || 'txt'}`;
    }
    
    getMimeType(format) {
        const mimeTypes = {
            'pdf': 'application/pdf',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'markdown': 'text/markdown',
            'json': 'application/json',
            'graph': 'application/json',
            'memorypack': 'application/json',
            'csv': 'text/csv',
            'html': 'text/html',
            'txt': 'text/plain',
            'research': 'application/json'
        };
        
        return mimeTypes[format] || 'text/plain';
    }
    
    async sha256ForBlob(blob) {
        if (!window.crypto?.subtle) return null;
        const buffer = await blob.arrayBuffer();
        const digest = await window.crypto.subtle.digest('SHA-256', buffer);
        return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, '0')).join('');
    }

    async createManifest(contentBlob, filename, mimeType) {
        const checksum = await this.sha256ForBlob(contentBlob);
        return {
            schemaVersion: '1.0',
            generatedAt: new Date().toISOString(),
            exporterVersion: this.version,
            file: {
                name: filename,
                mimeType,
                bytes: contentBlob.size,
                sha256: checksum
            },
            context: {
                platform: this.exportData?.metadata?.platform || this.platformInfo?.platform || 'unknown',
                scope: this.getExportOptions().scope || 'all'
            }
        };
    }

    async downloadManifest(contentBlob, filename, mimeType) {
        const manifest = await this.createManifest(contentBlob, filename, mimeType);
        const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
        const manifestUrl = URL.createObjectURL(manifestBlob);
        const link = document.createElement('a');
        link.href = manifestUrl;
        link.download = `${filename}.manifest.json`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            if (link.parentNode) link.parentNode.removeChild(link);
            URL.revokeObjectURL(manifestUrl);
        }, 1000);
    }

    async downloadFile(content, filename, mimeType) {
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

            const options = this.getExportOptions();
            if (options.includeSignature) {
                await this.downloadManifest(blob, filename, mimeType);
            }
            
            console.log(`📥 Downloaded: ${filename} (${blob.size} bytes)`);
            this.recordExportHistory({
                filename,
                bytes: blob.size,
                format: filename.split('.').pop() || 'unknown',
                platform: this.exportData?.metadata?.platform || this.platformInfo?.platform || 'unknown',
                scope: this.getExportOptions().scope || 'all',
                exportedAt: new Date().toISOString()
            });
            this.renderExportHistory();
            
        } catch (error) {
            console.error(`💥 Download failed for ${filename}:`, error);
            throw error;
        }
    }

    getExportHistory() {
        try {
            const raw = localStorage.getItem('uae_export_history_v1');
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    recordExportHistory(entry) {
        const history = this.getExportHistory();
        const next = [entry, ...history].slice(0, 20);
        try {
            localStorage.setItem('uae_export_history_v1', JSON.stringify(next));
        } catch (error) {
            console.warn('⚠️ Unable to persist export history:', error);
        }
    }

    renderExportHistory() {
        const historyEl = document.getElementById('uae-history-list');
        if (!historyEl) return;
        const history = this.getExportHistory();
        if (history.length === 0) {
            historyEl.innerHTML = '<div class="uae-history-empty">No exports yet.</div>';
            return;
        }

        historyEl.innerHTML = history.slice(0, 6).map((item) => {
            const date = new Date(item.exportedAt);
            const label = Number.isFinite(date.getTime()) ? date.toLocaleString() : item.exportedAt;
            const kb = Math.max(1, Math.round((item.bytes || 0) / 1024));
            return `
                <div class="uae-history-item">
                    <div class="uae-history-line"><strong>${this.escapeHtml(item.filename || 'export')}</strong></div>
                    <div class="uae-history-line">${this.escapeHtml(item.platform || 'unknown')} • ${this.escapeHtml(item.scope || 'all')} • ${kb} KB • ${this.escapeHtml(label)}</div>
                </div>
            `;
        }).join('');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

window.ExportInterface = ExportInterface;
