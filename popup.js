// Save toggle to storage
document.getElementById('anonymize-toggle').addEventListener('change', (e) => {
    chrome.storage.sync.set({ anonymizeAnalytics: e.target.checked });
});

// Load current value
chrome.storage.sync.get('anonymizeAnalytics', (result) => {
    document.getElementById('anonymize-toggle').checked = result.anonymizeAnalytics !== false;
});