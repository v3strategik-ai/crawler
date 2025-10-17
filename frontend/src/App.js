import React, { useState, useEffect } from 'react';
import './App.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Badge } from './components/ui/badge';
import axios from 'axios';
import { 
  Download, Globe, Search, TrendingUp, Database, Zap, Play, Plus, 
  Users, Building2, DollarSign, Mail, Phone, Target, Sparkles,
  CheckCircle, Eye, Clock, Link as LinkIcon, Image as ImageIcon,
  Table as TableIcon, Copy, ArrowRight, Wand2, FileJson, FileSpreadsheet
} from 'lucide-react';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function App() {
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [recentScrapes, setRecentScrapes] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState({ scraper: {}, crm: {} });
  const [autoSaveToHistory, setAutoSaveToHistory] = useState(true);

  useEffect(() => {
    loadData();
    loadRecentScrapes();
  }, []);

  const loadData = async () => {
    try {
      const [contactsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/crm/contacts?limit=100`),
        axios.get(`${API_URL}/api/stats`)
      ]);
      setContacts(contactsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadRecentScrapes = () => {
    const saved = localStorage.getItem('recentScrapes');
    if (saved) {
      setRecentScrapes(JSON.parse(saved));
    }
  };

  const saveToHistory = (data) => {
    const recent = [data, ...recentScrapes.slice(0, 9)];
    setRecentScrapes(recent);
    localStorage.setItem('recentScrapes', JSON.stringify(recent));
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
      
      if (autoSaveToHistory) {
        saveToHistory(data);
      }

      // Auto-save contacts to CRM if found
      if (data.extracted_contacts?.length > 0) {
        const contactCount = data.extracted_contacts.length;
        toast.success(`Scraped successfully! Found ${contactCount} potential contact${contactCount > 1 ? 's' : ''}`, {
          action: {
            label: 'Save to CRM',
            onClick: () => saveContactsToCRM(data.extracted_contacts)
          }
        });
      } else {
        toast.success('Page scraped successfully!');
      }

    } catch (error) {
      console.error('Scraping error:', error);
      toast.error('Failed to scrape page. Please check the URL and try again.');
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
            tags: ['scraped', 'auto-imported'],
            custom_fields: { source_url: contactData.source_url }
          };

          try {
            await axios.post(`${API_URL}/api/crm/contacts`, contactPayload);
            savedCount++;
          } catch (err) {
            // Contact might already exist
            console.log('Skipped duplicate contact');
          }
        }
      }
      
      if (savedCount > 0) {
        toast.success(`Saved ${savedCount} contact${savedCount > 1 ? 's' : ''} to CRM!`);
        loadData();
      } else {
        toast.info('No new contacts to save (duplicates skipped)');
      }
    } catch (error) {
      toast.error('Failed to save contacts to CRM');
    }
  };

  const quickExport = (format) => {
    if (!result) {
      toast.error('No data to export');
      return;
    }

    const dataStr = format === 'json' 
      ? JSON.stringify(result, null, 2)
      : convertToCSV(result);
    
    const blob = new Blob([dataStr], { 
      type: format === 'json' ? 'application/json' : 'text/csv' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scraped_${Date.now()}.${format}`;
    link.click();
    toast.success(`Exported as ${format.toUpperCase()}`);
  };

  const convertToCSV = (data) => {
    const rows = [];
    
    // Add basic info
    rows.push(['Field', 'Value']);
    rows.push(['URL', data.url]);
    rows.push(['Title', data.title]);
    rows.push(['Scraped At', new Date(data.scrapedAt).toLocaleString()]);
    rows.push(['']);
    
    // Add extracted data counts
    rows.push(['Data Type', 'Count']);
    if (data.data?.links) rows.push(['Links', data.data.links.length]);
    if (data.data?.images) rows.push(['Images', data.data.images.length]);
    if (data.data?.tables) rows.push(['Tables', data.data.tables.length]);
    if (data.extracted_contacts) rows.push(['Contacts', data.extracted_contacts.length]);
    
    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const scrapeFromHistory = (historicalData) => {
    setScrapeUrl(historicalData.url);
    setResult(historicalData);
  };

  const getSuggestions = () => {
    if (!scrapeUrl) return [];
    
    const url = scrapeUrl.toLowerCase();
    const suggestions = [];

    if (url.includes('linkedin')) suggestions.push('💼 Professional profiles detected');
    if (url.includes('amazon') || url.includes('ebay') || url.includes('shop')) suggestions.push('🛒 E-commerce page');
    if (url.includes('news') || url.includes('blog') || url.includes('article')) suggestions.push('📰 News/Article content');
    if (url.includes('contact') || url.includes('about')) suggestions.push('📧 Contact information likely available');
    if (url.includes('directory') || url.includes('list')) suggestions.push('📋 Directory/List page');

    return suggestions;
  };

  const suggestions = getSuggestions();

  return (
    <div className="app-container">
      <Toaster position="top-right" richColors expand={true} />
      
      {/* Simplified Hero */}
      <div className="hero-section-simple">
        <div className="hero-background">
          <div className="hero-gradient"></div>
        </div>
        
        <div className="hero-content-simple">
          <div className="logo-section">
            <Sparkles className="logo-icon" />
            <h1 className="logo-text">CRAWLai</h1>
          </div>
          <p className="tagline">Smart web scraping. Zero configuration needed.</p>
        </div>
      </div>

      <div className="main-content-simple">
        {/* Smart Scrape Box */}
        <Card className="scrape-box">
          <CardContent className="scrape-content">
            <div className="scrape-input-section">
              <div className="input-wrapper">
                <Globe className="input-icon" />
                <Input
                  data-testid="smart-scrape-url"
                  className="smart-input"
                  placeholder="Paste any website URL here... (e.g., linkedin.com/company/example)"
                  value={scrapeUrl}
                  onChange={(e) => setScrapeUrl(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSmartScrape()}
                />
                <Button 
                  data-testid="smart-scrape-btn"
                  onClick={handleSmartScrape} 
                  disabled={loading}
                  className="scrape-action-btn"
                  size="lg"
                >
                  {loading ? (
                    <><Clock className="animate-spin w-5 h-5 mr-2" />Scraping...</>
                  ) : (
                    <><Wand2 className="w-5 h-5 mr-2" />Scrape Now</>
                  )}
                </Button>
              </div>

              {/* Smart Suggestions */}
              {suggestions.length > 0 && (
                <div className="suggestions">
                  {suggestions.map((suggestion, idx) => (
                    <Badge key={idx} variant="secondary" className="suggestion-badge">
                      {suggestion}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="quick-stats">
              <div className="stat-item-small">
                <Database className="w-4 h-4" />
                <span>{stats.scraper?.total_results || 0} pages scraped</span>
              </div>
              <div className="stat-item-small">
                <Users className="w-4 h-4" />
                <span>{stats.crm?.total_contacts || 0} contacts in CRM</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Display */}
        {result && (
          <Card className="results-card">
            <CardHeader>
              <div className="result-header">
                <div>
                  <CardTitle className="result-title">{result.title || 'Untitled Page'}</CardTitle>
                  <a href={result.url} target="_blank" rel="noopener noreferrer" className="result-url">
                    {result.url}
                  </a>
                </div>
                <div className="result-actions">
                  <Button variant="outline" size="sm" onClick={() => quickExport('json')}>
                    <FileJson className="w-4 h-4 mr-2" />JSON
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => quickExport('csv')}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Data Overview */}
              <div className="data-overview">
                <div className="data-card" onClick={() => document.getElementById('links-section')?.scrollIntoView({ behavior: 'smooth' })}>
                  <LinkIcon className="data-icon" />
                  <div className="data-count">{result.data?.links?.length || 0}</div>
                  <div className="data-label">Links</div>
                </div>
                <div className="data-card" onClick={() => document.getElementById('images-section')?.scrollIntoView({ behavior: 'smooth' })}>
                  <ImageIcon className="data-icon" />
                  <div className="data-count">{result.data?.images?.length || 0}</div>
                  <div className="data-label">Images</div>
                </div>
                <div className="data-card" onClick={() => document.getElementById('tables-section')?.scrollIntoView({ behavior: 'smooth' })}>
                  <TableIcon className="data-icon" />
                  <div className="data-count">{result.data?.tables?.length || 0}</div>
                  <div className="data-label">Tables</div>
                </div>
                <div className="data-card contacts" onClick={() => document.getElementById('contacts-section')?.scrollIntoView({ behavior: 'smooth' })}>
                  <Users className="data-icon" />
                  <div className="data-count">{result.extracted_contacts?.length || 0}</div>
                  <div className="data-label">Contacts</div>
                </div>
              </div>

              {/* Contacts Section */}
              {result.extracted_contacts?.length > 0 && (
                <div id="contacts-section" className="data-section">
                  <div className="section-header">
                    <h3><Users className="w-5 h-5 mr-2" />Extracted Contacts</h3>
                    <Button size="sm" onClick={() => saveContactsToCRM(result.extracted_contacts)}>
                      <Plus className="w-4 h-4 mr-2" />Save All to CRM
                    </Button>
                  </div>
                  <div className="contacts-list">
                    {result.extracted_contacts.slice(0, 10).map((contact, idx) => (
                      <Card key={idx} className="contact-item">
                        <CardContent className="contact-content">
                          {contact.name && (
                            <div className="contact-name">{contact.name}</div>
                          )}
                          {contact.emails?.map(email => (
                            <div key={email} className="contact-detail">
                              <Mail className="w-4 h-4" />
                              <span>{email}</span>
                              <Button variant="ghost" size="icon" onClick={() => copyToClipboard(email)}>
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                          {contact.phones?.map(phone => (
                            <div key={phone} className="contact-detail">
                              <Phone className="w-4 h-4" />
                              <span>{phone}</span>
                              <Button variant="ghost" size="icon" onClick={() => copyToClipboard(phone)}>
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Links Section */}
              {result.data?.links?.length > 0 && (
                <div id="links-section" className="data-section">
                  <div className="section-header">
                    <h3><LinkIcon className="w-5 h-5 mr-2" />Links Found</h3>
                    <Badge>{result.data.links.length} total</Badge>
                  </div>
                  <div className="links-grid">
                    {result.data.links.slice(0, 20).map((link, idx) => (
                      <a key={idx} href={link.href} target="_blank" rel="noopener noreferrer" className="link-item">
                        <ArrowRight className="w-4 h-4" />
                        <span>{link.text || link.href}</span>
                      </a>
                    ))}
                    {result.data.links.length > 20 && (
                      <div className="more-indicator">+{result.data.links.length - 20} more links</div>
                    )}
                  </div>
                </div>
              )}

              {/* Images Section */}
              {result.data?.images?.length > 0 && (
                <div id="images-section" className="data-section">
                  <div className="section-header">
                    <h3><ImageIcon className="w-5 h-5 mr-2" />Images Found</h3>
                    <Badge>{result.data.images.length} total</Badge>
                  </div>
                  <div className="images-grid">
                    {result.data.images.slice(0, 12).map((img, idx) => (
                      <div key={idx} className="image-item">
                        <img src={img.src} alt={img.alt || `Image ${idx + 1}`} loading="lazy" />
                        <div className="image-alt">{img.alt || 'No alt text'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tables Section */}
              {result.data?.tables?.length > 0 && (
                <div id="tables-section" className="data-section">
                  <div className="section-header">
                    <h3><TableIcon className="w-5 h-5 mr-2" />Tables Found</h3>
                    <Badge>{result.data.tables.length} total</Badge>
                  </div>
                  {result.data.tables.slice(0, 3).map((table, tableIdx) => (
                    <div key={tableIdx} className="table-wrapper">
                      <div className="table-container">
                        <table className="scraped-table">
                          <tbody>
                            {table.slice(0, 10).map((row, rowIdx) => (
                              <tr key={rowIdx}>
                                {row.map((cell, cellIdx) => (
                                  <td key={cellIdx}>{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Processing Info */}
              {result.processing_time && (
                <div className="processing-info">
                  <Clock className="w-4 h-4" />
                  <span>Scraped in {result.processing_time.toFixed(2)} seconds</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Scrapes */}
        {!result && recentScrapes.length > 0 && (
          <Card className="recent-scrapes-card">
            <CardHeader>
              <CardTitle>Recent Scrapes</CardTitle>
              <CardDescription>Click to view previous results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="recent-scrapes-list">
                {recentScrapes.slice(0, 5).map((scrape, idx) => (
                  <div key={idx} className="recent-scrape-item" onClick={() => scrapeFromHistory(scrape)}>
                    <div className="recent-scrape-info">
                      <div className="recent-scrape-title">{scrape.title || 'Untitled'}</div>
                      <div className="recent-scrape-url">{scrape.url}</div>
                    </div>
                    <div className="recent-scrape-meta">
                      <Badge variant="outline">
                        {new Date(scrape.scrapedAt).toLocaleDateString()}
                      </Badge>
                      {scrape.extracted_contacts?.length > 0 && (
                        <Badge variant="secondary">
                          <Users className="w-3 h-3 mr-1" />
                          {scrape.extracted_contacts.length}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* CRM Quick View */}
        {contacts.length > 0 && (
          <Card className="crm-preview-card">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Your CRM Contacts</CardTitle>
                  <CardDescription>{contacts.length} contacts saved</CardDescription>
                </div>
                <Button variant="outline" onClick={() => window.open(`${API_URL.replace('/api', '')}/crm`, '_blank')}>
                  View All <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="contacts-preview">
                {contacts.slice(0, 6).map(contact => (
                  <div key={contact.id} className="contact-preview-item">
                    <div className="contact-preview-avatar">
                      {(contact.first_name?.[0] || '?')}{(contact.last_name?.[0] || '')}
                    </div>
                    <div className="contact-preview-info">
                      <div className="contact-preview-name">
                        {contact.first_name} {contact.last_name}
                      </div>
                      <div className="contact-preview-email">{contact.email}</div>
                    </div>
                    <Badge variant="outline">{contact.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="footer-simple">
        <p>Powered by CRAWLai Pro • Smart scraping made simple</p>
      </div>
    </div>
  );
}

export default App;