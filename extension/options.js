// Options page script

let currentConfig = {};

document.addEventListener('DOMContentLoaded', async () => {
  await loadConfiguration();
  
  document.getElementById('addSelectorBtn').addEventListener('click', addSelector);
  document.getElementById('saveBtn').addEventListener('click', saveConfiguration);
  document.getElementById('resetBtn').addEventListener('click', resetToDefaults);
});

// Load configuration
async function loadConfiguration() {
  try {
    const result = await chrome.storage.sync.get('scraperConfig');
    currentConfig = result.scraperConfig || getDefaultConfig();
    
    // Load keywords
    document.getElementById('keywords').value = currentConfig.keywords.join('\n');
    
    // Load selectors
    renderSelectors();
    
    // Load domain filters
    document.getElementById('whitelist').value = currentConfig.whitelistDomains.join('\n');
    document.getElementById('blacklist').value = currentConfig.blacklistDomains.join('\n');
    
    // Load backend settings
    document.getElementById('backendUrl').value = currentConfig.backendUrl || 'http://localhost:8001/api';
    document.getElementById('saveToBackend').checked = currentConfig.saveToBackend || false;
    
  } catch (error) {
    console.error('Error loading configuration:', error);
    showStatus('Error loading configuration', 'error');
  }
}

// Render selectors
function renderSelectors() {
  const selectorList = document.getElementById('selectorList');
  selectorList.innerHTML = '';
  
  currentConfig.selectors.forEach((selector, index) => {
    const item = document.createElement('div');
    item.className = 'selector-item';
    item.innerHTML = `
      <input type="text" class="selector-input" value="${selector.name}" data-index="${index}" data-field="name" placeholder="Name">
      <input type="text" class="selector-input" value="${selector.selector}" data-index="${index}" data-field="selector" placeholder="CSS Selector">
      <select class="selector-input" data-index="${index}" data-field="type">
        <option value="text" ${selector.type === 'text' ? 'selected' : ''}>Text</option>
        <option value="links" ${selector.type === 'links' ? 'selected' : ''}>Links</option>
        <option value="images" ${selector.type === 'images' ? 'selected' : ''}>Images</option>
        <option value="emails" ${selector.type === 'emails' ? 'selected' : ''}>Emails</option>
        <option value="html" ${selector.type === 'html' ? 'selected' : ''}>HTML</option>
      </select>
      <button class="btn btn-danger btn-small" onclick="removeSelector(${index})">Remove</button>
    `;
    selectorList.appendChild(item);
  });
  
  // Add event listeners
  selectorList.querySelectorAll('.selector-input').forEach(input => {
    input.addEventListener('change', updateSelector);
  });
}

// Add new selector
function addSelector() {
  currentConfig.selectors.push({
    name: 'new_selector',
    selector: '',
    type: 'text'
  });
  renderSelectors();
}

// Remove selector
window.removeSelector = function(index) {
  currentConfig.selectors.splice(index, 1);
  renderSelectors();
};

// Update selector
function updateSelector(event) {
  const index = parseInt(event.target.dataset.index);
  const field = event.target.dataset.field;
  currentConfig.selectors[index][field] = event.target.value;
}

// Save configuration
async function saveConfiguration() {
  try {
    // Update keywords
    const keywords = document.getElementById('keywords').value
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);
    
    // Update domain filters
    const whitelist = document.getElementById('whitelist').value
      .split('\n')
      .map(d => d.trim())
      .filter(d => d.length > 0);
    
    const blacklist = document.getElementById('blacklist').value
      .split('\n')
      .map(d => d.trim())
      .filter(d => d.length > 0);
    
    // Update backend settings
    const backendUrl = document.getElementById('backendUrl').value.trim();
    const saveToBackend = document.getElementById('saveToBackend').checked;
    
    // Update configuration
    currentConfig.keywords = keywords;
    currentConfig.whitelistDomains = whitelist;
    currentConfig.blacklistDomains = blacklist;
    currentConfig.backendUrl = backendUrl;
    currentConfig.saveToBackend = saveToBackend;
    
    // Save to storage
    await chrome.storage.sync.set({ scraperConfig: currentConfig });
    
    // Also save to backend if enabled
    if (saveToBackend && backendUrl) {
      try {
        await fetch(`${backendUrl}/scrape/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            auto_scrape_enabled: currentConfig.autoScrapeEnabled,
            keywords: currentConfig.keywords,
            selectors: currentConfig.selectors,
            whitelist_domains: currentConfig.whitelistDomains,
            blacklist_domains: currentConfig.blacklistDomains,
            export_format: currentConfig.exportFormat
          })
        });
      } catch (error) {
        console.warn('Could not save to backend:', error);
      }
    }
    
    showStatus('Configuration saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving configuration:', error);
    showStatus('Error saving configuration', 'error');
  }
}

// Reset to defaults
async function resetToDefaults() {
  if (!confirm('Are you sure you want to reset to default configuration?')) {
    return;
  }
  
  currentConfig = getDefaultConfig();
  await chrome.storage.sync.set({ scraperConfig: currentConfig });
  await loadConfiguration();
  showStatus('Configuration reset to defaults', 'success');
}

// Get default configuration
function getDefaultConfig() {
  return {
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
    backendUrl: 'http://localhost:8001/api'
  };
}

// Show status message
function showStatus(message, type) {
  const statusDiv = document.getElementById('statusMessage');
  statusDiv.textContent = message;
  statusDiv.className = `status-message ${type}`;
  
  setTimeout(() => {
    statusDiv.textContent = '';
    statusDiv.className = '';
  }, 3000);
}