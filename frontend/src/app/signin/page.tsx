"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { neonAuthClient } from "@/lib/auth-client";
import { AstraIcon } from "@/components/common/ProviderIcons";
import { Loader2, Lock, Shield, Zap } from "lucide-react";

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.6 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.5 6.6 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.5 6.6 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.2l-6.3-5.4C29.5 35.3 26.9 36 24 36c-5.3 0-9.8-3.4-11.4-8.1l-6.6 5.1C9.5 39.5 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.3 5.4C37.2 39 44 34 44 24c0-1.3-.1-2.7-.4-3.9z"/>
    </svg>
  );
}

const BENEFITS = [
  { emoji: "🔐", text: "No passwords to create or lose" },
  { emoji: "⚡", text: "One-click sign in, every time" },
  { emoji: "🛡️", text: "Protected by Google's 2FA security" },
];

const TRUST_BADGES = [
  { icon: <Lock size={11} />, label: "TLS Encrypted" },
  { icon: <Shield size={11} />, label: "No spam, ever" },
  { icon: <Zap size={11} />, label: "Free to use" },
];

export default function SignInPage() {
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkSession() {
      try {
        const { data } = await neonAuthClient.getSession();
        if (data) {
          setStatus("authenticated");
          router.replace("/chat");
        } else {
          setStatus("unauthenticated");
        }
      } catch {
        setStatus("unauthenticated");
      }
    }
    checkSession();
  }, [router]);

  useEffect(() => {
    if (status === "authenticated") router.replace("/chat");
  }, [status, router]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      await neonAuthClient.signIn.social({ provider: "google", callbackURL: "/chat" });
    } catch (err: unknown) {
      setError((err as Error).message || "Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  if (status === "loading" || status === "authenticated") {
    return (
      <div style={{ display: "flex", height: "100dvh", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", flexDirection: "column", gap: 16 }}>
        <Loader2 style={{ width: 32, height: 32, color: "var(--brand)", animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-dm,'DM Sans'),sans-serif" }}>Loading…</p>
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", minHeight: "100dvh", alignItems: "center", justifyContent: "center",
      background: "var(--bg-primary)", color: "var(--text-primary)", padding: "24px",
      fontFamily: "var(--font-dm,'DM Sans'),system-ui,sans-serif",
    }}>
      {/* Background glow orbs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-180px", left: "50%", transform: "translateX(-50%)", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,118,59,0.2) 0%, transparent 70%)", filter: "blur(80px)" }} />
        <div style={{ position: "absolute", bottom: "-100px", right: "-100px", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,122,252,0.12) 0%, transparent 70%)", filter: "blur(80px)" }} />
      </div>

      <div style={{
        width: "100%", maxWidth: 420, zIndex: 1,
        background: "var(--surface-1)", border: "1px solid var(--border-default)",
        borderRadius: 28, padding: "44px 36px",
        boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
        animation: "scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1)",
      }}>

        {/* Logo & Branding */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 36, gap: 14 }}>
          <div style={{
            width: 68, height: 68, borderRadius: 22,
            background: "linear-gradient(135deg, var(--brand), var(--brand-light))",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 32px var(--brand-glow), 0 0 0 10px rgba(212,118,59,0.08)",
            animation: "logoPulse 3s ease-in-out infinite",
          }}>
            <AstraIcon size={38} />
          </div>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 6, fontFamily: "var(--font-syne,'Syne'),sans-serif" }}>
              ASTRAMIND
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 280 }}>
              The world&apos;s fastest multi-AI platform.<br />Sign in to get started — it&apos;s completely free.
            </p>
          </div>
        </div>

        {/* Google Sign In Button */}
        <button
          id="google-signin-btn"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          style={{
            width: "100%", padding: "14px 16px", borderRadius: 14,
            border: "1px solid var(--border-default)",
            background: "var(--surface-2)", color: "var(--text-primary)",
            fontSize: 15, fontWeight: 600, cursor: googleLoading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            transition: "all 0.2s ease", opacity: googleLoading ? 0.7 : 1,
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
          onMouseEnter={(e) => {
            if (!googleLoading) {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.background = "var(--surface-3)";
              btn.style.borderColor = "var(--brand)";
              btn.style.transform = "translateY(-1px)";
              btn.style.boxShadow = "0 6px 20px rgba(0,0,0,0.3)";
            }
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.background = "var(--surface-2)";
            btn.style.borderColor = "var(--border-default)";
            btn.style.transform = "";
            btn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
          }}
        >
          {googleLoading
            ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            : <GoogleIcon size={20} />
          }
          {googleLoading ? "Signing in…" : "Continue with Google"}
        </button>

        {/* Error */}
        {error && (
          <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, fontSize: 13, background: "rgba(245,100,90,0.08)", border: "1px solid rgba(245,100,90,0.2)", color: "var(--error)" }}>
            {error}
          </div>
        )}

        {/* Why Google divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0 16px" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
          <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.1em" }}>WHY GOOGLE ONLY?</span>
          <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
        </div>

        {/* Benefits */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
          {BENEFITS.map((item) => (
            <div key={item.emoji} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--text-secondary)" }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{item.emoji}</span>
              {item.text}
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
          {TRUST_BADGES.map((b) => (
            <div key={b.label} style={{
              display: "flex", alignItems: "center", gap: 5, fontSize: 11,
              padding: "4px 10px", borderRadius: 100,
              background: "var(--surface-3)", color: "var(--text-muted)",
              border: "1px solid var(--border-subtle)",
            }}>
              {b.icon} {b.label}
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.65 }}>
          By continuing you agree to our{" "}
          <a href="/privacy" style={{ color: "var(--brand-light)", textDecoration: "none", fontWeight: 600 }}>Privacy Policy</a>
          {" & "}
          <a href="/disclaimer" style={{ color: "var(--brand-light)", textDecoration: "none", fontWeight: 600 }}>Disclaimer</a>.
        </p>
      </div>

      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92) translateY(14px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes logoPulse {
          0%, 100% { box-shadow: 0 8px 32px var(--brand-glow), 0 0 0 10px rgba(212,118,59,0.08); }
          50%       { box-shadow: 0 8px 32px var(--brand-glow), 0 0 0 14px rgba(212,118,59,0.16); }
        }
      `}</style>
    </div>
  );
}
