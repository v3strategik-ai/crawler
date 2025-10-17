from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, HttpUrl
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from bs4 import BeautifulSoup
import requests
from urllib.parse import urljoin, urlparse
import json
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="CRAWLai API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# Models
class ScrapeRequest(BaseModel):
    url: str
    selectors: Optional[List[Dict[str, str]]] = []
    extract_links: bool = True
    extract_images: bool = True
    extract_tables: bool = True
    max_depth: int = 1
    follow_pagination: bool = False

class ScraperProject(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = ""
    target_url: str
    selectors: List[Dict[str, Any]] = []
    schedule: Optional[str] = None
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_run: Optional[datetime] = None
    run_count: int = 0

class ScraperProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    target_url: str
    selectors: List[Dict[str, Any]] = []
    schedule: Optional[str] = None

class ScrapedResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    url: str
    title: Optional[str] = ""
    data: Dict[str, Any] = {}
    scraped_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "success"
    error: Optional[str] = None

class ScrapeTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str
    description: str
    icon: str
    selectors: List[Dict[str, Any]]
    sample_url: str

# Scraping Engine
class WebScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def scrape_url(self, url: str, selectors: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            result = {
                'url': url,
                'title': soup.title.string if soup.title else '',
                'data': {}
            }
            
            # Extract based on selectors
            if selectors:
                for selector_config in selectors:
                    name = selector_config.get('name', 'unnamed')
                    selector = selector_config.get('selector', '')
                    extract_type = selector_config.get('type', 'text')
                    
                    elements = soup.select(selector)
                    
                    if extract_type == 'text':
                        result['data'][name] = [el.get_text(strip=True) for el in elements]
                    elif extract_type == 'attribute':
                        attr = selector_config.get('attribute', 'href')
                        result['data'][name] = [el.get(attr) for el in elements if el.get(attr)]
                    elif extract_type == 'html':
                        result['data'][name] = [str(el) for el in elements]
            
            # Auto-extract common elements
            result['data']['links'] = [
                {'text': a.get_text(strip=True), 'href': urljoin(url, a.get('href'))}
                for a in soup.find_all('a', href=True)
            ][:50]  # Limit to 50 links
            
            result['data']['images'] = [
                {'src': urljoin(url, img.get('src')), 'alt': img.get('alt', '')}
                for img in soup.find_all('img', src=True)
            ][:30]  # Limit to 30 images
            
            # Extract tables
            tables = []
            for table in soup.find_all('table')[:5]:  # Limit to 5 tables
                rows = []
                for tr in table.find_all('tr'):
                    cells = [td.get_text(strip=True) for td in tr.find_all(['td', 'th'])]
                    if cells:
                        rows.append(cells)
                if rows:
                    tables.append(rows)
            result['data']['tables'] = tables
            
            # Extract meta tags
            result['data']['meta'] = {
                meta.get('name') or meta.get('property'): meta.get('content')
                for meta in soup.find_all('meta')
                if meta.get('content')
            }
            
            return result
            
        except Exception as e:
            return {
                'url': url,
                'error': str(e),
                'status': 'failed'
            }

scraper = WebScraper()

# API Routes
@api_router.get("/")
async def root():
    return {"message": "CRAWLai API", "version": "1.0.0", "status": "active"}

# Quick Scrape
@api_router.post("/scrape/quick")
async def quick_scrape(request: ScrapeRequest):
    """Perform a quick scrape of a URL"""
    result = scraper.scrape_url(request.url, request.selectors)
    return result

# Projects CRUD
@api_router.post("/projects", response_model=ScraperProject)
async def create_project(project: ScraperProjectCreate):
    """Create a new scraping project"""
    project_obj = ScraperProject(**project.model_dump())
    doc = project_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('last_run'):
        doc['last_run'] = doc['last_run'].isoformat()
    
    await db.scraper_projects.insert_one(doc)
    return project_obj

@api_router.get("/projects", response_model=List[ScraperProject])
async def get_projects():
    """Get all scraping projects"""
    projects = await db.scraper_projects.find({}, {"_id": 0}).to_list(1000)
    
    for project in projects:
        if isinstance(project.get('created_at'), str):
            project['created_at'] = datetime.fromisoformat(project['created_at'])
        if project.get('last_run') and isinstance(project['last_run'], str):
            project['last_run'] = datetime.fromisoformat(project['last_run'])
    
    return projects

@api_router.get("/projects/{project_id}", response_model=ScraperProject)
async def get_project(project_id: str):
    """Get a specific project"""
    project = await db.scraper_projects.find_one({"id": project_id}, {"_id": 0})
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if isinstance(project.get('created_at'), str):
        project['created_at'] = datetime.fromisoformat(project['created_at'])
    if project.get('last_run') and isinstance(project['last_run'], str):
        project['last_run'] = datetime.fromisoformat(project['last_run'])
    
    return project

@api_router.put("/projects/{project_id}", response_model=ScraperProject)
async def update_project(project_id: str, project: ScraperProjectCreate):
    """Update a project"""
    existing = await db.scraper_projects.find_one({"id": project_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = project.model_dump()
    await db.scraper_projects.update_one(
        {"id": project_id},
        {"$set": update_data}
    )
    
    updated = await get_project(project_id)
    return updated

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    """Delete a project"""
    result = await db.scraper_projects.delete_one({"id": project_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Also delete associated results
    await db.scraped_results.delete_many({"project_id": project_id})
    
    return {"message": "Project deleted successfully"}

# Run Project
@api_router.post("/projects/{project_id}/run")
async def run_project(project_id: str, background_tasks: BackgroundTasks):
    """Run a scraping project"""
    project = await db.scraper_projects.find_one({"id": project_id}, {"_id": 0})
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Scrape the URL
    result = scraper.scrape_url(project['target_url'], project.get('selectors', []))
    
    # Save result
    scraped_result = ScrapedResult(
        project_id=project_id,
        url=result['url'],
        title=result.get('title', ''),
        data=result.get('data', {}),
        status='success' if 'error' not in result else 'failed',
        error=result.get('error')
    )
    
    doc = scraped_result.model_dump()
    doc['scraped_at'] = doc['scraped_at'].isoformat()
    await db.scraped_results.insert_one(doc)
    
    # Update project
    await db.scraper_projects.update_one(
        {"id": project_id},
        {
            "$set": {
                "last_run": datetime.now(timezone.utc).isoformat()
            },
            "$inc": {"run_count": 1}
        }
    )
    
    return scraped_result

# Results
@api_router.get("/projects/{project_id}/results")
async def get_project_results(project_id: str, limit: int = 50):
    """Get results for a project"""
    results = await db.scraped_results.find(
        {"project_id": project_id},
        {"_id": 0}
    ).sort("scraped_at", -1).limit(limit).to_list(limit)
    
    for result in results:
        if isinstance(result.get('scraped_at'), str):
            result['scraped_at'] = datetime.fromisoformat(result['scraped_at'])
    
    return results

@api_router.get("/results", response_model=List[ScrapedResult])
async def get_all_results(limit: int = 100):
    """Get all scraped results"""
    results = await db.scraped_results.find({}, {"_id": 0}).sort("scraped_at", -1).limit(limit).to_list(limit)
    
    for result in results:
        if isinstance(result.get('scraped_at'), str):
            result['scraped_at'] = datetime.fromisoformat(result['scraped_at'])
    
    return results

# Templates
@api_router.get("/templates", response_model=List[ScrapeTemplate])
async def get_templates():
    """Get scraping templates"""
    templates = [
        {
            "id": "ecommerce",
            "name": "E-commerce Product",
            "category": "Shopping",
            "description": "Extract product details, prices, and reviews",
            "icon": "ShoppingCart",
            "selectors": [
                {"name": "title", "selector": "h1.product-title, .product-name", "type": "text"},
                {"name": "price", "selector": ".price, [data-price]", "type": "text"},
                {"name": "description", "selector": ".description, .product-description", "type": "text"},
                {"name": "images", "selector": ".product-image img", "type": "attribute", "attribute": "src"}
            ],
            "sample_url": "https://example.com/product"
        },
        {
            "id": "news",
            "name": "News Article",
            "category": "Media",
            "description": "Extract article title, content, author, and date",
            "icon": "Newspaper",
            "selectors": [
                {"name": "headline", "selector": "h1.headline, article h1", "type": "text"},
                {"name": "author", "selector": ".author, .byline", "type": "text"},
                {"name": "date", "selector": "time, .publish-date", "type": "text"},
                {"name": "content", "selector": "article p, .article-body p", "type": "text"}
            ],
            "sample_url": "https://example.com/article"
        },
        {
            "id": "directory",
            "name": "Business Directory",
            "category": "Directory",
            "description": "Extract business listings with contact info",
            "icon": "Building2",
            "selectors": [
                {"name": "name", "selector": ".business-name, h3", "type": "text"},
                {"name": "phone", "selector": ".phone, a[href^='tel:']", "type": "text"},
                {"name": "address", "selector": ".address, .location", "type": "text"},
                {"name": "website", "selector": "a.website", "type": "attribute", "attribute": "href"}
            ],
            "sample_url": "https://example.com/directory"
        },
        {
            "id": "job",
            "name": "Job Listing",
            "category": "Careers",
            "description": "Extract job postings with requirements",
            "icon": "Briefcase",
            "selectors": [
                {"name": "title", "selector": ".job-title, h1", "type": "text"},
                {"name": "company", "selector": ".company-name", "type": "text"},
                {"name": "location", "selector": ".location, .job-location", "type": "text"},
                {"name": "salary", "selector": ".salary, .compensation", "type": "text"},
                {"name": "description", "selector": ".job-description", "type": "text"}
            ],
            "sample_url": "https://example.com/jobs"
        },
        {
            "id": "social",
            "name": "Social Media Post",
            "category": "Social",
            "description": "Extract posts, comments, and engagement",
            "icon": "Share2",
            "selectors": [
                {"name": "content", "selector": ".post-content, .status", "type": "text"},
                {"name": "author", "selector": ".author, .username", "type": "text"},
                {"name": "timestamp", "selector": "time, .timestamp", "type": "text"},
                {"name": "likes", "selector": ".like-count, .engagement", "type": "text"}
            ],
            "sample_url": "https://example.com/post"
        },
        {
            "id": "realestate",
            "name": "Real Estate",
            "category": "Property",
            "description": "Extract property listings with details",
            "icon": "Home",
            "selectors": [
                {"name": "address", "selector": ".property-address, h1", "type": "text"},
                {"name": "price", "selector": ".price, .listing-price", "type": "text"},
                {"name": "bedrooms", "selector": ".beds, .bedrooms", "type": "text"},
                {"name": "bathrooms", "selector": ".baths, .bathrooms", "type": "text"},
                {"name": "sqft", "selector": ".sqft, .square-feet", "type": "text"}
            ],
            "sample_url": "https://example.com/property"
        }
    ]
    return templates

# Stats
@api_router.get("/stats")
async def get_stats():
    """Get platform statistics"""
    total_projects = await db.scraper_projects.count_documents({})
    active_projects = await db.scraper_projects.count_documents({"active": True})
    total_results = await db.scraped_results.count_documents({})
    
    # Recent activity
    recent_results = await db.scraped_results.find(
        {},
        {"_id": 0, "project_id": 1, "scraped_at": 1}
    ).sort("scraped_at", -1).limit(10).to_list(10)
    
    return {
        "total_projects": total_projects,
        "active_projects": active_projects,
        "total_results": total_results,
        "recent_activity": recent_results
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()