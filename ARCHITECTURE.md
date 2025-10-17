# 🏗️ Web Scraper Pro - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │          Advanced Web Scraper Pro Extension               │  │
│  │                                                           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │  │
│  │  │   Popup UI  │  │  Options UI │  │ Data Viewer │     │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │  │
│  │         │                 │                 │            │  │
│  │         └─────────────────┼─────────────────┘            │  │
│  │                          │                               │  │
│  │         ┌────────────────┴────────────────┐             │  │
│  │         │   Background Service Worker      │             │  │
│  │         │  - Data management               │             │  │
│  │         │  - Export functionality          │             │  │
│  │         │  - Backend communication         │             │  │
│  │         └────────────────┬────────────────┘             │  │
│  │                          │                               │  │
│  │         ┌────────────────┴────────────────┐             │  │
│  │         │      Content Script              │             │  │
│  │         │  - Page scraping                 │             │  │
│  │         │  - DOM extraction                │             │  │
│  │         │  - Keyword filtering             │             │  │
│  │         └────────────────┬────────────────┘             │  │
│  └──────────────────────────┼────────────────────────────────┘  │
│                             │                                   │
│         Visits Webpage      │    Scrapes Content                │
│                ↓            ↓                                   │
│         ┌──────────────────────────────────┐                   │
│         │      Website Being Scraped       │                   │
│         │  - HTML content                  │                   │
│         │  - CSS selectors                 │                   │
│         │  - Tables, links, images         │                   │
│         └──────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │ HTTP API Calls
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVER                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                FastAPI Application                        │  │
│  │                (port 8001)                                │  │
│  │                                                           │  │
│  │  API Endpoints:                                          │  │
│  │  • POST   /api/scrape/data      - Save scraped data     │  │
│  │  • GET    /api/scrape/data      - Retrieve data         │  │
│  │  • DELETE /api/scrape/data/{id} - Delete entry          │  │
│  │  • GET    /api/scrape/stats     - Get statistics        │  │
│  │  • POST   /api/scrape/config    - Save config           │  │
│  │  • GET    /api/scrape/config    - Get config            │  │
│  └─────────────────────┬─────────────────────────────────────┘  │
│                        │                                         │
│                        ↓                                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                MongoDB Database                           │  │
│  │                                                           │  │
│  │  Collections:                                            │  │
│  │  • scraped_data    - All scraped content                │  │
│  │  • scraper_config  - User configuration                 │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Browser Extension Components

#### Manifest (manifest.json)
- Defines extension metadata
- Declares permissions
- Configures content scripts and background worker
- Version: Manifest V3 (latest)

#### Content Script (content.js)
**Runs on**: Every webpage visited
**Responsibilities**:
- DOM scraping using CSS selectors
- Keyword detection and filtering
- Data extraction (text, links, images, tables)
- Meta information gathering
- Automatic scraping on page load

**Key Functions**:
```javascript
- performScraping()           // Main scraping function
- extractDataFromSelectors()  // Extract based on config
- filterByKeywords()          // Apply keyword filters
- extractMetaData()           // Get meta tags
- extractTables()             // Parse HTML tables
```

#### Background Worker (background.js)
**Runs as**: Service worker
**Responsibilities**:
- Message passing between components
- Data storage management
- Backend API communication
- File export generation
- Auto-scrape triggering

**Key Functions**:
```javascript
- handleSaveScrapedData()    // Save to backend/local
- handleExportData()         // Generate exports
- handleManualScrape()       // Trigger scraping
- saveToLocalStorage()       // Local fallback
- convertToCSV()             // CSV conversion
```

#### Popup UI (popup.html/js)
**Purpose**: Quick actions interface
**Features**:
- Statistics dashboard
- Auto-scrape toggle
- Manual scrape button
- Quick export
- Navigation to other pages

#### Options Page (options.html/js)
**Purpose**: Configuration interface
**Features**:
- Keyword management
- Custom selector builder
- Domain whitelist/blacklist
- Backend connection settings
- Configuration save/reset

#### Data Viewer (data-viewer.html/js)
**Purpose**: Browse scraped data
**Features**:
- List all scraped items
- Filter by domain/search term
- View detailed content
- Delete individual items
- Statistics overview

### 2. Backend API Components

#### FastAPI Server (server.py)
**Port**: 8001
**Framework**: FastAPI with async support
**Database**: MongoDB via Motor (async driver)

**Models**:
```python
ScrapedData
  - id: str
  - url: str
  - title: str
  - domain: str
  - scraped_content: dict
  - keywords_found: list
  - timestamp: datetime
  - user_agent: str

ScraperConfig
  - auto_scrape_enabled: bool
  - keywords: list
  - selectors: list[dict]
  - whitelist_domains: list
  - blacklist_domains: list
  - export_format: str
```

#### MongoDB Database
**Database Name**: test_database
**Collections**:
- `scraped_data` - Stores all scraped content
- `scraper_config` - Stores user configuration

**Indexes**: Automatic on domain, timestamp for performance

## Data Flow

### Automatic Scraping Flow

```
1. User visits webpage
   ↓
2. Tab update detected by background worker
   ↓
3. Check auto-scrape enabled + domain filters
   ↓
4. Send message to content script
   ↓
5. Content script extracts data using selectors
   ↓
6. Apply keyword filtering
   ↓
7. Send data to background worker
   ↓
8. Background worker saves data:
   → Local storage (always)
   → Backend API (if enabled)
   ↓
9. Show success notification
```

### Manual Scraping Flow

```
1. User clicks "Scrape Current Page"
   ↓
2. Popup sends message to background worker
   ↓
3. Background worker injects script into active tab
   ↓
4. Content script performs scraping
   ↓
5. Data flows back through background worker
   ↓
6. Saved to storage + backend
   ↓
7. Success response to popup
   ↓
8. Update statistics display
```

### Export Flow

```
1. User clicks Export button (JSON/CSV)
   ↓
2. Popup retrieves data from local storage
   ↓
3. Sends data + format to background worker
   ↓
4. Background worker generates file:
   → JSON: stringify with formatting
   → CSV: convert to CSV format
   ↓
5. Create Blob and download URL
   ↓
6. Trigger browser download
   ↓
7. Confirm success to user
```

## Storage Strategy

### Local Storage (Chrome Storage API)
**Used for**:
- Extension configuration
- Scraped data (primary)
- Offline access

**Advantages**:
- No server required
- Fast access
- Automatic sync across devices (sync storage)
- Private to user

### Backend Storage (MongoDB)
**Used for**:
- Centralized data access
- Historical tracking
- API-based retrieval
- Multi-device access

**Advantages**:
- Persistent beyond browser
- Queryable via API
- Shareable
- Larger storage capacity

## Feature Mapping to Top Scrapers

### Chat4Data Features
- ✅ AI-pattern recognition (via smart selectors)
- ✅ Pagination handling (via continuous scraping)
- ✅ Email/phone detection
- ✅ Comprehensive data types

### Thunderbit Features
- ✅ Field suggestion system (default selectors)
- ✅ Subpage capability (continuous scraping)
- ✅ Flexible exports (JSON/CSV)
- ✅ Instant templates (default configs)

### Web Scraper Features
- ✅ Point-and-click interface
- ✅ Sitemap concept (selector system)
- ✅ Domain filtering
- ✅ Visual configuration

### Instant Data Scraper Features
- ✅ Direct scraping (one-click)
- ✅ Fast extraction
- ✅ Simple interface
- ✅ Automatic detection

### Data Scraper Features
- ✅ Table scraping
- ✅ List data handling
- ✅ API integration
- ✅ Real-time capture

## Technology Stack

### Frontend (Extension)
- **Language**: JavaScript (ES6+)
- **APIs**: Chrome Extension API
- **Storage**: Chrome Storage API
- **UI**: Custom HTML/CSS

### Backend
- **Language**: Python 3.11
- **Framework**: FastAPI 0.110.1
- **Database**: MongoDB (Motor driver)
- **Server**: Uvicorn (ASGI)
- **Process Manager**: Supervisor

### Deployment
- **Container**: Kubernetes cluster
- **Backend Port**: 8001 (internal)
- **Database**: localhost:27017
- **CORS**: Enabled for local development

## Security Considerations

### Extension Security
- Manifest V3 (latest security model)
- Content Security Policy enforced
- Minimal permissions requested
- No eval() or unsafe practices
- Local-first data storage

### Backend Security
- CORS configured
- Environment variable protection
- No hardcoded credentials
- MongoDB connection secured

### Privacy
- No third-party tracking
- No external API calls (except configured backend)
- User controls all data
- Export capability for data portability

## Performance Optimizations

### Extension
- Async operations for non-blocking
- Debounced auto-scrape (1s delay)
- Efficient DOM queries
- Minimal memory footprint

### Backend
- Async MongoDB operations
- Indexed queries for speed
- Pagination support
- Efficient data serialization

## Scalability

### Current Capacity
- **Extension**: Limited by browser storage (~10MB)
- **Backend**: MongoDB handles millions of documents
- **API**: Async design supports high concurrency

### Future Expansion
- Add cloud storage options
- Implement worker queues for large scrapes
- Add caching layer
- Support distributed scraping

## Monitoring & Debugging

### Extension Debugging
```javascript
// Check in browser console
chrome.storage.local.get(console.log)
chrome.storage.sync.get(console.log)
```

### Backend Monitoring
```bash
# Server status
sudo supervisorctl status backend

# View logs
tail -f /var/log/supervisor/backend.*.log

# API health check
curl http://localhost:8001/api/
```

### Database Inspection
```bash
# MongoDB shell
mongosh mongodb://localhost:27017
use test_database
db.scraped_data.find()
```

## Development Workflow

### Extension Development
1. Make changes to extension files
2. Reload extension in `chrome://extensions/`
3. Test on target websites
4. Check browser console for errors
5. Iterate

### Backend Development
1. Modify `/app/backend/server.py`
2. Restart: `sudo supervisorctl restart backend`
3. Test endpoints with curl
4. Check logs for errors
5. Update requirements.txt if needed

---

**This architecture provides a robust, scalable, and feature-rich web scraping solution that combines the best elements from the top commercial scrapers while maintaining simplicity and ease of use.**
