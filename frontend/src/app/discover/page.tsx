"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Compass, Clock, Search, ExternalLink } from "lucide-react";
import { AstraIcon } from "@/components/common/ProviderIcons";

interface NewsItem {
  id: number;
  title: string;
  summary: string;
  source_name: string;
  source_url: string;
  image_url: string | null;
  published_at: string;
}

export default function DiscoverPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In production, fetch from /api/v1/discover/feed
    // For now, if the backend isn't up, we fallback to mock data
    fetch("http://localhost:8000/api/v1/discover/feed", {
      headers: { "Authorization": "Bearer mock-token-123" }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.items && data.items.length > 0) {
          setNews(data.items);
        } else {
          // Fallback mocked data if scraping failed
          setNews(getMockNews());
        }
        setLoading(false);
      })
      .catch((err) => {
        console.log("Discover backend sync failed, using fallback UI", err);
        setNews(getMockNews());
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      
      {/* HEADER */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(26,22,18,0.85)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border-subtle)", padding: "12px 24px"
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link href="/chat">
              <button style={{
                padding: "8px 12px", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border-default)",
                color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}>
                <ArrowLeft size={16} /> Chat
              </button>
            </Link>
            
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,var(--brand),var(--brand-light))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AstraIcon size={16} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em" }}>Discover</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, background: "var(--surface-2)",
              padding: "6px 14px", borderRadius: 100, border: "1px solid var(--border-subtle)",
              width: 260
            }}>
              <Search size={14} color="var(--text-muted)" />
              <input 
                type="text" 
                placeholder="Search topics..." 
                style={{ background: "transparent", border: "none", color: "var(--text-primary)", fontSize: 13, outline: "none", width: "100%" }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 24px 40px", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <Compass size={32} color="var(--brand-light)" />
          <h1 style={{ fontSize: "2.8rem", fontWeight: 800, fontFamily: "var(--font-syne, 'Syne'), sans-serif", letterSpacing: "-0.03em" }}>
            Top Stories
          </h1>
        </div>
        <p style={{ fontSize: 16, color: "var(--text-secondary)", maxWidth: 600 }}>
          The latest advancements in AI, machine learning, and tech infrastructure, curated by ASTRAMIND.
        </p>
      </section>

      {/* GRID */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 80px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 100 }}>
             <p style={{ color: "var(--text-muted)", fontSize: 15 }}>Loading latest feed...</p>
          </div>
        ) : (
          <div style={{
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", 
            gap: 24 
          }}>
            {news.map((item) => (
              <a 
                href={item.source_url} 
                target="_blank" 
                rel="noreferrer"
                key={item.id} 
                style={{
                  display: "flex", flexDirection: "column",
                  background: "var(--surface-1)", border: "1px solid var(--border-subtle)",
                  borderRadius: 20, overflow: "hidden", textDecoration: "none",
                  transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                }}
                onMouseEnter={(e) => { 
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.borderColor = "var(--border-strong)";
                  e.currentTarget.style.boxShadow = "0 12px 30px rgba(0,0,0,0.3)";
                }}
                onMouseLeave={(e) => { 
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Cover Image */}
                <div style={{ 
                  height: 180, width: "100%", 
                  background: `url(${item.image_url}) center/cover no-repeat`,
                  backgroundColor: "var(--surface-2)",
                  borderBottom: "1px solid var(--border-subtle)"
                }} />
                
                {/* Content */}
                <div style={{ padding: 20, display: "flex", flexDirection: "column", flex: 1 }}>
                  {/* Meta tag */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={`https://www.google.com/s2/favicons?domain=${new URL(item.source_url).hostname}&sz=32`} 
                      style={{ width: 14, height: 14, borderRadius: "50%" }} 
                      alt="" 
                    />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{item.source_name}</span>
                    <span style={{ fontSize: 12, color: "var(--border-strong)" }}>•</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={12} /> {formatTimeAgo(item.published_at)}
                    </span>
                  </div>
                  
                  {/* Title & Summary */}
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8, lineHeight: 1.35, letterSpacing: "-0.01em" }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, flex: 1, marginBottom: 16 }}>
                    {item.summary}
                  </p>

                  <div style={{ display: "flex", alignItems: "center", color: "var(--brand-light)", fontSize: 13, fontWeight: 600, gap: 4 }}>
                    Read article <ExternalLink size={14} />
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────
function formatTimeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getMockNews(): NewsItem[] {
  return [
    {
      id: 1,
      title: "Anthropic releases Claude 3.5 Haiku, beating GPT-4o Mini in latency",
      summary: "The latest highly efficient model from Anthropic achieves sub-second TTFT while retaining impressive coding capabilities.",
      source_name: "TechWeekly",
      source_url: "https://anthropic.com",
      image_url: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=80",
      published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 2,
      title: "DeepSeek-V3 Open Source Model Challenges Proprietary Giants",
      summary: "A new MoE model offers compelling performance on math and reasoning benchmarks, reshaping the competitive landscape.",
      source_name: "AI Insights",
      source_url: "https://deepseek.com",
      image_url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80",
      published_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 3,
      title: "OpenAI Previews 'o1' Reasoning Protocol",
      summary: "New paradigm allows models to 'think' systematically before generating output, massively reducing logical hallucination.",
      source_name: "The Verge AI",
      source_url: "https://openai.com",
      image_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=600&q=80",
      published_at: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 4,
      title: "Next.js 15 Introduced with Experimental React Native Port",
      summary: "Vercel pushes boundaries by allowing universal App Router across web, iOS, and Android seamlessly.",
      source_name: "Vercel Blog",
      source_url: "https://nextjs.org",
      image_url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80",
      published_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    }
  ];
}
