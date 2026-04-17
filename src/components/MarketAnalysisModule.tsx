import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Globe, 
  TrendingUp, 
  ExternalLink, 
  Loader2, 
  FileText, 
  MapPin, 
  DollarSign, 
  Info,
  Sparkles,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  BarChart3,
  Users,
  Activity,
  TrendingDown,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { firecrawlService } from '../services/firecrawlService';
import { geminiService } from '../services/geminiService';
import { marketAnalyticsService } from '../services/marketAnalyticsService';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { ServiceCategory, AcuityLevel, SERVICE_CATEGORY_LABELS, ACUITY_LABELS } from '../types';

interface Competitor {
  title: string;
  url: string;
  description?: string;
  markdown?: string;
  analysis?: string;
  isAnalyzing?: boolean;
}

export const MarketAnalysisModule = () => {
  const [query, setQuery] = useState('Home care nursing services Karachi');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Competitor[]>([]);
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [serviceStats, setServiceStats] = useState<{ category: ServiceCategory; count: number; avgRate: number }[]>([]);
  const [acuityData, setAcuityData] = useState<{ level: AcuityLevel; count: number }[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(true);

  useEffect(() => {
    loadMarketInsights();
  }, []);

  const loadMarketInsights = async () => {
    setIsLoadingInsights(true);
    try {
      const [stats, acuity, overviewData] = await Promise.all([
        marketAnalyticsService.getServiceCategoryStats(),
        marketAnalyticsService.getAcuityDistribution(),
        marketAnalyticsService.getMarketOverview(),
      ]);
      setServiceStats(stats);
      setAcuityData(acuity);
      setOverview(overviewData);
    } catch (error) {
      console.error('Failed to load market insights:', error);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const COLORS = ['#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a', '#042f2e', '#06b6d4', '#0891b2'];

  const acuityChartData = acuityData.map(d => ({
    name: `Level ${d.level}`,
    count: d.count,
    description: ACUITY_LABELS[d.level].split(' - ')[0],
  }));

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const response = await firecrawlService.search(query);
      if (response.success && response.data) {
        setResults(response.data.map(item => ({
          title: item.title || 'Untitled',
          url: item.url,
          description: item.description || '',
          markdown: item.markdown || ''
        })));
        toast.success(`Found ${response.data.length} potential competitors`);
      } else {
        toast.error(response.error || 'Failed to search market data');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSearching(false);
    }
  };

  const analyzeCompetitor = async (competitor: Competitor) => {
    if (!competitor.markdown) {
      toast.error('No content available to analyze');
      return;
    }

    // Update state to show loading for this specific competitor
    setResults(prev => prev.map(c => 
      c.url === competitor.url ? { ...c, isAnalyzing: true } : c
    ));

    try {
      const analysis = await geminiService.analyzeMarketData(competitor.markdown);
      
      const updatedCompetitor = { ...competitor, analysis, isAnalyzing: false };
      
      setResults(prev => prev.map(c => 
        c.url === competitor.url ? updatedCompetitor : c
      ));
      
      setSelectedCompetitor(updatedCompetitor);
      toast.success('Analysis complete!');
    } catch (error) {
      toast.error('Failed to analyze competitor data');
      setResults(prev => prev.map(c => 
        c.url === competitor.url ? { ...c, isAnalyzing: false } : c
      ));
    }
  };

  return (
    <div className="space-y-8">
      {/* Market Insights Dashboard */}
      <div className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 rounded-3xl p-6 border border-teal-100 dark:border-teal-800/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 dark:bg-teal-900/50 rounded-xl">
              <BarChart3 className="text-teal-600 dark:text-teal-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-teal-900 dark:text-teal-100">Market Intelligence Dashboard</h2>
              <p className="text-sm text-teal-600 dark:text-teal-400">Real-time insights from your agency data</p>
            </div>
          </div>
          <button 
            onClick={loadMarketInsights}
            disabled={isLoadingInsights}
            className="p-2 hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw size={20} className={isLoadingInsights ? 'animate-spin' : ''} />
          </button>
        </div>

        {isLoadingInsights ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-teal-600" size={32} />
          </div>
        ) : (
          <>
            {/* Overview Stats */}
            {overview && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/80 dark:bg-slate-900/50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Users size={16} />
                    <span className="text-xs font-medium">Total Patients</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{overview.totalPatients}</p>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Activity size={16} />
                    <span className="text-xs font-medium">Categorized</span>
                  </div>
                  <p className="text-2xl font-bold text-teal-600">{overview.categorizedPatients}</p>
                  <p className="text-xs text-slate-400">{overview.totalPatients > 0 ? Math.round(overview.categorizedPatients / overview.totalPatients * 100) : 0}%</p>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <DollarSign size={16} />
                    <span className="text-xs font-medium">Avg Rate (PKR)</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{overview.avgBillingRate.toLocaleString()}</p>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Zap size={16} />
                    <span className="text-xs font-medium">Top Service</span>
                  </div>
                  <p className="text-lg font-bold text-teal-600">
                    {overview.topServiceCategory ? SERVICE_CATEGORY_LABELS[overview.topServiceCategory] : 'N/A'}
                  </p>
                </div>
              </div>
            )}

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Service Category Distribution */}
              <div className="bg-white/80 dark:bg-slate-900/50 rounded-2xl p-4">
                <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-4">Service Category Distribution</h3>
                {serviceStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={serviceStats.map(s => ({
                      category: SERVICE_CATEGORY_LABELS[s.category] || s.category,
                      count: s.count,
                      avgRate: s.avgRate,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255,255,255,0.9)', 
                          border: 'none', 
                          borderRadius: '12px',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                        }}
                        formatter={(value: number, name: string) => [
                          name === 'count' ? `${value} patients` : `PKR ${value.toLocaleString()}`,
                          name === 'count' ? 'Patients' : 'Avg Rate'
                        ]}
                      />
                      <Bar dataKey="count" fill="#14b8a6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-slate-400">
                    <div className="text-center">
                      <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No categorized patients yet</p>
                      <p className="text-xs">Add service categories to patient records</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Care Acuity Distribution */}
              <div className="bg-white/80 dark:bg-slate-900/50 rounded-2xl p-4">
                <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-4">Care Acuity Levels</h3>
                {acuityData.some(d => d.count > 0) ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={acuityChartData.filter(d => d.count > 0)}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {acuityChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-slate-400">
                    <div className="text-center">
                      <Activity size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No acuity data yet</p>
                      <p className="text-xs">Add acuity levels to patient records</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Competency Gaps */}
            <div className="mt-6 bg-white/80 dark:bg-slate-900/50 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-4">Market Research Tips</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                  <TrendingUp className="text-emerald-600 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Track Demand</p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">Add service categories to see which care types are most requested</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-sky-50 dark:bg-sky-900/20 rounded-xl">
                  <Users className="text-sky-600 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm font-semibold text-sky-900 dark:text-sky-100">Staff Planning</p>
                    <p className="text-xs text-sky-700 dark:text-sky-300">Use acuity levels to understand staffing complexity needs</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                  <DollarSign className="text-amber-600 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Pricing Strategy</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">Higher acuity = higher rates. Compare your pricing to market average</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Competitor Research Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Globe className="text-teal-600 dark:text-teal-400" size={32} />
            Market Analysis & Competitor Insights
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            Real-time intelligence on home care services in Karachi powered by Firecrawl & Gemini.
          </p>
        </div>
        
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 dark:group-focus-within:text-teal-400 transition-colors" size={18} />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search competitors..."
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 w-64 lg:w-80 text-sm focus:ring-2 focus:ring-teal-500 transition-all shadow-sm dark:text-white"
            />
          </div>
          <button 
            disabled={isSearching}
            className="bg-teal-600 text-white px-6 py-2.5 rounded-2xl font-bold text-sm shadow-lg shadow-teal-100 dark:shadow-teal-900/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
          >
            {isSearching ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Results List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2">
            <TrendingUp size={14} />
            Search Results
          </h2>
          
          <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 custom-scrollbar">
            {results.length === 0 && !isSearching && (
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-8 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl flex items-center justify-center mx-auto">
                  <Search size={24} />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No results yet. Try searching for "Home nursing Karachi".</p>
              </div>
            )}

            {isSearching && Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-3xl animate-pulse space-y-3">
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                <div className="h-10 bg-slate-50 dark:bg-slate-800/50 rounded-2xl w-full" />
              </div>
            ))}

            {results.map((competitor) => (
              <motion.div
                key={competitor.url}
                layoutId={competitor.url}
                onClick={() => setSelectedCompetitor(competitor)}
                className={`p-4 rounded-3xl border transition-all cursor-pointer group ${
                  selectedCompetitor?.url === competitor.url 
                    ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 shadow-lg shadow-teal-50 dark:shadow-teal-900/20' 
                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-teal-100 dark:hover:border-teal-700 hover:shadow-md'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-1">{competitor.title}</h3>
                  <a 
                    href={competitor.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-slate-400 dark:text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">{competitor.description}</p>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    analyzeCompetitor(competitor);
                  }}
                  disabled={competitor.isAnalyzing}
                  className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                    competitor.analysis 
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800' 
                      : 'bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700'
                  }`}
                >
                  {competitor.isAnalyzing ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : competitor.analysis ? (
                    <Sparkles size={12} />
                  ) : (
                    <Sparkles size={12} />
                  )}
                  {competitor.isAnalyzing ? 'Analyzing...' : competitor.analysis ? 'Re-Analyze' : 'Analyze with AI'}
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Analysis Detail */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedCompetitor ? (
              <motion.div
                key={selectedCompetitor.url}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[40px] shadow-xl overflow-hidden flex flex-col h-full max-h-[calc(100vh-200px)]"
              >
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 bg-gradient-to-r from-teal-600 to-sky-600 text-white">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-teal-100 text-[10px] font-black uppercase tracking-widest">
                        <Globe size={12} />
                        Competitor Profile
                      </div>
                      <h2 className="text-2xl font-black tracking-tight tracking-tight">{selectedCompetitor.title}</h2>
                    </div>
                    <a 
                      href={selectedCompetitor.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all"
                    >
                      <ExternalLink size={20} />
                    </a>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium flex items-center gap-1.5">
                      <MapPin size={12} /> Karachi
                    </span>
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium flex items-center gap-1.5">
                      <Info size={12} /> Home Care
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                  {selectedCompetitor.analysis ? (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-3xl">
                        <div className="w-10 h-10 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100 dark:shadow-emerald-900/20">
                          <Sparkles size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-emerald-900">AI Strategic Analysis</h4>
                          <p className="text-xs text-emerald-600">Generated using Gemini 3.1 Flash</p>
                        </div>
                      </div>
                      
                      <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tight prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600">
                        <ReactMarkdown>{selectedCompetitor.analysis}</ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-12">
                      <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-[32px] flex items-center justify-center border border-slate-100">
                        <Sparkles size={40} />
                      </div>
                      <div className="space-y-2 max-w-xs">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">No Analysis Yet</h3>
                        <p className="text-sm text-slate-500 font-medium">
                          Click "Analyze with AI" to extract strategic insights from this competitor's website.
                        </p>
                      </div>
                      <button 
                        onClick={() => analyzeCompetitor(selectedCompetitor)}
                        disabled={selectedCompetitor.isAnalyzing}
                        className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-[24px] font-bold shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {selectedCompetitor.isAnalyzing ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                        {selectedCompetitor.isAnalyzing ? 'Analyzing Content...' : 'Generate AI Insights'}
                      </button>
                    </div>
                  )}

                  {/* Raw Content Preview */}
                  <div className="pt-8 border-t border-slate-100">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <FileText size={14} />
                      Scraped Content Preview
                    </h4>
                    <div className="bg-slate-50 rounded-3xl p-6 text-[10px] font-mono text-slate-500 overflow-hidden max-h-48 relative">
                      <div className="whitespace-pre-wrap">{selectedCompetitor.markdown?.substring(0, 1000)}...</div>
                      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-50 to-transparent" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 bg-slate-50/50 border border-dashed border-slate-200 rounded-[40px] py-24">
                <div className="w-24 h-24 bg-white text-slate-200 rounded-[40px] flex items-center justify-center shadow-sm border border-slate-100">
                  <Globe size={48} />
                </div>
                <div className="space-y-2 max-w-sm">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Select a Competitor</h3>
                  <p className="text-slate-500 font-medium">
                    Choose a service provider from the search results to see their detailed profile and AI-generated analysis.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-teal-600 font-bold text-sm animate-bounce">
                  <ArrowRight size={18} className="rotate-180" />
                  Start by searching above
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
