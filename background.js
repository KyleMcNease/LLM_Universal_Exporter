/**
 * Universal AI Exporter - Background Service Worker
 * Handles extension lifecycle, context menus, and communication
 */

// Extension configuration
const CONFIG = {
    version: '1.0.0',
    name: 'Universal AI Exporter',
    supportedDomains: [
        'claude.ai',
        'chat.openai.com',
        'gemini.google.com',
        'bard.google.com',
        'perplexity.ai',
        'poe.com',
        'character.ai',
        'bing.com',
        'grok.x.ai',
        'manus.im',
        'llama.meta.com',
        'deepseek.com',
        'qwen.aliyun.com',
        'devin.ai'
    ]
};

// Production-hardened state management
class ServiceWorkerState {
    static async save(key, data) {
        try {
            // Primary storage
            await chrome.storage.session.set({ [key]: data });
            // Backup storage for recovery
            await chrome.storage.local.set({ [`${key}_backup`]: data, [`${key}_timestamp`]: Date.now() });
        } catch (error) {
            console.error(`💥 State save failed for ${key}:`, error);
            throw new Error(`Failed to persist ${key}: ${error.message}`);
        }
    }
    
    static async restore(key) {
        try {
            // Try session storage first
            const session = await chrome.storage.session.get(key);
            if (session[key]) {
                console.log(`✅ Restored ${key} from session storage`);
                return session[key];
            }
            
            // Fallback to local storage backup
            const backup = await chrome.storage.local.get([`${key}_backup`, `${key}_timestamp`]);
            if (backup[`${key}_backup`]) {
                console.log(`🔄 Restored ${key} from backup (age: ${Date.now() - backup[`${key}_timestamp`]}ms)`);
                // Re-save to session storage
                await chrome.storage.session.set({ [key]: backup[`${key}_backup`] });
                return backup[`${key}_backup`];
            }
            
            console.warn(`⚠️ No state found for ${key}`);
            return null;
        } catch (error) {
            console.error(`💥 State restore failed for ${key}:`, error);
            return null;
        }
    }
    
    static async clear(key) {
        try {
            await Promise.all([
                chrome.storage.session.remove(key),
                chrome.storage.local.remove([`${key}_backup`, `${key}_timestamp`])
            ]);
        } catch (error) {
            console.warn(`⚠️ State clear failed for ${key}:`, error);
        }
    }
}

// Persistent state wrapper
class ActiveTabManager {
    constructor() {
        this.cache = new Map();
        this.initialized = false;
    }
    
    async initialize() {
        if (this.initialized) return;
        
        try {
            const saved = await ServiceWorkerState.restore('activeTabData');
            if (saved && Array.isArray(saved)) {
                this.cache = new Map(saved);
                console.log(`🔄 Restored ${this.cache.size} active tabs`);
            }
            this.initialized = true;
        } catch (error) {
            console.error('💥 ActiveTabManager initialization failed:', error);
            this.cache = new Map();
            this.initialized = true;
        }
    }
    
    async set(tabId, data) {
        await this.initialize();
        this.cache.set(tabId, data);
        await this.persist();
    }
    
    async get(tabId) {
        await this.initialize();
        return this.cache.get(tabId);
    }
    
    async delete(tabId) {
        await this.initialize();
        const deleted = this.cache.delete(tabId);
        if (deleted) await this.persist();
        return deleted;
    }
    
    async size() {
        await this.initialize();
        return this.cache.size;
    }
    
    async persist() {
        try {
            const data = Array.from(this.cache.entries());
            await ServiceWorkerState.save('activeTabData', data);
        } catch (error) {
            console.error('💥 Failed to persist active tab data:', error);
        }
    }
}

// Global instances
const activeTabManager = new ActiveTabManager();
let installationTime = null;

// Privacy anonymization function
function anonymize(text) {
    return text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
               .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
               .replace(/@[\w_]+/g, '[USERNAME]');
}

/**
 * Extension installation/startup with error boundaries
 */
chrome.runtime.onInstalled.addListener(async (details) => {
    try {
        console.log(`🚀 ${CONFIG.name} v${CONFIG.version} installed`);
        
        installationTime = Date.now();
        
        // Atomic installation data commit
        await ServiceWorkerState.save('installation', {
            installationTime,
            version: CONFIG.version,
            installationType: details.reason,
            timestamp: new Date().toISOString()
        });
    
        // Initialize with error boundaries
        await Promise.all([
            createContextMenus(),
            updateBadge(),
            activeTabManager.initialize()
        ]);
        
        // Async analytics with error boundary
        chrome.storage.sync.get('anonymizeAnalytics', (result) => {
            try {
                const anonymize = result.anonymizeAnalytics !== false;
                trackEvent('extension_installed', {
                    reason: details.reason,
                    version: CONFIG.version,
                    anonymize
                });
            } catch (error) {
                console.warn('⚠️ Analytics tracking failed:', error);
            }
        });
        
        if (details.reason === 'install') {
            showWelcomeNotification();
        }
        
        console.log('✅ Extension installation completed successfully');
        
    } catch (error) {
        console.error('💥 Extension installation failed:', error);
        // Try to show error notification
        try {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: 'Installation Error',
                message: `${CONFIG.name} installation failed: ${error.message}`
            });
        } catch (notifError) {
            console.error('💥 Could not show error notification:', notifError);
        }
    }
});

/**
 * Extension startup with recovery
 */
chrome.runtime.onStartup.addListener(async () => {
    try {
        console.log(`✅ ${CONFIG.name} started`);
        
        // Initialize state management
        await activeTabManager.initialize();
        
        // Restore extension state
        await Promise.all([
            updateBadge(),
            createContextMenus() // Recreate in case they were lost
        ]);
        
        trackEvent('extension_started', {
            activeTabsRestored: await activeTabManager.size()
        });
        
    } catch (error) {
        console.error('💥 Extension startup failed:', error);
        trackEvent('extension_startup_failed', { error: error.message });
    }
});

/**
 * Create context menus
 */
function createContextMenus() {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: 'export-conversation',
            title: 'Export AI Conversation',
            contexts: ['page'],
            documentUrlPatterns: CONFIG.supportedDomains.map(domain => `*://${domain}/*`)
        });
        
        chrome.contextMenus.create({
            id: 'export-pdf',
            parentId: 'export-conversation',
            title: 'Export as PDF',
            contexts: ['page']
        });
        
        chrome.contextMenus.create({
            id: 'export-markdown',
            parentId: 'export-conversation',
            title: 'Export as Markdown',
            contexts: ['page']
        });
        
        chrome.contextMenus.create({
            id: 'export-json',
            parentId: 'export-conversation',
            title: 'Export as JSON',
            contexts: ['page']
        });
        
        chrome.contextMenus.create({
            id: 'export-all',
            parentId: 'export-conversation',
            title: 'Export All Formats',
            contexts: ['page']
        });
        
        chrome.contextMenus.create({
            id: 'separator-1',
            parentId: 'export-conversation',
            type: 'separator',
            contexts: ['page']
        });
        
        chrome.contextMenus.create({
            id: 'analyze-conversation',
            parentId: 'export-conversation',
            title: 'Analyze Conversation',
            contexts: ['page']
        });
    });
}

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    console.log('📋 Context menu clicked:', info.menuItemId);
    
    try {
        switch (info.menuItemId) {
            case 'export-conversation':
            case 'analyze-conversation':
                await activateExporter(tab.id);
                break;
                
            case 'export-pdf':
            case 'export-markdown':
            case 'export-json':
            case 'export-all':
                await exportSpecificFormat(tab.id, info.menuItemId);
                break;
        }
        
        trackEvent('context_menu_used', {
            menuItem: info.menuItemId,
            domain: new URL(tab.url).hostname
        });
        
    } catch (error) {
        console.error('❌ Context menu action failed:', error);
        showErrorNotification(tab.id, 'Action failed: ' + error.message);
    }
});

/**
 * Handle tab updates with error boundaries
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Only process complete page loads with URLs
    if (changeInfo.status !== 'complete' || !tab.url) return;
    
    try {
        const url = new URL(tab.url);
        const domain = url.hostname;
        const isSupported = CONFIG.supportedDomains.some(supportedDomain => 
            domain.includes(supportedDomain)
        );
        
        if (isSupported) {
            const tabData = {
                domain,
                url: tab.url,
                title: tab.title || 'Untitled',
                lastUpdate: Date.now(),
                pathname: url.pathname
            };
            
            await Promise.all([
                activeTabManager.set(tabId, tabData),
                updateBadge(tabId, '✓')
            ]);
            
            console.log(`🎯 Supported platform detected: ${domain}`);
        } else {
            // Clean up non-supported tabs
            await Promise.all([
                activeTabManager.delete(tabId),
                updateBadge(tabId, '')
            ]);
        }
        
    } catch (error) {
        console.error(`💥 Tab update handling failed for tab ${tabId}:`, error);
        // Don't let tab update errors break the extension
        try {
            await updateBadge(tabId, '⚠️');
        } catch (badgeError) {
            console.error('💥 Badge update also failed:', badgeError);
        }
    }
});

/**
 * Handle tab removal with cleanup
 */
chrome.tabs.onRemoved.addListener(async (tabId) => {
    try {
        await activeTabManager.delete(tabId);
        console.log(`🧹 Cleaned up data for closed tab ${tabId}`);
    } catch (error) {
        console.error(`💥 Tab cleanup failed for tab ${tabId}:`, error);
    }
});

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Message received:', request.action);
    
    switch (request.action) {
        case 'activate_exporter':
            activateExporter(sender.tab?.id || request.tabId)
                .then(() => sendResponse({ success: true }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;
            
        case 'get_tab_status':
            activeTabManager.get(request.tabId)
                .then(tabData => sendResponse({
                    supported: !!tabData,
                    data: tabData || null
                }))
                .catch(error => sendResponse({
                    supported: false,
                    data: null,
                    error: error.message
                }));
            return true;
            
        case 'get_extension_info':
            activeTabManager.size()
                .then(size => sendResponse({
                    version: CONFIG.version,
                    supportedDomains: CONFIG.supportedDomains,
                    activeTabCount: size,
                    serviceWorkerHealthy: true
                }))
                .catch(error => sendResponse({
                    version: CONFIG.version,
                    supportedDomains: CONFIG.supportedDomains,
                    activeTabCount: 0,
                    serviceWorkerHealthy: false,
                    error: error.message
                }));
            return true;
            
        case 'export_completed':
            trackEvent('export_completed', {
                format: request.format,
                platform: request.platform,
                messageCount: request.messageCount
            });
            sendResponse({ success: true });
            break;
            
        case 'get_analytics':
            getAnalyticsData()
                .then(data => sendResponse(data))
                .catch(error => sendResponse({ error: error.message }));
            return true;
            
        default:
            console.warn('⚠️ Unknown message action:', request.action);
            sendResponse({ success: false, error: 'Unknown action' });
    }
});

/**
 * Activate exporter on specific tab
 */
async function activateExporter(tabId) {
    if (!tabId) {
        throw new Error('No tab ID provided');
    }
    
    const tab = await chrome.tabs.get(tabId);
    const domain = new URL(tab.url).hostname;
    const isSupported = CONFIG.supportedDomains.some(supportedDomain => 
        domain.includes(supportedDomain)
    );
    
    if (!isSupported) {
        throw new Error(`Platform ${domain} is not supported`);
    }
    
    try {
        const response = await chrome.tabs.sendMessage(tabId, {
            action: 'activate_exporter'
        });
        
        if (!response?.success) {
            throw new Error('Failed to activate exporter');
        }
        
        console.log('✅ Exporter activated successfully');
        
    } catch (error) {
        console.error('❌ Failed to activate exporter:', error);
        throw error;
    }
}

/**
 * Export specific format
 */
async function exportSpecificFormat(tabId, menuItemId) {
    const format = menuItemId.replace('export-', '');
    
    try {
        await chrome.tabs.sendMessage(tabId, {
            action: 'export_format',
            format: format
        });
        
        console.log(`✅ ${format} export initiated`);
        
    } catch (error) {
        console.error(`❌ ${format} export failed:`, error);
        throw error;
    }
}

/**
 * Update extension badge
 */
async function updateBadge(tabId = null, text = null) {
    try {
        if (tabId && text !== null) {
            await chrome.action.setBadgeText({
                tabId: tabId,
                text: text
            });
            
            if (text === '✓') {
                await chrome.action.setBadgeBackgroundColor({
                    tabId: tabId,
                    color: '#4ade80'
                });
            }
        } else {
            const tabs = await chrome.tabs.query({});
            
            for (const tab of tabs) {
                const domain = new URL(tab.url || 'about:blank').hostname;
                const isSupported = CONFIG.supportedDomains.some(supportedDomain => 
                    domain.includes(supportedDomain)
                );
                
                await chrome.action.setBadgeText({
                    tabId: tab.id,
                    text: isSupported ? '✓' : ''
                });
                
                if (isSupported) {
                    await chrome.action.setBadgeBackgroundColor({
                        tabId: tab.id,
                        color: '#4ade80'
                    });
                }
            }
        }
    } catch (error) {
        console.warn('⚠️ Failed to update badge:', error);
    }
}

/**
 * Show welcome notification for new users
 */
function showWelcomeNotification() {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Universal AI Exporter Installed!',
        message: 'Visit any AI chat platform and look for the export button, or use Alt+E to export conversations.'
    });
}

/**
 * Show error notification
 */
function showErrorNotification(tabId, message) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Export Error',
        message: message
    });
}

/**
 * Track events for analytics
 */
function trackEvent(eventName, properties = {}) {
    // Get anonymize toggle
    chrome.storage.sync.get('anonymizeAnalytics', (result) => {
        const shouldAnonymize = result.anonymizeAnalytics !== false;
        
        if (shouldAnonymize) {
            Object.keys(properties).forEach(key => {
                if (typeof properties[key] === 'string') {
                    properties[key] = anonymize(properties[key]);
                }
            });
        }
        
        const eventData = {
            event: eventName,
            timestamp: Date.now(),
            version: CONFIG.version,
            ...properties
        };
        
        console.log('📊 Event tracked:', eventData);
        
        chrome.storage.local.get(['analytics'], (result) => {
            const analytics = result.analytics || [];
            analytics.push(eventData);
            
            if (analytics.length > 1000) {
                analytics.splice(0, analytics.length - 1000);
            }
            
            chrome.storage.local.set({ analytics });
        });
    });
}

/**
 * Get analytics data
 */
async function getAnalyticsData() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['analytics', 'installationTime'], (result) => {
            const analytics = result.analytics || [];
            const installTime = result.installationTime || Date.now();
            
            const stats = {
                installationDate: new Date(installTime).toISOString(),
                totalEvents: analytics.length,
                exportCount: analytics.filter(e => e.event === 'export_completed').length,
                platformUsage: {},
                formatUsage: {},
                dailyUsage: {}
            };
            
            analytics.forEach(event => {
                if (event.platform) {
                    stats.platformUsage[event.platform] = (stats.platformUsage[event.platform] || 0) + 1;
                }
                
                if (event.format) {
                    stats.formatUsage[event.format] = (stats.formatUsage[event.format] || 0) + 1;
                }
                
                const date = new Date(event.timestamp).toISOString().split('T')[0];
                stats.dailyUsage[date] = (stats.dailyUsage[date] || 0) + 1;
            });
            
            resolve(stats);
        });
    });
}

/**
 * Handle extension updates
 */
chrome.runtime.onUpdateAvailable.addListener((details) => {
    console.log('🔄 Extension update available:', details.version);
    
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Update Available',
        message: `Universal AI Exporter v${details.version} is ready to install.`
    });
});

/**
 * Handle extension suspension (Manifest V3)
 */
chrome.runtime.onSuspend.addListener(() => {
    console.log('💤 Extension suspending...');
    trackEvent('extension_suspended');
});

/**
 * Cleanup on extension disable/uninstall
 */
chrome.management.onDisabled.addListener((info) => {
    if (info.id === chrome.runtime.id) {
        console.log('🛑 Extension disabled');
        trackEvent('extension_disabled');
    }
});

console.log(`🚀 ${CONFIG.name} v${CONFIG.version} background script loaded`);