// Background service worker for Advanced Web Scraper Pro

const API_BASE_URL = 'http://localhost:8001/api';

// Initialize default configuration
chrome.runtime.onInstalled.addListener(() => {
  const defaultConfig = {
    autoScrapeEnabled: true,
    keywords: [],
    selectors: [
      { name: 'headings', selector: 'h1, h2, h3', type: 'text' },
      { name: 'links', selector: 'a[href]', type: 'links' },
      { name: 'images', selector: 'img[src]', type: 'images' },
      { name: 'paragraphs', selector: 'p', type: 'text' },
      { name: 'emails', selector: 'a[href^="mailto:"]', type: 'emails' }
    ],
    whitelistDomains: [],
    blacklistDomains: [],
    exportFormat: 'json',
    saveToBackend: true,
    backendUrl: API_BASE_URL
  };
  
  chrome.storage.sync.set({ scraperConfig: defaultConfig });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveScrapedData') {
    handleSaveScrapedData(request.data)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'exportData') {
    handleExportData(request.data, request.format)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'manualScrape') {
    handleManualScrape(sender.tab.id)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Save scraped data to backend
async function handleSaveScrapedData(data) {
  const config = await chrome.storage.sync.get('scraperConfig');
  
  if (config.scraperConfig?.saveToBackend) {
    try {
      const response = await fetch(`${config.scraperConfig.backendUrl}/scrape/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`Backend error: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to save to backend:', error);
      // Save locally as fallback
      await saveToLocalStorage(data);
      throw error;
    }
  } else {
    await saveToLocalStorage(data);
  }
}

// Save to local storage
async function saveToLocalStorage(data) {
  const result = await chrome.storage.local.get('scrapedData');
  const scrapedData = result.scrapedData || [];
  scrapedData.push(data);
  await chrome.storage.local.set({ scrapedData });
}

// Export data to file
async function handleExportData(data, format) {
  let content, mimeType, filename;
  
  if (format === 'json') {
    content = JSON.stringify(data, null, 2);
    mimeType = 'application/json';
    filename = `scraped_data_${Date.now()}.json`;
  } else if (format === 'csv') {
    content = convertToCSV(data);
    mimeType = 'text/csv';
    filename = `scraped_data_${Date.now()}.csv`;
  }
  
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  await chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true
  });
}

// Convert data to CSV format
function convertToCSV(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }
  
  const headers = ['URL', 'Title', 'Domain', 'Timestamp', 'Keywords Found', 'Content'];
  const rows = data.map(item => [
    item.url || '',
    item.title || '',
    item.domain || '',
    item.timestamp || '',
    (item.keywords_found || []).join('; '),
    JSON.stringify(item.scraped_content || {})
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  return csvContent;
}

// Manual scrape trigger
async function handleManualScrape(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // Trigger scraping
        window.postMessage({ type: 'MANUAL_SCRAPE' }, '*');
        return { success: true };
      }
    });
    return results[0].result;
  } catch (error) {
    console.error('Manual scrape failed:', error);
    throw error;
  }
}

// Listen for tab updates to auto-scrape
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const config = await chrome.storage.sync.get('scraperConfig');
    
    if (config.scraperConfig?.autoScrapeEnabled) {
      const domain = new URL(tab.url).hostname;
      
      // Check whitelist/blacklist
      const whitelist = config.scraperConfig.whitelistDomains || [];
      const blacklist = config.scraperConfig.blacklistDomains || [];
      
      if (blacklist.includes(domain)) {
        return;
      }
      
      if (whitelist.length > 0 && !whitelist.includes(domain)) {
        return;
      }
      
      // Inject and execute scraping
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { action: 'autoScrape' });
      }, 1000);
    }
  }
});