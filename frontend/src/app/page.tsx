"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap, Shield, GitBranch, Globe,
  Sparkles, ArrowRight, Code2, Search, Lightbulb, MessageSquare, ChevronRight,
} from "lucide-react";
import { GroqLogoIcon, OpenAIIcon, ClaudeIcon, GeminiIcon, DeepSeekIcon, MistralIcon } from "@/components/common/ProviderIcons";
import { AstraIcon } from "@/components/common/ProviderIcons";
import { neonAuthClient } from "@/lib/auth-client";

const PROMPTS = [
  "Explain quantum entanglement simply",
  "Write a Python web scraper",
  "Analyze the French Revolution",
  "Debug my async/await code",
  "Summarize this research paper",
];

const PROVIDERS = [
  { name: "Groq",     ms: "45ms",   color: "#F55036", Icon: GroqLogoIcon },
  { name: "Gemini",   ms: "310ms",  color: "#4285F4", Icon: GeminiIcon },
  { name: "Claude",   ms: "890ms",  color: "#CC785C", Icon: ClaudeIcon },
  { name: "DeepSeek", ms: "520ms",  color: "#4D6BFE", Icon: DeepSeekIcon },
  { name: "Mistral",  ms: "280ms",  color: "#F7431C", Icon: MistralIcon },
  { name: "OpenAI",   ms: "680ms",  color: "#74aa9c", Icon: OpenAIIcon },
];

const FEATURES = [
  { icon: <Zap className="w-5 h-5" />,      title: "Sub-50ms responses",      desc: "Groq's LPU delivers lightning responses. Smart routing picks the fastest available provider." },
  { icon: <GitBranch className="w-5 h-5" />, title: "Multi-provider fallback",  desc: "Never go down. Circuit breakers automatically reroute to secondary providers." },
  { icon: <Shield className="w-5 h-5" />,   title: "Zero-trust security",      desc: "JWT auth, prompt injection detection, content filtering, and rate limiting baked in." },
  { icon: <Globe className="w-5 h-5" />,    title: "Web-augmented answers",   desc: "Real-time web search for up-to-date answers. No more knowledge cutoffs." },
];

const SUGGESTIONS = [
  { icon: <Code2 className="w-4 h-4" />,       label: "Write code" },
  { icon: <Search className="w-4 h-4" />,       label: "Search the web" },
  { icon: <Lightbulb className="w-4 h-4" />,    label: "Brainstorm ideas" },
  { icon: <MessageSquare className="w-4 h-4" />, label: "Answer questions" },
];

const PAGE_FONT = "var(--font-dm, 'DM Sans'), system-ui, sans-serif";
const DISPLAY_FONT = "var(--font-syne, 'Syne'), system-ui, sans-serif";

export default function HomePage() {
  const [session, setSession] = useState<{ user?: { email?: string } } | null>(undefined as any);
  const isSignedIn = !!session?.user;
  const status = session === undefined ? "loading" : session === null ? "unauthenticated" : "authenticated";
  const [mounted, setMounted] = useState(false);
  const [promptIdx, setPromptIdx] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [typing, setTyping] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function check() {
      const { data } = await neonAuthClient.getSession();
      setSession(data ? { user: { email: data.user.email } } : null);
      if (data) {
        router.push("/chat");
      }
    }
    check();
  }, [router]);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const full = PROMPTS[promptIdx];
    let i = 0;
    setTyping(true);
    setDisplayText("");
    const timer = setInterval(() => {
      if (i <= full.length) {
        setDisplayText(full.slice(0, i));
        i++;
      } else {
        clearInterval(timer);
        setTyping(false);
        setTimeout(() => setPromptIdx((p) => (p + 1) % PROMPTS.length), 2200);
      }
    }, 45);
    return () => clearInterval(timer);
  }, [promptIdx]);

  return (
    <div style={{ background: "var(--bg-primary)", color: "var(--text-primary)", minHeight: "100vh", overflowX: "hidden" }}>

      {/* Decorative glow orbs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }} aria-hidden>
        <div style={{ position: "absolute", top: "-200px", left: "50%", transform: "translateX(-50%)", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,118,59,0.12) 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div style={{ position: "absolute", bottom: 0, right: "-100px", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(32,178,170,0.08) 0%, transparent 70%)", filter: "blur(80px)" }} />
      </div>

      {/* ═══ NAV ═══ */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: scrolled ? "rgba(26,22,18,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(24px)" : "none",
        borderBottom: scrolled ? "1px solid var(--border-subtle)" : "1px solid transparent",
        transition: "all 0.3s ease",
      }}>
        {scrolled && <div className="top-highlight" />}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg,var(--brand),var(--brand-light))",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 12px var(--brand-glow)",
            }}>
              <AstraIcon size={20} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>ASTRAMIND</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {!isSignedIn ? (
              <>
                <button onClick={() => router.push("/signin")} style={{
                  background: "transparent", border: "1px solid var(--border-default)",
                  color: "var(--text-secondary)", padding: "8px 18px", borderRadius: 10,
                  fontSize: 14, fontWeight: 500, cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
                  Sign in
                </button>
                <button onClick={() => router.push("/signin")} style={{
                  background: "linear-gradient(135deg,var(--brand),var(--brand-light))",
                  color: "var(--bg-primary)", padding: "8px 20px", borderRadius: 10,
                  fontSize: 14, fontWeight: 600, cursor: "pointer", border: "none",
                  display: "flex", alignItems: "center", gap: 6,
                  boxShadow: "0 2px 10px var(--brand-glow)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 18px var(--brand-glow)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ""; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 10px var(--brand-glow)"; }}>
                  Try free <ArrowRight style={{ width: 14, height: 14 }} />
                </button>
              </>
            ) : (
              <>
                <button onClick={async () => { await neonAuthClient.signOut(); setSession(null); }} style={{
                  background: "transparent", border: "1px solid var(--border-default)",
                  color: "var(--text-secondary)", padding: "6px 14px", borderRadius: 10,
                  fontSize: 13, fontWeight: 500, cursor: "pointer",
                }}>
                  Sign out
                </button>
                <Link href="/chat">
                  <button style={{
                    background: "linear-gradient(135deg,var(--brand),var(--brand-light))",
                    color: "var(--bg-primary)", padding: "8px 20px", borderRadius: 10,
                    marginLeft: 12,
                    fontSize: 14, fontWeight: 600, cursor: "pointer", border: "none",
                    display: "flex", alignItems: "center", gap: 6,
                    boxShadow: "0 2px 10px var(--brand-glow)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 18px var(--brand-glow)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ""; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 10px var(--brand-glow)"; }}>
                    Open Chat <ArrowRight style={{ width: 14, height: 14 }} />
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section style={{ maxWidth: 860, margin: "0 auto", padding: "80px 24px 60px", textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)", transition: "all 0.7s cubic-bezier(0.16,1,0.3,1)" }}>

          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 32,
            background: "rgba(212,118,59,0.12)", border: "1px solid rgba(212,118,59,0.25)",
            borderRadius: 100, padding: "5px 16px",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--brand-light)", display: "inline-block" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--brand-light)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              10+ AI Providers · Always On
            </span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: "clamp(2.8rem,6vw,4.5rem)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: 20, fontFamily: DISPLAY_FONT }}>
            <span style={{ display: "block", color: "var(--text-primary)" }}>Ask anything.</span>
            <span style={{ display: "block", background: "linear-gradient(135deg,var(--brand) 0%,var(--brand-light) 50%,#ffd080 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Get smarter answers.
            </span>
          </h1>

          <p style={{ fontSize: "clamp(1rem,2vw,1.2rem)", color: "var(--text-secondary)", lineHeight: 1.65, maxWidth: 600, margin: "0 auto 48px", fontFamily: PAGE_FONT }}>
            ASTRAMIND routes your prompts to the best AI — Groq, Claude, Gemini, DeepSeek and more —
            with fallback protection, web search, and enterprise-grade security.
          </p>

          {/* ─ Typewriter card ─ */}
          <div style={{
            maxWidth: 640, margin: "0 auto 40px",
            background: "var(--surface-2)", border: "1.5px solid var(--border-default)",
            borderRadius: 20, padding: "20px 24px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
            textAlign: "left",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg,var(--brand),var(--brand-light))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <AstraIcon size={14} />
              </div>
              <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>Try asking…</span>
            </div>
            <p style={{ fontSize: "1.15rem", fontWeight: 500, color: "var(--text-primary)", minHeight: "1.8rem", lineHeight: 1.4 }}>
              {displayText}
              <span style={{
                display: "inline-block", width: 2, height: "1.1em", marginLeft: 2,
                background: "var(--brand)", verticalAlign: "middle",
                animation: typing ? "cursor-blink 1s step-end infinite" : "none",
                opacity: typing ? 1 : 0,
              }} />
            </p>

            {/* Suggestion chips — inside card, separated */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-subtle)" }}>
              {SUGGESTIONS.map((s) => (
                <Link key={s.label} href="/chat">
                  <button style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 14px", borderRadius: 8, fontSize: 13,
                    background: "var(--surface-3)", color: "var(--text-secondary)",
                    border: "1px solid var(--border-subtle)", cursor: "pointer",
                    transition: "all 0.2s ease", whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--brand)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--brand-glow)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-subtle)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-3)"; }}>
                    {s.icon} {s.label}
                  </button>
                </Link>
              ))}
            </div>
          </div>

          {/* CTA Buttons */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", alignItems: "center", marginBottom: 12 }}>
            <Link href="/chat">
              <button style={{
                background: "linear-gradient(135deg,var(--brand),var(--brand-light))",
                color: "var(--bg-primary)", padding: "14px 36px", borderRadius: 14,
                fontSize: 16, fontWeight: 700, cursor: "pointer", border: "none",
                display: "flex", alignItems: "center", gap: 8,
                boxShadow: "0 4px 24px var(--brand-glow), 0 8px 40px rgba(0,0,0,0.3)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 32px var(--brand-glow)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ""; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 24px var(--brand-glow), 0 8px 40px rgba(0,0,0,0.3)"; }}>
                <Sparkles style={{ width: 18, height: 18 }} />
                Start for free
              </button>
            </Link>
            <Link href="#features">
              <button style={{
                background: "transparent", border: "1px solid var(--border-strong)",
                color: "var(--text-secondary)", padding: "14px 28px", borderRadius: 14,
                fontSize: 16, fontWeight: 500, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
                See how it works <ChevronRight style={{ width: 16, height: 16 }} />
              </button>
            </Link>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No credit card required · Free quota daily · Enterprise plans available</p>
        </div>
      </section>

      {/* ═══ PROVIDER BAR ═══ */}
      <section style={{ padding: "48px 24px", position: "relative", zIndex: 1, display: "flex", justifyContent: "center" }}>
        <div style={{ 
          maxWidth: 900, width: "100%", padding: "32px 40px",
          background: "rgba(255, 255, 255, 0.02)",
          backdropFilter: "blur(20px)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 32,
          boxShadow: "0 12px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)"
        }}>
          <p style={{ textAlign: "center", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 36 }}>
            Routing across the world&apos;s best AI models
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 16 }}>
            {PROVIDERS.map((p) => {
              const Icon = p.Icon;
              return (
                <div key={p.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: `${p.color}15`,
                    border: `1px solid ${p.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: `0 4px 20px ${p.color}10`,
                    transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                  }}
                  onMouseEnter={(e) => { 
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; 
                    (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 30px ${p.color}40`;
                  }}
                  onMouseLeave={(e) => { 
                    (e.currentTarget as HTMLDivElement).style.transform = ""; 
                    (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 20px ${p.color}10`;
                  }}>
                    <Icon size={30} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{p.name}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100,
                    background: `${p.color}15`, color: p.color, border: `1px solid ${p.color}25`,
                  }}>{p.ms}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" style={{ maxWidth: 960, margin: "0 auto", padding: "64px 24px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 12, fontFamily: DISPLAY_FONT }}>
            Built for reliability at scale
          </h2>
          <p style={{ fontSize: "1.05rem", color: "var(--text-secondary)", maxWidth: 520, margin: "0 auto", fontFamily: PAGE_FONT }}>
            Not just another chat wrapper — a production-grade AI orchestration platform
          </p>
        </div>

        <div className="mobile-col" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              background: "var(--surface-1)", border: "1px solid var(--border-subtle)",
              borderRadius: 20, padding: "32px",
              transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
              cursor: "default",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--brand)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(212,118,59,0.2)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-subtle)"; (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: "var(--brand-glow)", color: "var(--brand-light)",
                border: "1px solid rgba(212,118,59,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 20,
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 8, color: "var(--text-primary)" }}>{f.title}</h3>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section style={{ borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)", background: "var(--surface-1)", padding: "60px 24px", position: "relative", zIndex: 1 }}>
        <div className="mobile-grid-1" style={{ maxWidth: 800, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 32, textAlign: "center" }}>
          {[
            { value: "10+", label: "AI providers" },
            { value: "500+", label: "Tokens/sec" },
            { value: "<50ms", label: "P50 latency" },
            { value: "99.9%", label: "Uptime SLA" },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: "2.2rem", fontWeight: 800, background: "linear-gradient(135deg,var(--brand),var(--brand-light))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", letterSpacing: "-0.03em" }}>
                {s.value}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section style={{ maxWidth: 640, margin: "0 auto", padding: "100px 24px", textAlign: "center", position: "relative", zIndex: 1 }}>
          <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 16, fontFamily: "Syne, sans-serif" }}>
            Ready to think{" "}
            <span style={{ background: "linear-gradient(135deg,var(--brand),var(--brand-light),#ffd080)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              beyond limits
            </span>?
        </h2>
        <p style={{ fontSize: "1.05rem", color: "var(--text-secondary)", marginBottom: 36 }}>
          Join thousands of developers and power users who&apos;ve upgraded their AI experience.
        </p>
        <Link href="/chat">
          <button style={{
            background: "linear-gradient(135deg,var(--brand),var(--brand-light))",
            color: "var(--bg-primary)", padding: "16px 44px", borderRadius: 16,
            fontSize: 16, fontWeight: 700, cursor: "pointer", border: "none",
            display: "inline-flex", alignItems: "center", gap: 8,
            boxShadow: "0 4px 24px var(--brand-glow), 0 16px 48px rgba(0,0,0,0.4)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ""; }}>
            <Sparkles style={{ width: 18, height: 18 }} />
            Start chatting now — it&apos;s free
          </button>
        </Link>
      </section>

      {/* ═══ UPGRADED FOOTER ═══ */}
      <footer style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--bg-primary)", padding: "64px 24px 32px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          
          <div className="mobile-col" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.5fr", gap: 48, marginBottom: 48 }}>
            
            {/* Branding Column */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,var(--brand),var(--brand-light))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AstraIcon size={20} />
                </div>
                <span style={{ fontWeight: 800, fontSize: 18, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>ASTRAMIND</span>
              </div>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 280 }}>
                The world&apos;s fastest AI orchestration layer. Enterprise-grade reasoning without the wait.
              </p>
            </div>

            {/* Links Columns */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>Product</h4>
              <Link href="/chat" style={{ fontSize: 14, color: "var(--text-secondary)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = "var(--brand-light)"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}>Chat Engine</Link>
              <Link href="/discover" style={{ fontSize: 14, color: "var(--text-secondary)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = "var(--brand-light)"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}>Discover <span style={{fontSize: 10, padding: "2px 6px", background: "var(--brand-glow)", color: "var(--brand-light)", borderRadius: 100, marginLeft: 6}}>NEW</span></Link>
              <Link href="/pricing" style={{ fontSize: 14, color: "var(--text-secondary)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = "var(--brand-light)"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}>Pricing</Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>Resources</h4>
              <Link href="#features" style={{ fontSize: 14, color: "var(--text-secondary)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = "var(--brand-light)"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}>Documentation</Link>
              <Link href="/privacy" style={{ fontSize: 14, color: "var(--text-secondary)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = "var(--brand-light)"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}>Privacy Policy</Link>
              <Link href="/terms" style={{ fontSize: 14, color: "var(--text-secondary)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = "var(--brand-light)"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}>Terms of Service</Link>
            </div>

            {/* Newsletter Column */}
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>Stay updated</h4>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>Get the latest AI updates and product news.</p>
              <div style={{ display: "flex", gap: 8 }}>
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  style={{
                    flex: 1, padding: "10px 14px", borderRadius: 12, border: "1px solid var(--border-default)",
                    background: "var(--surface-1)", color: "var(--text-primary)", fontSize: 13, outline: "none",
                    transition: "border-color 0.2s ease"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "var(--brand)"}
                  onBlur={(e) => e.target.style.borderColor = "var(--border-default)"}
                />
                <button style={{
                  background: "var(--surface-3)", color: "var(--text-primary)", border: "1px solid var(--border-strong)",
                  padding: "0 16px", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--text-primary)"; e.currentTarget.style.color = "var(--bg-primary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface-3)"; e.currentTarget.style.color = "var(--text-primary)"; }}>
                  Subscribe
                </button>
              </div>
            </div>

          </div>

          <div className="mobile-col mobile-gap-sm" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 32, borderTop: "1px solid var(--border-subtle)" }}>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>© 2026 ASTRAMIND INC. All rights reserved.</p>
            <div style={{ display: "flex", gap: 20 }}>
              {["Twitter", "GitHub", "Discord"].map(social => (
                <span key={social} style={{ fontSize: 13, color: "var(--text-muted)", cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"}
                onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}>{social}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}