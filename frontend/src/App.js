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
import { Download, Globe, Search, Settings, TrendingUp, Database, Zap, Play, Plus, Trash2, Edit, Copy, ShoppingCart, Newspaper, Building2, Briefcase, Share2, Home, Sparkles } from 'lucide-react';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const templateIcons = {
  ShoppingCart,
  Newspaper,
  Building2,
  Briefcase,
  Share2,
  Home
};

function App() {
  const [projects, setProjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState({ total_projects: 0, active_projects: 0, total_results: 0 });
  const [quickScrapeUrl, setQuickScrapeUrl] = useState('');
  const [quickScrapeLoading, setQuickScrapeLoading] = useState(false);
  const [quickScrapeResult, setQuickScrapeResult] = useState(null);
  const [newProject, setNewProject] = useState({ name: '', description: '', target_url: '', selectors: [] });
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, templatesRes, resultsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/projects`),
        axios.get(`${API_URL}/api/templates`),
        axios.get(`${API_URL}/api/results?limit=50`),
        axios.get(`${API_URL}/api/stats`)
      ]);
      
      setProjects(projectsRes.data);
      setTemplates(templatesRes.data);
      setResults(resultsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    }
  };

  const handleQuickScrape = async () => {
    if (!quickScrapeUrl) {
      toast.error('Please enter a URL');
      return;
    }

    setQuickScrapeLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/scrape/quick`, {
        url: quickScrapeUrl,
        selectors: [],
        extract_links: true,
        extract_images: true,
        extract_tables: true
      });
      
      setQuickScrapeResult(response.data);
      toast.success('Page scraped successfully!');
    } catch (error) {
      toast.error('Failed to scrape page');
    } finally {
      setQuickScrapeLoading(false);
    }
  };

  const createProject = async () => {
    if (!newProject.name || !newProject.target_url) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      await axios.post(`${API_URL}/api/projects`, newProject);
      toast.success('Project created successfully!');
      setShowNewProjectDialog(false);
      setNewProject({ name: '', description: '', target_url: '', selectors: [] });
      fetchData();
    } catch (error) {
      toast.error('Failed to create project');
    }
  };

  const runProject = async (projectId) => {
    try {
      toast.loading('Running scraper...');
      await axios.post(`${API_URL}/api/projects/${projectId}/run`);
      toast.success('Scraping completed!');
      fetchData();
    } catch (error) {
      toast.error('Failed to run project');
    }
  };

  const deleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/projects/${projectId}`);
      toast.success('Project deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  const useTemplate = (template) => {
    setSelectedTemplate(template);
    setNewProject({
      name: template.name,
      description: template.description,
      target_url: template.sample_url,
      selectors: template.selectors
    });
    setShowNewProjectDialog(true);
  };

  const exportResults = (format) => {
    const dataStr = format === 'json' 
      ? JSON.stringify(results, null, 2)
      : convertToCSV(results);
    
    const blob = new Blob([dataStr], { 
      type: format === 'json' ? 'application/json' : 'text/csv' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `crawlai_results_${Date.now()}.${format}`;
    link.click();
    toast.success(`Exported as ${format.toUpperCase()}`);
  };

  const convertToCSV = (data) => {
    if (!data.length) return '';
    const headers = ['Project ID', 'URL', 'Title', 'Status', 'Scraped At'];
    const rows = data.map(item => [
      item.project_id,
      item.url,
      item.title,
      item.status,
      new Date(item.scraped_at).toLocaleString()
    ]);
    return [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
  };

  return (
    <div className="app-container">
      <Toaster position="top-right" richColors />
      
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-background">
          <div className="hero-gradient"></div>
          <div className="hero-pattern"></div>
        </div>
        
        <div className="hero-content">
          <div className="hero-badge" data-testid="hero-badge">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Web Intelligence</span>
          </div>
          
          <h1 className="hero-title" data-testid="hero-title">
            <span className="gradient-text">CRAWLai</span>
          </h1>
          
          <p className="hero-subtitle" data-testid="hero-subtitle">
            The most advanced web scraping platform. Extract, transform, and automate data from any website with intelligent precision.
          </p>
          
          <div className="hero-features">
            <div className="hero-feature">
              <Zap className="w-5 h-5" />
              <span>Lightning Fast</span>
            </div>
            <div className="hero-feature">
              <Globe className="w-5 h-5" />
              <span>Any Website</span>
            </div>
            <div className="hero-feature">
              <Database className="w-5 h-5" />
              <span>Smart Extraction</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Stats Cards */}
        <div className="stats-grid">
          <Card className="stat-card" data-testid="stat-projects">
            <CardContent className="stat-content">
              <div className="stat-icon-wrapper">
                <Database className="stat-icon" />
              </div>
              <div className="stat-info">
                <div className="stat-value">{stats.total_projects}</div>
                <div className="stat-label">Active Projects</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="stat-card" data-testid="stat-results">
            <CardContent className="stat-content">
              <div className="stat-icon-wrapper success">
                <TrendingUp className="stat-icon" />
              </div>
              <div className="stat-info">
                <div className="stat-value">{stats.total_results}</div>
                <div className="stat-label">Total Scrapes</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="stat-card" data-testid="stat-active">
            <CardContent className="stat-content">
              <div className="stat-icon-wrapper purple">
                <Zap className="stat-icon" />
              </div>
              <div className="stat-info">
                <div className="stat-value">{stats.active_projects}</div>
                <div className="stat-label">Running Now</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Scrape Section */}
        <Card className="quick-scrape-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Quick Scrape
            </CardTitle>
            <CardDescription>Instantly extract data from any URL</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="quick-scrape-input">
              <Input
                data-testid="quick-scrape-url"
                placeholder="Enter URL to scrape (e.g., https://example.com)"
                value={quickScrapeUrl}
                onChange={(e) => setQuickScrapeUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleQuickScrape()}
              />
              <Button 
                data-testid="quick-scrape-btn"
                onClick={handleQuickScrape} 
                disabled={quickScrapeLoading}
                className="scrape-btn"
              >
                {quickScrapeLoading ? 'Scraping...' : 'Scrape Now'}
                <Zap className="w-4 h-4 ml-2" />
              </Button>
            </div>
            
            {quickScrapeResult && (
              <div className="scrape-result" data-testid="quick-scrape-result">
                <h4>Scraped: {quickScrapeResult.title}</h4>
                <div className="result-stats">
                  <Badge>Links: {quickScrapeResult.data?.links?.length || 0}</Badge>
                  <Badge>Images: {quickScrapeResult.data?.images?.length || 0}</Badge>
                  <Badge>Tables: {quickScrapeResult.data?.tables?.length || 0}</Badge>
                </div>
                <pre className="result-data">{JSON.stringify(quickScrapeResult.data, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs defaultValue="projects" className="main-tabs">
          <TabsList className="tabs-list">
            <TabsTrigger value="projects" data-testid="projects-tab">
              <Database className="w-4 h-4 mr-2" />
              My Projects
            </TabsTrigger>
            <TabsTrigger value="templates" data-testid="templates-tab">
              <Copy className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="results" data-testid="results-tab">
              <TrendingUp className="w-4 h-4 mr-2" />
              Results
            </TabsTrigger>
          </TabsList>

          {/* Projects Tab */}
          <TabsContent value="projects">
            <div className="tab-header">
              <h2>Scraping Projects</h2>
              <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
                <DialogTrigger asChild>
                  <Button data-testid="new-project-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    New Project
                  </Button>
                </DialogTrigger>
                <DialogContent className="dialog-content">
                  <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>
                      Set up a new scraping project with custom selectors
                    </DialogDescription>
                  </DialogHeader>
                  <div className="dialog-form">
                    <div className="form-group">
                      <Label>Project Name *</Label>
                      <Input
                        data-testid="project-name-input"
                        value={newProject.name}
                        onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                        placeholder="My Scraping Project"
                      />
                    </div>
                    <div className="form-group">
                      <Label>Description</Label>
                      <Textarea
                        data-testid="project-description-input"
                        value={newProject.description}
                        onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                        placeholder="What does this project scrape?"
                      />
                    </div>
                    <div className="form-group">
                      <Label>Target URL *</Label>
                      <Input
                        data-testid="project-url-input"
                        value={newProject.target_url}
                        onChange={(e) => setNewProject({...newProject, target_url: e.target.value})}
                        placeholder="https://example.com"
                      />
                    </div>
                    <Button onClick={createProject} className="w-full" data-testid="create-project-btn">
                      Create Project
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="projects-grid">
              {projects.length === 0 ? (
                <div className="empty-state">
                  <Database className="empty-icon" />
                  <h3>No projects yet</h3>
                  <p>Create your first scraping project or use a template</p>
                </div>
              ) : (
                projects.map(project => (
                  <Card key={project.id} className="project-card" data-testid="project-card">
                    <CardHeader>
                      <div className="project-header">
                        <div>
                          <CardTitle>{project.name}</CardTitle>
                          <CardDescription>{project.description || 'No description'}</CardDescription>
                        </div>
                        <Badge variant={project.active ? "default" : "secondary"}>
                          {project.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="project-info">
                        <div className="project-url">
                          <Globe className="w-4 h-4" />
                          <span>{project.target_url}</span>
                        </div>
                        <div className="project-stats">
                          <span>Runs: {project.run_count}</span>
                          {project.last_run && (
                            <span>Last: {new Date(project.last_run).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="project-actions">
                        <Button onClick={() => runProject(project.id)} size="sm" data-testid="run-project-btn">
                          <Play className="w-4 h-4 mr-2" />
                          Run
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => deleteProject(project.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <div className="tab-header">
              <h2>Scraping Templates</h2>
              <p className="tab-description">Pre-configured templates for common scraping tasks</p>
            </div>

            <div className="templates-grid">
              {templates.map(template => {
                const IconComponent = templateIcons[template.icon] || Database;
                return (
                  <Card key={template.id} className="template-card" data-testid="template-card">
                    <CardHeader>
                      <div className="template-icon">
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <CardTitle>{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                      <Badge variant="secondary">{template.category}</Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="template-selectors">
                        <strong>Extracts:</strong>
                        <ul>
                          {template.selectors.slice(0, 3).map((sel, idx) => (
                            <li key={idx}>{sel.name}</li>
                          ))}
                          {template.selectors.length > 3 && <li>+{template.selectors.length - 3} more</li>}
                        </ul>
                      </div>
                      <Button 
                        onClick={() => useTemplate(template)} 
                        className="w-full mt-4"
                        data-testid="use-template-btn"
                      >
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results">
            <div className="tab-header">
              <h2>Scraping Results</h2>
              <div className="header-actions">
                <Button onClick={() => exportResults('json')} variant="outline" data-testid="export-json-btn">
                  <Download className="w-4 h-4 mr-2" />
                  Export JSON
                </Button>
                <Button onClick={() => exportResults('csv')} variant="outline" data-testid="export-csv-btn">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>

            <div className="results-list">
              {results.length === 0 ? (
                <div className="empty-state">
                  <TrendingUp className="empty-icon" />
                  <h3>No results yet</h3>
                  <p>Run a project to see scraped data here</p>
                </div>
              ) : (
                results.map(result => (
                  <Card key={result.id} className="result-card" data-testid="result-card">
                    <CardHeader>
                      <div className="result-header">
                        <div>
                          <CardTitle>{result.title || 'Untitled'}</CardTitle>
                          <a href={result.url} target="_blank" rel="noopener noreferrer" className="result-url">
                            {result.url}
                          </a>
                        </div>
                        <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                          {result.status}
                        </Badge>
                      </div>
                      <CardDescription>
                        Scraped {new Date(result.scraped_at).toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="result-stats">
                        {result.data?.links && <Badge>Links: {result.data.links.length}</Badge>}
                        {result.data?.images && <Badge>Images: {result.data.images.length}</Badge>}
                        {result.data?.tables && <Badge>Tables: {result.data.tables.length}</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="footer">
        <p>Powered by CRAWLai - The Future of Web Scraping</p>
      </div>
    </div>
  );
}

export default App;