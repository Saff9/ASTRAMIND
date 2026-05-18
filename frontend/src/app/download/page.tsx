"use client";

import Link from "next/link";
import { Smartphone, Download, Check, Shield, Zap, RefreshCw, Monitor, Globe, ArrowRight } from "lucide-react";
import { AstraIcon } from "@/components/common/ProviderIcons";

const GITHUB_RELEASE_URL = "https://github.com/Saff9/ASTRAMIND/releases/latest";
const APP_VERSION = "2.0.3";

export default function DownloadPage() {
  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh", color: "var(--text-primary)", position: "relative", overflow: "hidden" }}>

      {/* Glow bg */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -200, left: "30%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(242,169,59,0.1) 0%, transparent 70%)", filter: "blur(80px)" }} />
        <div style={{ position: "absolute", bottom: -100, right: "10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,122,252,0.08) 0%, transparent 70%)", filter: "blur(80px)" }} />
      </div>

      {/* Nav */}
      <nav style={{ padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-subtle)", position: "relative", zIndex: 10 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,var(--brand),var(--brand-light))", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AstraIcon size={18} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 15, color: "var(--text-primary)" }}>ASTRAMIND</span>
        </Link>
        <Link href="/chat">
          <button style={{ padding: "8px 20px", borderRadius: 10, background: "linear-gradient(135deg,var(--brand),var(--brand-light))", color: "var(--bg-primary)", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            Open Web App <ArrowRight size={14} />
          </button>
        </Link>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "80px 24px 60px", textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ width: 80, height: 80, borderRadius: 28, background: "linear-gradient(135deg,var(--brand),var(--brand-light))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px", boxShadow: "0 12px 40px rgba(242,169,59,0.35)" }}>
          <AstraIcon size={44} />
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24, background: "rgba(242,169,59,0.12)", border: "1px solid rgba(242,169,59,0.25)", borderRadius: 100, padding: "5px 16px" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "glow-pulse 2s ease-in-out infinite" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", letterSpacing: "0.08em", textTransform: "uppercase" }}>v{APP_VERSION} · Now Available</span>
        </div>

        <h1 style={{ fontSize: "clamp(2.5rem, 7vw, 4rem)", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 20 }}>
          Get ASTRAMIND on{" "}
          <span style={{ background: "linear-gradient(135deg, #f2a93b, #ffd080)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Every Device
          </span>
        </h1>
        <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)", maxWidth: 560, margin: "0 auto 48px", lineHeight: 1.65 }}>
          Chat with the world's best AI models from your Android phone, browser, or desktop. Works offline. No App Store needed.
        </p>

        {/* Download Options Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, maxWidth: 780, margin: "0 auto", textAlign: "left" }}>

          {/* Android APK */}
          <div style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.03))", border: "1.5px solid rgba(34,197,94,0.3)", borderRadius: 24, padding: 32, position: "relative" }}>
            <div style={{ display: "inline-flex", padding: "5px 12px", borderRadius: 100, background: "rgba(34,197,94,0.15)", color: "#22c55e", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
              Android APK
            </div>
            <div style={{ fontSize: 36, marginBottom: 12 }}>
              <Smartphone size={36} style={{ color: "#22c55e" }} />
            </div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: 8 }}>ASTRAMIND Android</h2>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.5 }}>
              Native-feeling Android app built with Trusted Web Activity (TWA). Works on Android 7.0+.
            </p>
            <ul style={{ listStyle: "none", padding: 0, marginBottom: 28, display: "flex", flexDirection: "column", gap: 8 }}>
              {["No Google Play required", "Auto-updates with the web app", "Full offline support", "Push notifications ready"].map(f => (
                <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
                  <Check size={14} style={{ color: "#22c55e", flexShrink: 0 }} /> {f}
                </li>
              ))}
            </ul>
            <a
              href={`${GITHUB_RELEASE_URL}/download/ASTRAMIND-v${APP_VERSION}.apk`}
              download
              style={{ textDecoration: "none" }}
            >
              <button style={{ width: "100%", padding: "14px 20px", borderRadius: 14, fontWeight: 700, fontSize: 15, background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 20px rgba(34,197,94,0.3)", transition: "all 0.2s" }}>
                <Download size={18} /> Download APK (v{APP_VERSION})
              </button>
            </a>
            <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", marginTop: 10 }}>
              ~8MB · Android 7.0+ · <a href={GITHUB_RELEASE_URL} target="_blank" rel="noopener noreferrer" style={{ color: "#22c55e" }}>View all releases</a>
            </p>
          </div>

          {/* Progressive Web App */}
          <div style={{ background: "rgba(242,169,59,0.06)", border: "1.5px solid rgba(242,169,59,0.28)", borderRadius: 24, padding: 32, position: "relative" }}>
            <div style={{ display: "inline-flex", padding: "5px 12px", borderRadius: 100, background: "rgba(242,169,59,0.15)", color: "#f2a93b", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
              Web App (PWA)
            </div>
            <div style={{ marginBottom: 12 }}>
              <Globe size={36} style={{ color: "#f2a93b" }} />
            </div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: 8 }}>Install from Browser</h2>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.5 }}>
              Works on all devices — Android, iPhone, Mac, Windows. Install directly from Chrome or Safari.
            </p>
            <ul style={{ listStyle: "none", padding: 0, marginBottom: 28, display: "flex", flexDirection: "column", gap: 8 }}>
              {["iOS & Android Safari", "Chrome & Edge on Desktop", "Always up-to-date automatically", "No download needed"].map(f => (
                <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
                  <Check size={14} style={{ color: "#f2a93b", flexShrink: 0 }} /> {f}
                </li>
              ))}
            </ul>
            <Link href="/chat" style={{ textDecoration: "none" }}>
              <button style={{ width: "100%", padding: "14px 20px", borderRadius: 14, fontWeight: 700, fontSize: 15, background: "linear-gradient(135deg, #f2a93b, #ffd080)", color: "#1a1612", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 20px rgba(242,169,59,0.3)", transition: "all 0.2s" }}>
                <Monitor size={18} /> Open in Browser
              </button>
            </Link>
            <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", marginTop: 10 }}>
              Click ⊕ or "Add to Home Screen" in your browser
            </p>
          </div>

        </div>
      </div>

      {/* Install Instructions */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 24px 80px", position: "relative", zIndex: 1 }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, textAlign: "center", marginBottom: 32 }}>How to Install the APK</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          {[
            { step: "01", icon: "⬇️", title: "Download APK", desc: "Tap the Download button above. Your browser will download the APK file." },
            { step: "02", icon: "⚙️", title: "Allow Unknown Apps", desc: "Go to Settings → Security → Install unknown apps → Allow your browser." },
            { step: "03", icon: "📦", title: "Install", desc: "Open the APK file from your Downloads folder and tap Install." },
            { step: "04", icon: "🚀", title: "Launch", desc: "Find ASTRAMIND on your home screen. Sign in and start chatting!" },
          ].map(item => (
            <div key={item.step} style={{ padding: 24, background: "var(--surface-1)", border: "1px solid var(--border-subtle)", borderRadius: 20, textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text-muted)", letterSpacing: "0.15em", marginBottom: 8 }}>STEP {item.step}</div>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 6 }}>{item.title}</h3>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 32, padding: 24, borderRadius: 20, background: "rgba(139,122,252,0.08)", border: "1px solid rgba(139,122,252,0.2)", textAlign: "center" }}>
          <Shield size={24} style={{ color: "#8b7afc", margin: "0 auto 12px" }} />
          <h3 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 8 }}>Built with Google's Trusted Web Activity</h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
            The ASTRAMIND APK is a Trusted Web Activity (TWA) — the same technology used by apps like Starbucks and Trivago. It's not a random APK — it's cryptographically bound to our verified web domain. Questions? <a href="mailto:saffanakbar942@gmail.com" style={{ color: "#8b7afc" }}>saffanakbar942@gmail.com</a>
          </p>
        </div>

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--text-muted)", fontSize: 13 }}>
            <RefreshCw size={14} />
            <span>Auto-updates: The app always reflects the latest web version. No manual update needed.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
