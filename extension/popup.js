// Popup script for Advanced Web Scraper Pro

document.addEventListener('DOMContentLoaded', async () => {
  // Load configuration and stats
  await loadStats();
  await loadConfig();
  
  // Auto-scrape toggle
  const autoScrapeToggle = document.getElementById('autoScrapeToggle');
  autoScrapeToggle.addEventListener('click', toggleAutoScrape);
  
  // Scrape now button
  document.getElementById('scrapeNowBtn').addEventListener('click', scrapeCurrentPage);
  
  // View data button
  document.getElementById('viewDataBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('data-viewer.html') });
  });
  
  // Config button
  document.getElementById('configBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Export buttons
  document.getElementById('exportJsonBtn').addEventListener('click', () => exportData('json'));
  document.getElementById('exportCsvBtn').addEventListener('click', () => exportData('csv'));
  
  // Clear data button
  document.getElementById('clearDataBtn').addEventListener('click', clearAllData);
});

// Load statistics
async function loadStats() {
  try {
    const result = await chrome.storage.local.get('scrapedData');
    const scrapedData = result.scrapedData || [];
    
    document.getElementById('totalScraped').textContent = scrapedData.length;
    
    const totalKeywords = scrapedData.reduce((sum, item) => {
      return sum + (item.keywords_found?.length || 0);
    }, 0);
    
    document.getElementById('totalKeywords').textContent = totalKeywords;
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Load configuration
async function loadConfig() {
  try {
    const result = await chrome.storage.sync.get('scraperConfig');
    const config = result.scraperConfig || {};
    
    const autoScrapeToggle = document.getElementById('autoScrapeToggle');
    if (config.autoScrapeEnabled) {
      autoScrapeToggle.classList.add('active');
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
}

// Toggle auto-scrape
async function toggleAutoScrape() {
  try {
    const result = await chrome.storage.sync.get('scraperConfig');
    const config = result.scraperConfig || {};
    
    config.autoScrapeEnabled = !config.autoScrapeEnabled;
    await chrome.storage.sync.set({ scraperConfig: config });
    
    const autoScrapeToggle = document.getElementById('autoScrapeToggle');
    autoScrapeToggle.classList.toggle('active');
    
    showStatus(`Auto-scrape ${config.autoScrapeEnabled ? 'enabled' : 'disabled'}`, 'success');
  } catch (error) {
    showStatus('Error toggling auto-scrape', 'error');
  }
}

// Scrape current page
async function scrapeCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.runtime.sendMessage(
      { action: 'manualScrape' },
      (response) => {
        if (response?.success) {
          showStatus('Page scraped successfully!', 'success');
          setTimeout(() => loadStats(), 500);
        } else {
          showStatus('Failed to scrape page', 'error');
        }
      }
    );
  } catch (error) {
    showStatus('Error scraping page', 'error');
  }
}

// Export data
async function exportData(format) {
  try {
    const result = await chrome.storage.local.get('scrapedData');
    const scrapedData = result.scrapedData || [];
    
    if (scrapedData.length === 0) {
      showStatus('No data to export', 'error');
      return;
    }
    
    chrome.runtime.sendMessage(
      { action: 'exportData', data: scrapedData, format: format },
      (response) => {
        if (response?.success) {
          showStatus(`Exported as ${format.toUpperCase()}`, 'success');
        } else {
          showStatus('Export failed', 'error');
        }
      }
    );
  } catch (error) {
    showStatus('Error exporting data', 'error');
  }
}

// Clear all data
async function clearAllData() {
  if (!confirm('Are you sure you want to clear all scraped data?')) {
    return;
  }
  
  try {
    await chrome.storage.local.set({ scrapedData: [] });
    await loadStats();
    showStatus('All data cleared', 'success');
  } catch (error) {
    showStatus('Error clearing data', 'error');
  }
}

// Show status message
function showStatus(message, type) {
  const statusDiv = document.getElementById('statusMessage');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  
  setTimeout(() => {
    statusDiv.textContent = '';
    statusDiv.className = '';
  }, 3000);
}