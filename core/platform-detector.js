/**
 * Universal AI Platform Detector
 * Production-hardened platform detection with versioned fallbacks
 */

class PlatformDetector {
    constructor() {
        // Versioned selector system for production resilience
        this.selectorVersions = {
            'claude': {
                'v2025': {
                    conversation: '[data-testid="conversation"], .conversation-container',
                    messages: '[data-testid="message"], .message',
                    thinkingBlocks: '.thinking-block, [data-thinking], [aria-expanded]',
                    userMessages: '[data-author="user"]',
                    assistantMessages: '[data-author="assistant"]'
                },
                'v2024': {
                    conversation: '.conversation, [role="main"]',
                    messages: '.message, .chat-message',
                    thinkingBlocks: '.collapsible, [aria-expanded="false"]',
                    userMessages: '.user, [data-role="user"]',
                    assistantMessages: '.assistant, [data-role="assistant"]'
                },
                'generic': {
                    conversation: '[role="main"], .main, .chat',
                    messages: '.message, [role="message"], .chat-item',
                    thinkingBlocks: '[aria-expanded], .expandable',
                    userMessages: '[data-role="user"], .user',
                    assistantMessages: '[data-role="assistant"], .assistant'
                }
            },
            'chatgpt': {
                'v2025': {
                    conversation: '[role="main"], .conversation-container',
                    messages: '[data-message-author-role], .group',
                    userMessages: '[data-message-author-role="user"]',
                    assistantMessages: '[data-message-author-role="assistant"]'
                },
                'generic': {
                    conversation: '.chat, [role="main"]',
                    messages: '.message, .chat-message',
                    userMessages: '.user, [data-role="user"]',
                    assistantMessages: '.assistant, [data-role="assistant"]'
                }
            }
        };
        
        // Legacy platforms object for backwards compatibility
        this.platforms = {
            'claude': {
                domains: ['claude.ai'],
                selectors: {
                    conversation: '[data-testid="conversation"], .conversation-container',
                    messages: '[data-testid="message"], .message',
                    thinkingBlocks: '.thinking-block, [data-thinking], [aria-expanded]',
                    userMessages: '[data-author="user"]',
                    assistantMessages: '[data-author="assistant"]'
                },
                extractor: 'ClaudeExtractor'
            },
            
            'chatgpt': {
                domains: ['chat.openai.com'],
                selectors: {
                    conversation: '[role="main"], .conversation-container',
                    messages: '[data-message-author-role], .group',
                    userMessages: '[data-message-author-role="user"]',
                    assistantMessages: '[data-message-author-role="assistant"]'
                },
                extractor: 'ChatGPTExtractor'
            },
            
            'gemini': {
                domains: ['gemini.google.com', 'bard.google.com'],
                selectors: {
                    conversation: '.conversation-container, [role="main"]',
                    messages: '.model-response-text, .user-input',
                    userMessages: '.user-input, [data-role="user"]',
                    assistantMessages: '.model-response-text, [data-role="model"]'
                },
                extractor: 'GeminiExtractor'
            },
            
            'perplexity': {
                domains: ['perplexity.ai'],
                selectors: {
                    conversation: '.conversation, [role="main"]',
                    messages: '.message-container, .prose',
                    userMessages: '.user-message',
                    assistantMessages: '.assistant-message'
                },
                extractor: 'PerplexityExtractor'
            },
            
            'poe': {
                domains: ['poe.com'],
                selectors: {
                    conversation: '.chat-container, [role="main"]',
                    messages: '.ChatMessage_messageRow__xIMF4, .message-container',
                    userMessages: '.user-message, [data-role="user"]',
                    assistantMessages: '.bot-message, [data-role="assistant"], .ChatMessage_botMessage__HcCta',
                    thinkingBlocks: '.reasoning-block, [data-thinking], [aria-expanded="false"]'
                },
                extractor: 'PoeExtractor'
            },
            
            'character': {
                domains: ['character.ai'],
                selectors: {
                    conversation: '.chat-container, [role="main"]',
                    messages: '.msg-row, .chat-message',
                    userMessages: '.user-msg, [data-role="user"]',
                    assistantMessages: '.char-msg, [data-role="character"]',
                    thinkingBlocks: '.thinking-indicator, [aria-expanded="false"]'
                },
                extractor: 'CharacterExtractor'
            },
            
            'bing': {
                domains: ['bing.com'],
                selectors: {
                    conversation: '#b_sydConvCont, .cib-serp-main',
                    messages: '.ac-textBlock, .item',
                    userMessages: '.from-user, [data-role="user"]',
                    assistantMessages: '.from-bot, [data-role="assistant"]',
                    thinkingBlocks: '.thinking, [aria-expanded="false"]'
                },
                extractor: 'BingExtractor'
            },
            
            'grok': {
                domains: ['grok.x.ai', 'x.com'],
                selectors: {
                    conversation: '.conversation-container, [role="main"]',
                    messages: '.message, .post-message',
                    userMessages: '.user-message, [data-role="user"]',
                    assistantMessages: '.grok-message, [data-role="grok"]',
                    thinkingBlocks: '.thinking-block, [aria-expanded="false"]'
                },
                extractor: 'GrokExtractor'
            },
            
            'manus': {
                domains: ['manus.im'],
                selectors: {
                    conversation: '.agent-chat, [role="main"]',
                    messages: '.chat-bubble, .task-message',
                    userMessages: '.user-bubble, [data-role="user"]',
                    assistantMessages: '.agent-bubble, [data-role="agent"]',
                    thinkingBlocks: '.processing, [aria-expanded="false"]'
                },
                extractor: 'ManusExtractor'
            },
            
            'llama': {
                domains: ['llama.meta.com', 'huggingface.co'],
                selectors: {
                    conversation: '.chat-interface, [role="main"]',
                    messages: '.message-text, .chat-message',
                    userMessages: '.prompt-message, [data-role="user"]',
                    assistantMessages: '.response-message, [data-role="llama"]',
                    thinkingBlocks: '.generation-indicator, [aria-expanded="false"]'
                },
                extractor: 'LlamaExtractor'
            },
            
            'deepseek': {
                domains: ['deepseek.com'],
                selectors: {
                    conversation: '.chat-window, [role="main"]',
                    messages: '.response-container, .chat-entry',
                    userMessages: '.user-entry, [data-role="user"]',
                    assistantMessages: '.deepseek-response, [data-role="deepseek"]',
                    thinkingBlocks: '.computing, [aria-expanded="false"]'
                },
                extractor: 'DeepSeekExtractor'
            },
            
            'qwen3': {
                domains: ['qwen.aliyun.com'],
                selectors: {
                    conversation: '.qwen-chat, [role="main"]',
                    messages: '.qwen-message, .chat-item',
                    userMessages: '.user-item, [data-role="user"]',
                    assistantMessages: '.assistant-reply, [data-role="qwen"]',
                    thinkingBlocks: '.reasoning, [aria-expanded="false"]'
                },
                extractor: 'Qwen3Extractor'
            },
            
            'devin': {
                domains: ['devin.ai'],
                selectors: {
                    conversation: '.devin-chat, [role="main"]',
                    messages: '.code-message, .devin-entry',
                    userMessages: '.user-code, [data-role="user"]',
                    assistantMessages: '.devin-response, [data-role="devin"]',
                    thinkingBlocks: '.planning-step, [aria-expanded="false"]'
                },
                extractor: 'DevinExtractor'
            }
        };
        
        this.currentPlatform = null;
        this.detectionResult = null;
        this.detectionAttempts = new Map();
        this.lastSuccessfulVersion = new Map();
    }
    
    detectPlatform() {
        const hostname = window.location.hostname;
        const pathname = window.location.pathname;
        
        console.log('🔍 Universal AI Exporter: Detecting platform...', {hostname, pathname});
        
        // Try versioned detection first
        for (const [platformName, platform] of Object.entries(this.platforms)) {
            const domainMatch = platform.domains.some(domain => 
                hostname.includes(domain)
            );
            
            if (domainMatch) {
                const result = this.detectWithVersionedFallback(platformName, hostname, pathname);
                if (result) {
                    console.log('✅ Platform detected:', result);
                    return result;
                }
            }
        }
        
        // Final fallback detection
        const fallbackDetection = this.detectFallback();
        if (fallbackDetection) {
            this.currentPlatform = 'unknown';
            this.detectionResult = fallbackDetection;
            console.log('⚠️ Unknown platform detected, using fallback:', this.detectionResult);
            return this.detectionResult;
        }
        
        console.log('❌ No supported AI platform detected');
        return null;
    }
    
    detectWithVersionedFallback(platformName, hostname, pathname) {
        const versions = this.selectorVersions[platformName];
        if (!versions) {
            // Fallback to legacy detection
            return this.legacyDetection(platformName, hostname, pathname);
        }
        
        // Track attempts for this platform
        const attemptKey = `${platformName}_${hostname}`;
        let attempts = this.detectionAttempts.get(attemptKey) || 0;
        this.detectionAttempts.set(attemptKey, attempts + 1);
        
        // Start with last successful version if available
        const lastSuccessful = this.lastSuccessfulVersion.get(attemptKey);
        const versionOrder = lastSuccessful ? 
            [lastSuccessful, ...Object.keys(versions).filter(v => v !== lastSuccessful)] :
            Object.keys(versions);
        
        for (const version of versionOrder) {
            try {
                const selectors = versions[version];
                const conversationEl = document.querySelector(selectors.conversation);
                
                if (conversationEl) {
                    // Verify we can find messages too
                    const messages = document.querySelectorAll(selectors.messages);
                    if (messages.length > 0) {
                        // Success! Remember this version
                        this.lastSuccessfulVersion.set(attemptKey, version);
                        
                        this.currentPlatform = platformName;
                        this.detectionResult = {
                            platform: platformName,
                            version: version,
                            config: {
                                domains: this.platforms[platformName].domains,
                                selectors: selectors,
                                extractor: this.platforms[platformName].extractor
                            },
                            hostname,
                            pathname,
                            timestamp: new Date().toISOString(),
                            attempts,
                            fallbackLevel: version === 'generic' ? 'high' : 'none'
                        };
                        
                        console.log(`✅ ${platformName} detected using ${version} selectors`);
                        return this.detectionResult;
                    }
                }
            } catch (error) {
                console.warn(`⚠️ ${platformName} ${version} detection failed:`, error);
            }
        }
        
        // If all versions failed, try legacy as final fallback
        return this.legacyDetection(platformName, hostname, pathname);
    }
    
    legacyDetection(platformName, hostname, pathname) {
        try {
            const platform = this.platforms[platformName];
            const conversationExists = document.querySelector(platform.selectors.conversation);
            
            if (conversationExists) {
                this.currentPlatform = platformName;
                this.detectionResult = {
                    platform: platformName,
                    version: 'legacy',
                    config: platform,
                    hostname,
                    pathname,
                    timestamp: new Date().toISOString(),
                    fallbackLevel: 'legacy'
                };
                
                console.log(`✅ ${platformName} detected using legacy selectors`);
                return this.detectionResult;
            }
        } catch (error) {
            console.warn(`⚠️ ${platformName} legacy detection failed:`, error);
        }
        
        return null;
    }
    
    detectFallback() {
        const chatPatterns = [
            '.message, [role="message"]',
            '.chat-message, .conversation-message',
            '.user-message, .assistant-message',
            '.human-message, .ai-message',
            '[data-message], [data-role]'
        ];
        
        for (const pattern of chatPatterns) {
            const elements = document.querySelectorAll(pattern);
            if (elements.length >= 2) {
                // Heuristic backups: text patterns
                const bodyText = document.body.innerText;
                const userRegex = /You:|User:|Human:/i;
                const assistantRegex = /AI:|Assistant:|Bot:/i;
                
                const fallbackSelectors = {
                    conversation: pattern.split(',')[0],
                    messages: pattern,
                    userMessages: bodyText.match(userRegex) ? '.user-message, [data-role="user"]' : '',
                    assistantMessages: bodyText.match(assistantRegex) ? '.assistant-message, [data-role="assistant"]' : ''
                };
                
                return {
                    platform: 'unknown',
                    config: {
                        domains: [window.location.hostname],
                        selectors: fallbackSelectors,
                        extractor: 'UniversalExtractor'
                    },
                    hostname: window.location.hostname,
                    pathname: window.location.pathname,
                    timestamp: new Date().toISOString(),
                    fallback: true
                };
            }
        }
        
        return null;
    }
    
    getPlatformConfig() {
        if (!this.detectionResult) {
            this.detectPlatform();
        }
        return this.detectionResult?.config || null;
    }
    
    getSelectors() {
        const config = this.getPlatformConfig();
        return config?.selectors || null;
    }
    
    getExtractorName() {
        const config = this.getPlatformConfig();
        return config?.extractor || 'UniversalExtractor';
    }
    
    isSupported() {
        return this.currentPlatform !== null;
    }
    
    getPlatformDisplayName() {
        if (!this.currentPlatform) return 'Unknown Platform';
        
        const displayNames = {
            'claude': 'Claude',
            'chatgpt': 'ChatGPT',
            'gemini': 'Gemini',
            'perplexity': 'Perplexity',
            'poe': 'Poe',
            'character': 'Character.ai',
            'bing': 'Bing',
            'grok': 'Grok',
            'manus': 'Manus',
            'llama': 'Llama',
            'deepseek': 'DeepSeek',
            'qwen3': 'Qwen3',
            'devin': 'Devin',
            'unknown': 'Unknown AI Platform'
        };
        
        return displayNames[this.currentPlatform] || 'Unknown Platform';
    }
    
    async waitForPlatform(maxAttempts = 8, interval = 1000) {
        let lastError = null;
        
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const result = this.detectPlatform();
                if (result) {
                    console.log(`✅ Platform detected after ${i + 1} attempts`);
                    return result;
                }
                
                // Progressive backoff for SPA loading
                const backoffInterval = Math.min(interval * Math.pow(1.5, i), 5000);
                console.log(`⏳ Waiting for platform to load... (${i + 1}/${maxAttempts}) - next attempt in ${backoffInterval}ms`);
                
                await new Promise(resolve => setTimeout(resolve, backoffInterval));
                
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Detection attempt ${i + 1} failed:`, error);
                
                // Still wait before next attempt
                await new Promise(resolve => setTimeout(resolve, interval));
            }
        }
        
        // Final attempt with extended fallback
        try {
            const desperateFallback = this.desperateFallbackDetection();
            if (desperateFallback) {
                console.log('✅ Desperate fallback detection succeeded');
                return desperateFallback;
            }
        } catch (fallbackError) {
            console.error('❌ Even desperate fallback failed:', fallbackError);
        }
        
        // Show error notification
        try {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: 'Detection Failed',
                message: `No supported platform detected after ${maxAttempts} attempts.`
            });
        } catch (notifError) {
            console.warn('⚠️ Could not show notification:', notifError);
        }
        
        const error = new Error(`Platform detection timeout after ${maxAttempts} attempts`);
        error.lastError = lastError;
        error.detectionAttempts = this.detectionAttempts;
        throw error;
    }
    
    desperateFallbackDetection() {
        // Last resort: try to find any chat-like interface
        const desperateSelectors = [
            '.chat, .conversation, .messages',
            '[role="main"], [role="log"]',
            '.message, .chat-message, .msg',
            '[class*="chat"], [class*="message"], [class*="conversation"]',
            '[id*="chat"], [id*="message"], [id*="conversation"]'
        ];
        
        for (const selector of desperateSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length >= 2) {
                // Found something that looks like a chat interface
                return {
                    platform: 'unknown-desperate',
                    version: 'desperate-fallback',
                    config: {
                        domains: [window.location.hostname],
                        selectors: {
                            conversation: selector,
                            messages: selector,
                            userMessages: '',
                            assistantMessages: ''
                        },
                        extractor: 'UniversalExtractor'
                    },
                    hostname: window.location.hostname,
                    pathname: window.location.pathname,
                    timestamp: new Date().toISOString(),
                    fallbackLevel: 'desperate',
                    detectedElements: elements.length
                };
            }
        }
        
        return null;
    }
}

window.PlatformDetector = PlatformDetector;