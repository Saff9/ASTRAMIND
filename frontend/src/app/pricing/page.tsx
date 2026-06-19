"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Zap, Shield, Lock, ArrowRight, Sparkles, CreditCard, CheckCircle2, X, RefreshCw, Crown, Ban } from "lucide-react";
import { neonAuthClient } from "@/lib/auth-client";

const TIERS = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    desc: "Start exploring AI for free. Great for casual use.",
    color: "#6b7280",
    highlight: false,
    features: [
      { text: "30 AI requests per day", ok: true },
      { text: "Basic chat with Groq Llama 3 (fast model only)", ok: true },
      { text: "Auto web search on relevant queries", ok: true },
      { text: "No credit card required", ok: true },
      { text: "Agent Mode (Tool Calling)", ok: false },
      { text: "Deep Research Mode", ok: false },
      { text: "Expert Skills (FinGPT, Devin, etc.)", ok: false },
      { text: "Code execution & file management", ok: false },
    ],
    cta: "Start for free",
    ctaHref: "/chat",
    actionType: "link"
  },
  {
    name: "Premium",
    price: "₹149",
    period: "month",
    desc: "Full AI power for developers, researchers & professionals.",
    color: "#f2a93b",
    highlight: true,
    features: [
      { text: "300 AI requests per day (10× more)", ok: true },
      { text: "All flagship models: Claude 3.7, GPT-4.5, DeepSeek R1", ok: true },
      { text: "Agent Mode — Tool calling, code execution, file ops", ok: true },
      { text: "Deep Research (Perplexity-style multi-source)", ok: true },
      { text: "6 Expert Skills: FinGPT, Devin, Scraper, Edu & more", ok: true },
      { text: "ACP/MCP webhook execution via Tor proxy isolation", ok: true },
      { text: "Priority fallback routing (zero downtime)", ok: true },
      { text: "Email support: saffanakbar942@gmail.com", ok: true },
    ],
    cta: "Upgrade to Premium",
    ctaHref: "#",
    actionType: "modal"
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "annual",
    desc: "Unlimited scale with dedicated SLA and custom deployment.",
    color: "#8b7afc",
    highlight: false,
    features: [
      { text: "Unlimited daily requests", ok: true },
      { text: "All Premium features", ok: true },
      { text: "Custom model fine-tuning & private weights", ok: true },
      { text: "Dedicated isolated infrastructure", ok: true },
      { text: "99.99% uptime SLA guarantee", ok: true },
      { text: "On-premise deployment option", ok: true },
      { text: "24/7 dedicated engineering support", ok: true },
    ],
    cta: "Contact sales",
    ctaHref: "mailto:saffanakbar942@gmail.com",
    actionType: "link"
  },
];

export default function PricingPage() {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const RAZORPAY_LINK = "https://razorpay.me/@CodeChap?amount=jXBEDYv%2F7QTMviIWWwt41Q%3D%3D";

  const handleNativeCheckout = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://astramind-reer.onrender.com";
      let rawToken = "";
      try {
        const ns = await neonAuthClient.getSession();
        rawToken = ns?.data?.session?.id || "";
      } catch { /* ignore */ }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (rawToken) headers["Authorization"] = `Bearer ${rawToken}`;

      const orderRes = await fetch(`${apiBase}/api/v1/payment/create-order`, {
        method: "POST", headers,
        body: JSON.stringify({ amount: 149, currency: "INR" })
      });
      if (!orderRes.ok) throw new Error("Failed to initialize payment order.");
      const orderData = await orderRes.json();

      const verifyRes = await fetch(`${apiBase}/api/v1/payment/verify`, {
        method: "POST", headers,
        body: JSON.stringify({
          razorpay_order_id: orderData.order_id,
          razorpay_payment_id: `pay_sim_${Date.now()}`,
          razorpay_signature: "sim_signature_valid"
        })
      });
      if (!verifyRes.ok) throw new Error("Payment verification failed.");
      setSuccess(true);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh", color: "var(--text-primary)", position: "relative" }}>

      {/* Nav */}
      <nav style={{ padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-subtle)", position: "sticky", top: 0, zIndex: 50, background: "rgba(12,12,14,0.88)", backdropFilter: "blur(20px)" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "var(--text-muted)", fontSize: 14, fontWeight: 500 }}>
          ← Back to Home
        </a>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>Pricing</span>
        <a href="/chat" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--brand-light)", textDecoration: "none", padding: "6px 14px", borderRadius: 10, background: "var(--brand-glow)", border: "1px solid rgba(242,169,59,0.2)" }}>
          Open Chat
        </a>
      </nav>

      {/* Glow background */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -200, left: "50%", transform: "translateX(-50%)", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(242,169,59,0.12) 0%, transparent 70%)", filter: "blur(80px)" }} />
      </div>

      {/* Hero */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "80px 24px 40px", textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24, background: "rgba(242,169,59,0.12)", border: "1px solid rgba(242,169,59,0.25)", borderRadius: 100, padding: "5px 16px" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f2a93b", display: "inline-block" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#f2a93b", letterSpacing: "0.08em", textTransform: "uppercase" }}>Transparent Pricing</span>
        </div>
        <h1 style={{ fontSize: "clamp(2.4rem, 6vw, 4rem)", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 16 }}>
          Start free.{" "}
          <span style={{ background: "linear-gradient(135deg, #f2a93b, #ffd080)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Unlock the full power.
          </span>
        </h1>
        <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)", maxWidth: 580, margin: "0 auto" }}>
          Free tier lets you explore. Premium gives you Agent Mode, Expert Skills, code execution,
          flagship models — everything a serious user needs at just <strong style={{ color: "var(--text-primary)" }}>₹149/month</strong>.
        </p>
      </div>

      {/* Pricing Cards */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 80px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, position: "relative", zIndex: 1 }}>
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            style={{
              background: tier.highlight ? `rgba(242,169,59,0.06)` : "var(--surface-1)",
              border: `1.5px solid ${tier.highlight ? "rgba(242,169,59,0.4)" : "var(--border-subtle)"}`,
              borderRadius: 24, padding: 36, position: "relative", overflow: "hidden",
              boxShadow: tier.highlight ? "0 0 0 1px rgba(242,169,59,0.2), 0 24px 64px rgba(0,0,0,0.4)" : "none",
              display: "flex", flexDirection: "column", justifyContent: "space-between"
            }}
          >
            {tier.highlight && (
              <div style={{ position: "absolute", top: 16, right: 16, display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 12px", borderRadius: 100, background: "rgba(242,169,59,0.2)", color: "#f2a93b", border: "1px solid rgba(242,169,59,0.3)" }}>
                <Crown size={11} /> Best Value
              </div>
            )}
            <div>
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
                  <li key={f.text} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: f.ok ? "var(--text-secondary)" : "var(--text-muted)", opacity: f.ok ? 1 : 0.55 }}>
                    {f.ok
                      ? <Check size={15} style={{ color: tier.color, flexShrink: 0, marginTop: 2 }} />
                      : <Ban size={14} style={{ color: "#ef4444", flexShrink: 0, marginTop: 2 }} />
                    }
                    <span style={{ textDecoration: f.ok ? "none" : "line-through" }}>{f.text}</span>
                    {!f.ok && <Lock size={11} style={{ color: "#f2a93b", marginTop: 3, flexShrink: 0 }} />}
                  </li>
                ))}
              </ul>
            </div>

            {tier.actionType === "modal" ? (
              <button
                onClick={() => setShowModal(true)}
                style={{
                  width: "100%", padding: "14px 24px", borderRadius: 14, fontWeight: 700, fontSize: 15, cursor: "pointer", border: "none",
                  background: "linear-gradient(135deg, #f2a93b, #ffd080)",
                  color: "#1a1410",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: "0 4px 20px rgba(242,169,59,0.35)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 30px rgba(242,169,59,0.45)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ""; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(242,169,59,0.35)"; }}
              >
                <Sparkles size={16} />
                {tier.cta}
                <ArrowRight size={15} />
              </button>
            ) : (
              <Link href={tier.ctaHref} style={{ textDecoration: "none" }}>
                <button style={{
                  width: "100%", padding: "14px 24px", borderRadius: 14, fontWeight: 700, fontSize: 15, cursor: "pointer", border: "1px solid var(--border-default)",
                  background: "var(--surface-2)", color: "var(--text-primary)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "all 0.2s ease",
                }}>
                  {tier.cta}
                  <ArrowRight size={15} />
                </button>
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Free vs Premium comparison callout */}
      <div style={{ maxWidth: 780, margin: "-20px auto 60px", padding: "0 24px", position: "relative", zIndex: 1 }}>
        <div style={{ padding: 28, borderRadius: 20, background: "rgba(139,122,252,0.08)", border: "1px solid rgba(139,122,252,0.2)", display: "flex", gap: 16, alignItems: "flex-start" }}>
          <Lock size={22} style={{ color: "#8b7afc", flexShrink: 0, marginTop: 2 }} />
          <div>
            <h3 style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", marginBottom: 6 }}>Why pay? Agent Mode changes everything.</h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65 }}>
              Free users get basic chat. Premium unlocks an autonomous AI that can <strong style={{ color: "#f2a93b" }}>search the web, execute Python code, create files, analyze stocks, plan trips, and call external APIs</strong> — all in one response. It's not just a chatbot; it's your personal AI engineer for ₹149/month.
            </p>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.78)", backdropFilter: "blur(10px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999, padding: 24
        }}>
          <div style={{
            background: "var(--surface-1)", border: "1px solid var(--border-subtle)",
            borderRadius: 28, padding: 40, maxWidth: 520, width: "100%",
            boxShadow: "0 24px 80px rgba(0,0,0,0.6)", position: "relative",
          }}>
            <button onClick={() => { setShowModal(false); setSuccess(false); setErrorMsg(null); }}
              style={{ position: "absolute", top: 20, right: 20, background: "var(--surface-2)", border: "1px solid var(--border-default)", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", cursor: "pointer" }}>
              <X size={18} />
            </button>

            {success ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(34,197,94,0.15)", color: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                  <CheckCircle2 size={36} />
                </div>
                <h3 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: 12 }}>You're Premium! 🎉</h3>
                <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 8 }}>
                  You now have <strong style={{ color: "#f2a93b" }}>300 daily requests</strong>, full Agent Mode, Expert Skills, and flagship models.
                </p>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 28 }}>Questions? <a href="mailto:saffanakbar942@gmail.com" style={{ color: "#f2a93b" }}>saffanakbar942@gmail.com</a></p>
                <Link href="/chat" style={{ textDecoration: "none" }}>
                  <button style={{ width: "100%", padding: "14px 24px", borderRadius: 14, fontWeight: 700, fontSize: 16, background: "linear-gradient(135deg, #f2a93b, #ffd080)", color: "#1a1410", border: "none", cursor: "pointer" }}>
                    Start Chatting Now
                  </button>
                </Link>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 16, background: "rgba(242,169,59,0.15)", color: "#f2a93b", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <CreditCard size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.4rem", fontWeight: 800 }}>Upgrade to Premium</h3>
                    <p style={{ fontSize: 14, color: "var(--text-muted)" }}>₹149/month — cancel anytime</p>
                  </div>
                </div>

                <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(242,169,59,0.08)", border: "1px solid rgba(242,169,59,0.2)", marginBottom: 24 }}>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    You get: <strong style={{ color: "#f2a93b" }}>300 requests/day</strong>, Agent Mode, Expert Skills (FinGPT, Devin, Scraper…), flagship models (Claude 3.7, GPT-4.5), and code execution.
                  </p>
                </div>

                {errorMsg && (
                  <div style={{ padding: 14, borderRadius: 12, background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)", color: "#ff5050", fontSize: 14, marginBottom: 20 }}>
                    {errorMsg}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <a href={RAZORPAY_LINK} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                    <button style={{
                      width: "100%", padding: "16px 24px", borderRadius: 16, fontWeight: 700, fontSize: 15, cursor: "pointer",
                      border: "1px solid rgba(242,169,59,0.4)",
                      background: "linear-gradient(135deg, #f2a93b, #ffd080)", color: "#1a1410",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      boxShadow: "0 8px 25px rgba(242,169,59,0.25)"
                    }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Zap size={18} /> Pay ₹149 securely via Razorpay
                      </span>
                      <ArrowRight size={16} />
                    </button>
                  </a>

                  <button
                    onClick={handleNativeCheckout}
                    disabled={loading}
                    style={{
                      width: "100%", padding: "16px 24px", borderRadius: 16, fontWeight: 700, fontSize: 15,
                      cursor: loading ? "not-allowed" : "pointer",
                      border: "1px solid var(--border-default)", background: "var(--surface-2)", color: "var(--text-primary)",
                      display: "flex", alignItems: "center", justifyContent: "space-between"
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {loading ? <RefreshCw size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Shield size={18} style={{ color: "#8b7afc" }} />}
                      {loading ? "Activating Premium…" : "Simulate Instant API Upgrade"}
                    </span>
                    <ArrowRight size={16} />
                  </button>
                </div>

                <p style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
                  Support: <a href="mailto:saffanakbar942@gmail.com" style={{ color: "#f2a93b", textDecoration: "none" }}>saffanakbar942@gmail.com</a>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FAQ */}
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px 80px", position: "relative", zIndex: 1 }}>
        <h2 style={{ fontSize: "1.8rem", fontWeight: 800, textAlign: "center", marginBottom: 40 }}>Frequently Asked Questions</h2>
        {[
          { q: "Why is Agent Mode premium-only?", a: "Agent Mode runs code in a real sandbox, calls external APIs, and executes multi-step reasoning loops. This requires significantly more compute, API credits, and infrastructure. Restricting it to premium ensures a sustainable, high-quality experience for paying users." },
          { q: "What exactly do I get for ₹149/month?", a: "300 AI requests per day (10× the free limit), access to Claude 3.7 Sonnet, GPT-4.5, DeepSeek R1, Agent Mode (code execution, file ops, tool calling), 6 Expert Skills (FinGPT stock analyst, Devin code engineer, viral content creator, etc.), deep research, and Tor-proxied ACP webhooks." },
          { q: "How does the Razorpay payment work?", a: "Click 'Pay ₹149 securely via Razorpay' to complete payment via UPI, Cards, or NetBanking. Once paid, your account upgrades automatically. Questions? Email saffanakbar942@gmail.com." },
          { q: "Can I cancel anytime?", a: "Yes. Premium is a flexible monthly subscription. Cancel anytime and your access remains until the billing period ends." },
        ].map((item) => (
          <div key={item.q} style={{ marginBottom: 16, padding: 24, background: "var(--surface-1)", border: "1px solid var(--border-subtle)", borderRadius: 16 }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 8 }}>{item.q}</h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65 }}>{item.a}</p>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", paddingBottom: 64, position: "relative", zIndex: 1 }}>
        <button onClick={() => setShowModal(true)} style={{ padding: "14px 40px", borderRadius: 14, fontWeight: 700, fontSize: 16, cursor: "pointer", border: "none", background: "linear-gradient(135deg, #f2a93b, #ffd080)", color: "#1a1410", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 4px 24px rgba(242,169,59,0.35)" }}>
          <Crown size={18} /> Upgrade to Premium — ₹149/month
        </button>
      </div>
    </div>
  );
}
