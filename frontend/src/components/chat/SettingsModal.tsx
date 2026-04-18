"use client";

import { useState } from "react";
import {
  X, Palette, Monitor, Cpu, Bell, Shield, User,
  Keyboard, Check, ChevronRight, Moon, Sun, Zap,
  Volume2, VolumeX, Eye, EyeOff, Trash2, Download,
} from "lucide-react";
import { useSettings, FONT_CSS_VAR } from "@/lib/SettingsContext";
import type { Theme, FontId } from "@/lib/SettingsContext";
import { neonAuthClient } from "@/lib/auth-client";
import { usePWA } from "@/lib/PWAContext";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

// ────────────────────────────────────────────────────────────────────
// Font catalogue
// ────────────────────────────────────────────────────────────────────
const FONT_OPTIONS: { id: FontId; label: string; type: string; trait: string; preview: string }[] = [
  { id: "dm",        label: "DM Sans",           type: "Sans-serif",  trait: "Friendly curves, highly readable at all sizes",       preview: "The quick brown fox jumps over the lazy dog" },
  { id: "fira",      label: "Fira Code",          type: "Monospaced",  trait: "Programming ligatures, developer-friendly",            preview: "const x = (a, b) => a + b; // 0!=1" },
  { id: "playfair",  label: "Playfair Display",   type: "Serif",       trait: "High contrast, elegant, editorial",                   preview: "Intelligence amplified beautifully" },
  { id: "rajdhani",  label: "Rajdhani",           type: "Sans-serif",  trait: "Geometric, futuristic, highly legible",               preview: "ASTRAMIND · NEURAL INTERFACE · 2025" },
  { id: "pacifico",  label: "Pacifico",           type: "Handwriting", trait: "Warm, personal, brush lettering",                     preview: "Hello from Astramind~" },
  { id: "spacemono", label: "Space Mono",         type: "Monospaced",  trait: "Bold, rounded, nostalgic yet modern",                  preview: "> SYSTEM BOOT · 42 modules loaded_" },
];

const THEME_OPTIONS: { id: Theme; label: string; icon: React.ElementType }[] = [
  { id: "dark",   label: "Dark",   icon: Moon },
  { id: "system", label: "System", icon: Monitor },
  { id: "light",  label: "Light",  icon: Sun },
];

const SECTIONS = [
  { id: "appearance",     label: "Appearance",    icon: Palette },
  { id: "interface",      label: "Interface",      icon: Monitor },
  { id: "ai",             label: "AI Behavior",    icon: Cpu },
  { id: "notifications",  label: "Notifications",  icon: Bell },
  { id: "privacy",        label: "Privacy & Data", icon: Shield },
  { id: "account",        label: "Account",        icon: User },
  { id: "shortcuts",      label: "Shortcuts",      icon: Keyboard },
];

const DENSITY_OPTIONS = ["Compact", "Default", "Comfortable"];

const SHORTCUTS = [
  { action: "New conversation",     keys: ["Ctrl", "Shift", "O"] },
  { action: "Toggle sidebar",       keys: ["Ctrl", "\\"] },
  { action: "Send message",         keys: ["Enter"] },
  { action: "New line",             keys: ["Shift", "Enter"] },
  { action: "Focus input",          keys: ["/"] },
  { action: "Open settings",        keys: ["Ctrl", ","] },
  { action: "Search conversations", keys: ["Ctrl", "K"] },
  { action: "Copy last response",   keys: ["Ctrl", "Shift", "C"] },
];

// ────────────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────────────
export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  // Real context — reads and writes persist to localStorage + DOM
  const { theme, font, setTheme, setFont } = useSettings();
  // Local session state
  const [session, setSession] = useState<{ user?: { email?: string; name?: string } } | null>(undefined as any);
  const user = session?.user;
  const isSignedIn = !!user;

  // Fetch session on mount
  useState(() => {
    async function fetchSession() {
      const { data } = await neonAuthClient.getSession();
      setSession(data ? { user: { email: data.user.email, name: data.user.name || undefined } } : null);
    }
    fetchSession();
  });
  const { isInstallable, triggerInstall } = usePWA();

  // Local-only UI state (not persisted globally)
  const [section, setSection]           = useState("appearance");
  const [density, setDensity]           = useState("Default");
  const [fontSize, setFontSize]         = useState(14);
  const [sounds, setSounds]             = useState(false);
  const [streaming, setStreaming]       = useState(true);
  const [markdown, setMarkdown]         = useState(true);
  const [codeHighlight, setCodeHighlight] = useState(true);
  const [responseLen, setResponseLen]   = useState("balanced");
  const [notifChat, setNotifChat]       = useState(true);
  const [notifUpdate, setNotifUpdate]   = useState(true);
  const [analytics, setAnalytics]       = useState(false);
  const [saveHistory, setSaveHistory]   = useState(true);

  if (!open) return null;

  // ── Reusable sub-components ────────────────────────────────────
  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
        background: value ? "linear-gradient(135deg,var(--brand),var(--brand-light))" : "var(--surface-3)",
        position: "relative", transition: "background 0.25s ease", flexShrink: 0,
        boxShadow: value ? "0 0 10px var(--brand-glow)" : "none",
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: value ? 21 : 3, width: 16, height: 16,
        borderRadius: "50%", background: "#fff",
        transition: "left 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
      }} />
    </button>
  );

  const Row = ({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--border-subtle)" }}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{label}</p>
        {sub && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{sub}</p>}
      </div>
      {children}
    </div>
  );

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 2, marginTop: 16 }}>
      {children}
    </h3>
  );

  // ── Section renderers ──────────────────────────────────────────
  const renderSection = () => {

    // ── APPEARANCE ─────────────────────────────────────────────────
    if (section === "appearance") return (
      <div>
        <SectionTitle>Theme</SectionTitle>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 10px" }}>
          Applies instantly and is saved for future sessions.
        </p>
        <div style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
          {THEME_OPTIONS.map(t => {
            const TIcon = t.icon;
            const active = theme === t.id;
            return (
              <button key={t.id} onClick={() => setTheme(t.id)} style={{
                flex: 1, padding: "14px 8px", borderRadius: 12,
                border: `1.5px solid ${active ? "var(--brand)" : "var(--border-default)"}`,
                background: active ? "var(--brand-glow)" : "var(--surface-2)",
                color: active ? "var(--brand-light)" : "var(--text-secondary)",
                cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                transition: "all 0.2s ease",
                boxShadow: active ? "0 0 0 3px rgba(232,160,48,0.12)" : "none",
              }}>
                <TIcon style={{ width: 20, height: 20 }} />
                <span style={{ fontSize: 13, fontWeight: active ? 700 : 500 }}>{t.label}</span>
                {active && (
                  <span style={{ fontSize: 10, color: "var(--brand)", fontWeight: 700, letterSpacing: "0.06em" }}>
                    ACTIVE
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <SectionTitle>Interface Font</SectionTitle>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 10px" }}>
          Changes the font used across all text in the app — applied immediately.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FONT_OPTIONS.map(f => {
            const active = font === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFont(f.id)}
                style={{
                  display: "flex", gap: 14, alignItems: "flex-start",
                  padding: "14px 16px", borderRadius: 14,
                  border: `1.5px solid ${active ? "var(--brand)" : "var(--border-default)"}`,
                  background: active ? "var(--brand-glow)" : "var(--surface-2)",
                  cursor: "pointer", textAlign: "left", transition: "all 0.2s ease",
                  boxShadow: active ? "0 0 0 3px rgba(232,160,48,0.1)" : "none",
                }}
              >
                {/* Radio dot */}
                <div style={{
                  width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                  border: `2px solid ${active ? "var(--brand)" : "var(--border-strong)"}`,
                  background: active ? "var(--brand)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s ease",
                }}>
                  {active && <Check style={{ width: 10, height: 10, color: "var(--bg-primary)" }} />}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: 15, fontWeight: 700,
                      color: active ? "var(--brand-light)" : "var(--text-primary)",
                      fontFamily: FONT_CSS_VAR[f.id],
                    }}>{f.label}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
                      padding: "1px 7px", borderRadius: 100,
                      background: "var(--surface-3)", color: "var(--text-muted)",
                    }}>{f.type}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6, lineHeight: 1.4 }}>
                    {f.trait}
                  </p>
                  {/* Live preview rendered IN that font */}
                  <p style={{
                    fontSize: 13, fontFamily: FONT_CSS_VAR[f.id],
                    color: active ? "var(--text-secondary)" : "var(--text-muted)",
                    lineHeight: 1.5, overflow: "hidden",
                    whiteSpace: "nowrap", textOverflow: "ellipsis",
                    fontStyle: "italic",
                  }}>{f.preview}</p>
                </div>
              </button>
            );
          })}
        </div>

        <SectionTitle>Font Size</SectionTitle>
        <div style={{ marginTop: 8, padding: "16px", background: "var(--surface-2)", borderRadius: 12, border: "1px solid var(--border-default)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 24 }}>A</span>
            <input type="range" min={12} max={18} value={fontSize}
              onChange={e => {
                const v = +e.target.value;
                setFontSize(v);
                document.body.style.fontSize = `${v}px`;
              }}
              style={{ flex: 1, accentColor: "var(--brand)", cursor: "pointer" }} />
            <span style={{ fontSize: 16, color: "var(--text-muted)", minWidth: 24, textAlign: "right" }}>A</span>
            <span style={{
              minWidth: 36, fontSize: 12, fontWeight: 600, color: "var(--brand-light)",
              background: "var(--brand-glow)", padding: "2px 8px", borderRadius: 6, textAlign: "center",
            }}>{fontSize}px</span>
          </div>
        </div>

        <SectionTitle>Density</SectionTitle>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          {DENSITY_OPTIONS.map(d => (
            <button key={d} onClick={() => setDensity(d)} style={{
              flex: 1, padding: "10px", borderRadius: 10,
              border: `1.5px solid ${density === d ? "var(--brand)" : "var(--border-default)"}`,
              background: density === d ? "var(--brand-glow)" : "var(--surface-2)",
              color: density === d ? "var(--brand-light)" : "var(--text-secondary)",
              cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.2s ease",
            }}>{d}</button>
          ))}
        </div>
      </div>
    );

    // ── INTERFACE ──────────────────────────────────────────────────
    if (section === "interface") return (
      <div>
        <Row label="Streaming responses" sub="Show AI reply as it's generated"><Toggle value={streaming} onChange={setStreaming} /></Row>
        <Row label="Markdown rendering" sub="Format bold, italics, code blocks"><Toggle value={markdown} onChange={setMarkdown} /></Row>
        <Row label="Code syntax highlighting" sub="Color-code programming snippets"><Toggle value={codeHighlight} onChange={setCodeHighlight} /></Row>
        <Row label="Sound effects" sub="Play audio on send / receive">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {sounds ? <Volume2 style={{ width: 16, height: 16, color: "var(--brand)" }} /> : <VolumeX style={{ width: 16, height: 16, color: "var(--text-muted)" }} />}
            <Toggle value={sounds} onChange={setSounds} />
          </div>
        </Row>
        <Row label="Show message timestamps"><Toggle value={true} onChange={() => {}} /></Row>
        <Row label="Auto-scroll to latest"><Toggle value={true} onChange={() => {}} /></Row>
        
        {isInstallable && (
          <Row label="Install ASTRAMIND App" sub="Add to your device for offline & full-screen access">
            <button
              onClick={triggerInstall}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 16px", borderRadius: 10,
                background: "var(--brand-glow)", border: "none", color: "var(--brand-light)",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 0 10px rgba(232,160,48,0.2)"
              }}
            >
              <Download style={{ width: 15, height: 15 }} />
              Install
            </button>
          </Row>
        )}
      </div>
    );

    // ── AI BEHAVIOR ────────────────────────────────────────────────
    if (section === "ai") return (
      <div>
        <SectionTitle>Response Length</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, marginBottom: 20 }}>
          {[
            { id: "concise",  label: "Concise",  desc: "Short, direct answers" },
            { id: "balanced", label: "Balanced", desc: "Comprehensive with examples — default" },
            { id: "detailed", label: "Detailed", desc: "In-depth explanations and analysis" },
          ].map(opt => (
            <button key={opt.id} onClick={() => setResponseLen(opt.id)} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12,
              border: `1.5px solid ${responseLen === opt.id ? "var(--brand)" : "var(--border-default)"}`,
              background: responseLen === opt.id ? "var(--brand-glow)" : "var(--surface-2)",
              cursor: "pointer", textAlign: "left", transition: "all 0.2s ease",
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                border: `2px solid ${responseLen === opt.id ? "var(--brand)" : "var(--border-strong)"}`,
                background: responseLen === opt.id ? "var(--brand)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {responseLen === opt.id && <Check style={{ width: 9, height: 9, color: "var(--bg-primary)" }} />}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: responseLen === opt.id ? "var(--brand-light)" : "var(--text-primary)" }}>{opt.label}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
        <Row label="Show model badge per message"><Toggle value={true} onChange={() => {}} /></Row>
        <Row label="Show thinking process"><Toggle value={false} onChange={() => {}} /></Row>
        <Row label="Web search by default"><Toggle value={false} onChange={() => {}} /></Row>
        <Row label="Auto-suggest follow-ups"><Toggle value={true} onChange={() => {}} /></Row>
        <SectionTitle>Default System Prompt</SectionTitle>
        <textarea
          placeholder="You are ASTRAMIND, a helpful and precise AI assistant…"
          style={{
            width: "100%", minHeight: 80, resize: "vertical",
            background: "var(--surface-2)", border: "1px solid var(--border-default)",
            borderRadius: 12, padding: "12px 14px", fontSize: 13, color: "var(--text-secondary)",
            fontFamily: "inherit", outline: "none", marginTop: 8, lineHeight: 1.6,
          }}
        />
      </div>
    );

    // ── NOTIFICATIONS ──────────────────────────────────────────────
    if (section === "notifications") return (
      <div>
        <Row label="Chat completion alerts" sub="Notify when long tasks finish"><Toggle value={notifChat} onChange={setNotifChat} /></Row>
        <Row label="Product updates" sub="New features and announcements"><Toggle value={notifUpdate} onChange={setNotifUpdate} /></Row>
        <Row label="Weekly usage digest"><Toggle value={false} onChange={() => {}} /></Row>
        <Row label="Push notifications" sub="Requires browser permission"><Toggle value={false} onChange={() => {}} /></Row>
        <Row label="Email notifications"><Toggle value={false} onChange={() => {}} /></Row>
        <div style={{ marginTop: 20, padding: 14, background: "rgba(124,106,245,0.06)", borderRadius: 12, border: "1px solid rgba(124,106,245,0.18)" }}>
          <div style={{ display: "flex", gap: 10 }}>
            <Zap style={{ width: 16, height: 16, color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Real-time notifications require browser permission.{" "}
              <span style={{ color: "var(--accent)", cursor: "pointer", fontWeight: 500 }}>Enable now →</span>
            </p>
          </div>
        </div>
      </div>
    );

    // ── PRIVACY & DATA ─────────────────────────────────────────────
    if (section === "privacy") return (
      <div>
        <Row label="Usage analytics" sub="Help improve ASTRAMIND (anonymous)">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {analytics ? <Eye style={{ width: 15, height: 15, color: "var(--brand)" }} /> : <EyeOff style={{ width: 15, height: 15, color: "var(--text-muted)" }} />}
            <Toggle value={analytics} onChange={setAnalytics} />
          </div>
        </Row>
        <Row label="Save conversation history"><Toggle value={saveHistory} onChange={setSaveHistory} /></Row>
        <Row label="Allow model fine-tuning"><Toggle value={false} onChange={() => {}} /></Row>
        <Row label="Data encryption at rest">
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--success)", background: "rgba(61,214,140,0.1)", padding: "4px 10px", borderRadius: 100 }}>Active</span>
        </Row>
        <SectionTitle>Data Management</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
          <button style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12,
            background: "var(--surface-2)", border: "1px solid var(--border-default)",
            color: "var(--text-secondary)", cursor: "pointer", fontSize: 13, fontWeight: 500,
          }}>
            <Download style={{ width: 15, height: 15 }} />
            Export all conversations (JSON)
          </button>
          <button style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12,
            background: "rgba(245,100,90,0.06)", border: "1px solid rgba(245,100,90,0.2)",
            color: "var(--error)", cursor: "pointer", fontSize: 13, fontWeight: 500,
          }}>
            <Trash2 style={{ width: 15, height: 15 }} />
            Clear all conversation history
          </button>
        </div>
        <div style={{ marginTop: 16, padding: 14, background: "var(--surface-2)", borderRadius: 12, border: "1px solid var(--border-subtle)" }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
            Read our{" "}
            <a href="/privacy" style={{ color: "var(--brand-light)", textDecoration: "none", fontWeight: 500 }}>Privacy Policy</a>
            {" "}to understand how we handle your data.
          </p>
        </div>
      </div>
    );

    // ── ACCOUNT ────────────────────────────────────────────────────
    if (section === "account") {
      if (!isSignedIn || !user) {
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center", height: "100%" }}>
            <User style={{ width: 48, height: 48, color: "var(--text-muted)", marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>Sign in to sync your settings</h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 24, maxWidth: 320 }}>
              Create an account to save your font, theme, and API keys securely across all your devices.
            </p>
            <button
               onClick={onClose}
               style={{
                 padding: "12px 24px", borderRadius: 12, background: "linear-gradient(135deg,var(--brand),var(--brand-light))",
                 color: "var(--bg-primary)", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer",
                 boxShadow: "0 8px 24px var(--brand-glow)",
               }}>
              Sign In Now 
            </button>
          </div>
        );
      }

      return (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 20, background: "var(--surface-2)", borderRadius: 16, border: "1px solid var(--border-default)", marginBottom: 20 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div style={{ width: 52, height: 52, borderRadius: "50%", flexShrink: 0, border: "2px solid var(--border-default)", background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "var(--bg-primary)" }}>
              {user.name?.[0]?.toUpperCase() || "A"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name || "Astramind User"}</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</p>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--success)", background: "rgba(61,214,140,0.1)", padding: "2px 10px", borderRadius: 100, marginTop: 4, display: "inline-block" }}>Verified</span>
            </div>
          </div>
          <Row label="Email address" sub={user.email || ""}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>NextAuth</span>
          </Row>
          <Row label="Security" sub="Managed securely by JWT">
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>Active</span>
          </Row>
          <div style={{ marginTop: 24 }}>
            <button 
              onClick={async () => { 
                await neonAuthClient.signOut();
                onClose();
                window.location.href = "/"; // Force refresh to clear state
              }}
              style={{
              width: "100%", padding: "12px", borderRadius: 12,
              border: "1px solid rgba(245,100,90,0.3)",
              background: "rgba(245,100,90,0.06)", color: "var(--error)", cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}>Sign out</button>
          </div>
        </div>
      );
    }

    // ── SHORTCUTS ──────────────────────────────────────────────────
    if (section === "shortcuts") return (
      <div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.6 }}>
          Keyboard shortcuts available throughout ASTRAMIND.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {SHORTCUTS.map(s => (
            <div key={s.action} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 14px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border-subtle)",
            }}>
              <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{s.action}</span>
              <div style={{ display: "flex", gap: 4 }}>
                {s.keys.map(k => (
                  <kbd key={k} style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                    background: "var(--surface-3)", border: "1px solid var(--border-strong)",
                    color: "var(--text-primary)", fontFamily: "var(--font-mono,'JetBrains Mono')",
                  }}>{k}</kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );

    return null;
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
        animation: "fadeIn 0.2s ease",
      }} />

      {/* Dialog */}
      <div className="mobile-fullscreen-modal" style={{
        position: "fixed", top: "50%", left: "50%", zIndex: 201,
        transform: "translate(-50%,-50%)",
        width: "min(760px, 96vw)", height: "min(640px, 92vh)",
        display: "flex", flexDirection: "column",
        background: "var(--surface-1)", border: "1px solid var(--border-default)",
        borderRadius: 20, overflow: "hidden",
        boxShadow: "0 24px 80px rgba(0,0,0,0.9), 0 0 0 1px var(--border-subtle)",
        animation: "scaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        {/* Header */}
        <div style={{
          flexShrink: 0, padding: "18px 20px 16px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "var(--surface-1)",
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Settings</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Personalise your ASTRAMIND experience</p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 10, border: "none",
              background: "var(--surface-2)", color: "var(--text-muted)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-3)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Body */}
        <div className="settings-body" style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {/* Left nav */}
          <nav className="settings-nav" style={{
            width: 160, flexShrink: 0, borderRight: "1px solid var(--border-subtle)",
            padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto",
            background: "var(--surface-1)",
          }}>
            {SECTIONS.map(s => {
              const Icon = s.icon;
              const active = section === s.id;
              return (
                <button key={s.id} onClick={() => setSection(s.id)} style={{
                  display: "flex", alignItems: "center", gap: 9, padding: "9px 12px",
                  borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13,
                  fontWeight: active ? 600 : 400, whiteSpace: "nowrap",
                  background: active ? "var(--surface-3)" : "transparent",
                  color: active ? "var(--text-primary)" : "var(--text-muted)",
                  transition: "all 0.15s ease",
                }}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)"; } }}
                  onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; } }}
                >
                  <Icon style={{ width: 15, height: 15, flexShrink: 0 }} />
                  {s.label}
                  {active && <ChevronRight className="mobile-hidden" style={{ width: 13, height: 13, marginLeft: "auto", color: "var(--text-muted)" }} />}
                </button>
              );
            })}
          </nav>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", background: "var(--bg-primary)" }}>
            {renderSection()}
          </div>
        </div>
      </div>
    </>
  );
}
