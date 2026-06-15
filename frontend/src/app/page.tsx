"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Zap, Shield, GitBranch, Globe,
  Sparkles, ArrowRight, Code2, Search, Lightbulb, MessageSquare, ChevronRight, Download, Smartphone,
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
  { icon: <Zap className="w-5 h-5 text-amber-400" />,      title: "Sub-50ms responses",      desc: "Groq's LPU delivers lightning responses. Smart routing picks the fastest available provider." },
  { icon: <GitBranch className="w-5 h-5 text-indigo-400" />, title: "Multi-provider fallback",  desc: "Never go down. Circuit breakers automatically reroute to secondary providers." },
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
    <div className="relative min-h-screen overflow-x-hidden bg-[#0c0c0e] text-[#eeeef2] font-sans">
      
      {/* ═══ Cosmic Background Decor ═══ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.05]" />
        <div className="absolute inset-0 bg-grid-pattern-radial opacity-[0.04]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[550px] bg-gradient-to-b from-amber-500/[0.06] via-transparent to-transparent blur-[120px]" />
        <div className="absolute top-[-100px] left-[10%] w-[400px] h-[400px] rounded-full bg-amber-500/[0.07] blur-[100px] animate-float-1" />
        <div className="absolute bottom-[5%] right-[5%] w-[500px] h-[500px] rounded-full bg-[#8b7afc]/[0.05] blur-[110px] animate-float-2" />
      </div>

      {/* ═══ STICKY HEADER NAV ═══ */}
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled 
          ? "bg-[#111116]/85 backdrop-blur-xl border-b border-white/[0.06] py-3 shadow-[0_4px_30px_rgba(0,0,0,0.5)]" 
          : "bg-transparent py-5 border-b border-transparent"
      }`}>
        {scrolled && <div className="absolute top-0 left-0 right-0 top-highlight" />}
        
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 no-underline group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-300 flex items-center justify-center shadow-[0_0_20px_rgba(242,169,59,0.3)] transition-transform group-hover:scale-105 duration-300">
              <AstraIcon size={20} />
            </div>
            <span className="font-extrabold text-base tracking-tight text-white font-display">ASTRAMIND</span>
          </Link>

          <div className="flex items-center gap-3">
            {!isSignedIn ? (
              <>
                <Link href="/download" className="hidden sm:flex items-center gap-2 text-xs font-semibold text-[#9898b0] hover:text-white no-underline px-3.5 py-2 border border-white/[0.08] hover:border-white/20 rounded-xl transition-all duration-200">
                  <Download size={13} /> App
                </Link>
                <button 
                  onClick={() => router.push("/signin")} 
                  className="bg-transparent border border-white/[0.1] hover:border-white/20 text-[#9898b0] hover:text-white px-4.5 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200"
                >
                  Sign in
                </button>
                <button 
                  onClick={() => router.push("/signin")} 
                  className="relative overflow-hidden group bg-gradient-to-r from-amber-500 to-amber-400 text-[#0c0c0e] px-5 py-2 rounded-xl text-sm font-bold cursor-pointer border-none flex items-center gap-2 shadow-[0_4px_15px_rgba(242,169,59,0.2)] hover:shadow-[0_4px_25px_rgba(242,169,59,0.35)] transition-all duration-300 hover:-translate-y-[1px]"
                >
                  Try free <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={async () => { await neonAuthClient.signOut(); setSession(null); }} 
                  className="bg-transparent border border-white/[0.1] text-[#9898b0] hover:text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200"
                >
                  Sign out
                </button>
                <Link href="/chat" className="no-underline">
                  <button className="bg-gradient-to-r from-amber-500 to-amber-400 text-[#0c0c0e] px-5 py-2 rounded-xl text-sm font-bold cursor-pointer border-none flex items-center gap-2 shadow-[0_4px_15px_rgba(242,169,59,0.2)] hover:shadow-[0_4px_25px_rgba(242,169,59,0.35)] transition-all duration-200 hover:-translate-y-[1px]">
                    Open Chat <ArrowRight size={14} />
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ═══ HERO SECTION ═══ */}
      <section className="relative max-w-3xl mx-auto px-6 pt-16 pb-12 text-center z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Badge indicator */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/[0.08] border border-amber-500/20 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[10px] font-bold text-amber-300 tracking-wider uppercase">
              10+ Frontier AI Providers · Circuit fallbacks enabled
            </span>
          </div>

          {/* Core Title */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05] mb-6 font-display">
            <span className="block text-white">Ask anything.</span>
            <span className="block bg-gradient-to-r from-amber-400 via-amber-200 to-white bg-clip-text text-transparent pb-1">
              Get smarter answers.
            </span>
          </h1>

          {/* Description */}
          <p className="text-sm sm:text-base text-[#9898b0] leading-relaxed max-w-xl mx-auto mb-10">
            ASTRAMIND routes your prompt to the best model—Groq, Claude, Gemini, DeepSeek and more—with automated failover, web synthesis, and developer skills.
          </p>

          {/* Composer Typing Simulation Card */}
          <div className="max-w-2xl mx-auto bg-[#121217]/50 border border-white/[0.07] rounded-2xl p-5 mb-10 shadow-[0_16px_36px_rgba(0,0,0,0.4)] text-left backdrop-blur-md">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-amber-300 flex items-center justify-center shadow-[0_0_10px_rgba(242,169,59,0.2)]">
                <AstraIcon size={12} />
              </div>
              <span className="text-xs font-semibold text-[#5a5a72]">Try asking ASTRAMIND...</span>
            </div>
            
            <p className="text-base font-medium text-white min-h-[48px] leading-relaxed mb-5">
              {displayText}
              <span className={`inline-block w-[2px] h-[1.1em] ml-1 bg-amber-400 align-middle ${
                typing ? "animate-pulse" : "opacity-0"
              }`} />
            </p>

            {/* Suggestions */}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-white/[0.05]">
              {SUGGESTIONS.map((s) => (
                <Link key={s.label} href="/chat" className="no-underline">
                  <button 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1c1c24]/40 hover:bg-amber-500/[0.08] text-[#9898b0] hover:text-amber-300 border border-white/[0.05] hover:border-amber-500/20 cursor-pointer transition-all duration-300"
                  >
                    {s.icon} {s.label}
                  </button>
                </Link>
              ))}
            </div>
          </div>

          {/* CTA Action Bar */}
          <div className="flex flex-wrap gap-3 justify-center items-center mb-4">
            <Link href="/chat" className="no-underline">
              <button className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-[#0c0c0e] px-8 py-3.5 rounded-xl text-sm font-bold cursor-pointer border-none flex items-center gap-2 shadow-[0_4px_20px_rgba(242,169,59,0.25)] hover:shadow-[0_4px_30px_rgba(242,169,59,0.4)] transition-all duration-300 hover:-translate-y-[2px]">
                <Sparkles size={16} /> Start for free
              </button>
            </Link>
            <Link href="#features" className="no-underline">
              <button className="bg-transparent hover:bg-white/[0.03] text-[#eeeef2] hover:text-white px-6 py-3.5 rounded-xl text-sm font-semibold cursor-pointer border border-white/[0.12] hover:border-white/20 flex items-center gap-1.5 transition-all duration-300 hover:-translate-y-[1px]">
                See features <ChevronRight size={15} />
              </button>
            </Link>
          </div>
          <p className="text-[11px] text-[#5a5a72] mb-5">No card required · 30 free requests/day · Upgrade to Premium for ₹149/mo</p>
          
          <Link href="/download" className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.06] hover:border-white/[0.1] bg-[#121217]/30 hover:bg-[#121217]/50 text-[#9898b0] hover:text-white text-xs no-underline transition-all duration-300">
            <Smartphone size={12} className="text-amber-400" /> Download for Android
          </Link>
        </motion.div>
      </section>

      {/* ═══ TRUSTED BY MARQUEE ═══ */}
      <section className="relative z-10 py-10 overflow-hidden border-b border-white/[0.04] mb-12">
        <p className="text-center text-[10px] font-extrabold tracking-[0.18em] uppercase text-[#5a5a72] mb-6">
          Supported Architectures & Frameworks
        </p>
        
        <div className="absolute left-0 top-0 bottom-0 w-[15%] bg-gradient-to-r from-[#0c0c0e] to-transparent z-2 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-[15%] bg-gradient-to-l from-[#0c0c0e] to-transparent z-2 pointer-events-none" />

        <div className="flex width-[200%] marquee-container">
          <div className="flex w-1/2 justify-between items-center px-10 opacity-30 filter grayscale hover:grayscale-0 hover:opacity-85 transition-all duration-500 animate-[marquee_45s_linear_infinite]">
            <div className="flex items-center gap-2 text-white">
              <OpenAIIcon size={22} /> <span className="font-extrabold tracking-tight text-base">OpenAI</span>
            </div>
            <div className="flex items-center gap-2 text-white">
              <ClaudeIcon size={22} /> <span className="font-bold text-base">Anthropic</span>
            </div>
            <div className="flex items-center gap-2 text-white">
              <GeminiIcon size={22} /> <span className="font-bold text-base">Gemini</span>
            </div>
            <div className="flex items-center gap-2 text-white">
              <DeepSeekIcon size={22} /> <span className="font-extrabold text-base">DeepSeek</span>
            </div>
            <div className="flex items-center gap-2 text-white">
              <MistralIcon size={22} /> <span className="font-bold text-base">Mistral</span>
            </div>
            <div className="flex items-center gap-2 text-white">
              <GroqLogoIcon size={22} /> <span className="font-extrabold text-base">Groq</span>
            </div>
          </div>
          <div className="flex w-1/2 justify-between items-center px-10 opacity-30 filter grayscale hover:grayscale-0 hover:opacity-85 transition-all duration-500 animate-[marquee_45s_linear_infinite]">
            <div className="flex items-center gap-2 text-white">
              <OpenAIIcon size={22} /> <span className="font-extrabold tracking-tight text-base">OpenAI</span>
            </div>
            <div className="flex items-center gap-2 text-white">
              <ClaudeIcon size={22} /> <span className="font-bold text-base">Anthropic</span>
            </div>
            <div className="flex items-center gap-2 text-white">
              <GeminiIcon size={22} /> <span className="font-bold text-base">Gemini</span>
            </div>
            <div className="flex items-center gap-2 text-white">
              <DeepSeekIcon size={22} /> <span className="font-extrabold text-base">DeepSeek</span>
            </div>
            <div className="flex items-center gap-2 text-white">
              <MistralIcon size={22} /> <span className="font-bold text-base">Mistral</span>
            </div>
            <div className="flex items-center gap-2 text-white">
              <GroqLogoIcon size={22} /> <span className="font-extrabold text-base">Groq</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ MODEL SPEEDS MATRIX ═══ */}
      <section className="max-w-4xl mx-auto px-6 py-8 relative z-10 flex justify-center">
        <div className="w-full glass-card-glow rounded-3xl p-7 sm:p-9">
          <p className="text-center text-[10px] font-bold tracking-wider uppercase text-[#9898b0] mb-8">
            Dynamic Model Routing and Latency Metrics
          </p>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {PROVIDERS.map((p) => {
              const Icon = p.Icon;
              return (
                <div 
                  key={p.name} 
                  className="flex flex-col items-center gap-2.5 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-300 group"
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-105"
                    style={{ background: `${p.color}10`, border: `1px solid ${p.color}20` }}
                  >
                    <Icon size={26} />
                  </div>
                  <span className="text-xs font-semibold text-white">{p.name}</span>
                  <span 
                    className="text-[9px] font-extrabold px-2 py-0.5 rounded-full border"
                    style={{ background: `${p.color}0d`, color: p.color, borderColor: `${p.color}15` }}
                  >
                    {p.ms}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="max-w-4xl mx-auto px-6 py-16 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3 font-display">Built for reliability at scale</h2>
          <p className="text-[#9898b0] text-sm max-w-md mx-auto">
            Not just another basic API wrapper. A complex, local-first orchestration client.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FEATURES.map((f, i) => (
            <div 
              key={i} 
              className="glass-card rounded-2xl p-6.5 hover:border-amber-500/20 group"
            >
              <div className="w-10 h-10 rounded-lg bg-white/[0.02] border border-white/[0.05] group-hover:border-amber-500/20 group-hover:bg-amber-500/[0.02] flex items-center justify-center mb-5 transition-all duration-300">
                {f.icon}
              </div>
              <h3 className="text-base font-bold mb-2 text-white tracking-tight">{f.title}</h3>
              <p className="text-xs text-[#9898b0] leading-relaxed opacity-85">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="max-w-4xl mx-auto px-6 py-8 relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-extrabold tracking-tight mb-2.5 font-display">How It Works</h2>
          <p className="text-[#9898b0] text-xs max-w-xs mx-auto">Get intelligent results in three simple steps</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { step: "01", emoji: "🤖", title: "Select Model Mode", desc: "Choose your preferred model tier or let our system auto-route to the lowest latency provider." },
            { step: "02", emoji: "💬", title: "Prompt Details", desc: "Input text. The system automatically fetches web references and developer context." },
            { step: "03", emoji: "⚡", title: "Low Latency Answer", desc: "View real-time markdown answers with syntax code rendering and voice output." },
          ].map((item, i) => (
            <div 
              key={i} 
              className="glass-card rounded-2xl p-5.5 text-center relative overflow-hidden group hover:border-amber-500/15"
            >
              <div className="absolute top-2 right-4 text-4xl font-black text-white/[0.02] font-display select-none">{item.step}</div>
              <div className="text-3.5xl mb-3">{item.emoji}</div>
              <h3 className="text-sm font-bold mb-2.5 text-white">{item.title}</h3>
              <p className="text-xs text-[#9898b0] leading-relaxed opacity-85">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ PREMIUM UPGRADE CTA ═══ */}
      <section className="max-w-3xl mx-auto px-6 py-12 relative z-10">
        <div className="glass-card-glow rounded-3xl p-8 sm:p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/[0.03] via-transparent to-[#8b7afc]/[0.03] pointer-events-none" />
          <div className="text-3xl mb-3">⚡</div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/[0.08] border border-amber-500/20 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-[9px] font-extrabold text-amber-300 tracking-wider uppercase">Premium — ₹149/month</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3 font-display">
            Unlock <span className="bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">Unlimited Capabilities</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#9898b0] leading-relaxed max-w-lg mx-auto mb-5">
            Upgrade to Premium to increase your daily limit to <strong className="text-white">300 requests/day</strong> and gain expert agent tools, deeper research maps, and priority routing.
          </p>
          <p className="text-[10px] text-[#5a5a72] mb-6">Expert skills · File operations · Priority support · Cancel anytime</p>
          
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/pricing" className="no-underline">
              <button className="bg-gradient-to-r from-amber-500 to-amber-400 text-[#0c0c0e] px-7 py-3 rounded-lg text-xs font-bold cursor-pointer border-none shadow-[0_4px_15px_rgba(242,169,59,0.2)] hover:shadow-[0_4px_25px_rgba(242,169,59,0.35)] transition-all duration-300 hover:-translate-y-[1px]">
                🚀 Upgrade to Premium
              </button>
            </Link>
            <Link href="/chat" className="no-underline">
              <button className="bg-transparent hover:bg-white/[0.03] text-[#eeeef2] hover:text-white px-6 py-3 rounded-lg text-xs font-semibold cursor-pointer border border-white/[0.12] hover:border-white/20 transition-all duration-300 hover:-translate-y-[1px]">
                Try free first
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ STATS MATRIX ═══ */}
      <section className="border-t border-b border-white/[0.04] bg-[#121216]/10 py-10 relative z-10">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "10+", label: "AI Engines" },
            { value: "500+", label: "Tokens/sec" },
            { value: "<50ms", label: "P50 Latency" },
            { value: "99.99%", label: "Uptime Fallback" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-extrabold bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent font-display mb-1">
                {s.value}
              </div>
              <div className="text-[10px] text-[#5a5a72] font-semibold uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ CTA SECTION ═══ */}
      <section className="max-w-2xl mx-auto px-6 py-16 text-center relative z-10">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-4 font-display">
          Ready to think <span className="bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">beyond boundaries</span>?
        </h2>
        <p className="text-xs text-[#9898b0] mb-6 leading-relaxed">
          Access every frontier model in a single unified low-latency platform.
        </p>
        <Link href="/chat" className="no-underline">
          <button className="bg-gradient-to-r from-amber-500 to-amber-400 text-[#0c0c0e] px-8 py-4 rounded-xl text-sm font-bold cursor-pointer border-none shadow-[0_8px_25px_rgba(242,169,59,0.25)] hover:shadow-[0_8px_35px_rgba(242,169,59,0.35)] transition-all duration-300 hover:-translate-y-[2px]">
            <Sparkles size={14} className="inline mr-1" /> Start Chatting Now
          </button>
        </Link>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/[0.04] bg-[#09090b] py-12 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-300 flex items-center justify-center shadow-[0_0_15px_rgba(242,169,59,0.25)]">
                  <AstraIcon size={18} />
                </div>
                <span className="font-extrabold text-sm tracking-tight text-white font-display">ASTRAMIND</span>
              </div>
              <p className="text-xs text-[#9898b0] leading-relaxed max-w-[260px]">
                The world&apos;s fastest AI routing client. Designed for developers and power users.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Product</h4>
              <Link href="/chat" className="text-xs text-[#9898b0] hover:text-amber-300 no-underline transition-colors duration-200">Chat Engine</Link>
              <Link href="/discover" className="text-xs text-[#9898b0] hover:text-amber-300 no-underline transition-colors duration-200 flex items-center gap-1.5">Discover <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300">NEW</span></Link>
              <Link href="/pricing" className="text-xs text-[#9898b0] hover:text-amber-300 no-underline transition-colors duration-200 flex items-center gap-1.5">Pricing <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300">₹149</span></Link>
            </div>

            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Resources</h4>
              <Link href="#features" className="text-xs text-[#9898b0] hover:text-amber-300 no-underline transition-colors duration-200">Documentation</Link>
              <Link href="/privacy" className="text-xs text-[#9898b0] hover:text-amber-300 no-underline transition-colors duration-200">Privacy Policy</Link>
              <Link href="/disclaimer" className="text-xs text-[#9898b0] hover:text-amber-300 no-underline transition-colors duration-200">API Disclaimer</Link>
              <Link href="/privacy" className="text-xs text-[#9898b0] hover:text-amber-300 no-underline transition-colors duration-200">Terms of Service</Link>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Newsletter</h4>
              <p className="text-[11px] text-[#9898b0] mb-3">Get release notes and updates.</p>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="Enter email" 
                  className="flex-1 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-amber-500 transition-colors"
                />
                <button className="bg-[#1c1c24] hover:bg-white text-white hover:text-black border border-white/[0.08] hover:border-transparent px-3 rounded-lg text-xs font-bold cursor-pointer transition-all duration-200">
                  Join
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-white/[0.04] gap-4">
            <p className="text-[11px] text-[#5a5a72]">
              © 2026 ASTRAMIND. Developed securely on local architecture. Support: saffanakbar942@gmail.com
            </p>
            <div className="flex gap-4">
              {["Twitter", "GitHub", "Discord"].map((social) => (
                <span key={social} className="text-[11px] text-[#5a5a72] hover:text-white cursor-pointer transition-colors duration-200">{social}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}