"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Compass, Clock, Search, ExternalLink, RefreshCw, TrendingUp, Zap, Brain, Globe, Flame } from "lucide-react";
import { AstraIcon } from "@/components/common/ProviderIcons";

interface NewsItem {
  id: string;
  title: string;
  source_name: string;
  source_url: string;
  published_at: string;
  points: number;
}

const CATEGORIES = ["All", "Models", "Research", "Tools", "Companies"];

const CATEGORY_QUERIES: Record<string, string> = {
  All: "AI OR LLM OR OpenAI OR Claude OR Anthropic OR Gemini",
  Models: "LLM OR \"language model\" OR GPT OR Claude OR Gemini",
  Research: "paper OR \"research\" OR arxiv OR reasoning",
  Tools: "\"AI tool\" OR framework OR agents OR RAG",
  Companies: "OpenAI OR Anthropic OR Google OR Meta OR xAI",
};

function formatTimeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getDomainFavicon(url: string): string {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch {
    return "";
  }
}

export default function DiscoverPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [error, setError] = useState(false);

  const fetchNews = useCallback(async (cat: string, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(false);

    try {
      const query = encodeURIComponent(CATEGORY_QUERIES[cat] || "AI");
      // Fetch from HackerNews Algolia API
      const res = await fetch(`https://hn.algolia.com/api/v1/search_by_date?query=${query}&tags=story&hitsPerPage=24`);
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      if (data?.hits?.length > 0) {
        const mapped: NewsItem[] = data.hits.map((hit: any) => {
          let domain = "news.ycombinator.com";
          try { domain = new URL(hit.url).hostname.replace('www.', ''); } catch { }
          return {
            id: hit.objectID,
            title: hit.title,
            source_name: hit.url ? domain : "HackerNews",
            source_url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
            published_at: hit.created_at,
            points: hit.points || 1,
          };
        });
        
        // Boost items with higher points slightly to the top, but keep mostly chronological
        const sorted = mapped.sort((a, b) => {
          const timeA = new Date(a.published_at).getTime();
          const timeB = new Date(b.published_at).getTime();
          // Complex scoring: recency + points weight
          const scoreA = timeA + (a.points * 600000); 
          const scoreB = timeB + (b.points * 600000);
          return scoreB - scoreA;
        });

        setNews(sorted);
      } else {
        setNews([]);
      }
    } catch (err) {
      console.warn("Discover fetch failed:", err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { 
    fetchNews(category); 
  }, [category, fetchNews]);

  // Client-side search filter
  const filtered = news.filter(item => {
    if (!search) return true;
    return item.title.toLowerCase().includes(search.toLowerCase()) || 
           item.source_name.toLowerCase().includes(search.toLowerCase());
  });

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div className="min-h-screen bg-bg-base text-text-main font-sans selection:bg-brand-500/30 selection:text-white">

      {/* ═══ STICKY HEADER ═══ */}
      <header className="sticky top-0 z-50 bg-bg-panel/80 backdrop-blur-xl border-b border-border-dim">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">
          <Link href="/chat" className="no-underline">
            <button className="px-3.5 py-2 rounded-xl bg-bg-elevated border border-border-dim text-text-muted hover:text-white cursor-pointer flex items-center gap-2 text-sm font-semibold transition-colors hover:bg-bg-hover">
              <ArrowLeft size={16} /> Back
            </button>
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <AstraIcon size={16} className="text-white" />
            </div>
            <span className="font-display font-extrabold text-lg tracking-tight hidden sm:block">Discover</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-sm ml-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase">Live Feed</span>
            </div>
          </div>

          <div className="flex-1" />

          {/* Search Bar */}
          <div className="hidden sm:flex items-center gap-2 bg-bg-elevated px-4 py-2 rounded-xl border border-border-dim focus-within:border-brand-500/50 focus-within:ring-1 focus-within:ring-brand-500/50 transition-all w-64">
            <Search size={14} className="text-text-muted" />
            <input
              type="text"
              placeholder="Search news..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none text-text-main text-sm outline-none w-full placeholder:text-text-dim"
            />
          </div>

          <button 
            onClick={() => fetchNews(category, true)} 
            disabled={refreshing} 
            className="px-3.5 py-2 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 text-brand-400 cursor-pointer flex items-center gap-2 text-sm font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-12 pb-24">
        {/* ═══ HERO TITLE ═══ */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Compass size={32} className="text-brand-400" />
              <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tighter">
                AI Intelligence
              </h1>
            </div>
            <p className="text-text-muted text-base max-w-xl leading-relaxed">
              Real-time, unfiltered AI technology news directly from the community. Live updates, zero delays.
            </p>
          </div>

          {/* Stats Bar */}
          <div className="flex gap-6 bg-bg-elevated border border-border-dim p-4 rounded-2xl shadow-inner">
            {[
              { icon: <TrendingUp size={16} />, label: "Stories", value: "24+" },
              { icon: <Zap size={16} />, label: "Latency", value: "<1s" },
              { icon: <Globe size={16} />, label: "Sources", value: "Live HN" },
            ].map((s, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 text-brand-400 mb-1">
                  {s.icon}
                  <span className="text-lg font-bold">{s.value}</span>
                </div>
                <div className="text-[10px] text-text-dim uppercase tracking-widest font-bold">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ CATEGORY CHIPS ═══ */}
        <div className="flex flex-wrap gap-2 mb-12">
          {CATEGORIES.map(cat => (
            <button 
              key={cat} 
              onClick={() => setCategory(cat)} 
              className={`px-5 py-2 rounded-full text-sm font-bold cursor-pointer transition-all duration-200 border shadow-sm ${
                category === cat 
                  ? "bg-brand-500 text-bg-base border-brand-400 shadow-brand-500/20" 
                  : "bg-bg-elevated text-text-muted border-border-dim hover:border-border-strong hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ═══ CONTENT GRID ═══ */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-bg-panel border border-border-dim rounded-2xl p-6 h-48 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="h-4 bg-bg-elevated rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-bg-elevated rounded animate-pulse w-full" />
                  <div className="h-4 bg-bg-elevated rounded animate-pulse w-5/6" />
                </div>
                <div className="flex gap-2">
                  <div className="w-5 h-5 bg-bg-elevated rounded-full animate-pulse" />
                  <div className="h-4 bg-bg-elevated rounded animate-pulse w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center glass-card rounded-3xl">
            <Globe size={48} className="text-red-400 mb-6" />
            <h3 className="text-2xl font-bold text-white mb-3">Connection Lost</h3>
            <p className="text-text-muted mb-8 max-w-sm">We couldn't connect to the live feed. Please check your connection or try again.</p>
            <button 
              onClick={() => fetchNews(category)} 
              className="px-6 py-3 rounded-xl bg-white text-bg-base font-bold cursor-pointer transition-colors hover:bg-gray-200"
            >
              Try Again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center glass-card rounded-3xl">
            <Search size={48} className="text-text-dim mb-6" />
            <h3 className="text-xl font-bold text-white mb-2">No stories found</h3>
            <p className="text-text-muted">Try adjusting your search terms.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Featured Hero Card */}
            {featured && (
              <a 
                href={featured.source_url} 
                target="_blank" 
                rel="noreferrer" 
                className="group block no-underline relative bg-bg-panel border border-border-strong rounded-[2rem] p-8 sm:p-12 overflow-hidden transition-all duration-500 hover:border-brand-500/50 hover:shadow-2xl hover:shadow-brand-500/10"
              >
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/5 rounded-full blur-[100px] group-hover:bg-brand-500/10 transition-colors pointer-events-none" />
                
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-[11px] font-bold text-brand-300 uppercase tracking-widest mb-6">
                      <Flame size={12} className="text-brand-400" /> Top Story
                    </div>
                    
                    <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-white leading-tight mb-6 group-hover:text-brand-300 transition-colors">
                      {featured.title}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-8">
                    <div className="flex items-center gap-2">
                      <img src={getDomainFavicon(featured.source_url)} alt="" className="w-5 h-5 rounded-full bg-bg-elevated p-0.5" />
                      <span className="text-sm font-semibold text-text-muted">{featured.source_name}</span>
                    </div>
                    <span className="w-1 h-1 rounded-full bg-border-strong hidden sm:block" />
                    <div className="flex items-center gap-1.5 text-sm font-medium text-text-dim">
                      <Clock size={14} /> {formatTimeAgo(featured.published_at)}
                    </div>
                    <span className="w-1 h-1 rounded-full bg-border-strong hidden sm:block" />
                    <div className="flex items-center gap-1.5 text-sm font-medium text-amber-500/80">
                      <TrendingUp size={14} /> {featured.points} pts
                    </div>
                    
                    <div className="flex-1" />
                    <div className="flex items-center gap-2 text-sm font-bold text-brand-400 group-hover:translate-x-1 transition-transform">
                      Read full article <ExternalLink size={14} />
                    </div>
                  </div>
                </div>
              </a>
            )}

            {/* Sub-grid of other news */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {rest.map(item => (
                <a 
                  key={item.id} 
                  href={item.source_url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="group flex flex-col bg-bg-panel border border-border-dim hover:border-border-strong rounded-2xl p-6 no-underline transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 relative overflow-hidden"
                >
                  <div className="flex items-center gap-2.5 mb-4">
                    <img src={getDomainFavicon(item.source_url)} alt="" className="w-4 h-4 rounded-sm" />
                    <span className="text-xs font-semibold text-text-muted truncate">{item.source_name}</span>
                    <span className="text-text-dim/50 text-xs">•</span>
                    <span className="text-[11px] font-medium text-text-dim flex items-center gap-1 flex-shrink-0">
                      {formatTimeAgo(item.published_at)}
                    </span>
                  </div>
                  
                  <h3 className="text-base font-bold text-white mb-6 leading-snug group-hover:text-brand-300 transition-colors line-clamp-3">
                    {item.title}
                  </h3>
                  
                  <div className="mt-auto flex items-center justify-between border-t border-border-subtle pt-4">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-dim">
                      <TrendingUp size={12} /> {item.points}
                    </div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-brand-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Read <ExternalLink size={10} />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
