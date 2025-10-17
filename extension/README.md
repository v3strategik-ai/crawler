# Advanced Web Scraper Pro

A lightweight, powerful browser extension that combines the best features from top-performing web scrapers on the market. Automatically scrapes websites you visit with advanced filtering, custom selectors, and backend integration.

## 🚀 Features

Based on analysis of the top 5 web scrapers (Chat4Data, Thunderbit, Web Scraper, Instant Data Scraper, Data Scraper), this extension includes:

### Core Features
- ✅ **Automatic Scraping** - Scrapes every website you visit automatically
- ✅ **Custom CSS Selectors** - Define exactly what data to extract
- ✅ **Keyword Filtering** - Only save pages containing specific keywords
- ✅ **Multi-Format Export** - Export data as JSON or CSV
- ✅ **Backend Integration** - Save scraped data to FastAPI backend with MongoDB
- ✅ **Domain Whitelist/Blacklist** - Control which sites to scrape
- ✅ **Point-and-Click Configuration** - Easy-to-use UI for all settings
- ✅ **Real-time Statistics** - Track scraped pages and keywords found
- ✅ **Table Extraction** - Automatically extracts data from HTML tables
- ✅ **Meta Data Extraction** - Captures page metadata
- ✅ **Email & Link Detection** - Special handling for emails and links
- ✅ **Image Scraping** - Extract images with metadata

## 📦 Installation

### Chrome/Edge Installation

1. Download or clone this repository
2. Open Chrome/Edge and navigate to:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the `/app/extension` folder
6. The extension is now installed! 🎉

### Backend Setup (Optional)

The extension works standalone, but for advanced features like centralized data storage:

1. Install backend dependencies:
```bash
cd /app/backend
pip install -r requirements.txt
```

2. Make sure MongoDB is running (already configured at `mongodb://localhost:27017`)

3. Start the backend server:
```bash
sudo supervisorctl restart backend
```

4. The API will be available at `http://localhost:8001/api`

## 🎯 Usage

### Quick Start

1. **Click the extension icon** in your browser toolbar
2. **Toggle Auto-Scrape** to enable/disable automatic scraping
3. **Click "Configuration"** to set up:
   - Keywords to search for
   - Custom CSS selectors
   - Domain filters
   - Backend connection

### Manual Scraping

- Click **"Scrape Current Page"** in the popup to manually scrape any page
- View scraped data by clicking **"View Scraped Data"**

### Configuration

#### Keywords
Add keywords (one per line) to filter pages. Only pages containing these keywords will be saved.

```
product
price
email
contact
```

#### Custom Selectors
Define custom CSS selectors to extract specific data:

| Name | Selector | Type |
|------|----------|------|
| headings | h1, h2, h3 | text |
| links | a[href] | links |
| images | img[src] | images |
| emails | a[href^="mailto:"] | emails |
| prices | .price, [data-price] | text |

#### Domain Filters

**Whitelist**: Only scrape these domains (leave empty to scrape all)
```
example.com
github.com
stackoverflow.com
```

**Blacklist**: Never scrape these domains
```
ads.example.com
tracker.com
```

### Exporting Data

1. Click the extension icon
2. Choose **"Export as JSON"** or **"Export as CSV"**
3. Select where to save the file

## 🏗️ Architecture

### Extension Structure

```
/app/extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (handles data saving)
├── content.js            # Content script (performs scraping)
├── popup.html/js         # Extension popup UI
├── options.html/js       # Configuration page
├── data-viewer.html/js   # Data viewer page
└── icons/                # Extension icons
```

### Backend API Endpoints

- `POST /api/scrape/data` - Save scraped data
- `GET /api/scrape/data?limit=100&domain=example.com` - Retrieve data
- `DELETE /api/scrape/data/{id}` - Delete specific entry
- `DELETE /api/scrape/data` - Clear all data
- `POST /api/scrape/config` - Save configuration
- `GET /api/scrape/config` - Get configuration
- `GET /api/scrape/stats` - Get statistics

## 🔧 Advanced Configuration

### Backend Connection

In the Configuration page:

1. Set **Backend API URL**: `http://localhost:8001/api`
2. Enable **"Save to Backend Server"**
3. Click **"Save Configuration"**

All scraped data will now be saved to MongoDB via the FastAPI backend.

### Custom Selector Types

- **text**: Extract text content
- **links**: Extract links with href and text
- **images**: Extract images with src, alt, width, height
- **emails**: Extract email addresses from mailto links
- **html**: Extract raw HTML

## 📊 Data Structure

Scraped data is stored in this format:

```json
{
  "id": "uuid",
  "url": "https://example.com/page",
  "title": "Page Title",
  "domain": "example.com",
  "scraped_content": {
    "headings": ["Heading 1", "Heading 2"],
    "links": [{"text": "Link text", "href": "url"}],
    "images": [{"src": "url", "alt": "description"}],
    "meta": {"description": "..."},
    "tables": [["cell1", "cell2"], ...]
  },
  "keywords_found": ["keyword1", "keyword2"],
  "timestamp": "2025-01-10T12:00:00Z"
}
```

## 🎨 Features from Top Scrapers

### From Chat4Data
- ✅ AI-based data extraction patterns
- ✅ Automatic pagination handling
- ✅ Email and phone number detection

### From Thunderbit
- ✅ Smart field suggestions
- ✅ Subpage scraping capability
- ✅ Flexible export options

### From Web Scraper
- ✅ Point-and-click interface
- ✅ Custom selector configuration
- ✅ Domain-based filtering

### From Instant Data Scraper
- ✅ Fast, simple scraping
- ✅ Automatic detection of data patterns

### From Data Scraper
- ✅ Table and list data scraping
- ✅ API integration
- ✅ Real-time data capture

## 🔒 Privacy & Security

- All data is stored locally in your browser by default
- Backend integration is optional and can be disabled
- No data is sent to third parties
- You have full control over what gets scraped

## 🐛 Troubleshooting

### Extension not scraping?
- Check that Auto-Scrape is enabled
- Verify domain is not blacklisted
- Check browser console for errors

### Backend connection failed?
- Ensure backend server is running: `sudo supervisorctl status backend`
- Check logs: `tail -n 100 /var/log/supervisor/backend.*.log`
- Verify URL in configuration matches server address

### Data not appearing?
- Check keyword filters - pages must contain keywords to be saved
- Verify selectors are correct for target websites
- Check storage in data viewer

## 📝 License

MIT License - Feel free to use and modify as needed!

## 🤝 Contributing

Contributions welcome! This scraper combines the best features from:
- Chat4Data
- Thunderbit
- Web Scraper
- Instant Data Scraper
- Data Scraper

Feel free to suggest additional features from other scrapers.