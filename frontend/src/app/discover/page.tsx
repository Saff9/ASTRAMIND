"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Compass, Clock, Search, ExternalLink, RefreshCw, TrendingUp, Zap, Brain, Globe } from "lucide-react";
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

const CATEGORIES = ["All", "Models", "Research", "Tools", "Companies"];

const CATEGORY_QUERIES: Record<string, string> = {
  All: "",
  Models: "language model",
  Research: "research paper",
  Tools: "AI tool developer",
  Companies: "OpenAI Anthropic Google Meta",
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export default function DiscoverPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [error, setError] = useState(false);
  const [source, setSource] = useState<"live" | "fallback">("live");

  const fetchNews = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(false);

    try {
      const res = await fetch(`${API_BASE}/api/v1/discover/feed`, {
        cache: "no-store",
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      if (data?.items?.length > 0) {
        setNews(data.items);
        setSource(data.source === "fallback" ? "fallback" : "live");
      } else {
        setError(true);
      }
    } catch (err) {
      console.warn("Discover fetch failed:", err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchNews(); }, [fetchNews]);

  // Filter news
  const filtered = news.filter(item => {
    const matchSearch = !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.summary?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "All" ||
      item.title.toLowerCase().includes(CATEGORY_QUERIES[category]?.toLowerCase() || "") ||
      item.summary?.toLowerCase().includes(CATEGORY_QUERIES[category]?.toLowerCase() || "");
    return matchSearch && matchCategory;
  });

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)" }}>

      {/* ═══ STICKY HEADER ═══ */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(12,12,14,0.88)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border-subtle)", padding: "0 24px",
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", height: 60, display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/chat">
            <button style={{
              padding: "7px 14px", borderRadius: 10, background: "var(--surface-2)",
              border: "1px solid var(--border-default)", color: "var(--text-secondary)",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13,
              fontWeight: 500, transition: "all 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}>
              <ArrowLeft size={14} /> Back
            </button>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,var(--brand),var(--brand-light))", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AstraIcon size={17} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em" }}>Discover</span>
            {source === "live" && (
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 100, background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>
                ● LIVE
              </span>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* Search */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "var(--surface-2)", padding: "7px 14px",
            borderRadius: 100, border: "1px solid var(--border-subtle)", width: 240,
            transition: "border-color 0.2s",
          }}>
            <Search size={13} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search AI news..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ background: "transparent", border: "none", color: "var(--text-primary)", fontSize: 13, outline: "none", width: "100%" }}
            />
          </div>

          <button onClick={() => fetchNews(true)} disabled={refreshing} style={{
            padding: "7px 14px", borderRadius: 10, background: "var(--surface-2)",
            border: "1px solid var(--border-default)", color: "var(--text-secondary)",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13,
            transition: "all 0.2s", opacity: refreshing ? 0.5 : 1,
          }}>
            <RefreshCw size={13} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
        </div>
      </header>

      {/* ═══ HERO ═══ */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 24px 32px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Compass size={28} color="var(--brand-light)" />
              <h1 style={{ fontSize: "2.4rem", fontWeight: 900, fontFamily: "var(--font-syne, Syne), sans-serif", letterSpacing: "-0.04em" }}>
                AI Intelligence Feed
              </h1>
            </div>
            <p style={{ fontSize: 15, color: "var(--text-secondary)", maxWidth: 560, lineHeight: 1.6 }}>
              Live AI & tech news curated by AstraMind — updated every 30 minutes from across the web.
            </p>
          </div>

          {/* Stats bar */}
          <div style={{ display: "flex", gap: 20 }}>
            {[
              { icon: <TrendingUp size={14} />, label: "Stories", value: filtered.length.toString() },
              { icon: <Zap size={14} />, label: "Updated", value: "30m" },
              { icon: <Globe size={14} />, label: "Sources", value: "Live" },
              { icon: <Brain size={14} />, label: "AI Focus", value: "100%" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--brand-light)", justifyContent: "center", marginBottom: 2 }}>
                  {s.icon}
                  <span style={{ fontSize: 16, fontWeight: 800 }}>{s.value}</span>
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Category chips */}
        <div style={{ display: "flex", gap: 8, marginTop: 28, flexWrap: "wrap" }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} style={{
              padding: "6px 16px", borderRadius: 100, fontSize: 13, fontWeight: 600,
              cursor: "pointer", transition: "all 0.2s", border: "1px solid",
              borderColor: category === cat ? "var(--brand)" : "var(--border-subtle)",
              background: category === cat ? "rgba(242,169,59,0.15)" : "var(--surface-1)",
              color: category === cat ? "var(--brand-light)" : "var(--text-secondary)",
            }}>
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* ═══ CONTENT ═══ */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 80px" }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)", borderRadius: 20, overflow: "hidden" }}>
                <div style={{ height: 180, background: "var(--surface-2)", animation: "pulse 1.5s ease-in-out infinite" }} />
                <div style={{ padding: 20 }}>
                  <div style={{ height: 12, background: "var(--surface-2)", borderRadius: 6, marginBottom: 12, width: "60%", animation: "pulse 1.5s ease-in-out infinite" }} />
                  <div style={{ height: 18, background: "var(--surface-2)", borderRadius: 6, marginBottom: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
                  <div style={{ height: 14, background: "var(--surface-2)", borderRadius: 6, width: "80%", animation: "pulse 1.5s ease-in-out infinite" }} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 8 }}>Unable to Load Live News</h3>
            <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>Backend may be offline. Try again later.</p>
            <button onClick={() => fetchNews()} style={{ padding: "10px 24px", borderRadius: 12, background: "linear-gradient(135deg,var(--brand),var(--brand-light))", color: "#1a1410", fontWeight: 700, fontSize: 14, cursor: "pointer", border: "none" }}>
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
            <p>No stories match your search.</p>
          </div>
        ) : (
          <>
            {/* Featured Card */}
            {featured && (
              <a href={featured.source_url} target="_blank" rel="noreferrer" style={{ display: "block", textDecoration: "none", marginBottom: 28 }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 0,
                  background: "var(--surface-1)", border: "1px solid var(--border-subtle)",
                  borderRadius: 24, overflow: "hidden", transition: "all 0.3s ease",
                  minHeight: 300,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--brand)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 16px 50px rgba(0,0,0,0.4)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-subtle)"; (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
                  <div style={{
                    background: `url(${featured.image_url}) center/cover no-repeat`,
                    backgroundColor: "var(--surface-2)", minHeight: 300,
                  }} />
                  <div style={{ padding: 40, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", padding: "4px 10px", borderRadius: 100, background: "rgba(242,169,59,0.15)", color: "var(--brand-light)", border: "1px solid rgba(242,169,59,0.3)" }}>
                        ⭐ Featured
                      </span>
                      <h2 style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.02em", marginTop: 16, marginBottom: 12, lineHeight: 1.3 }}>{featured.title}</h2>
                      <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.65 }}>{featured.summary}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 24 }}>
                      {featured.source_url && <img src={getDomainFavicon(featured.source_url)} style={{ width: 16, height: 16, borderRadius: "50%" }} alt="" />}
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{featured.source_name}</span>
                      <span style={{ color: "var(--border-strong)" }}>•</span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={11} /> {formatTimeAgo(featured.published_at)}
                      </span>
                      <div style={{ flex: 1 }} />
                      <span style={{ color: "var(--brand-light)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                        Read <ExternalLink size={12} />
                      </span>
                    </div>
                  </div>
                </div>
              </a>
            )}

            {/* Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 20 }}>
              {rest.map(item => (
                <a href={item.source_url} target="_blank" rel="noreferrer" key={item.id}
                  style={{ display: "flex", flexDirection: "column", background: "var(--surface-1)", border: "1px solid var(--border-subtle)", borderRadius: 20, overflow: "hidden", textDecoration: "none", transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.boxShadow = "0 12px 30px rgba(0,0,0,0.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.boxShadow = "none"; }}>
                  <div style={{
                    height: 170, width: "100%",
                    background: `url(${item.image_url}) center/cover no-repeat`,
                    backgroundColor: "var(--surface-2)",
                    borderBottom: "1px solid var(--border-subtle)",
                  }} />
                  <div style={{ padding: 20, display: "flex", flexDirection: "column", flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      {item.source_url && <img src={getDomainFavicon(item.source_url)} style={{ width: 14, height: 14, borderRadius: "50%" }} alt="" />}
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{item.source_name}</span>
                      <span style={{ fontSize: 12, color: "var(--border-strong)" }}>•</span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
                        <Clock size={11} /> {formatTimeAgo(item.published_at)}
                      </span>
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8, lineHeight: 1.35, letterSpacing: "-0.01em" }}>{item.title}</h3>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, flex: 1, marginBottom: 14 }}>{item.summary}</p>
                    <div style={{ display: "flex", alignItems: "center", color: "var(--brand-light)", fontSize: 13, fontWeight: 600, gap: 4 }}>
                      Read article <ExternalLink size={12} />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Keyframes moved to globals.css */}
    </div>
  );
}
