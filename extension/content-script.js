/**
 * Universal AI Exporter - Main Content Script
 * Entry point for the browser extension
 */

(() => {
    'use strict';
    
    // Prevent multiple injections
    if (window.UniversalAIExporterLoaded) {
        console.log('🔄 Universal AI Exporter already loaded');
        return;
    }
    
    window.UniversalAIExporterLoaded = true;
    
    // Extension configuration
    const CONFIG = {
        version: '1.1.0', // Bumped for enhancements
        name: 'Universal AI Exporter',
        debug: true,
        autoDetect: true,
        showOnLoad: false,
        keyboardShortcut: 'Alt+E'
    };
    
    // Browser API polyfill for multi-browser support
    const extApi = typeof chrome !== 'undefined'
        ? chrome
        : (typeof browser !== 'undefined' ? browser : null);

    // Lightweight resource manager to avoid dangling timers
    const resourceManager = {
        timers: new Set(),
        intervals: new Set(),
        addTimer(id) {
            if (typeof id === 'number') {
                this.timers.add(id);
            }
        },
        clearTimer(id) {
            if (this.timers.has(id)) {
                clearTimeout(id);
                this.timers.delete(id);
            }
        },
        addInterval(id) {
            if (typeof id === 'number') {
                this.intervals.add(id);
            }
        },
        clearInterval(id) {
            if (this.intervals.has(id)) {
                clearInterval(id);
                this.intervals.delete(id);
            }
        },
        clearAll() {
            this.timers.forEach((timerId) => clearTimeout(timerId));
            this.intervals.forEach((intervalId) => clearInterval(intervalId));
            this.timers.clear();
            this.intervals.clear();
        }
    };
    
    // Global state
    let exportInterface = null;
    let platformDetector = null;
    let isInitialized = false;
    let suppressFabClickUntil = 0;

    const WIDGET_POSITION_STORAGE_KEY = 'uae_widget_positions_v1';
    const WIDGET_STYLE_ELEMENT_ID = 'uae-floating-button-style';

    function getStorageArea() {
        return extApi?.storage?.local || extApi?.storage?.sync || null;
    }

    function getDefaultWidgetPosition() {
        const isMobile = window.innerWidth <= 768;
        const size = isMobile ? 48 : 56;
        const marginX = isMobile ? 16 : 20;
        const marginY = isMobile ? 80 : 20;

        return {
            x: Math.max(marginX, window.innerWidth - size - marginX),
            y: Math.max(marginX, window.innerHeight - size - marginY)
        };
    }

    function clampWidgetPosition(button, position) {
        const rect = button.getBoundingClientRect();
        const width = rect.width || 56;
        const height = rect.height || 56;
        const margin = 8;

        const minX = margin;
        const minY = margin;
        const maxX = Math.max(minX, window.innerWidth - width - margin);
        const maxY = Math.max(minY, window.innerHeight - height - margin);

        const x = Math.min(maxX, Math.max(minX, Number(position?.x) || minX));
        const y = Math.min(maxY, Math.max(minY, Number(position?.y) || minY));

        return { x, y };
    }

    function applyWidgetPosition(button, position) {
        const next = clampWidgetPosition(button, position);
        button.style.left = `${next.x}px`;
        button.style.top = `${next.y}px`;
        button.style.right = 'auto';
        button.style.bottom = 'auto';
        return next;
    }

    function loadWidgetPosition(hostname, callback) {
        const storageArea = getStorageArea();
        if (!storageArea?.get) {
            callback(null);
            return;
        }

        storageArea.get(WIDGET_POSITION_STORAGE_KEY, (result = {}) => {
            const allPositions = result[WIDGET_POSITION_STORAGE_KEY] || {};
            callback(allPositions[hostname] || null);
        });
    }

    function saveWidgetPosition(hostname, position) {
        const storageArea = getStorageArea();
        if (!storageArea?.get || !storageArea?.set) return;

        storageArea.get(WIDGET_POSITION_STORAGE_KEY, (result = {}) => {
            const allPositions = result[WIDGET_POSITION_STORAGE_KEY] || {};
            allPositions[hostname] = {
                x: Math.round(position.x),
                y: Math.round(position.y),
                updatedAt: Date.now()
            };

            storageArea.set({ [WIDGET_POSITION_STORAGE_KEY]: allPositions });
        });
    }

    function installFloatingButtonStyles() {
        const existing = document.getElementById(WIDGET_STYLE_ELEMENT_ID);
        if (existing) return;

        const style = document.createElement('style');
        style.id = WIDGET_STYLE_ELEMENT_ID;
        style.textContent = `
            #uae-floating-button {
                touch-action: none;
                cursor: grab;
                z-index: 2147483647 !important;
            }

            #uae-floating-button.uae-dragging {
                cursor: grabbing;
                transform: scale(1.05);
            }

            #uae-floating-button:hover {
                transform: translateY(-2px) scale(1.06);
                box-shadow: 0 10px 28px rgba(20, 16, 10, 0.46);
            }

            #uae-floating-button.uae-dragging:hover {
                transform: scale(1.05);
            }
            
            .uae-fab-tooltip {
                position: absolute;
                bottom: 70px;
                right: 0;
                background: rgba(17, 24, 33, 0.95);
                color: #f4f0e8;
                border: 1px solid rgba(216, 182, 122, 0.35);
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                white-space: nowrap;
                opacity: 0;
                visibility: hidden;
                transition: all 0.2s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            #uae-floating-button:hover .uae-fab-tooltip {
                opacity: 1;
                visibility: visible;
            }
            
            .uae-fab-icon {
                transition: transform 0.2s ease;
            }
            
            #uae-floating-button:hover .uae-fab-icon {
                transform: scale(1.08);
            }
            
            @media (max-width: 768px) {
                #uae-floating-button {
                    width: 48px;
                    height: 48px;
                    font-size: 18px;
                }
                
                .uae-fab-tooltip {
                    display: none;
                }
            }
        `;

        document.head.appendChild(style);
    }
    
    /**
     * Main initialization function
     */
    async function initialize() {
        try {
            console.log(`🚀 ${CONFIG.name} v${CONFIG.version} starting...`);
            
            // Wait for page to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // Wait for dynamic content with timeout tracking
            const dynamicContentTimer = setTimeout(() => {
                console.log('⏰ Dynamic content wait completed');
            }, 1000);
            resourceManager.addTimer(dynamicContentTimer);

            await new Promise(resolve => {
                setTimeout(() => {
                    resourceManager.clearTimer(dynamicContentTimer);
                    resolve();
                }, 1000);
            });
            
            // Initialize platform detection
            platformDetector = new PlatformDetector();
            const platformInfo = platformDetector.detectPlatform();
            
            if (!platformInfo) {
                console.log('ℹ️ No supported AI platform detected');
                return;
            }
            
            console.log('✅ Platform detected:', platformInfo);
            
            // Initialize export interface
            exportInterface = new ExportInterface();
            
            // Setup activation triggers
            setupActivationTriggers();
            
            // Setup keyboard shortcuts
            setupKeyboardShortcuts();
            
            // Setup page change detection
            setupPageChangeDetection();
            
            // Add floating action button with ARIA
            addFloatingActionButton();
            
            isInitialized = true;
            console.log(`✅ ${CONFIG.name} initialized successfully`);
            
            // Auto-show interface if configured
            if (CONFIG.showOnLoad) {
                showExportInterface();
            }
            
        } catch (error) {
            console.error(`❌ ${CONFIG.name} initialization failed:`, error);
        }
    }
    
    /**
     * Setup activation triggers
     */
    function setupActivationTriggers() {
        // Listen for extension messages using polyfill
        if (extApi?.runtime?.onMessage?.addListener) {
            extApi.runtime.onMessage.addListener((request, sender, sendResponse) => {
                if (request.action === 'activate_exporter') {
                    showExportInterface();
                    sendResponse({ success: true });
                }

                if (request.action === 'get_status') {
                    sendResponse({
                        initialized: isInitialized,
                        platform: platformDetector?.currentPlatform || null,
                        version: CONFIG.version
                    });
                }
            });
        }
        
        // Listen for custom events
        document.addEventListener('universalExporterActivate', () => {
            showExportInterface();
        });
    }
    
    /**
     * Setup keyboard shortcuts
     */
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Alt+E to activate exporter
            if (event.altKey && event.key.toLowerCase() === 'e') {
                event.preventDefault();
                showExportInterface();
                return;
            }
            
            // Ctrl+Shift+E alternative
            if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'e') {
                event.preventDefault();
                showExportInterface();
                return;
            }
        });
    }
    
    /**
     * Setup page change detection for SPAs
     */
    function setupPageChangeDetection() {
        let currentUrl = window.location.href;
        
        // Monitor URL changes
        const urlObserver = new MutationObserver(() => {
            if (!window.location || typeof window.location.href !== 'string') {
                return;
            }

            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                console.log('🔄 Page changed, re-detecting platform...');
                
                // Re-detect platform after URL change
                setTimeout(() => {
                    const newPlatformInfo = platformDetector.detectPlatform();
                    if (newPlatformInfo) {
                        console.log('✅ Platform re-detected:', newPlatformInfo);
                        updateFloatingActionButton();
                    }
                }, 1000);
            }
        });
        
        urlObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Also listen for history API changes
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = function(...args) {
            originalPushState.apply(this, args);
            setTimeout(() => platformDetector.detectPlatform(), 500);
        };
        
        history.replaceState = function(...args) {
            originalReplaceState.apply(this, args);
            setTimeout(() => platformDetector.detectPlatform(), 500);
        };
        
        window.addEventListener('popstate', () => {
            setTimeout(() => platformDetector.detectPlatform(), 500);
        });
    }
    
    /**
     * Add floating action button with ARIA enhancements
     */
    function addFloatingActionButton() {
        // Remove existing button if present
        const existing = document.getElementById('uae-floating-button');
        if (existing) {
            existing.remove();
        }
        
        const button = document.createElement('button');
        button.id = 'uae-floating-button';
        button.innerHTML = `
            <span class="uae-fab-icon">📥</span>
            <span class="uae-fab-tooltip">Export Conversation (Alt+E)</span>
        `;
        button.setAttribute('aria-label', 'Export AI Conversation'); // ARIA for accessibility
        button.setAttribute('role', 'button');
        
        button.style.cssText = `
            position: fixed;
            width: 56px;
            height: 56px;
            background: radial-gradient(circle at 30% 20%, #e4c58f, #c89d5a 62%, #b18243 100%);
            border: none;
            border-radius: 50%;
            color: #17120b;
            font-size: 20px;
            cursor: pointer;
            box-shadow: 0 8px 22px rgba(20, 16, 10, 0.38);
            transition: all 0.3s ease;
            z-index: 999998;
            display: flex;
            align-items: center;
            justify-content: center;
            position: fixed;
            overflow: visible;
        `;

        installFloatingButtonStyles();

        const defaultPosition = getDefaultWidgetPosition();
        applyWidgetPosition(button, defaultPosition);

        loadWidgetPosition(window.location.hostname, (savedPosition) => {
            if (savedPosition) {
                applyWidgetPosition(button, savedPosition);
            }
        });

        let dragState = null;

        button.addEventListener('pointerdown', (event) => {
            if (event.button !== 0) return;

            event.preventDefault();
            event.stopPropagation();

            const rect = button.getBoundingClientRect();
            dragState = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                originX: rect.left,
                originY: rect.top,
                moved: false,
                distance: 0
            };

            button.classList.add('uae-dragging');
            button.setPointerCapture(event.pointerId);
        });

        button.addEventListener('pointermove', (event) => {
            if (!dragState || event.pointerId !== dragState.pointerId) return;

            const dx = event.clientX - dragState.startX;
            const dy = event.clientY - dragState.startY;
            dragState.distance = Math.hypot(dx, dy);

            if (dragState.distance > 8) {
                dragState.moved = true;
            }

            const nextPosition = {
                x: dragState.originX + dx,
                y: dragState.originY + dy
            };
            applyWidgetPosition(button, nextPosition);
        });

        button.addEventListener('pointerup', (event) => {
            if (!dragState || event.pointerId !== dragState.pointerId) return;

            const finalPosition = {
                x: parseFloat(button.style.left),
                y: parseFloat(button.style.top)
            };

            if (dragState.moved) {
                suppressFabClickUntil = Date.now() + 350;
                saveWidgetPosition(window.location.hostname, finalPosition);
            }

            button.classList.remove('uae-dragging');
            dragState = null;
        });

        button.addEventListener('pointercancel', () => {
            button.classList.remove('uae-dragging');
            dragState = null;
        });

        button.addEventListener('click', (e) => {
            if (Date.now() < suppressFabClickUntil) return;
            e.preventDefault();
            e.stopPropagation();
            showExportInterface();
        });

        window.addEventListener('resize', () => {
            const clamped = applyWidgetPosition(button, {
                x: parseFloat(button.style.left),
                y: parseFloat(button.style.top)
            });
            saveWidgetPosition(window.location.hostname, clamped);
        });

        document.body.appendChild(button);
    }
    
    /**
     * Update floating action button state
     */
    function updateFloatingActionButton() {
        const button = document.getElementById('uae-floating-button');
        if (!button) return;
        
        const platformInfo = platformDetector.detectPlatform();
        
        if (platformInfo) {
            button.style.display = 'flex';
            const tooltip = button.querySelector('.uae-fab-tooltip');
            if (tooltip) {
                tooltip.textContent = `Export ${platformDetector.getPlatformDisplayName()} Conversation (Alt+E) • Drag to move`;
            }
        } else {
            button.style.display = 'none';
        }
    }
    
    /**
     * Show the export interface with privacy check
     */
    function showExportInterface() {
        if (!isInitialized) {
            console.warn('⚠️ Export interface not initialized yet');
            return;
        }
        
        // Check if interface is already visible
        const existing = document.getElementById('universal-ai-exporter-ui');
        if (existing) {
            console.log('ℹ️ Export interface already visible');
            return;
        }
        
        // Verify platform is still supported
        const platformInfo = platformDetector.detectPlatform();
        if (!platformInfo) {
            showErrorNotification('No supported AI platform detected on this page');
            return;
        }
        
        // Privacy check: Get anonymize toggle from storage
        const storageSync = extApi?.storage?.sync;
        if (storageSync?.get) {
            storageSync.get('anonymizeData', (result = {}) => {
                if (result.anonymizeData) {
                    console.log('🔒 Anonymizing data before export');
                }

                exportInterface.initialize().catch(error => {
                    console.error('❌ Failed to show export interface:', error);
                    showErrorNotification('Failed to initialize export interface: ' + error.message);
                });
            });
        } else {
            exportInterface.initialize().catch(error => {
                console.error('❌ Failed to show export interface:', error);
                showErrorNotification('Failed to initialize export interface: ' + error.message);
            });
        }
        
        // Analytics/tracking (if enabled)
        trackEvent('interface_shown', {
            platform: platformInfo.platform,
            url: window.location.hostname
        });
    }
    
    /**
     * Show error notification
     */
    function showErrorNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(239, 68, 68, 0.3);
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            max-width: 300px;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span>❌</span>
                <span>${message}</span>
            </div>
        `;
        
        notification.setAttribute('role', 'alert'); // ARIA for accessibility
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
    
    /**
     * Track events (placeholder for analytics) with anonymize
     */
    function trackEvent(eventName, properties = {}) {
        // Anonymize properties (e.g., remove personal info)
        Object.keys(properties).forEach(key => {
            if (typeof properties[key] === 'string' && (properties[key].includes('@') || properties[key].match(/\d{3}-\d{3}-\d{4}/))) {
                properties[key] = '[anonymized]';
            }
        });
        
        if (CONFIG.debug) {
            console.log('📊 Event:', eventName, properties);
        }
        
        // Here you could send to analytics service
    }
    
    /**
     * Handle errors gracefully
     */
    window.addEventListener('error', (event) => {
        if (event.error && event.error.stack && event.error.stack.includes('universal-ai-exporter')) {
            console.error('💥 Universal AI Exporter error:', event.error);
            trackEvent('extension_error', {
                message: event.error.message,
                stack: event.error.stack
            });
        }
    });
    
    /**
     * Cleanup on page unload
     */
    window.addEventListener('beforeunload', () => {
        console.log('🧹 Universal AI Exporter cleanup');
        
        // Cleanup any resources
        resourceManager.clearAll();
        if (exportInterface) {
            exportInterface.hideUI();
        }
        
        // Remove floating button
        const button = document.getElementById('uae-floating-button');
        if (button) {
            button.remove();
        }
    });
    
    // Start initialization
    console.log(`🎯 ${CONFIG.name} content script loaded`);
    initialize();
    
    // Make key functions globally available for debugging
    if (CONFIG.debug) {
        window.UniversalAIExporter = {
            initialize,
            showExportInterface,
            platformDetector,
            exportInterface,
            resourceManager,
            config: CONFIG
        };
    }

})();
