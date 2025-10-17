from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, HttpUrl, EmailStr
from typing import List, Optional, Dict, Any, Literal
import uuid
from datetime import datetime, timezone
from bs4 import BeautifulSoup
import requests
from urllib.parse import urljoin, urlparse
import json
import asyncio
import re
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="CRAWLai Pro API", version="2.0.0")
api_router = APIRouter(prefix="/api")

# Advanced Models
class ProxyConfig(BaseModel):
    enabled: bool = False
    proxy_url: Optional[str] = None
    auth: Optional[Dict[str, str]] = None

class RateLimitConfig(BaseModel):
    enabled: bool = True
    requests_per_minute: int = 30
    delay_between_requests: float = 2.0

class AuthConfig(BaseModel):
    type: Literal["none", "basic", "bearer", "cookie"] = "none"
    username: Optional[str] = None
    password: Optional[str] = None
    token: Optional[str] = None
    cookies: Optional[Dict[str, str]] = None

class SelectorConfig(BaseModel):
    name: str
    selector: str
    selector_type: Literal["css", "xpath"] = "css"
    extract_type: Literal["text", "attribute", "html", "regex"] = "text"
    attribute: Optional[str] = None
    regex_pattern: Optional[str] = None
    transform: Optional[str] = None  # JavaScript-like transform
    required: bool = False
    multiple: bool = True

class PaginationConfig(BaseModel):
    enabled: bool = False
    strategy: Literal["next_button", "page_numbers", "infinite_scroll", "api"] = "next_button"
    next_selector: Optional[str] = None
    max_pages: int = 10
    url_pattern: Optional[str] = None  # e.g., "https://example.com/page={page}"

class DataTransform(BaseModel):
    field: str
    operation: Literal["lowercase", "uppercase", "trim", "regex_extract", "split", "replace", "parse_date", "parse_number"]
    params: Optional[Dict[str, Any]] = {}

class WebhookConfig(BaseModel):
    enabled: bool = False
    url: Optional[str] = None
    events: List[str] = ["scrape_complete", "scrape_failed"]
    headers: Optional[Dict[str, str]] = None

class AdvancedScrapeRequest(BaseModel):
    urls: List[str]
    selectors: List[SelectorConfig] = []
    proxy: ProxyConfig = ProxyConfig()
    rate_limit: RateLimitConfig = RateLimitConfig()
    auth: AuthConfig = AuthConfig()
    pagination: PaginationConfig = PaginationConfig()
    transforms: List[DataTransform] = []
    extract_links: bool = True
    extract_images: bool = True
    extract_tables: bool = True
    extract_emails: bool = True
    extract_phones: bool = True
    custom_headers: Optional[Dict[str, str]] = None
    javascript_enabled: bool = False
    timeout: int = 30
    retry_count: int = 3
    webhook: WebhookConfig = WebhookConfig()

class ScraperProject(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = ""
    target_urls: List[str]
    config: AdvancedScrapeRequest
    schedule: Optional[str] = None
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_run: Optional[datetime] = None
    run_count: int = 0
    success_count: int = 0
    error_count: int = 0
    auto_import_to_crm: bool = False
    crm_mapping: Optional[Dict[str, str]] = None

class ScraperProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    target_urls: List[str]
    config: AdvancedScrapeRequest
    schedule: Optional[str] = None
    auto_import_to_crm: bool = False
    crm_mapping: Optional[Dict[str, str]] = None

class ScrapedResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    url: str
    title: Optional[str] = ""
    data: Dict[str, Any] = {}
    extracted_contacts: List[Dict[str, Any]] = []
    scraped_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "success"
    error: Optional[str] = None
    processing_time: Optional[float] = None

# CRM Models
class CRMContact(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    website: Optional[str] = None
    linkedin: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    tags: List[str] = []
    status: Literal["new", "contacted", "qualified", "proposal", "won", "lost"] = "new"
    source: str = "manual"
    source_url: Optional[str] = None
    scraped_data: Optional[Dict[str, Any]] = None
    custom_fields: Dict[str, Any] = {}
    notes: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_contacted: Optional[datetime] = None

class CRMContactCreate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    website: Optional[str] = None
    tags: List[str] = []
    custom_fields: Dict[str, Any] = {}

class CRMCompany(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    website: Optional[str] = None
    industry: Optional[str] = None
    size: Optional[str] = None
    revenue: Optional[str] = None
    description: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    tags: List[str] = []
    custom_fields: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CRMCompanyCreate(BaseModel):
    name: str
    website: Optional[str] = None
    industry: Optional[str] = None
    tags: List[str] = []

class CRMDeal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    contact_id: Optional[str] = None
    company_id: Optional[str] = None
    value: float = 0.0
    currency: str = "USD"
    stage: Literal["lead", "qualified", "proposal", "negotiation", "won", "lost"] = "lead"
    probability: int = 0
    expected_close_date: Optional[datetime] = None
    notes: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CRMDealCreate(BaseModel):
    title: str
    contact_id: Optional[str] = None
    company_id: Optional[str] = None
    value: float = 0.0
    stage: str = "lead"

# Advanced Scraper Engine
class AdvancedWebScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def extract_emails(self, text: str) -> List[str]:
        """Extract email addresses from text"""
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        return list(set(re.findall(email_pattern, text)))
    
    def extract_phones(self, text: str) -> List[str]:
        """Extract phone numbers from text"""
        phone_patterns = [
            r'\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}',
            r'\(\d{3}\)\s*\d{3}-\d{4}',
            r'\d{3}-\d{3}-\d{4}'
        ]
        phones = []
        for pattern in phone_patterns:
            phones.extend(re.findall(pattern, text))
        return list(set(phones))
    
    def extract_contact_info(self, soup: BeautifulSoup, url: str) -> List[Dict[str, Any]]:
        """Smart extraction of contact information"""
        contacts = []
        page_text = soup.get_text()
        
        # Extract emails and phones
        emails = self.extract_emails(page_text)
        phones = self.extract_phones(page_text)
        
        # Try to find contact sections
        contact_sections = soup.find_all(['div', 'section'], 
            class_=re.compile(r'contact|about|team|staff', re.I))
        
        for section in contact_sections[:10]:  # Limit to 10 sections
            section_text = section.get_text()
            section_emails = self.extract_emails(section_text)
            section_phones = self.extract_phones(section_text)
            
            # Try to find names
            names = section.find_all(['h1', 'h2', 'h3', 'h4', 'strong'])
            
            for name_elem in names:
                name = name_elem.get_text(strip=True)
                if len(name) > 2 and len(name) < 100:
                    contact = {
                        'name': name,
                        'emails': section_emails,
                        'phones': section_phones,
                        'source_url': url,
                        'context': section_text[:200]
                    }
                    contacts.append(contact)
        
        # If no structured contacts found, create generic one
        if not contacts and (emails or phones):
            contacts.append({
                'emails': emails,
                'phones': phones,
                'source_url': url
            })
        
        return contacts
    
    def apply_transforms(self, data: Dict[str, Any], transforms: List[DataTransform]) -> Dict[str, Any]:
        """Apply data transformations"""
        result = data.copy()
        
        for transform in transforms:
            field = transform.field
            if field not in result:
                continue
            
            value = result[field]
            operation = transform.operation
            params = transform.params or {}
            
            if isinstance(value, list):
                result[field] = [self._apply_single_transform(v, operation, params) for v in value]
            else:
                result[field] = self._apply_single_transform(value, operation, params)
        
        return result
    
    def _apply_single_transform(self, value: Any, operation: str, params: Dict) -> Any:
        """Apply single transformation"""
        if not isinstance(value, str):
            return value
        
        if operation == "lowercase":
            return value.lower()
        elif operation == "uppercase":
            return value.upper()
        elif operation == "trim":
            return value.strip()
        elif operation == "regex_extract":
            pattern = params.get('pattern', '')
            match = re.search(pattern, value)
            return match.group(0) if match else value
        elif operation == "replace":
            old = params.get('old', '')
            new = params.get('new', '')
            return value.replace(old, new)
        elif operation == "parse_number":
            return re.sub(r'[^0-9.]', '', value)
        
        return value
    
    def scrape_url(self, url: str, config: AdvancedScrapeRequest) -> Dict[str, Any]:
        """Advanced scraping with full configuration"""
        import time
        start_time = time.time()
        
        try:
            # Setup headers
            headers = self.session.headers.copy()
            if config.custom_headers:
                headers.update(config.custom_headers)
            
            # Setup auth
            auth = None
            if config.auth.type == "basic":
                auth = (config.auth.username, config.auth.password)
            elif config.auth.type == "bearer":
                headers['Authorization'] = f"Bearer {config.auth.token}"
            
            # Setup proxy
            proxies = None
            if config.proxy.enabled and config.proxy.proxy_url:
                proxies = {
                    'http': config.proxy.proxy_url,
                    'https': config.proxy.proxy_url
                }
            
            # Make request with retries
            for attempt in range(config.retry_count):
                try:
                    response = self.session.get(
                        url,
                        headers=headers,
                        auth=auth,
                        proxies=proxies,
                        timeout=config.timeout,
                        cookies=config.auth.cookies or {}
                    )
                    response.raise_for_status()
                    break
                except Exception as e:
                    if attempt == config.retry_count - 1:
                        raise
                    time.sleep(config.rate_limit.delay_between_requests)
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            result = {
                'url': url,
                'title': soup.title.string if soup.title else '',
                'data': {},
                'extracted_contacts': []
            }
            
            # Extract based on custom selectors
            for selector_config in config.selectors:
                name = selector_config.name
                selector = selector_config.selector
                
                if selector_config.selector_type == "css":
                    elements = soup.select(selector)
                else:  # xpath - would need lxml
                    elements = []  # Placeholder
                
                extracted = []
                for el in elements:
                    if selector_config.extract_type == "text":
                        extracted.append(el.get_text(strip=True))
                    elif selector_config.extract_type == "attribute":
                        attr = selector_config.attribute or 'href'
                        value = el.get(attr)
                        if value:
                            extracted.append(value)
                    elif selector_config.extract_type == "html":
                        extracted.append(str(el))
                    elif selector_config.extract_type == "regex":
                        text = el.get_text()
                        if selector_config.regex_pattern:
                            matches = re.findall(selector_config.regex_pattern, text)
                            extracted.extend(matches)
                
                result['data'][name] = extracted if selector_config.multiple else (extracted[0] if extracted else None)
            
            # Auto-extract common elements
            if config.extract_links:
                result['data']['links'] = [
                    {'text': a.get_text(strip=True), 'href': urljoin(url, a.get('href'))}
                    for a in soup.find_all('a', href=True)
                ][:50]
            
            if config.extract_images:
                result['data']['images'] = [
                    {'src': urljoin(url, img.get('src')), 'alt': img.get('alt', '')}
                    for img in soup.find_all('img', src=True)
                ][:30]
            
            if config.extract_tables:
                tables = []
                for table in soup.find_all('table')[:5]:
                    rows = []
                    for tr in table.find_all('tr'):
                        cells = [td.get_text(strip=True) for td in tr.find_all(['td', 'th'])]
                        if cells:
                            rows.append(cells)
                    if rows:
                        tables.append(rows)
                result['data']['tables'] = tables
            
            # Extract contact information
            if config.extract_emails or config.extract_phones:
                result['extracted_contacts'] = self.extract_contact_info(soup, url)
            
            # Extract meta tags
            result['data']['meta'] = {
                meta.get('name') or meta.get('property'): meta.get('content')
                for meta in soup.find_all('meta')
                if meta.get('content')
            }
            
            # Apply transforms
            if config.transforms:
                result['data'] = self.apply_transforms(result['data'], config.transforms)
            
            result['processing_time'] = time.time() - start_time
            result['status'] = 'success'
            
            return result
            
        except Exception as e:
            return {
                'url': url,
                'error': str(e),
                'status': 'failed',
                'processing_time': time.time() - start_time
            }

scraper = AdvancedWebScraper()

# API Routes
@api_router.get("/")
async def root():
    return {"message": "CRAWLai Pro API", "version": "2.0.0", "status": "active"}

# Advanced Scraping
@api_router.post("/scrape/advanced")
async def advanced_scrape(request: AdvancedScrapeRequest):
    """Advanced scraping with full configuration"""
    results = []
    
    for url in request.urls:
        result = scraper.scrape_url(url, request)
        results.append(result)
        
        # Rate limiting
        if len(request.urls) > 1 and request.rate_limit.enabled:
            await asyncio.sleep(request.rate_limit.delay_between_requests)
    
    return {"results": results, "total": len(results)}

@api_router.post("/scrape/quick")
async def quick_scrape(url: str):
    """Quick scrape with defaults"""
    config = AdvancedScrapeRequest(
        urls=[url],
        extract_links=True,
        extract_images=True,
        extract_tables=True,
        extract_emails=True,
        extract_phones=True
    )
    result = scraper.scrape_url(url, config)
    return result

# Projects CRUD
@api_router.post("/projects", response_model=ScraperProject)
async def create_project(project: ScraperProjectCreate):
    project_obj = ScraperProject(**project.model_dump())
    doc = project_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('last_run'):
        doc['last_run'] = doc['last_run'].isoformat()
    
    await db.scraper_projects.insert_one(doc)
    return project_obj

@api_router.get("/projects", response_model=List[ScraperProject])
async def get_projects():
    projects = await db.scraper_projects.find({}, {"_id": 0}).to_list(1000)
    
    for project in projects:
        if isinstance(project.get('created_at'), str):
            project['created_at'] = datetime.fromisoformat(project['created_at'])
        if project.get('last_run') and isinstance(project['last_run'], str):
            project['last_run'] = datetime.fromisoformat(project['last_run'])
    
    return projects

@api_router.post("/projects/{project_id}/run")
async def run_project(project_id: str):
    project = await db.scraper_projects.find_one({"id": project_id}, {"_id": 0})
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Scrape all URLs
    results = []
    for url in project['target_urls']:
        result = scraper.scrape_url(url, AdvancedScrapeRequest(**project['config']))
        
        # Save result
        scraped_result = ScrapedResult(
            project_id=project_id,
            url=result['url'],
            title=result.get('title', ''),
            data=result.get('data', {}),
            extracted_contacts=result.get('extracted_contacts', []),
            status=result.get('status', 'success'),
            error=result.get('error'),
            processing_time=result.get('processing_time')
        )
        
        doc = scraped_result.model_dump()
        doc['scraped_at'] = doc['scraped_at'].isoformat()
        await db.scraped_results.insert_one(doc)
        results.append(scraped_result)
        
        # Auto-import to CRM if enabled
        if project.get('auto_import_to_crm') and scraped_result.extracted_contacts:
            for contact_data in scraped_result.extracted_contacts:
                await auto_import_to_crm(contact_data, project.get('crm_mapping'))
    
    # Update project
    success_count = sum(1 for r in results if r.status == 'success')
    error_count = len(results) - success_count
    
    await db.scraper_projects.update_one(
        {"id": project_id},
        {
            "$set": {"last_run": datetime.now(timezone.utc).isoformat()},
            "$inc": {"run_count": 1, "success_count": success_count, "error_count": error_count}
        }
    )
    
    return {"results": results, "success": success_count, "errors": error_count}

# CRM Contacts
@api_router.post("/crm/contacts", response_model=CRMContact)
async def create_contact(contact: CRMContactCreate):
    # Check for duplicates
    if contact.email:
        existing = await db.crm_contacts.find_one({"email": contact.email}, {"_id": 0})
        if existing:
            raise HTTPException(status_code=400, detail="Contact with this email already exists")
    
    contact_obj = CRMContact(**contact.model_dump(), source="manual")
    doc = contact_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    if doc.get('last_contacted'):
        doc['last_contacted'] = doc['last_contacted'].isoformat()
    
    await db.crm_contacts.insert_one(doc)
    return contact_obj

@api_router.get("/crm/contacts", response_model=List[CRMContact])
async def get_contacts(
    status: Optional[str] = None,
    tag: Optional[str] = None,
    source: Optional[str] = None,
    limit: int = 100
):
    query = {}
    if status:
        query['status'] = status
    if tag:
        query['tags'] = tag
    if source:
        query['source'] = source
    
    contacts = await db.crm_contacts.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    for contact in contacts:
        if isinstance(contact.get('created_at'), str):
            contact['created_at'] = datetime.fromisoformat(contact['created_at'])
        if isinstance(contact.get('updated_at'), str):
            contact['updated_at'] = datetime.fromisoformat(contact['updated_at'])
        if contact.get('last_contacted') and isinstance(contact['last_contacted'], str):
            contact['last_contacted'] = datetime.fromisoformat(contact['last_contacted'])
    
    return contacts

@api_router.get("/crm/contacts/{contact_id}", response_model=CRMContact)
async def get_contact(contact_id: str):
    contact = await db.crm_contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    if isinstance(contact.get('created_at'), str):
        contact['created_at'] = datetime.fromisoformat(contact['created_at'])
    if isinstance(contact.get('updated_at'), str):
        contact['updated_at'] = datetime.fromisoformat(contact['updated_at'])
    
    return contact

@api_router.put("/crm/contacts/{contact_id}", response_model=CRMContact)
async def update_contact(contact_id: str, contact: CRMContactCreate):
    existing = await db.crm_contacts.find_one({"id": contact_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    update_data = contact.model_dump(exclude_unset=True)
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.crm_contacts.update_one({"id": contact_id}, {"$set": update_data})
    
    return await get_contact(contact_id)

@api_router.delete("/crm/contacts/{contact_id}")
async def delete_contact(contact_id: str):
    result = await db.crm_contacts.delete_one({"id": contact_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"message": "Contact deleted"}

# CRM Companies
@api_router.post("/crm/companies", response_model=CRMCompany)
async def create_company(company: CRMCompanyCreate):
    company_obj = CRMCompany(**company.model_dump())
    doc = company_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.crm_companies.insert_one(doc)
    return company_obj

@api_router.get("/crm/companies", response_model=List[CRMCompany])
async def get_companies(limit: int = 100):
    companies = await db.crm_companies.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    for company in companies:
        if isinstance(company.get('created_at'), str):
            company['created_at'] = datetime.fromisoformat(company['created_at'])
        if isinstance(company.get('updated_at'), str):
            company['updated_at'] = datetime.fromisoformat(company['updated_at'])
    
    return companies

# CRM Deals
@api_router.post("/crm/deals", response_model=CRMDeal)
async def create_deal(deal: CRMDealCreate):
    deal_obj = CRMDeal(**deal.model_dump())
    doc = deal_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    if doc.get('expected_close_date'):
        doc['expected_close_date'] = doc['expected_close_date'].isoformat()
    
    await db.crm_deals.insert_one(doc)
    return deal_obj

@api_router.get("/crm/deals", response_model=List[CRMDeal])
async def get_deals(stage: Optional[str] = None, limit: int = 100):
    query = {}
    if stage:
        query['stage'] = stage
    
    deals = await db.crm_deals.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    for deal in deals:
        if isinstance(deal.get('created_at'), str):
            deal['created_at'] = datetime.fromisoformat(deal['created_at'])
        if isinstance(deal.get('updated_at'), str):
            deal['updated_at'] = datetime.fromisoformat(deal['updated_at'])
        if deal.get('expected_close_date') and isinstance(deal['expected_close_date'], str):
            deal['expected_close_date'] = datetime.fromisoformat(deal['expected_close_date'])
    
    return deals

# Import scraped data to CRM
@api_router.post("/crm/import/contacts")
async def import_contacts_from_scrape(project_id: Optional[str] = None, result_ids: Optional[List[str]] = None):
    """Import contacts from scraped results"""
    query = {}
    if project_id:
        query['project_id'] = project_id
    if result_ids:
        query['id'] = {'$in': result_ids}
    
    results = await db.scraped_results.find(query, {"_id": 0}).to_list(1000)
    
    imported_count = 0
    skipped_count = 0
    
    for result in results:
        for contact_data in result.get('extracted_contacts', []):
            try:
                await auto_import_to_crm(contact_data, None)
                imported_count += 1
            except:
                skipped_count += 1
    
    return {
        "imported": imported_count,
        "skipped": skipped_count,
        "total": imported_count + skipped_count
    }

async def auto_import_to_crm(contact_data: Dict[str, Any], mapping: Optional[Dict[str, str]]):
    """Auto import contact to CRM with smart field mapping"""
    # Extract fields
    emails = contact_data.get('emails', [])
    phones = contact_data.get('phones', [])
    name = contact_data.get('name', '')
    
    if not emails and not phones:
        return
    
    email = emails[0] if emails else None
    phone = phones[0] if phones else None
    
    # Check if contact exists
    if email:
        existing = await db.crm_contacts.find_one({"email": email})
        if existing:
            return
    
    # Parse name
    first_name = None
    last_name = None
    if name:
        parts = name.split()
        if len(parts) >= 2:
            first_name = parts[0]
            last_name = ' '.join(parts[1:])
        else:
            first_name = name
    
    contact = CRMContact(
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone=phone,
        source="scraper",
        source_url=contact_data.get('source_url'),
        scraped_data=contact_data,
        status="new",
        tags=["scraped"]
    )
    
    doc = contact.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.crm_contacts.insert_one(doc)

# Stats
@api_router.get("/stats")
async def get_stats():
    total_projects = await db.scraper_projects.count_documents({})
    active_projects = await db.scraper_projects.count_documents({"active": True})
    total_results = await db.scraped_results.count_documents({})
    total_contacts = await db.crm_contacts.count_documents({})
    total_companies = await db.crm_companies.count_documents({})
    total_deals = await db.crm_deals.count_documents({})
    
    return {
        "scraper": {
            "total_projects": total_projects,
            "active_projects": active_projects,
            "total_results": total_results
        },
        "crm": {
            "total_contacts": total_contacts,
            "total_companies": total_companies,
            "total_deals": total_deals
        }
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()