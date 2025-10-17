from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class ScrapedData(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    url: str
    title: str
    domain: str
    scraped_content: Dict[str, Any]
    keywords_found: List[str] = []
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_agent: Optional[str] = None

class ScrapedDataCreate(BaseModel):
    url: str
    title: str
    domain: str
    scraped_content: Dict[str, Any]
    keywords_found: List[str] = []
    user_agent: Optional[str] = None

class ScraperConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    auto_scrape_enabled: bool = True
    keywords: List[str] = []
    selectors: List[Dict[str, str]] = []
    whitelist_domains: List[str] = []
    blacklist_domains: List[str] = []
    export_format: str = "json"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ScraperConfigCreate(BaseModel):
    auto_scrape_enabled: bool = True
    keywords: List[str] = []
    selectors: List[Dict[str, str]] = []
    whitelist_domains: List[str] = []
    blacklist_domains: List[str] = []
    export_format: str = "json"


# Routes
@api_router.get("/")
async def root():
    return {"message": "Web Scraper API", "status": "active"}

# Scraped Data Endpoints
@api_router.post("/scrape/data", response_model=ScrapedData)
async def save_scraped_data(input: ScrapedDataCreate):
    """Save scraped data from browser extension"""
    data_obj = ScrapedData(**input.model_dump())
    
    doc = data_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    await db.scraped_data.insert_one(doc)
    return data_obj

@api_router.get("/scrape/data", response_model=List[ScrapedData])
async def get_scraped_data(
    limit: int = 100,
    domain: Optional[str] = None,
    keyword: Optional[str] = None
):
    """Retrieve scraped data with optional filters"""
    query = {}
    
    if domain:
        query['domain'] = domain
    
    if keyword:
        query['keywords_found'] = keyword
    
    data = await db.scraped_data.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    
    for item in data:
        if isinstance(item['timestamp'], str):
            item['timestamp'] = datetime.fromisoformat(item['timestamp'])
    
    return data

@api_router.delete("/scrape/data/{data_id}")
async def delete_scraped_data(data_id: str):
    """Delete a specific scraped data entry"""
    result = await db.scraped_data.delete_one({"id": data_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Data not found")
    
    return {"message": "Data deleted successfully"}

@api_router.delete("/scrape/data")
async def clear_all_scraped_data():
    """Clear all scraped data"""
    result = await db.scraped_data.delete_many({})
    return {"message": f"Deleted {result.deleted_count} entries"}

# Configuration Endpoints
@api_router.post("/scrape/config", response_model=ScraperConfig)
async def save_scraper_config(input: ScraperConfigCreate):
    """Save scraper configuration"""
    # Delete existing config (we only keep one)
    await db.scraper_config.delete_many({})
    
    config_obj = ScraperConfig(**input.model_dump())
    doc = config_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    await db.scraper_config.insert_one(doc)
    return config_obj

@api_router.get("/scrape/config", response_model=Optional[ScraperConfig])
async def get_scraper_config():
    """Get current scraper configuration"""
    config = await db.scraper_config.find_one({}, {"_id": 0})
    
    if config:
        if isinstance(config['timestamp'], str):
            config['timestamp'] = datetime.fromisoformat(config['timestamp'])
        return config
    
    return None

# Statistics Endpoint
@api_router.get("/scrape/stats")
async def get_scraper_stats():
    """Get scraping statistics"""
    total_scraped = await db.scraped_data.count_documents({})
    
    # Get top domains
    pipeline = [
        {"$group": {"_id": "$domain", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    top_domains = await db.scraped_data.aggregate(pipeline).to_list(10)
    
    return {
        "total_scraped_pages": total_scraped,
        "top_domains": [{"domain": item["_id"], "count": item["count"]} for item in top_domains]
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()