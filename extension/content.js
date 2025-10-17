// Content script for Advanced Web Scraper Pro

(function() {
  'use strict';
  
  let isScrapingInProgress = false;
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'autoScrape' && !isScrapingInProgress) {
      performScraping();
    }
  });
  
  // Listen for manual scrape trigger
  window.addEventListener('message', (event) => {
    if (event.data.type === 'MANUAL_SCRAPE' && !isScrapingInProgress) {
      performScraping();
    }
  });
  
  // Main scraping function
  async function performScraping() {
    if (isScrapingInProgress) return;
    
    isScrapingInProgress = true;
    
    try {
      // Get configuration
      const result = await chrome.storage.sync.get('scraperConfig');
      const config = result.scraperConfig || {};
      
      // Extract data based on selectors
      const scrapedContent = extractDataFromSelectors(config.selectors || []);
      
      // Filter by keywords
      const keywordsFound = filterByKeywords(scrapedContent, config.keywords || []);
      
      // Prepare data object
      const data = {
        url: window.location.href,
        title: document.title,
        domain: window.location.hostname,
        scraped_content: scrapedContent,
        keywords_found: keywordsFound,
        user_agent: navigator.userAgent
      };
      
      // Send to background script for saving
      chrome.runtime.sendMessage({
        action: 'saveScrapedData',
        data: data
      }, (response) => {
        if (response?.success) {
          console.log('✓ Web Scraper: Data saved successfully');
          showNotification('Scraping completed successfully!');
        } else {
          console.error('Web Scraper: Failed to save data', response?.error);
        }
      });
      
    } catch (error) {
      console.error('Web Scraper: Error during scraping', error);
    } finally {
      isScrapingInProgress = false;
    }
  }
  
  // Extract data based on CSS selectors
  function extractDataFromSelectors(selectors) {
    const data = {};
    
    selectors.forEach(selectorConfig => {
      const { name, selector, type } = selectorConfig;
      const elements = document.querySelectorAll(selector);
      
      if (type === 'text') {
        data[name] = Array.from(elements)
          .map(el => el.textContent.trim())
          .filter(text => text.length > 0);
      } else if (type === 'links') {
        data[name] = Array.from(elements)
          .map(el => ({
            text: el.textContent.trim(),
            href: el.href
          }))
          .filter(link => link.href);
      } else if (type === 'images') {
        data[name] = Array.from(elements)
          .map(el => ({
            src: el.src,
            alt: el.alt || '',
            width: el.width,
            height: el.height
          }))
          .filter(img => img.src);
      } else if (type === 'emails') {
        data[name] = Array.from(elements)
          .map(el => el.href.replace('mailto:', ''))
          .filter(email => email);
      } else if (type === 'html') {
        data[name] = Array.from(elements)
          .map(el => el.outerHTML);
      } else {
        // Default to text content
        data[name] = Array.from(elements)
          .map(el => el.textContent.trim())
          .filter(text => text.length > 0);
      }
    });
    
    // Add meta information
    data.meta = extractMetaData();
    
    // Add tables if present
    data.tables = extractTables();
    
    return data;
  }
  
  // Extract meta tags
  function extractMetaData() {
    const meta = {};
    const metaTags = document.querySelectorAll('meta');
    
    metaTags.forEach(tag => {
      const name = tag.getAttribute('name') || tag.getAttribute('property');
      const content = tag.getAttribute('content');
      if (name && content) {
        meta[name] = content;
      }
    });
    
    return meta;
  }
  
  // Extract tables
  function extractTables() {
    const tables = [];
    const tableElements = document.querySelectorAll('table');
    
    tableElements.forEach((table, index) => {
      const rows = [];
      const tableRows = table.querySelectorAll('tr');
      
      tableRows.forEach(tr => {
        const cells = [];
        const tableCells = tr.querySelectorAll('td, th');
        
        tableCells.forEach(cell => {
          cells.push(cell.textContent.trim());
        });
        
        if (cells.length > 0) {
          rows.push(cells);
        }
      });
      
      if (rows.length > 0) {
        tables.push({
          index: index,
          rows: rows
        });
      }
    });
    
    return tables;
  }
  
  // Filter content by keywords
  function filterByKeywords(content, keywords) {
    if (!keywords || keywords.length === 0) {
      return [];
    }
    
    const found = [];
    const contentStr = JSON.stringify(content).toLowerCase();
    
    keywords.forEach(keyword => {
      if (contentStr.includes(keyword.toLowerCase())) {
        found.push(keyword);
      }
    });
    
    return found;
  }
  
  // Show notification banner
  function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 999999;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  
  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
  
})();