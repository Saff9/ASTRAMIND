"use client";

import { useState, useEffect } from "react";
import { signIn, useSession, getProviders } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AstraIcon } from "@/components/common/ProviderIcons";
import { Eye, EyeOff, Loader2 } from "lucide-react";

// Google SVG Icon
function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.6 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.5 6.6 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.5 6.6 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.2l-6.3-5.4C29.5 35.3 26.9 36 24 36c-5.3 0-9.8-3.4-11.4-8.1l-6.6 5.1C9.5 39.5 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.3 5.4C37.2 39 44 34 44 24c0-1.3-.1-2.7-.4-3.9z"/>
    </svg>
  );
}

export default function SignInPage() {
  const { status } = useSession();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasGoogle, setHasGoogle] = useState(false);

  // Check if Google provider is available
  useEffect(() => {
    getProviders().then((providers) => {
      setHasGoogle(!!providers?.google);
    });
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/chat");
    }
  }, [status, router]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");
    await signIn("google", { callbackUrl: "/chat" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) { setError("Email is required."); return; }
    if (mode === "signup" && !name.trim()) { setError("Display name is required."); return; }
    if (!password.trim() || password.length < 4) { setError("Password must be at least 4 characters."); return; }

    setLoading(true);
    try {
      const res = await signIn("credentials", {
        redirect: false,
        username: mode === "signup" ? name.trim() : email.split("@")[0],
        email: email.trim(),
        password,
        callbackUrl: "/chat",
      });

      if (res?.error) {
        setError("Invalid credentials. Please check your details.");
      } else if (res?.ok) {
        router.replace("/chat");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || status === "authenticated") {
    return (
      <div style={{ display: "flex", height: "100dvh", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
        <Loader2 style={{ width: 32, height: 32, color: "var(--brand)", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px", borderRadius: 12, fontSize: 14,
    background: "var(--surface-2)", border: "1px solid var(--border-default)",
    color: "var(--text-primary)", outline: "none", boxSizing: "border-box",
    transition: "border-color 0.2s",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)",
    marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase",
  };

  return (
    <div style={{
      display: "flex", height: "100dvh", alignItems: "center", justifyContent: "center",
      background: "var(--bg-primary)", color: "var(--text-primary)", padding: "24px",
      fontFamily: "var(--font-dm, 'DM Sans'), system-ui, sans-serif",
    }}>
      {/* Background glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: "-200px", left: "50%", transform: "translateX(-50%)",
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212,118,59,0.14) 0%, transparent 70%)",
          filter: "blur(60px)",
        }} />
      </div>

      <div style={{
        width: "100%", maxWidth: 420, zIndex: 1,
        background: "var(--surface-1)", border: "1px solid var(--border-default)",
        borderRadius: 24, padding: "36px 32px",
        boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        animation: "scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
      }}>

        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28, gap: 12 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "linear-gradient(135deg, var(--brand), var(--brand-light))",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 24px var(--brand-glow)",
          }}>
            <AstraIcon size={32} />
          </div>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4, fontFamily: "var(--font-syne, 'Syne'), system-ui" }}>
              ASTRAMIND
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {mode === "signin" ? "Welcome back. Sign in to continue." : "Create your free account."}
            </p>
          </div>
        </div>

        {/* Google Sign In */}
        {hasGoogle && (
          <>
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              style={{
                width: "100%", padding: "12px 16px", borderRadius: 12,
                border: "1px solid var(--border-default)",
                background: "var(--surface-2)", color: "var(--text-primary)",
                fontSize: 14, fontWeight: 600, cursor: googleLoading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                transition: "all 0.2s ease",
                opacity: googleLoading ? 0.7 : 1,
              }}
              onMouseEnter={(e) => { if (!googleLoading) { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-3)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--brand)"; }}}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-default)"; }}
            >
              {googleLoading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <GoogleIcon size={18} />}
              Continue with Google
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
              <div style={{ flex: 1, height: 1, background: "var(--border-default)" }} />
              <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>or</span>
              <div style={{ flex: 1, height: 1, background: "var(--border-default)" }} />
            </div>
          </>
        )}

        {/* Mode toggle */}
        <div style={{ display: "flex", background: "var(--surface-2)", borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 }}>
          {(["signin", "signup"] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(""); }} style={{
              flex: 1, padding: "8px 0", borderRadius: 9, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600, transition: "all 0.2s ease",
              background: mode === m ? "var(--surface-3)" : "transparent",
              color: mode === m ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow: mode === m ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
            }}>
              {m === "signin" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Name (signup only) */}
          {mode === "signup" && (
            <div>
              <label style={labelStyle}>Display Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Your name" autoComplete="name" style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = "var(--brand)"; }}
                onBlur={(e) => { e.target.style.borderColor = "var(--border-default)"; }} />
            </div>
          )}

          {/* Email */}
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" autoComplete="email" required style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = "var(--brand)"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--border-default)"; }} />
          </div>

          {/* Password */}
          <div>
            <label style={labelStyle}>Password</label>
            <div style={{ position: "relative" }}>
              <input type={showPass ? "text" : "password"} value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                style={{ ...inputStyle, paddingRight: 44 }}
                onFocus={(e) => { e.target.style.borderColor = "var(--brand)"; }}
                onBlur={(e) => { e.target.style.borderColor = "var(--border-default)"; }} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 4 }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 10, fontSize: 13, background: "rgba(245,100,90,0.08)", border: "1px solid rgba(245,100,90,0.2)", color: "var(--error)" }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "13px 0", marginTop: 4, borderRadius: 12, border: "none",
            background: loading ? "var(--surface-3)" : "linear-gradient(135deg, var(--brand), var(--brand-light))",
            color: loading ? "var(--text-muted)" : "var(--bg-primary)",
            fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            boxShadow: loading ? "none" : "0 4px 16px var(--brand-glow)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            {loading
              ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Processing...</>
              : mode === "signin" ? "Sign In" : "Create Account"
            }
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", marginTop: 20, lineHeight: 1.6 }}>
          By continuing you agree to our{" "}
          <a href="/privacy" style={{ color: "var(--brand-light)", textDecoration: "none" }}>Privacy Policy</a>.
        </p>
      </div>

      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
