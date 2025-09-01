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
    const extApi = chrome || browser;
    
    // Global state
    let exportInterface = null;
    let platformDetector = null;
    let isInitialized = false;
    
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
                    resourceManager.timers.delete(dynamicContentTimer);
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
        extApi.runtime?.onMessage?.addListener((request, sender, sendResponse) => {
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
            bottom: 20px;
            right: 20px;
            width: 56px;
            height: 56px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 50%;
            color: white;
            font-size: 20px;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
            transition: all 0.3s ease;
            z-index: 999998;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: visible;
        `;
        
        // Add hover styles
        const style = document.createElement('style');
        style.textContent = `
            #uae-floating-button:hover {
                transform: translateY(-2px) scale(1.1);
                box-shadow: 0 8px 30px rgba(102, 126, 234, 0.6);
            }
            
            .uae-fab-tooltip {
                position: absolute;
                bottom: 70px;
                right: 0;
                background: rgba(0, 0, 0, 0.8);
                color: white;
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
                transform: scale(1.1);
            }
            
            @media (max-width: 768px) {
                #uae-floating-button {
                    bottom: 80px;
                    right: 16px;
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
        
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showExportInterface();
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
                tooltip.textContent = `Export ${platformDetector.getPlatformDisplayName()} Conversation (Alt+E)`;
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
        extApi.storage.sync.get('anonymizeData', (result) => {
            if (result.anonymizeData) {
                console.log('🔒 Anonymizing data before export');
                // Anonymize logic would go here if needed
            }
            
            // Initialize and show interface
            exportInterface.initialize().catch(error => {
                console.error('❌ Failed to show export interface:', error);
                showErrorNotification('Failed to initialize export interface: ' + error.message);
            });
        });
        
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
            config: CONFIG
        };
    }
    
})();