"use client";

import Link from "next/link";
import { ArrowLeft, Shield, Lock, Eye, Database, Globe, Mail } from "lucide-react";

// Custom Cpu icon
function CpuIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" style={style}>
      <rect x="9" y="9" width="6" height="6" rx="1" />
      <path d="M15 2v3M9 2v3M9 19v3M15 19v3M22 15h-3M22 9h-3M2 15h3M2 9h3" />
      <rect x="2" y="2" width="20" height="20" rx="4" />
    </svg>
  );
}

const SECTIONS = [
  {
    icon: Database,
    title: "Information We Collect",
    content: [
      "**Account data**: When you register, we collect your email address, display name, and hashed password. We never store passwords in plain text.",
      "**Conversation data**: Your messages and AI responses are stored securely on our servers to power conversation history and model fine-tuning (only if you opt in).",
      "**Usage analytics**: With your consent, we collect anonymised telemetry — feature usage, session duration, and error logs — to improve ASTRAMIND.",
      "**Technical data**: IP addresses, browser type, device identifiers, and cookie data for security, fraud prevention, and service delivery.",
    ],
  },
  {
    icon: CpuIcon,
    title: "How We Use Your Data",
    content: [
      "**Service delivery**: Your conversations are routed to the AI provider you select (Groq, Claude, DeepSeek, etc.). Only the content you send is forwarded — we strip all metadata.",
      "**Personalisation**: Saved preferences (font, theme, model selection) are used to restore your settings across sessions and devices.",
      "**Security & abuse prevention**: Requests are rate-limited and monitored for abuse. Violating content is flagged and may result in account suspension.",
      "**Product improvement**: Aggregated, de-identified analytics help us understand which features are most valuable and where to focus effort.",
    ],
  },
  {
    icon: Lock,
    title: "Data Security",
    content: [
      "All data in transit is encrypted using **TLS 1.3**. Data at rest is encrypted using **AES-256**.",
      "Our infrastructure is hosted on ISO 27001-certified providers with SOC 2 Type II compliance.",
      "We enforce **least-privilege access controls**: only engineers with a documented need can access production data, and all access is logged.",
      "We conduct regular penetration tests and vulnerability scans. Critical vulnerabilities are patched within 24 hours.",
    ],
  },
  {
    icon: Eye,
    title: "Data Sharing & Third Parties",
    content: [
      "**We do not sell your data.** Period. Your conversations are never sold to advertisers or data brokers.",
      "**AI Providers**: When you use a model, your message is forwarded to that provider (e.g., Anthropic for Claude). Each provider has its own privacy policy governing prompt data.",
      "**Sub-processors**: We use a small number of sub-processors (cloud hosting, analytics, email delivery). All are GDPR-compliant and bound by data processing agreements.",
      "**Legal requirements**: We may disclose information if required by law, court order, or to protect the safety of our users or the public.",
    ],
  },
  {
    icon: Globe,
    title: "Cookies & Tracking",
    content: [
      "**Essential cookies**: Session authentication, CSRF protection, and preference storage. These cannot be disabled without breaking the app.",
      "**Analytics cookies**: Only set with your explicit consent. Used to measure feature adoption and error rates.",
      "**No third-party advertising cookies**: We do not load any ad networks, Facebook pixels, or similar tracking scripts.",
      "You can manage cookies at any time via your browser settings or through our Cookie Preferences link in the footer.",
    ],
  },
  {
    icon: Shield,
    title: "Your Rights (GDPR & CCPA)",
    content: [
      "**Access**: Request a copy of all personal data we hold about you.",
      "**Correction**: Update inaccurate or incomplete data at any time via Account Settings.",
      "**Erasure**: Delete your account and all associated data from Settings → Account.",
      "**Portability**: Export your conversation history as JSON from Settings → Privacy & Data.",
      "**Objection**: Opt out of analytics and model fine-tuning at any time. These are opt-in by default.",
      "For CCPA: California residents have the right to know, delete, and opt out of the sale of personal information. We do not sell personal information.",
    ],
  },
  {
    icon: Mail,
    title: "Contact & Complaints",
    content: [
      "Data Controller: **ASTRAMIND Technologies Pvt. Ltd.**",
      "Data Protection Officer: **privacy@astramind.ai**",
      "For general privacy questions, use the in-app Help centre or email us directly.",
      "If you believe we have not handled your data correctly, you have the right to lodge a complaint with your local supervisory authority (e.g., ICO in the UK, CNIL in France, or the FTC in the USA).",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)" }}>

      {/* Top accent bar */}
      <div style={{ height: 2, background: "linear-gradient(90deg, transparent, var(--brand), var(--accent), transparent)" }} />

      {/* Nav */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(12,12,14,0.85)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border-subtle)",
        padding: "0 24px", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link href="/chat" style={{ textDecoration: "none" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            color: "var(--text-muted)", fontSize: 14, fontWeight: 500,
            padding: "6px 12px", borderRadius: 10, transition: "all 0.15s ease",
          }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--surface-2)"; (e.currentTarget as HTMLDivElement).style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; (e.currentTarget as HTMLDivElement).style.color = "var(--text-muted)"; }}
          >
            <ArrowLeft style={{ width: 15, height: 15 }} />
            Back to Chat
          </div>
        </Link>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          Privacy Policy
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Shield style={{ width: 15, height: 15, color: "var(--brand)" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--brand-light)" }}>ASTRAMIND</span>
        </div>
      </header>

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "72px 24px 48px" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 18px",
          borderRadius: 100, marginBottom: 24, background: "var(--brand-glow)",
          border: "1px solid rgba(232,160,48,0.25)", fontSize: 12, fontWeight: 600,
          color: "var(--brand-light)", letterSpacing: "0.06em",
        }}>
          <Shield style={{ width: 13, height: 13 }} />
          LAST UPDATED: 11 APRIL 2025
        </div>
        <h1 style={{
          fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 800, letterSpacing: "-0.03em",
          marginBottom: 16, lineHeight: 1.05,
          fontFamily: "var(--font-syne,'Syne'),sans-serif",
        }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 17, color: "var(--text-secondary)", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
          We believe privacy is a right, not a feature. Here&apos;s exactly how we handle your data — written in plain English.
        </p>
      </section>

      {/* Table of Contents */}
      <section style={{ maxWidth: 760, margin: "0 auto 48px", padding: "0 24px" }}>
        <div style={{
          padding: 24, background: "var(--surface-1)",
          border: "1px solid var(--border-default)", borderRadius: 20,
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 14 }}>
            Contents
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px" }}>
            {SECTIONS.map((s, i) => (
              <a key={i} href={`#section-${i}`} style={{
                fontSize: 13, color: "var(--text-secondary)", textDecoration: "none",
                padding: "5px 0", borderBottom: "1px solid var(--border-subtle)",
                display: "flex", gap: 8, alignItems: "center",
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", minWidth: 18 }}>{i + 1}.</span>
                {s.title}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Sections */}
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px 80px" }}>
        {SECTIONS.map((s, i) => {
          const Icon = s.icon;
          return (
            <section key={i} id={`section-${i}`} style={{ marginBottom: 48 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: "var(--brand-glow)", border: "1px solid rgba(232,160,48,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon style={{ width: 17, height: 17, color: "var(--brand)" }} />
                </div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                  {i + 1}. {s.title}
                </h2>
              </div>
              <div style={{
                background: "var(--surface-1)", border: "1px solid var(--border-subtle)",
                borderRadius: 16, padding: "20px 24px",
                display: "flex", flexDirection: "column", gap: 14,
              }}>
                {s.content.map((para, j) => {
                  const parts = para.split(/\*\*(.+?)\*\*/g);
                  return (
                    <p key={j} style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.75, margin: 0 }}>
                      {parts.map((part, k) =>
                        k % 2 === 1
                          ? <strong key={k} style={{ color: "var(--text-primary)", fontWeight: 600 }}>{part}</strong>
                          : part
                      )}
                    </p>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Footer card */}
        <div style={{
          textAlign: "center", padding: "32px 24px",
          background: "var(--surface-1)", borderRadius: 20, border: "1px solid var(--border-subtle)",
        }}>
          <Shield style={{ width: 32, height: 32, color: "var(--brand)", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7 }}>
            Questions? Email us at{" "}
            <a href="mailto:privacy@astramind.ai" style={{ color: "var(--brand-light)", textDecoration: "none", fontWeight: 600 }}>
              privacy@astramind.ai
            </a>
            <br />ASTRAMIND Technologies Pvt. Ltd. · All rights reserved © 2025
          </p>
        </div>
      </main>
    </div>
  );
}
