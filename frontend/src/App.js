import React, { useState, useEffect } from 'react';
import './App.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Badge } from './components/ui/badge';
import { Textarea } from './components/ui/textarea';
import axios from 'axios';
import { Download, Globe, Search, Settings, TrendingUp, Database, Chrome } from 'lucide-react';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function App() {
  const [scrapedData, setScrapedData] = useState([]);
  const [stats, setStats] = useState({ total_scraped_pages: 0, top_domains: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
    fetchStats();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/scrape/data?limit=100`);
      setScrapedData(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load scraped data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/scrape/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const exportAsJSON = () => {
    const dataStr = JSON.stringify(scrapedData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scraped_data_${Date.now()}.json`;
    link.click();
    toast.success('Data exported as JSON');
  };

  const exportAsCSV = () => {
    if (scrapedData.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const headers = ['URL', 'Title', 'Domain', 'Timestamp', 'Keywords'];
    const rows = scrapedData.map(item => [
      item.url,
      item.title,
      item.domain,
      new Date(item.timestamp).toLocaleString(),
      (item.keywords_found || []).join('; ')
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scraped_data_${Date.now()}.csv`;
    link.click();
    toast.success('Data exported as CSV');
  };

  const clearAllData = async () => {
    if (!window.confirm('Are you sure you want to delete all scraped data?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/scrape/data`);
      setScrapedData([]);
      await fetchStats();
      toast.success('All data cleared');
    } catch (error) {
      toast.error('Failed to clear data');
    }
  };

  const filteredData = scrapedData.filter(item => {
    const matchesSearch = !searchTerm || 
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.url?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDomain = !domainFilter ||
      item.domain?.toLowerCase().includes(domainFilter.toLowerCase());
    
    return matchesSearch && matchesDomain;
  });

  return (
    <div className="app-container">
      <Toaster position="top-right" />
      
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <Chrome className="w-4 h-4" />
            <span>Advanced Web Scraper Pro</span>
          </div>
          <h1 className="hero-title">Web Scraping Made Simple</h1>
          <p className="hero-subtitle">
            Combining features from top 5 market-leading scrapers into one powerful tool
          </p>
        </div>
      </div>

      <div className="main-content">
        <div className="stats-grid">
          <Card className="stat-card">
            <CardHeader className="stat-header">
              <Database className="stat-icon" />
              <CardTitle className="stat-value">{stats.total_scraped_pages}</CardTitle>
              <CardDescription>Total Pages Scraped</CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="stat-card">
            <CardHeader className="stat-header">
              <Globe className="stat-icon" />
              <CardTitle className="stat-value">{stats.top_domains.length}</CardTitle>
              <CardDescription>Unique Domains</CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="stat-card">
            <CardHeader className="stat-header">
              <TrendingUp className="stat-icon" />
              <CardTitle className="stat-value">
                {scrapedData.reduce((sum, item) => sum + (item.keywords_found?.length || 0), 0)}
              </CardTitle>
              <CardDescription>Keywords Found</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="data" className="tabs-container">
          <TabsList className="tabs-list">
            <TabsTrigger value="data" data-testid="data-tab">
              <Database className="w-4 h-4 mr-2" />
              Scraped Data
            </TabsTrigger>
            <TabsTrigger value="extension" data-testid="extension-tab">
              <Chrome className="w-4 h-4 mr-2" />
              Extension Setup
            </TabsTrigger>
            <TabsTrigger value="docs" data-testid="docs-tab">
              <Settings className="w-4 h-4 mr-2" />
              Documentation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="tab-content">
            <Card>
              <CardHeader>
                <CardTitle>Scraped Data Management</CardTitle>
                <CardDescription>View, filter, and export your scraped data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="filters-section">
                  <div className="filter-group">
                    <Label htmlFor="search">Search</Label>
                    <Input
                      id="search"
                      data-testid="search-input"
                      placeholder="Search by title or URL..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="filter-group">
                    <Label htmlFor="domain">Domain Filter</Label>
                    <Input
                      id="domain"
                      data-testid="domain-filter-input"
                      placeholder="Filter by domain..."
                      value={domainFilter}
                      onChange={(e) => setDomainFilter(e.target.value)}
                    />
                  </div>
                </div>

                <div className="actions-bar">
                  <Button onClick={fetchData} data-testid="refresh-btn">
                    <Search className="w-4 h-4 mr-2" />
                    Refresh Data
                  </Button>
                  <Button onClick={exportAsJSON} variant="outline" data-testid="export-json-btn">
                    <Download className="w-4 h-4 mr-2" />
                    Export JSON
                  </Button>
                  <Button onClick={exportAsCSV} variant="outline" data-testid="export-csv-btn">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button onClick={clearAllData} variant="destructive" data-testid="clear-all-btn">
                    Clear All
                  </Button>
                </div>

                {loading ? (
                  <div className="loading-state">Loading data...</div>
                ) : filteredData.length === 0 ? (
                  <div className="empty-state">
                    <Database className="empty-icon" />
                    <h3>No data found</h3>
                    <p>Install the browser extension and start scraping websites</p>
                  </div>
                ) : (
                  <div className="data-list">
                    {filteredData.map((item, index) => (
                      <Card key={item.id || index} className="data-item">
                        <CardHeader>
                          <div className="data-item-header">
                            <div>
                              <CardTitle className="data-title">{item.title || 'Untitled'}</CardTitle>
                              <a href={item.url} target="_blank" rel="noopener noreferrer" className="data-url">
                                {item.url}
                              </a>
                            </div>
                          </div>
                          <div className="data-meta">
                            <Badge variant="secondary">
                              <Globe className="w-3 h-3 mr-1" />
                              {item.domain}
                            </Badge>
                            <span className="data-timestamp">
                              {new Date(item.timestamp).toLocaleString()}
                            </span>
                          </div>
                          {item.keywords_found?.length > 0 && (
                            <div className="keywords-row">
                              {item.keywords_found.map((keyword, idx) => (
                                <Badge key={idx} className="keyword-badge">{keyword}</Badge>
                              ))}
                            </div>
                          )}
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="extension" className="tab-content">
            <Card>
              <CardHeader>
                <CardTitle>Browser Extension Installation</CardTitle>
                <CardDescription>Install the Advanced Web Scraper Pro extension in Chrome or Edge</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="installation-guide">
                  <div className="step-card">
                    <div className="step-number">1</div>
                    <div className="step-content">
                      <h3>Navigate to Extensions</h3>
                      <p><strong>Chrome:</strong> <code>chrome://extensions/</code></p>
                      <p><strong>Edge:</strong> <code>edge://extensions/</code></p>
                    </div>
                  </div>
                  
                  <div className="step-card">
                    <div className="step-number">2</div>
                    <div className="step-content">
                      <h3>Enable Developer Mode</h3>
                      <p>Toggle the "Developer mode" switch in the top-right corner</p>
                    </div>
                  </div>
                  
                  <div className="step-card">
                    <div className="step-number">3</div>
                    <div className="step-content">
                      <h3>Load Extension</h3>
                      <p>Click "Load unpacked" and select the folder: <code>/app/extension/</code></p>
                    </div>
                  </div>
                  
                  <div className="step-card">
                    <div className="step-number">4</div>
                    <div className="step-content">
                      <h3>Start Scraping!</h3>
                      <p>Click the extension icon in your toolbar and enable Auto-Scrape</p>
                    </div>
                  </div>
                </div>

                <div className="features-grid">
                  <h3 className="features-title">Key Features</h3>
                  <div className="feature-items">
                    <div className="feature-item">✅ Automatic scraping on every page visit</div>
                    <div className="feature-item">✅ Custom CSS selectors</div>
                    <div className="feature-item">✅ Keyword filtering</div>
                    <div className="feature-item">✅ Domain whitelist/blacklist</div>
                    <div className="feature-item">✅ Export as JSON or CSV</div>
                    <div className="feature-item">✅ Backend integration</div>
                    <div className="feature-item">✅ Table extraction</div>
                    <div className="feature-item">✅ Email & link detection</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="docs" className="tab-content">
            <Card>
              <CardHeader>
                <CardTitle>Documentation & API</CardTitle>
                <CardDescription>Learn how to use the scraper and integrate with the API</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="docs-section">
                  <h3>Available Files</h3>
                  <ul className="docs-list">
                    <li><code>/app/INSTALLATION_GUIDE.md</code> - Complete installation instructions</li>
                    <li><code>/app/QUICK_REFERENCE.md</code> - Feature cheatsheet</li>
                    <li><code>/app/ARCHITECTURE.md</code> - Technical documentation</li>
                    <li><code>/app/extension/README.md</code> - Extension documentation</li>
                  </ul>
                </div>

                <div className="docs-section">
                  <h3>API Endpoints</h3>
                  <div className="api-endpoint">
                    <Badge>GET</Badge>
                    <code>/api/scrape/data</code>
                    <span>Retrieve scraped data</span>
                  </div>
                  <div className="api-endpoint">
                    <Badge>POST</Badge>
                    <code>/api/scrape/data</code>
                    <span>Save new scraped data</span>
                  </div>
                  <div className="api-endpoint">
                    <Badge>GET</Badge>
                    <code>/api/scrape/stats</code>
                    <span>Get scraping statistics</span>
                  </div>
                  <div className="api-endpoint">
                    <Badge variant="destructive">DELETE</Badge>
                    <code>/api/scrape/data</code>
                    <span>Clear all data</span>
                  </div>
                </div>

                <div className="docs-section">
                  <h3>Backend URL</h3>
                  <div className="backend-url">
                    <code>{API_URL}/api</code>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Configure this URL in your browser extension to enable backend storage
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;