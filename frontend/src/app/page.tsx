"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Zap, Shield, GitBranch, Globe,
  Sparkles, ArrowRight, Code2, Search, Lightbulb, MessageSquare, ChevronRight, Download, Smartphone,
} from "lucide-react";
import { 
  GroqLogoIcon, OpenAIIcon, ClaudeIcon, GeminiIcon, DeepSeekIcon, MistralIcon,
  KimiIcon, GrokIcon, QwenIcon, QGPTIcon, MetaIcon, AstraIcon
} from "@/components/common/ProviderIcons";
import { neonAuthClient } from "@/lib/auth-client";

const PROMPTS = [
  "Explain quantum entanglement simply",
  "Write a Python web scraper",
  "Analyze the French Revolution",
  "Debug my async/await code",
  "Summarize this research paper",
];

const PROVIDERS = [
  { name: "Claude 4.8",    ms: "950ms",  color: "#D97757", Icon: ClaudeIcon },
  { name: "Kimi",          ms: "820ms",  color: "#14C775", Icon: KimiIcon },
  { name: "Meta",          ms: "450ms",  color: "#0064E0", Icon: MetaIcon },
  { name: "Grok Coder",    ms: "1100ms", color: "#FFFFFF", Icon: GrokIcon },
  { name: "Qwen",          ms: "880ms",  color: "#6A3AE3", Icon: QwenIcon },
  { name: "DeepSeek NLU",  ms: "750ms",  color: "#4D6BFE", Icon: DeepSeekIcon },
  { name: "QGPT",          ms: "980ms",  color: "#0080FF", Icon: QGPTIcon },
];

const FEATURES = [
  { icon: <Zap className="w-5 h-5 text-brand-400" />,      title: "Sub-50ms responses",      desc: "Groq's LPU delivers lightning responses. Smart routing picks the fastest available provider." },
  { icon: <GitBranch className="w-5 h-5 text-accent-500" />, title: "Multi-provider fallback",  desc: "Never go down. Circuit breakers automatically reroute to secondary providers." },
  { icon: <Shield className="w-5 h-5 text-emerald-400" />,   title: "Zero-trust security",      desc: "JWT auth, prompt injection detection, content filtering, and rate limiting baked in." },
  { icon: <Globe className="w-5 h-5 text-blue-400" />,    title: "Web-augmented answers",   desc: "Real-time web search for up-to-date answers. No more knowledge cutoffs." },
];

const SUGGESTIONS = [
  { icon: <Code2 className="w-4 h-4" />,       label: "Write code" },
  { icon: <Search className="w-4 h-4" />,       label: "Search the web" },
  { icon: <Lightbulb className="w-4 h-4" />,    label: "Brainstorm ideas" },
  { icon: <MessageSquare className="w-4 h-4" />, label: "Answer questions" },
];

export default function HomePage() {
  const [session, setSession] = useState<{ user?: { email?: string } } | null | undefined>(undefined);
  const isSignedIn = !!session?.user;
  const [mounted, setMounted] = useState(false);
  const [promptIdx, setPromptIdx] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [typing, setTyping] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function check() {
      try {
        const { data } = await neonAuthClient.getSession();
        setSession(data ? { user: { email: data.user.email } } : null);
        if (data) {
          router.push("/chat");
        }
      } catch (err) {
        console.error("Auth session check failed:", err);
        setSession(null);
      }
    }
    check();
  }, [router]);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 15);
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
        setTimeout(() => setPromptIdx((p) => (p + 1) % PROMPTS.length), 2500);
      }
    }, 45);
    return () => clearInterval(timer);
  }, [promptIdx]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bg-base text-text-main font-sans selection:bg-brand-500/30 selection:text-white">
      
      {/* ═══ Background Effects ═══ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[600px] bg-gradient-to-b from-brand-500/10 via-transparent to-transparent blur-[100px]" />
        <div className="absolute -top-32 left-0 w-[500px] h-[500px] rounded-full bg-brand-400/5 blur-[120px] animate-float-slow" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-accent-500/5 blur-[120px] animate-float-slow" style={{ animationDelay: '-5s' }} />
      </div>

      {/* ═══ STICKY HEADER NAV ═══ */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled 
            ? "bg-bg-panel/80 backdrop-blur-xl border-b border-border-subtle py-3 shadow-lg" 
            : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 no-underline group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
              <AstraIcon size={22} className="text-white" />
            </div>
            <span className="font-display font-extrabold text-lg tracking-tight text-white group-hover:text-brand-300 transition-colors">
              ASTRAMIND
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {!isSignedIn ? (
              <>
                <Link href="/download" className="hidden sm:flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-white no-underline px-4 py-2 border border-border-subtle hover:border-border-strong rounded-xl transition-all duration-300 hover:bg-bg-elevated">
                  <Download size={14} /> App
                </Link>
                <button 
                  onClick={() => router.push("/signin")} 
                  className="bg-transparent text-text-muted hover:text-white px-4 py-2 text-sm font-semibold cursor-pointer transition-colors duration-200"
                >
                  Sign in
                </button>
                <button 
                  onClick={() => router.push("/signin")} 
                  className="relative overflow-hidden group bg-brand-500 hover:bg-brand-400 text-bg-base px-6 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all duration-300 hover-lift shadow-lg shadow-brand-500/20 flex items-center gap-2"
                >
                  <span className="relative z-10 flex items-center gap-2">Try free <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" /></span>
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={async () => { await neonAuthClient.signOut(); setSession(null); }} 
                  className="bg-transparent text-text-muted hover:text-white px-4 py-2 text-sm font-semibold cursor-pointer transition-colors"
                >
                  Sign out
                </button>
                <Link href="/chat" className="no-underline">
                  <button className="bg-brand-500 hover:bg-brand-400 text-bg-base px-6 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all duration-300 hover-lift shadow-lg shadow-brand-500/20 flex items-center gap-2">
                    Open Chat <ArrowRight size={14} />
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </motion.nav>

      {/* ═══ HERO SECTION ═══ */}
      <section className="relative w-full max-w-4xl mx-auto px-6 pt-32 pb-20 text-center z-10 flex flex-col items-center justify-center min-h-[85vh]">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full flex flex-col items-center"
        >
          {/* Badge indicator */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel border border-brand-500/30 mb-8 shimmer">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
            <span className="text-[11px] font-bold text-brand-300 tracking-widest uppercase">
              10+ Frontier AI Providers Enabled
            </span>
          </div>

          {/* Core Title */}
          <h1 className="text-5xl sm:text-7xl font-display font-extrabold tracking-tighter leading-[1.1] mb-6">
            <span className="block text-white mb-2">Ask anything.</span>
            <span className="block text-gradient-brand pb-2">
              Get smarter answers.
            </span>
          </h1>

          {/* Description */}
          <p className="text-base sm:text-lg text-text-muted leading-relaxed max-w-2xl mx-auto mb-12">
            ASTRAMIND routes your prompt to the best model—Groq, Claude, Gemini, DeepSeek and more—with automated failover, web synthesis, and lightning-fast developer skills.
          </p>

          {/* Composer Typing Simulation Card */}
          <div className="w-full max-w-2xl glass-card rounded-2xl p-6 mb-12 text-left animate-pulse-glow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-bg-elevated border border-border-strong flex items-center justify-center shadow-inner">
                <AstraIcon size={14} className="text-brand-400" />
              </div>
              <span className="text-sm font-semibold text-text-dim uppercase tracking-wider">Try asking ASTRAMIND...</span>
            </div>
            
            <p className="text-lg sm:text-xl font-medium text-white min-h-[60px] leading-relaxed mb-6">
              {displayText}
              <span className={`inline-block w-0.5 h-5 ml-1 bg-brand-400 align-middle ${typing ? "animate-pulse" : "opacity-0"}`} />
            </p>

            {/* Suggestions */}
            <div className="flex flex-wrap gap-3 pt-5 border-t border-border-dim">
              {SUGGESTIONS.map((s) => (
                <Link key={s.label} href="/chat" className="no-underline flex-1 min-w-[140px]">
                  <button className="w-full flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-bg-elevated hover:bg-brand-500/10 text-text-muted hover:text-brand-300 border border-border-dim hover:border-brand-500/30 cursor-pointer transition-all duration-300 hover-lift">
                    {s.icon} {s.label}
                  </button>
                </Link>
              ))}
            </div>
          </div>

          {/* CTA Action Bar */}
          <div className="flex flex-wrap gap-4 justify-center items-center mb-6">
            <Link href="/chat" className="no-underline">
              <button className="bg-brand-500 hover:bg-brand-400 text-bg-base px-8 py-4 rounded-xl text-base font-bold cursor-pointer transition-all duration-300 hover-lift shadow-lg shadow-brand-500/20 flex items-center gap-2">
                <Sparkles size={18} /> Start for free
              </button>
            </Link>
            <Link href="#features" className="no-underline">
              <button className="bg-bg-elevated hover:bg-bg-hover text-white px-8 py-4 rounded-xl text-base font-semibold cursor-pointer border border-border-subtle hover:border-border-strong flex items-center gap-2 transition-all duration-300 hover-lift">
                See features <ChevronRight size={18} />
              </button>
            </Link>
          </div>
          
          <p className="text-xs text-text-dim font-medium">No credit card required · 30 free requests/day</p>
        </motion.div>
      </section>

      {/* ═══ TRUSTED BY MARQUEE ═══ */}
      <section className="relative z-10 py-12 border-y border-border-dim bg-bg-panel/50 backdrop-blur-sm overflow-hidden mb-20">
        <p className="text-center text-xs font-extrabold tracking-widest uppercase text-text-dim mb-8">
          Supported Architectures & Frameworks
        </p>
        
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-bg-base to-transparent z-[2] pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-bg-base to-transparent z-[2] pointer-events-none" />

        <div className="flex w-[200%] animate-marquee">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex w-1/2 justify-around items-center px-10">
              <div className="flex items-center gap-3 text-white/40 hover:text-white transition-colors duration-300 cursor-default">
                <OpenAIIcon size={28} /> <span className="font-display font-bold text-xl">OpenAI</span>
              </div>
              <div className="flex items-center gap-3 text-white/40 hover:text-white transition-colors duration-300 cursor-default">
                <ClaudeIcon size={28} /> <span className="font-display font-bold text-xl">Anthropic</span>
              </div>
              <div className="flex items-center gap-3 text-white/40 hover:text-white transition-colors duration-300 cursor-default">
                <GeminiIcon size={28} /> <span className="font-display font-bold text-xl">Gemini</span>
              </div>
              <div className="flex items-center gap-3 text-white/40 hover:text-white transition-colors duration-300 cursor-default">
                <DeepSeekIcon size={28} /> <span className="font-display font-bold text-xl">DeepSeek</span>
              </div>
              <div className="flex items-center gap-3 text-white/40 hover:text-white transition-colors duration-300 cursor-default">
                <MistralIcon size={28} /> <span className="font-display font-bold text-xl">Mistral</span>
              </div>
              <div className="flex items-center gap-3 text-white/40 hover:text-white transition-colors duration-300 cursor-default">
                <GroqLogoIcon size={28} /> <span className="font-display font-bold text-xl">Groq</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight mb-4">Built for reliability at scale</h2>
          <p className="text-text-muted text-lg max-w-2xl mx-auto">
            Not just another basic API wrapper. A complex, local-first orchestration client designed for speed and power.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f, i) => (
            <div key={i} className="glass-card rounded-2xl p-8 hover-lift group border-border-subtle hover:border-brand-500/30">
              <div className="w-12 h-12 rounded-xl bg-bg-elevated border border-border-strong group-hover:border-brand-500/50 flex items-center justify-center mb-6 transition-colors shadow-inner">
                {f.icon}
              </div>
              <h3 className="text-lg font-bold mb-3 text-white tracking-tight">{f.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ MODEL SPEEDS MATRIX ═══ */}
      <section className="max-w-6xl mx-auto px-6 py-20 relative z-10">
        <div className="w-full glass-panel rounded-[2rem] p-8 sm:p-12 shadow-2xl shadow-brand-500/5 border border-brand-500/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/5 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold mb-3">Dynamic Routing & Latency</h2>
            <p className="text-text-muted text-sm">Real-time metrics for our supported frontier models.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            {PROVIDERS.map((p) => {
              const Icon = p.Icon;
              return (
                <div key={p.name} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-bg-elevated border border-border-dim hover:border-border-strong hover:bg-bg-hover transition-all duration-300 hover-lift group">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-inner transition-transform duration-500 group-hover:scale-110" style={{ background: `${p.color}15`, border: `1px solid ${p.color}30` }}>
                    <Icon size={30} />
                  </div>
                  <span className="text-sm font-semibold text-white mt-2">{p.name}</span>
                  <span className="text-xs font-bold px-3 py-1 rounded-full border tracking-wide" style={{ background: `${p.color}10`, color: p.color, borderColor: `${p.color}20` }}>
                    {p.ms}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-border-dim bg-bg-base py-16 px-6 relative z-10 mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
                  <AstraIcon size={20} className="text-white" />
                </div>
                <span className="font-display font-extrabold text-lg tracking-tight text-white">ASTRAMIND</span>
              </div>
              <p className="text-sm text-text-muted leading-relaxed">
                The ultimate AI routing client. Designed for developers, researchers, and power users.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Product</h4>
              <Link href="/chat" className="text-sm text-text-muted hover:text-brand-300 no-underline transition-colors">Chat Engine</Link>
              <Link href="/discover" className="text-sm text-text-muted hover:text-brand-300 no-underline transition-colors flex items-center gap-2">Discover <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-500/20 text-brand-300">NEW</span></Link>
              <Link href="/pricing" className="text-sm text-text-muted hover:text-brand-300 no-underline transition-colors">Pricing</Link>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Resources</h4>
              <Link href="#features" className="text-sm text-text-muted hover:text-brand-300 no-underline transition-colors">Documentation</Link>
              <Link href="/privacy" className="text-sm text-text-muted hover:text-brand-300 no-underline transition-colors">Privacy Policy</Link>
              <Link href="/disclaimer" className="text-sm text-text-muted hover:text-brand-300 no-underline transition-colors">Terms of Service</Link>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Newsletter</h4>
              <p className="text-sm text-text-muted mb-3">Get release notes and updates.</p>
              <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="Enter email" 
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border-strong bg-bg-elevated text-white text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 transition-all"
                  required
                />
                <button type="submit" className="bg-white hover:bg-brand-100 text-bg-base px-4 rounded-xl text-sm font-bold cursor-pointer transition-colors shadow-sm">
                  Join
                </button>
              </form>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-border-dim gap-4">
            <p className="text-xs text-text-dim">
              © 2026 ASTRAMIND. Built securely on local architecture.
            </p>
            <div className="flex gap-6">
              {["Twitter", "GitHub", "Discord"].map((social) => (
                <a key={social} href="#" className="text-xs font-medium text-text-dim hover:text-white cursor-pointer transition-colors no-underline">{social}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}