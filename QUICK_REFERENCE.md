# 🎯 Web Scraper Pro - Quick Reference

## Installation (2 Steps)

### Chrome
1. Go to `chrome://extensions/` → Enable Developer Mode
2. Click "Load unpacked" → Select `/app/extension/`

### Edge  
1. Go to `edge://extensions/` → Enable Developer Mode
2. Click "Load unpacked" → Select `/app/extension/`

---

## Features from Top 5 Scrapers

| Feature | From | Description |
|---------|------|-------------|
| Auto-Scrape Every Page | Instant Data Scraper | Automatically captures data as you browse |
| Custom CSS Selectors | Web Scraper | Define exactly what to extract |
| Keyword Filtering | Chat4Data | Only save pages with specific keywords |
| Table Extraction | Data Scraper | Auto-extracts HTML tables |
| API Integration | Data Scraper | Backend storage via FastAPI |
| Point-and-Click Config | Web Scraper | Easy visual configuration |
| Multi-Format Export | Thunderbit | Export as JSON or CSV |
| Domain Whitelist/Blacklist | Web Scraper | Control which sites to scrape |
| Email Detection | Chat4Data | Automatically finds emails |
| Image Scraping | Chat4Data | Extract images with metadata |
| Link Extraction | All | Capture all links with context |
| Real-time Statistics | Thunderbit | Track scraping metrics |

---

## Quick Actions

### Popup (Click Extension Icon)
- **Scrape Now**: Manually scrape current page
- **View Data**: Browse all scraped data
- **Configuration**: Customize settings
- **Export JSON**: Download as JSON file
- **Export CSV**: Download as CSV file
- **Clear Data**: Delete all scraped data
- **Toggle Auto-Scrape**: Enable/disable automatic scraping

---

## Configuration Options

### 🎯 Keywords
```
Add one keyword per line:
product
price
email
```
Only pages containing these keywords will be saved.

### 🎨 Custom Selectors
| Name | CSS Selector | Type |
|------|-------------|------|
| headings | h1, h2, h3 | text |
| links | a[href] | links |
| images | img[src] | images |
| emails | a[href^="mailto:"] | emails |
| prices | .price, [data-price] | text |

**Selector Types:**
- `text` - Extract text content
- `links` - Extract links with href and text
- `images` - Extract images with metadata
- `emails` - Extract email addresses
- `html` - Extract raw HTML

### 🌐 Domain Filters
**Whitelist** (Only scrape these):
```
example.com
github.com
```

**Blacklist** (Never scrape these):
```
ads.example.com
tracker.com
```

### ⚙️ Backend Settings
- **URL**: `http://localhost:8001/api`
- **Enable**: Check to save to backend server

---

## Backend API Quick Reference

### Status Check
```bash
curl http://localhost:8001/api/
```

### Get Statistics
```bash
curl http://localhost:8001/api/scrape/stats
```

### Get All Data
```bash
curl http://localhost:8001/api/scrape/data
```

### Get Filtered Data
```bash
curl "http://localhost:8001/api/scrape/data?limit=50&domain=example.com"
```

### Clear All Data
```bash
curl -X DELETE http://localhost:8001/api/scrape/data
```

### Backend Control
```bash
# Check status
sudo supervisorctl status backend

# Restart
sudo supervisorctl restart backend

# View logs
tail -n 50 /var/log/supervisor/backend.*.log
```

---

## Common Use Cases

### 1. 🛒 E-commerce Price Monitoring
**Keywords**: `price`, `$`, `sale`, `discount`  
**Selectors**: `.price`, `[data-price]`, `.sale-price`  
**Whitelist**: `amazon.com`, `ebay.com`

### 2. 📧 Lead Generation
**Keywords**: `email`, `contact`, `phone`  
**Selectors**: `a[href^="mailto:"]`, `.contact-info`  
**Export**: CSV format

### 3. 📚 Content Research
**Keywords**: Your research topics  
**Selectors**: `h1`, `article`, `.content`  
**Auto-scrape**: ON

### 4. 🔍 Competitor Analysis
**Whitelist**: Competitor domains  
**Selectors**: `.product-title`, `.product-price`, `.rating`  
**Backend**: Enabled for tracking over time

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open Extension | Click toolbar icon |
| View Data | Extension → View Data |
| Quick Export | Extension → Export JSON/CSV |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Not scraping | Check Auto-Scrape is ON, remove keyword filters |
| Backend error | Check: `sudo supervisorctl status backend` |
| No data showing | Check keyword filters and domain whitelist |
| Export failed | Check browser download settings |

---

## Data Storage

**Local (Default)**:
- Stored in browser's local storage
- No server required
- Private and secure

**Backend (Optional)**:
- Stored in MongoDB
- Accessible via API
- Centralized access
- Historical tracking

---

## Best Practices

✅ Start with default settings  
✅ Use specific CSS selectors for accuracy  
✅ Add common ad domains to blacklist  
✅ Export data regularly as backup  
✅ Test selectors in browser DevTools first  
✅ Respect website terms of service  
✅ Don't overload servers with requests  

---

## File Locations

| Component | Location |
|-----------|----------|
| Extension Files | `/app/extension/` |
| Backend API | `/app/backend/server.py` |
| Installation Guide | `/app/INSTALLATION_GUIDE.md` |
| Extension README | `/app/extension/README.md` |

---

## Support

1. Check `/app/INSTALLATION_GUIDE.md` for detailed instructions
2. Check `/app/extension/README.md` for feature documentation
3. View backend logs: `tail -n 100 /var/log/supervisor/backend.*.log`
4. Check browser console (F12) for extension errors

---

**Ready to scrape! Visit any website to start collecting data! 🚀**
