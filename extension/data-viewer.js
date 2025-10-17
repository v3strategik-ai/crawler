// Data viewer script

let allData = [];
let filteredData = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  
  document.getElementById('searchFilter').addEventListener('input', applyFilters);
  document.getElementById('domainFilter').addEventListener('input', applyFilters);
});

// Load all scraped data
async function loadData() {
  try {
    const result = await chrome.storage.local.get('scrapedData');
    allData = result.scrapedData || [];
    filteredData = [...allData];
    
    updateStats();
    renderData();
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Update statistics
function updateStats() {
  document.getElementById('totalItems').textContent = allData.length;
  
  const uniqueDomains = new Set(allData.map(item => item.domain));
  document.getElementById('uniqueDomains').textContent = uniqueDomains.size;
  
  const totalKeywords = allData.reduce((sum, item) => {
    return sum + (item.keywords_found?.length || 0);
  }, 0);
  document.getElementById('totalKeywords').textContent = totalKeywords;
}

// Apply filters
function applyFilters() {
  const searchText = document.getElementById('searchFilter').value.toLowerCase();
  const domainText = document.getElementById('domainFilter').value.toLowerCase();
  
  filteredData = allData.filter(item => {
    const matchesSearch = !searchText || 
      item.title?.toLowerCase().includes(searchText) || 
      item.url?.toLowerCase().includes(searchText);
    
    const matchesDomain = !domainText || 
      item.domain?.toLowerCase().includes(domainText);
    
    return matchesSearch && matchesDomain;
  });
  
  renderData();
}

// Render data list
function renderData() {
  const dataList = document.getElementById('dataList');
  
  if (filteredData.length === 0) {
    dataList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-title">No Data Found</div>
        <div class="empty-state-text">Start scraping websites to see data here</div>
      </div>
    `;
    return;
  }
  
  dataList.innerHTML = filteredData.map((item, index) => `
    <div class="data-item">
      <div class="data-header">
        <div>
          <div class="data-title">${escapeHtml(item.title || 'Untitled')}</div>
          <a href="${escapeHtml(item.url)}" class="data-url" target="_blank">${escapeHtml(item.url)}</a>
        </div>
        <button class="btn btn-danger" onclick="deleteItem('${item.id || index}')">Delete</button>
      </div>
      
      <div class="data-meta">
        <span class="meta-item">🌐 ${escapeHtml(item.domain)}</span>
        <span class="meta-item">🕒 ${formatDate(item.timestamp)}</span>
      </div>
      
      ${item.keywords_found?.length > 0 ? `
        <div style="margin-bottom: 12px;">
          ${item.keywords_found.map(k => `<span class="keywords-badge">${escapeHtml(k)}</span>`).join('')}
        </div>
      ` : ''}
      
      <div class="data-content">
        <pre>${escapeHtml(JSON.stringify(item.scraped_content, null, 2))}</pre>
      </div>
    </div>
  `).join('');
}

// Delete item
window.deleteItem = async function(itemId) {
  if (!confirm('Are you sure you want to delete this item?')) {
    return;
  }
  
  try {
    allData = allData.filter(item => (item.id || allData.indexOf(item)) !== itemId);
    await chrome.storage.local.set({ scrapedData: allData });
    await loadData();
  } catch (error) {
    console.error('Error deleting item:', error);
  }
};

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Format date
function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  return date.toLocaleString();
}