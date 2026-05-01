"use client";

import Link from "next/link";
import { ArrowLeft, Shield, ExternalLink, Heart, AlertTriangle } from "lucide-react";

const API_PROVIDERS = [
  {
    name: "OpenAI",
    desc: "GPT-4.5, GPT-4o, GPT-4o mini and more. Industry-leading language models.",
    website: "https://openai.com",
    privacy: "https://openai.com/privacy",
    terms: "https://openai.com/terms",
    color: "#74aa9c",
    logo: "OAI",
  },
  {
    name: "Anthropic",
    desc: "Claude 3.7 Sonnet, Claude 3.5 Haiku. Safety-focused AI research company.",
    website: "https://anthropic.com",
    privacy: "https://www.anthropic.com/privacy",
    terms: "https://www.anthropic.com/legal/consumer-terms",
    color: "#CC785C",
    logo: "ANT",
  },
  {
    name: "Google AI",
    desc: "Gemini 2.0 Flash, Gemini 1.5 Pro. Google's most capable multimodal models.",
    website: "https://ai.google",
    privacy: "https://ai.google/responsibility/privacy/",
    terms: "https://policies.google.com/terms",
    color: "#4285F4",
    logo: "GGL",
  },
  {
    name: "Groq",
    desc: "Llama 3.3 70B, Llama 3.1 8B via LPU™ inference — sub-50ms responses.",
    website: "https://groq.com",
    privacy: "https://groq.com/privacy-policy/",
    terms: "https://groq.com/terms-of-use/",
    color: "#F55036",
    logo: "GRQ",
  },
  {
    name: "Mistral AI",
    desc: "Mistral Large, Mistral Small. European open-weight frontier AI.",
    website: "https://mistral.ai",
    privacy: "https://mistral.ai/privacy-policy/",
    terms: "https://mistral.ai/terms-of-service/",
    color: "#FF7000",
    logo: "MST",
  },
  {
    name: "DeepSeek",
    desc: "DeepSeek R1, DeepSeek V3. Advanced reasoning and chat models.",
    website: "https://www.deepseek.com",
    privacy: "https://www.deepseek.com/en/privacy_policy",
    terms: "https://www.deepseek.com/en/terms_of_use",
    color: "#4D6BFE",
    logo: "DSK",
  },
  {
    name: "xAI (Grok)",
    desc: "Grok 2. Real-time knowledge AI by Elon Musk's xAI research lab.",
    website: "https://x.ai",
    privacy: "https://x.ai/legal/privacy-policy",
    terms: "https://x.ai/legal/terms-of-service",
    color: "#9B59B6",
    logo: "xAI",
  },
];

const INFRA_PROVIDERS = [
  {
    name: "Vercel",
    desc: "Frontend hosting and edge network for the ASTRAMIND web app.",
    website: "https://vercel.com",
    privacy: "https://vercel.com/legal/privacy-policy",
    color: "#ffffff",
    logo: "VCL",
  },
  {
    name: "Render",
    desc: "Backend API server hosting for the ASTRAMIND Python/FastAPI service.",
    website: "https://render.com",
    privacy: "https://render.com/privacy",
    color: "#46E3B7",
    logo: "RND",
  },
  {
    name: "Neon (Auth)",
    desc: "Authentication and user session management via Stack Auth on Neon.",
    website: "https://neon.tech",
    privacy: "https://neon.tech/privacy-policy",
    color: "#00E599",
    logo: "NEO",
  },
  {
    name: "DuckDuckGo",
    desc: "Real-time web search for up-to-date information (privacy-first search engine).",
    website: "https://duckduckgo.com",
    privacy: "https://duckduckgo.com/privacy",
    color: "#DE5833",
    logo: "DDG",
  },
];

function ProviderCard({
  name, desc, website, privacy, terms, color, logo,
}: {
  name: string; desc: string; website: string; privacy: string; terms?: string; color: string; logo: string;
}) {
  return (
    <div style={{
      background: "var(--surface-1)", border: "1px solid var(--border-subtle)",
      borderRadius: 16, padding: "20px 22px",
      borderLeft: `3px solid ${color}`,
      transition: "all 0.2s ease",
    }}
    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = color; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-subtle)"; (e.currentTarget as HTMLDivElement).style.transform = ""; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: `${color}20`, border: `1px solid ${color}40`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 800, color, letterSpacing: "0.05em",
          fontFamily: "monospace",
        }}>
          {logo}
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 3 }}>{name}</h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55 }}>{desc}</p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
        <a href={website} target="_blank" rel="noopener noreferrer" style={{
          display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
          color: color, textDecoration: "none", padding: "4px 10px", borderRadius: 8,
          background: `${color}10`, border: `1px solid ${color}20`, transition: "all 0.15s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = `${color}20`; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = `${color}10`; }}
        >
          <ExternalLink size={11} /> Website
        </a>
        <a href={privacy} target="_blank" rel="noopener noreferrer" style={{
          display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
          color: "var(--text-secondary)", textDecoration: "none", padding: "4px 10px", borderRadius: 8,
          background: "var(--surface-3)", border: "1px solid var(--border-subtle)", transition: "all 0.15s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-primary)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-secondary)"; }}
        >
          <Shield size={11} /> Privacy Policy
        </a>
        {terms && (
          <a href={terms} target="_blank" rel="noopener noreferrer" style={{
            display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
            color: "var(--text-secondary)", textDecoration: "none", padding: "4px 10px", borderRadius: 8,
            background: "var(--surface-3)", border: "1px solid var(--border-subtle)", transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-primary)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-secondary)"; }}
          >
            <ExternalLink size={11} /> Terms
          </a>
        )}
      </div>
    </div>
  );
}

export default function DisclaimerPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", fontFamily: "var(--font-dm,'DM Sans'),sans-serif" }}>

      {/* Top accent */}
      <div style={{ height: 2, background: "linear-gradient(90deg, transparent, var(--brand), var(--accent), transparent)" }} />

      {/* Nav */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(12,12,14,0.88)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border-subtle)", padding: "0 24px", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 14, fontWeight: 500, padding: "6px 12px", borderRadius: 10, transition: "all 0.15s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--surface-2)"; (e.currentTarget as HTMLDivElement).style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; (e.currentTarget as HTMLDivElement).style.color = "var(--text-muted)"; }}
          >
            <ArrowLeft style={{ width: 15, height: 15 }} /> Back to Home
          </div>
        </Link>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          API Disclaimer
        </span>
        <Link href="/chat" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--brand-light)", padding: "6px 12px", borderRadius: 10, background: "var(--brand-glow)", border: "1px solid rgba(212,118,59,0.2)" }}>
            Open Chat
          </div>
        </Link>
      </header>

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "72px 24px 56px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 18px", borderRadius: 100, marginBottom: 24, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", fontSize: 12, fontWeight: 700, color: "#F59E0B", letterSpacing: "0.06em" }}>
          <AlertTriangle size={13} /> TRANSPARENCY NOTICE
        </div>
        <h1 style={{ fontSize: "clamp(2rem,5vw,3rem)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16, fontFamily: "var(--font-syne,'Syne'),sans-serif" }}>
          API & Service Disclaimer
        </h1>
        <p style={{ fontSize: 17, color: "var(--text-secondary)", maxWidth: 620, margin: "0 auto", lineHeight: 1.7 }}>
          ASTRAMIND is an AI <strong style={{ color: "var(--text-primary)" }}>orchestration layer</strong> — we route your prompts to third-party AI providers.
          Here&apos;s exactly who powers our platform and how your data flows.
        </p>
      </section>

      <main style={{ maxWidth: 820, margin: "0 auto", padding: "0 24px 80px" }}>

        {/* What we are */}
        <div style={{ background: "linear-gradient(135deg, rgba(212,118,59,0.08), rgba(139,122,252,0.06))", border: "1px solid rgba(212,118,59,0.2)", borderRadius: 20, padding: "28px 32px", marginBottom: 56 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: "var(--text-primary)" }}>What ASTRAMIND Is (and Isn&apos;t)</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "✅ We ARE an intelligent routing layer that sends your prompts to best-fit AI models.",
              "✅ We ARE building smart features on top of these APIs (search, history, streaming).",
              "❌ We do NOT own, train, or host any AI language models ourselves.",
              "❌ We do NOT sell your conversation data or personal information.",
              "⚠️ Your prompts ARE forwarded to third-party APIs — each has their own data policies.",
            ].map((item) => (
              <p key={item} style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>{item}</p>
            ))}
          </div>
        </div>

        {/* AI Providers */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 8, fontFamily: "var(--font-syne,'Syne'),sans-serif" }}>
              AI Model Providers
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              When you select a model and send a message, your prompt is forwarded to that provider&apos;s API.
              Review each provider&apos;s privacy policy to understand how they handle prompt data.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {API_PROVIDERS.map((p) => <ProviderCard key={p.name} {...p} />)}
          </div>
        </div>

        {/* Infrastructure */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 8, fontFamily: "var(--font-syne,'Syne'),sans-serif" }}>
              Infrastructure & Services
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              ASTRAMIND relies on the following services to operate the platform securely and reliably.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {INFRA_PROVIDERS.map((p) => <ProviderCard key={p.name} {...p} />)}
          </div>
        </div>

        {/* AI Accuracy */}
        <div style={{ background: "rgba(245,100,90,0.06)", border: "1px solid rgba(245,100,90,0.2)", borderRadius: 20, padding: "28px 32px", marginBottom: 56 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: "var(--text-primary)" }}>⚠️ AI Accuracy & Liability</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              "AI responses can be incorrect, outdated, or misleading. Always verify critical information from authoritative sources.",
              "ASTRAMIND is not liable for decisions made based on AI-generated content.",
              "Do not input sensitive personal, financial, or medical data into the chat interface.",
              "Web search results are sourced from DuckDuckGo and may not be complete or current.",
            ].map((item) => (
              <p key={item} style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>• {item}</p>
            ))}
          </div>
        </div>

        {/* Support section */}
        <div style={{ background: "linear-gradient(135deg, rgba(212,118,59,0.1), rgba(139,122,252,0.08))", border: "1px solid rgba(212,118,59,0.25)", borderRadius: 20, padding: "36px 32px", textAlign: "center" }}>
          <Heart size={32} style={{ color: "var(--brand-light)", margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 12 }}>Help Us Self-Host Our Own Models</h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 520, margin: "0 auto 24px" }}>
            Currently, we pay API costs out of pocket so you can use ASTRAMIND for free.
            Your support helps us eventually self-host open-source models — giving you faster, private, uncensored AI with no rate limits.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="https://ko-fi.com" target="_blank" rel="noopener noreferrer" style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 12,
              background: "linear-gradient(135deg, var(--brand), var(--brand-light))", color: "var(--bg-primary)",
              fontWeight: 700, fontSize: 14, textDecoration: "none", boxShadow: "0 4px 16px var(--brand-glow)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.transform = ""; }}
            >
              ☕ Support on Ko-fi
            </a>
            <Link href="/chat" style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 12,
              background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border-default)",
              fontWeight: 600, fontSize: 14, textDecoration: "none", transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-secondary)"; }}
            >
              Continue for Free
            </Link>
          </div>
        </div>

        {/* Footer note */}
        <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)", marginTop: 40, lineHeight: 1.6 }}>
          For privacy questions:{" "}
          <a href="mailto:privacy@astramind.ai" style={{ color: "var(--brand-light)", textDecoration: "none", fontWeight: 600 }}>privacy@astramind.ai</a>
          {" · "}
          <Link href="/privacy" style={{ color: "var(--brand-light)", textDecoration: "none", fontWeight: 600 }}>Privacy Policy</Link>
          {" · "}
          Last updated: May 2026
        </p>
      </main>
    </div>
  );
}
