import React, { useState, useEffect } from 'react';
import './App.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Badge } from './components/ui/badge';
import { Textarea } from './components/ui/textarea';
import { Switch } from './components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import axios from 'axios';
import { 
  Download, Globe, Search, TrendingUp, Database, Zap, Play, Plus, 
  Users, Building2, DollarSign, Mail, Phone, Tag, Sparkles, CheckCircle, 
  Eye, Clock, Link as LinkIcon, Image as ImageIcon, Table as TableIcon, 
  Copy, ArrowRight, Wand2, FileJson, FileSpreadsheet, Trash2, Edit, 
  Filter, Settings, Save, FolderOpen, Target, Code
} from 'lucide-react';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './components/ui/accordion';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function App() {
  const [activeTab, setActiveTab] = useState('scraper');
  
  // Scraping state
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [recentScrapes, setRecentScrapes] = useState([]);
  
  // Projects state
  const [projects, setProjects] = useState([]);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    target_urls: [''],
    keywords: [],
    auto_import_to_crm: false
  });
  const [editingProject, setEditingProject] = useState(null);
  
  // CRM state
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [deals, setDeals] = useState([]);
  const [showNewContactDialog, setShowNewContactDialog] = useState(false);
  const [showNewCompanyDialog, setShowNewCompanyDialog] = useState(false);
  const [showNewDealDialog, setShowNewDealDialog] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  
  const [newContact, setNewContact] = useState({
    first_name: '', last_name: '', email: '', phone: '', 
    company: '', position: '', website: '', tags: []
  });
  const [newCompany, setNewCompany] = useState({
    name: '', website: '', industry: '', tags: []
  });
  const [newDeal, setNewDeal] = useState({
    title: '', value: 0, stage: 'lead', contact_id: null
  });
  
  // Filters
  const [contactFilter, setContactFilter] = useState({ status: 'all', source: 'all', search: '' });
  const [projectFilter, setProjectFilter] = useState({ search: '' });
  
  // Stats
  const [stats, setStats] = useState({ scraper: {}, crm: {} });
  
  // Keywords for filtering
  const [keywordInput, setKeywordInput] = useState('');

  useEffect(() => {
    loadAllData();
    loadRecentScrapes();
  }, []);

  const loadAllData = async () => {
    try {
      const [projectsRes, contactsRes, companiesRes, dealsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/projects`),
        axios.get(`${API_URL}/api/crm/contacts?limit=1000`),
        axios.get(`${API_URL}/api/crm/companies?limit=1000`),
        axios.get(`${API_URL}/api/crm/deals?limit=1000`),
        axios.get(`${API_URL}/api/stats`)
      ]);
      
      setProjects(projectsRes.data);
      setContacts(contactsRes.data);
      setCompanies(companiesRes.data);
      setDeals(dealsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    }
  };

  const loadRecentScrapes = () => {
    const saved = localStorage.getItem('recentScrapes');
    if (saved) {
      setRecentScrapes(JSON.parse(saved));
    }
  };

  const handleSmartScrape = async () => {
    if (!scrapeUrl) {
      toast.error('Please enter a URL');
      return;
    }

    if (!scrapeUrl.startsWith('http')) {
      setScrapeUrl('https://' + scrapeUrl);
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await axios.post(`${API_URL}/api/scrape/quick?url=${encodeURIComponent(scrapeUrl)}`);
      
      const data = {
        ...response.data,
        scrapedAt: new Date().toISOString()
      };
      
      setResult(data);
      
      const recent = [data, ...recentScrapes.slice(0, 9)];
      setRecentScrapes(recent);
      localStorage.setItem('recentScrapes', JSON.stringify(recent));

      if (data.extracted_contacts?.length > 0) {
        toast.success(`Found ${data.extracted_contacts.length} contact${data.extracted_contacts.length > 1 ? 's' : ''}!`, {
          action: { label: 'Save to CRM', onClick: () => saveContactsToCRM(data.extracted_contacts) }
        });
      } else {
        toast.success('Page scraped successfully!');
      }
    } catch (error) {
      toast.error('Failed to scrape page');
    } finally {
      setLoading(false);
    }
  };

  const saveContactsToCRM = async (contactsData) => {
    try {
      let savedCount = 0;
      for (const contactData of contactsData) {
        const emails = contactData.emails || [];
        const phones = contactData.phones || [];
        const name = contactData.name || '';

        if (emails.length > 0 || phones.length > 0) {
          const nameParts = name.split(' ');
          const contactPayload = {
            first_name: nameParts[0] || '',
            last_name: nameParts.slice(1).join(' ') || '',
            email: emails[0] || null,
            phone: phones[0] || null,
            tags: ['scraped'],
            custom_fields: { source_url: contactData.source_url }
          };

          try {
            await axios.post(`${API_URL}/api/crm/contacts`, contactPayload);
            savedCount++;
          } catch (err) {
            console.log('Skipped duplicate');
          }
        }
      }
      
      if (savedCount > 0) {
        toast.success(`Saved ${savedCount} contact${savedCount > 1 ? 's' : ''} to CRM!`);
        loadAllData();
      } else {
        toast.info('No new contacts (duplicates skipped)');
      }
    } catch (error) {
      toast.error('Failed to save contacts');
    }
  };

  // Project Management
  const createProject = async () => {
    if (!newProject.name || !newProject.target_urls[0]) {
      toast.error('Name and at least one URL required');
      return;
    }

    try {
      const projectData = {
        ...newProject,
        config: {
          urls: newProject.target_urls,
          selectors: [],
          extract_links: true,
          extract_images: true,
          extract_tables: true,
          extract_emails: true,
          extract_phones: true,
          rate_limit: { enabled: true, requests_per_minute: 30, delay_between_requests: 2 },
          proxy: { enabled: false },
          auth: { type: 'none' },
          pagination: { enabled: false },
          timeout: 30,
          retry_count: 3
        }
      };

      await axios.post(`${API_URL}/api/projects`, projectData);
      toast.success('Project created!');
      setShowNewProjectDialog(false);
      setNewProject({ name: '', description: '', target_urls: [''], keywords: [], auto_import_to_crm: false });
      loadAllData();
    } catch (error) {
      toast.error('Failed to create project');
    }
  };

  const runProject = async (projectId) => {
    try {
      toast.loading('Running project...');
      const response = await axios.post(`${API_URL}/api/projects/${projectId}/run`);
      toast.success(`Completed! ${response.data.success} succeeded`);
      loadAllData();
    } catch (error) {
      toast.error('Failed to run project');
    }
  };

  const deleteProject = async (projectId) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      await axios.delete(`${API_URL}/api/projects/${projectId}`);
      toast.success('Project deleted');
      loadAllData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  // CRM Management
  const createContact = async () => {
    try {
      await axios.post(`${API_URL}/api/crm/contacts`, newContact);
      toast.success('Contact created!');
      setShowNewContactDialog(false);
      setNewContact({ first_name: '', last_name: '', email: '', phone: '', company: '', position: '', website: '', tags: [] });
      loadAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create contact');
    }
  };

  const updateContact = async () => {
    try {
      await axios.put(`${API_URL}/api/crm/contacts/${editingContact.id}`, editingContact);
      toast.success('Contact updated!');
      setEditingContact(null);
      loadAllData();
    } catch (error) {
      toast.error('Failed to update contact');
    }
  };

  const deleteContact = async (contactId) => {
    if (!window.confirm('Delete this contact?')) return;
    try {
      await axios.delete(`${API_URL}/api/crm/contacts/${contactId}`);
      toast.success('Contact deleted');
      loadAllData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const createCompany = async () => {
    try {
      await axios.post(`${API_URL}/api/crm/companies`, newCompany);
      toast.success('Company created!');
      setShowNewCompanyDialog(false);
      setNewCompany({ name: '', website: '', industry: '', tags: [] });
      loadAllData();
    } catch (error) {
      toast.error('Failed to create company');
    }
  };

  const createDeal = async () => {
    try {
      await axios.post(`${API_URL}/api/crm/deals`, newDeal);
      toast.success('Deal created!');
      setShowNewDealDialog(false);
      setNewDeal({ title: '', value: 0, stage: 'lead', contact_id: null });
      loadAllData();
    } catch (error) {
      toast.error('Failed to create deal');
    }
  };

  const exportContacts = (format) => {
    const dataStr = format === 'json' 
      ? JSON.stringify(filteredContacts, null, 2)
      : convertContactsToCSV(filteredContacts);
    
    const blob = new Blob([dataStr], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contacts_${Date.now()}.${format}`;
    link.click();
    toast.success(`Exported ${filteredContacts.length} contacts`);
  };

  const convertContactsToCSV = (data) => {
    if (!data.length) return '';
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Position', 'Status', 'Tags'];
    const rows = data.map(c => [
      c.first_name || '', c.last_name || '', c.email || '', c.phone || '',
      c.company || '', c.position || '', c.status || '', (c.tags || []).join(';')
    ]);
    return [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
  };

  const addKeyword = () => {
    if (keywordInput.trim()) {
      setNewProject({
        ...newProject,
        keywords: [...newProject.keywords, keywordInput.trim()]
      });
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword) => {
    setNewProject({
      ...newProject,
      keywords: newProject.keywords.filter(k => k !== keyword)
    });
  };

  const addTag = (setter, current, tagInput) => {
    if (tagInput.trim()) {
      setter({ ...current, tags: [...current.tags, tagInput.trim()] });
      return '';
    }
    return tagInput;
  };

  const filteredContacts = contacts.filter(c => {
    if (contactFilter.status !== 'all' && c.status !== contactFilter.status) return false;
    if (contactFilter.source !== 'all' && c.source !== contactFilter.source) return false;
    if (contactFilter.search) {
      const search = contactFilter.search.toLowerCase();
      return (
        c.first_name?.toLowerCase().includes(search) ||
        c.last_name?.toLowerCase().includes(search) ||
        c.email?.toLowerCase().includes(search) ||
        c.company?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const filteredProjects = projects.filter(p => {
    if (projectFilter.search) {
      const search = projectFilter.search.toLowerCase();
      return p.name?.toLowerCase().includes(search) || p.description?.toLowerCase().includes(search);
    }
    return true;
  });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied!');
  };

  return (
    <div className="app-container">
      <Toaster position="top-right" richColors expand={true} />
      
      <div className="app-header">
        <div className="app-header-content">
          <div className="logo-section">
            <Sparkles className="logo-icon" />
            <h1 className="logo-text">CRAWLai Pro</h1>
          </div>
          <div className="header-stats">
            <Badge variant="outline"><Database className="w-3 h-3 mr-1" />{stats.scraper?.total_results || 0} scraped</Badge>
            <Badge variant="outline"><Users className="w-3 h-3 mr-1" />{stats.crm?.total_contacts || 0} contacts</Badge>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="app-tabs">
        <div className="tabs-header">
          <TabsList className="tabs-nav">
            <TabsTrigger value="scraper"><Zap className="w-4 h-4 mr-2" />Quick Scrape</TabsTrigger>
            <TabsTrigger value="projects"><FolderOpen className="w-4 h-4 mr-2" />Projects</TabsTrigger>
            <TabsTrigger value="contacts"><Users className="w-4 h-4 mr-2" />Contacts ({contacts.length})</TabsTrigger>
            <TabsTrigger value="companies"><Building2 className="w-4 h-4 mr-2" />Companies ({companies.length})</TabsTrigger>
            <TabsTrigger value="deals"><DollarSign className="w-4 h-4 mr-2" />Deals ({deals.length})</TabsTrigger>
          </TabsList>
        </div>

        <div className="main-content">
          {/* QUICK SCRAPE TAB */}
          <TabsContent value="scraper" className="tab-panel">
            <Card className="scrape-box">
              <CardContent className="scrape-content">
                <div className="input-wrapper">
                  <Globe className="input-icon" />
                  <Input
                    className="smart-input"
                    placeholder="Paste any website URL..."
                    value={scrapeUrl}
                    onChange={(e) => setScrapeUrl(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSmartScrape()}
                  />
                  <Button onClick={handleSmartScrape} disabled={loading} className="scrape-action-btn" size="lg">
                    {loading ? <><Clock className="animate-spin w-5 h-5 mr-2" />Scraping...</> : <><Wand2 className="w-5 h-5 mr-2" />Scrape Now</>}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {result && (
              <Card className="results-card">
                <CardHeader>
                  <div className="result-header">
                    <div>
                      <CardTitle>{result.title}</CardTitle>
                      <a href={result.url} target="_blank" rel="noopener noreferrer" className="result-url">{result.url}</a>
                    </div>
                    <div className="result-actions">
                      <Button variant="outline" size="sm" onClick={() => { const d = JSON.stringify(result, null, 2); const b = new Blob([d], {type: 'application/json'}); const u = URL.createObjectURL(b); const l = document.createElement('a'); l.href = u; l.download = `scraped_${Date.now()}.json`; l.click(); toast.success('Exported!'); }}>
                        <FileJson className="w-4 h-4 mr-2" />JSON
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="data-overview">
                    <div className="data-card"><LinkIcon className="data-icon" /><div className="data-count">{result.data?.links?.length || 0}</div><div className="data-label">Links</div></div>
                    <div className="data-card"><ImageIcon className="data-icon" /><div className="data-count">{result.data?.images?.length || 0}</div><div className="data-label">Images</div></div>
                    <div className="data-card"><TableIcon className="data-icon" /><div className="data-count">{result.data?.tables?.length || 0}</div><div className="data-label">Tables</div></div>
                    <div className="data-card contacts"><Users className="data-icon" /><div className="data-count">{result.extracted_contacts?.length || 0}</div><div className="data-label">Contacts</div></div>
                  </div>

                  {result.extracted_contacts?.length > 0 && (
                    <div className="data-section">
                      <div className="section-header">
                        <h3><Users className="w-5 h-5 mr-2" />Contacts</h3>
                        <Button size="sm" onClick={() => saveContactsToCRM(result.extracted_contacts)}>
                          <Save className="w-4 h-4 mr-2" />Save to CRM
                        </Button>
                      </div>
                      <div className="contacts-list">
                        {result.extracted_contacts.slice(0, 10).map((contact, idx) => (
                          <Card key={idx} className="contact-item">
                            <CardContent className="contact-content">
                              {contact.name && <div className="contact-name">{contact.name}</div>}
                              {contact.emails?.map(email => (
                                <div key={email} className="contact-detail">
                                  <Mail className="w-4 h-4" /><span>{email}</span>
                                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(email)}><Copy className="w-3 h-3" /></Button>
                                </div>
                              ))}
                              {contact.phones?.map(phone => (
                                <div key={phone} className="contact-detail">
                                  <Phone className="w-4 h-4" /><span>{phone}</span>
                                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(phone)}><Copy className="w-3 h-3" /></Button>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* PROJECTS TAB */}
          <TabsContent value="projects" className="tab-panel">
            <div className="panel-header">
              <div>
                <h2>Scraping Projects</h2>
                <p className="text-muted-foreground">Organize and automate your scraping tasks</p>
              </div>
              <Button onClick={() => setShowNewProjectDialog(true)}><Plus className="w-4 h-4 mr-2" />New Project</Button>
            </div>

            <div className="filter-bar">
              <Input placeholder="Search projects..." value={projectFilter.search} onChange={(e) => setProjectFilter({ search: e.target.value })} className="search-input" />
            </div>

            <div className="projects-grid">
              {filteredProjects.map(project => (
                <Card key={project.id} className="project-card">
                  <CardHeader>
                    <div className="card-header-row">
                      <div>
                        <CardTitle>{project.name}</CardTitle>
                        <CardDescription>{project.description}</CardDescription>
                      </div>
                      <Badge>{project.active ? 'Active' : 'Inactive'}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="project-meta">
                      <Badge variant="outline"><CheckCircle className="w-3 h-3 mr-1" />{project.success_count} success</Badge>
                      <Badge variant="outline">Runs: {project.run_count}</Badge>
                      {project.auto_import_to_crm && <Badge variant="secondary"><Users className="w-3 h-3 mr-1" />Auto-CRM</Badge>}
                    </div>
                    <div className="card-actions">
                      <Button onClick={() => runProject(project.id)} size="sm"><Play className="w-4 h-4 mr-2" />Run</Button>
                      <Button variant="outline" size="sm" onClick={() => deleteProject(project.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* CONTACTS TAB - CRM */}
          <TabsContent value="contacts" className="tab-panel">
            <div className="panel-header">
              <div>
                <h2>CRM Contacts</h2>
                <p className="text-muted-foreground">{filteredContacts.length} contacts</p>
              </div>
              <div className="header-actions">
                <Button variant="outline" onClick={() => exportContacts('json')}><Download className="w-4 h-4 mr-2" />JSON</Button>
                <Button variant="outline" onClick={() => exportContacts('csv')}><Download className="w-4 h-4 mr-2" />CSV</Button>
                <Button onClick={() => setShowNewContactDialog(true)}><Plus className="w-4 h-4 mr-2" />New Contact</Button>
              </div>
            </div>

            <div className="filter-bar">
              <Input placeholder="Search contacts..." value={contactFilter.search} onChange={(e) => setContactFilter({ ...contactFilter, search: e.target.value })} className="search-input" />
              <Select value={contactFilter.status} onValueChange={(v) => setContactFilter({ ...contactFilter, status: v })}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                </SelectContent>
              </Select>
              <Select value={contactFilter.source} onValueChange={(v) => setContactFilter({ ...contactFilter, source: v })}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="scraper">Scraper</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="contacts-grid">
              {filteredContacts.map(contact => (
                <Card key={contact.id} className="contact-card">
                  <CardHeader>
                    <div className="card-header-row">
                      <div>
                        <CardTitle>{contact.first_name} {contact.last_name}</CardTitle>
                        {contact.company && <CardDescription>{contact.position} at {contact.company}</CardDescription>}
                      </div>
                      <Badge>{contact.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="contact-details">
                      {contact.email && <div className="detail-row"><Mail className="w-4 h-4" /><span>{contact.email}</span></div>}
                      {contact.phone && <div className="detail-row"><Phone className="w-4 h-4" /><span>{contact.phone}</span></div>}
                      {contact.website && <div className="detail-row"><Globe className="w-4 h-4" /><a href={contact.website} target="_blank" rel="noopener noreferrer">Website</a></div>}
                    </div>
                    {contact.tags?.length > 0 && (
                      <div className="tags-row">
                        {contact.tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                      </div>
                    )}
                    <div className="card-actions">
                      <Button variant="outline" size="sm" onClick={() => setEditingContact(contact)}><Edit className="w-4 h-4 mr-2" />Edit</Button>
                      <Button variant="outline" size="sm" onClick={() => deleteContact(contact.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* COMPANIES TAB */}
          <TabsContent value="companies" className="tab-panel">
            <div className="panel-header">
              <div><h2>Companies</h2><p className="text-muted-foreground">{companies.length} companies</p></div>
              <Button onClick={() => setShowNewCompanyDialog(true)}><Plus className="w-4 h-4 mr-2" />New Company</Button>
            </div>
            <div className="companies-grid">
              {companies.map(company => (
                <Card key={company.id} className="company-card">
                  <CardHeader>
                    <CardTitle>{company.name}</CardTitle>
                    <CardDescription>{company.industry}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {company.website && <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-primary text-sm">{company.website}</a>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* DEALS TAB */}
          <TabsContent value="deals" className="tab-panel">
            <div className="panel-header">
              <div><h2>Deals Pipeline</h2><p className="text-muted-foreground">{deals.length} active deals</p></div>
              <Button onClick={() => setShowNewDealDialog(true)}><Plus className="w-4 h-4 mr-2" />New Deal</Button>
            </div>
            <div className="deals-grid">
              {deals.map(deal => (
                <Card key={deal.id} className="deal-card">
                  <CardHeader>
                    <div className="card-header-row">
                      <CardTitle>{deal.title}</CardTitle>
                      <Badge>{deal.stage}</Badge>
                    </div>
                    <CardDescription>${deal.value.toLocaleString()} {deal.currency}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* NEW PROJECT DIALOG */}
      <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>Organize your scraping with projects and keywords</DialogDescription>
          </DialogHeader>
          <div className="dialog-form">
            <div className="form-group">
              <Label>Project Name *</Label>
              <Input value={newProject.name} onChange={(e) => setNewProject({ ...newProject, name: e.target.value })} placeholder="My Scraping Project" />
            </div>
            <div className="form-group">
              <Label>Description</Label>
              <Textarea value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })} placeholder="What does this project scrape?" />
            </div>
            <div className="form-group">
              <Label>Target URLs *</Label>
              {newProject.target_urls.map((url, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <Input value={url} onChange={(e) => { const urls = [...newProject.target_urls]; urls[idx] = e.target.value; setNewProject({ ...newProject, target_urls: urls }); }} placeholder="https://example.com" />
                  {idx > 0 && <Button variant="outline" size="icon" onClick={() => setNewProject({ ...newProject, target_urls: newProject.target_urls.filter((_, i) => i !== idx) })}><Trash2 className="w-4 h-4" /></Button>}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setNewProject({ ...newProject, target_urls: [...newProject.target_urls, ''] })}><Plus className="w-4 h-4 mr-2" />Add URL</Button>
            </div>
            <div className="form-group">
              <Label>Keywords (Optional)</Label>
              <div className="flex gap-2 mb-2">
                <Input value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (addKeyword(), e.preventDefault())} placeholder="Add keyword..." />
                <Button onClick={addKeyword}><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="tags-display">
                {newProject.keywords.map(kw => (
                  <Badge key={kw} variant="secondary">
                    {kw}
                    <button onClick={() => removeKeyword(kw)} className="ml-2 hover:text-destructive">×</button>
                  </Badge>
                ))}
              </div>
            </div>
            <div className="form-group">
              <div className="flex items-center space-x-2">
                <Switch checked={newProject.auto_import_to_crm} onCheckedChange={(checked) => setNewProject({ ...newProject, auto_import_to_crm: checked })} />
                <Label>Auto-import contacts to CRM</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewProjectDialog(false)}>Cancel</Button>
            <Button onClick={createProject}>Create Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NEW CONTACT DIALOG */}
      <Dialog open={showNewContactDialog} onOpenChange={setShowNewContactDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Contact</DialogTitle>
          </DialogHeader>
          <div className="dialog-form">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>First Name</Label><Input value={newContact.first_name} onChange={(e) => setNewContact({ ...newContact, first_name: e.target.value })} /></div>
              <div><Label>Last Name</Label><Input value={newContact.last_name} onChange={(e) => setNewContact({ ...newContact, last_name: e.target.value })} /></div>
            </div>
            <div><Label>Email</Label><Input type="email" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} /></div>
            <div><Label>Company</Label><Input value={newContact.company} onChange={(e) => setNewContact({ ...newContact, company: e.target.value })} /></div>
            <div><Label>Position</Label><Input value={newContact.position} onChange={(e) => setNewContact({ ...newContact, position: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewContactDialog(false)}>Cancel</Button>
            <Button onClick={createContact}>Create Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT CONTACT DIALOG */}
      <Dialog open={!!editingContact} onOpenChange={(open) => !open && setEditingContact(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          {editingContact && (
            <div className="dialog-form">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>First Name</Label><Input value={editingContact.first_name || ''} onChange={(e) => setEditingContact({ ...editingContact, first_name: e.target.value })} /></div>
                <div><Label>Last Name</Label><Input value={editingContact.last_name || ''} onChange={(e) => setEditingContact({ ...editingContact, last_name: e.target.value })} /></div>
              </div>
              <div><Label>Email</Label><Input value={editingContact.email || ''} onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={editingContact.phone || ''} onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })} /></div>
              <div><Label>Company</Label><Input value={editingContact.company || ''} onChange={(e) => setEditingContact({ ...editingContact, company: e.target.value })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={editingContact.status} onValueChange={(v) => setEditingContact({ ...editingContact, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingContact(null)}>Cancel</Button>
            <Button onClick={updateContact}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NEW COMPANY DIALOG */}
      <Dialog open={showNewCompanyDialog} onOpenChange={setShowNewCompanyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Company</DialogTitle>
          </DialogHeader>
          <div className="dialog-form">
            <div><Label>Company Name *</Label><Input value={newCompany.name} onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })} /></div>
            <div><Label>Website</Label><Input value={newCompany.website} onChange={(e) => setNewCompany({ ...newCompany, website: e.target.value })} /></div>
            <div><Label>Industry</Label><Input value={newCompany.industry} onChange={(e) => setNewCompany({ ...newCompany, industry: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCompanyDialog(false)}>Cancel</Button>
            <Button onClick={createCompany}>Create Company</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NEW DEAL DIALOG */}
      <Dialog open={showNewDealDialog} onOpenChange={setShowNewDealDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Deal</DialogTitle>
          </DialogHeader>
          <div className="dialog-form">
            <div><Label>Deal Title *</Label><Input value={newDeal.title} onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })} /></div>
            <div><Label>Value</Label><Input type="number" value={newDeal.value} onChange={(e) => setNewDeal({ ...newDeal, value: parseFloat(e.target.value) })} /></div>
            <div>
              <Label>Stage</Label>
              <Select value={newDeal.stage} onValueChange={(v) => setNewDeal({ ...newDeal, stage: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDealDialog(false)}>Cancel</Button>
            <Button onClick={createDeal}>Create Deal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;