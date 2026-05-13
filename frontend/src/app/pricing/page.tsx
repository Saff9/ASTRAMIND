"use client";

import Link from "next/link";
import { Check, Zap, Shield, Globe, ArrowRight, Sparkles } from "lucide-react";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "Perfect for personal use and exploration.",
    color: "#6b7280",
    highlight: false,
    features: [
      "50 AI requests per day",
      "Access to fast models (Llama 3.1 8B)",
      "Web search (5 results)",
      "No credit card required",
      "Community support",
    ],
    cta: "Start free",
    ctaHref: "/chat",
  },
  {
    name: "Pro",
    price: "Free",
    period: "while in beta",
    desc: "Full power for developers and power users.",
    color: "#f2a93b",
    highlight: true,
    features: [
      "100 AI requests per day",
      "All model tiers (fast, balanced, smart)",
      "DeepSeek R1 reasoning model",
      "Web search with deep research",
      "Agent mode with 9 tools",
      "Code execution sandbox",
      "File creation & management",
      "Priority routing",
    ],
    cta: "Get started free",
    ctaHref: "/chat",
  },
  {
    name: "Enterprise",
    price: "Contact us",
    period: "",
    desc: "Unlimited scale with SLA guarantees.",
    color: "#8b7afc",
    highlight: false,
    features: [
      "Unlimited requests",
      "All Pro features",
      "Custom model fine-tuning",
      "Dedicated infrastructure",
      "99.9% uptime SLA",
      "Enterprise security & compliance",
      "On-premise deployment option",
      "24/7 dedicated support",
    ],
    cta: "Contact sales",
    ctaHref: "mailto:hello@astramind.ai",
  },
];

export default function PricingPage() {
  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh", color: "var(--text-primary)" }}>
      {/* Hero */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "80px 24px 40px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24, background: "rgba(242,169,59,0.12)", border: "1px solid rgba(242,169,59,0.25)", borderRadius: 100, padding: "5px 16px" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f2a93b", display: "inline-block" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#f2a93b", letterSpacing: "0.08em", textTransform: "uppercase" }}>Simple Pricing</span>
        </div>
        <h1 style={{ fontSize: "clamp(2.4rem, 6vw, 4rem)", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 16 }}>
          Start free.{" "}
          <span style={{ background: "linear-gradient(135deg, #f2a93b, #ffd080)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Scale when ready.
          </span>
        </h1>
        <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)", maxWidth: 520, margin: "0 auto" }}>
          No hidden fees. No surprise bills. ASTRAMIND is free while in beta — we cover the API costs so you can focus on building.
        </p>
      </div>

      {/* Pricing Cards */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 80px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            style={{
              background: tier.highlight ? `rgba(242,169,59,0.06)` : "var(--surface-1)",
              border: `1.5px solid ${tier.highlight ? "rgba(242,169,59,0.4)" : "var(--border-subtle)"}`,
              borderRadius: 24, padding: 36,
              position: "relative", overflow: "hidden",
              boxShadow: tier.highlight ? "0 0 0 1px rgba(242,169,59,0.2), 0 20px 60px rgba(0,0,0,0.4)" : "none",
            }}
          >
            {tier.highlight && (
              <div style={{ position: "absolute", top: 16, right: 16, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 12px", borderRadius: 100, background: "rgba(242,169,59,0.2)", color: "#f2a93b", border: "1px solid rgba(242,169,59,0.3)" }}>
                ✨ Most Popular
              </div>
            )}
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>{tier.name}</h2>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: "2.5rem", fontWeight: 900, color: "var(--text-primary)" }}>{tier.price}</span>
                {tier.period && <span style={{ fontSize: 13, color: "var(--text-muted)" }}>/{tier.period}</span>}
              </div>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8, lineHeight: 1.5 }}>{tier.desc}</p>
            </div>

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: 10 }}>
              {tier.features.map((f) => (
                <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "var(--text-secondary)" }}>
                  <Check size={15} style={{ color: tier.color, flexShrink: 0, marginTop: 2 }} />
                  {f}
                </li>
              ))}
            </ul>

            <Link href={tier.ctaHref} style={{ textDecoration: "none" }}>
              <button style={{
                width: "100%", padding: "12px 24px", borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: "pointer", border: "none",
                background: tier.highlight ? "linear-gradient(135deg, #f2a93b, #ffd080)" : "var(--surface-3)",
                color: tier.highlight ? "#1a1410" : "var(--text-primary)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.2s ease",
              }}>
                {tier.highlight && <Sparkles size={16} />}
                {tier.cta}
                <ArrowRight size={15} />
              </button>
            </Link>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px 80px" }}>
        <h2 style={{ fontSize: "1.8rem", fontWeight: 800, textAlign: "center", marginBottom: 40 }}>Frequently Asked Questions</h2>
        {[
          { q: "Which AI models do you use?", a: "We use the best free models available: Groq's Llama 3.3-70B for fast responses, DeepSeek R1 (reasoning model equal to GPT-o1) for smart tasks, and Cerebras for ultra-fast inference." },
          { q: "Is my data private?", a: "Yes. We do not store your conversations. Requests are sent directly to AI providers and responses are streamed back. See our Privacy Policy for details." },
          { q: "Why is it free?", a: "We use free API tiers from providers like Groq and OpenRouter. Your support (Ko-fi) helps us scale and eventually self-host open-source models for zero-cost, unlimited usage." },
          { q: "What is agent mode?", a: "Agent mode enables multi-step reasoning: AstraMind can search the web, execute Python code, create files, fetch URLs, and perform calculations — all automatically — to give you comprehensive answers." },
        ].map((item) => (
          <div key={item.q} style={{ marginBottom: 24, padding: 24, background: "var(--surface-1)", border: "1px solid var(--border-subtle)", borderRadius: 16 }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 8 }}>{item.q}</h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65 }}>{item.a}</p>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", paddingBottom: 48 }}>
        <Link href="/chat" style={{ textDecoration: "none" }}>
          <button style={{ padding: "14px 40px", borderRadius: 14, fontWeight: 700, fontSize: 16, cursor: "pointer", border: "none", background: "linear-gradient(135deg, #f2a93b, #ffd080)", color: "#1a1410", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={18} /> Start for free now
          </button>
        </Link>
      </div>
    </div>
  );
}
