"use client";

import React, { useState } from "react";
import {
  X, Moon, Sun, Monitor, Check, Palette, Layout,
  Brain, Shield, Bell, User, Keyboard, Download, Trash2,
  LogOut, Cpu,
} from "lucide-react";
import { neonAuthClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useSettings, FontId } from "@/lib/SettingsContext";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportChat?: (format: 'json' | 'doc') => void;
  onClearHistory?: () => void;
}

// ─── Safe localStorage helpers ────────────────────────────────────────────────
function lsGet(key: string, fallback = ""): string {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function lsSet(key: string, val: string) {
  try { localStorage.setItem(key, val); } catch { /* ignore */ }
}

// ─── Extracted sub-components ─────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      style={{
        width: 42, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
        background: value ? "var(--brand)" : "var(--surface-3)",
        position: "relative", transition: "background 0.2s ease", flexShrink: 0,
        boxShadow: value ? "0 0 8px var(--brand-glow)" : "none",
      }}
    >
      <span style={{
        position: "absolute", top: 3, width: 18, height: 18, borderRadius: "50%",
        background: "white", transition: "left 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        left: value ? 21 : 3,
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }} />
    </button>
  );
}

function Row({ label, subtitle, children }: { label: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "11px 0", borderBottom: "1px solid var(--border-subtle)",
      gap: 12,
    }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>{label}</p>
        {subtitle && <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
      textTransform: "uppercase", color: "var(--text-muted)",
      margin: "18px 0 8px",
    }}>
      {children}
    </p>
  );
}

const NAV_ITEMS = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "interface", label: "Interface", icon: Layout },
  { id: "ai", label: "AI Behavior", icon: Brain },
  { id: "skills", label: "Skills & ACP", icon: Cpu },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy & Data", icon: Shield },
  { id: "account", label: "Account", icon: User },
  { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
];

const FONTS = [
  { id: "dm-sans", label: "DM Sans", var: "'DM Sans', sans-serif" },
  { id: "inter", label: "Inter", var: "'Inter', sans-serif" },
  { id: "system", label: "System UI", var: "system-ui, sans-serif" },
  { id: "mono", label: "Monospace", var: "'JetBrains Mono', monospace" },
  { id: "serif", label: "Georgia", var: "Georgia, serif" },
  { id: "nunito", label: "Nunito", var: "'Nunito', sans-serif" },
];

const SHORTCUTS = [
  { keys: ["Ctrl", "K"], action: "Search conversations" },
  { keys: ["Ctrl", "Shift", "N"], action: "New conversation" },
  { keys: ["Enter"], action: "Send message" },
  { keys: ["Shift", "Enter"], action: "New line in input" },
  { keys: ["Esc"], action: "Close modal / stop stream" },
  { keys: ["Ctrl", ","], action: "Open settings" },
  { keys: ["Ctrl", "Shift", "D"], action: "Toggle dark / light mode" },
  { keys: ["Ctrl", "E"], action: "Export conversation" },
];

export default function SettingsModal({ isOpen, onClose, onExportChat, onClearHistory }: SettingsModalProps) {
  const router = useRouter();
  const { theme, setTheme, font: ctxFont, setFont: ctxSetFont } = useSettings();
  const [section, setSection] = useState("appearance");
  const [session, setSession] = useState<{ user?: { email?: string; name?: string } } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const modalRef = React.useRef<HTMLDivElement>(null);

  // Map between our display FontId strings and context FontId enum
  const FONT_ID_MAP: Record<string, string> = {
    "dm-sans":  "dm",
    "inter":    "inter",   // not in context enum — falls back to dm
    "system":   "dm",
    "mono":     "fira",
    "serif":    "playfair",
    "nunito":   "rajdhani",
  };
  const FONT_DISPLAY_MAP: Record<string, string> = {
    "dm":        "dm-sans",
    "fira":      "mono",
    "playfair":  "serif",
    "rajdhani":  "nunito",
    "pacifico":  "dm-sans",
    "spacemono": "mono",
  };
  // Current display key derived from context font
  const globalFont = FONT_DISPLAY_MAP[ctxFont] || "dm-sans";

  const setGlobalFont = (displayId: string) => {
    const ctxId = FONT_ID_MAP[displayId] || "dm";
    ctxSetFont(ctxId as FontId);
    // Also persist with the display key for the local font settings
    lsSet("astramind_ui_font", displayId);
  };

  // ── Persisted settings ──────────────────────────────────────────────────────
  const [density, setDensityRaw] = useState(() => lsGet("astramind_density", "default"));
  const [fontSize, setFontSizeRaw] = useState(() => parseInt(lsGet("astramind_fontsize", "15")));
  const [streaming, setStreamingRaw] = useState(() => lsGet("astramind_streaming", "true") === "true");
  const [markdownEnabled, setMarkdownRaw] = useState(() => lsGet("astramind_markdown", "true") === "true");
  const [codeHighlight, setCodeHighlightRaw] = useState(() => lsGet("astramind_codehighlight", "true") === "true");
  const [sounds, setSoundsRaw] = useState(() => lsGet("astramind_sounds", "false") === "true");
  const [voiceGender, setVoiceGenderRaw] = useState(() => lsGet("astramind_voice_gender", "female"));
  const [responseLen, setResponseLenRaw] = useState(() => lsGet("astramind_response_len", "balanced"));
  const [customSkills, setCustomSkillsRaw] = useState(() => lsGet("astramind_custom_skills", ""));
  const [acpTools, setAcpToolsRaw] = useState(() => lsGet("astramind_acp_tools", ""));
  const [notifChat, setNotifChatRaw] = useState(() => lsGet("astramind_notif_chat", "true") === "true");
  const [notifUpdate, setNotifUpdateRaw] = useState(() => lsGet("astramind_notif_update", "true") === "true");
  const [analytics, setAnalyticsRaw] = useState(() => lsGet("astramind_analytics", "true") === "true");
  const [saveHistory, setSaveHistoryRaw] = useState(() => lsGet("astramind_save_history", "true") === "true");

  // Persisted setters
  const setDensity = (v: string) => { setDensityRaw(v); lsSet("astramind_density", v); };
  const setFontSize = (v: number) => { setFontSizeRaw(v); lsSet("astramind_fontsize", String(v)); document.documentElement.style.fontSize = `${v}px`; };
  const setStreaming = (v: boolean) => { setStreamingRaw(v); lsSet("astramind_streaming", String(v)); };
  const setMarkdown = (v: boolean) => { setMarkdownRaw(v); lsSet("astramind_markdown", String(v)); };
  const setCodeHighlight = (v: boolean) => { setCodeHighlightRaw(v); lsSet("astramind_codehighlight", String(v)); };
  const setSounds = (v: boolean) => { setSoundsRaw(v); lsSet("astramind_sounds", String(v)); };
  const setVoiceGender = (v: string) => { setVoiceGenderRaw(v); lsSet("astramind_voice_gender", v); };
  const setResponseLen = (v: string) => { setResponseLenRaw(v); lsSet("astramind_response_len", v); };
  const setCustomSkills = (v: string) => { setCustomSkillsRaw(v); lsSet("astramind_custom_skills", v); };
  const setAcpTools = (v: string) => { setAcpToolsRaw(v); lsSet("astramind_acp_tools", v); };
  const setNotifChat = (v: boolean) => { setNotifChatRaw(v); lsSet("astramind_notif_chat", String(v)); };
  const setNotifUpdate = (v: boolean) => { setNotifUpdateRaw(v); lsSet("astramind_notif_update", String(v)); };
  const setAnalytics = (v: boolean) => { setAnalyticsRaw(v); lsSet("astramind_analytics", String(v)); };
  const setSaveHistory = (v: boolean) => { setSaveHistoryRaw(v); lsSet("astramind_save_history", String(v)); };

  React.useEffect(() => {
    if (!isOpen) return;
    neonAuthClient.getSession().then(({ data }) => {
      if (data) setSession({ user: { email: data.user.email, name: data.user.name || undefined } });
    }).catch(() => {});
  }, [isOpen]);

  // Focus trap
  React.useEffect(() => {
    if (!isOpen) return;
    const el = modalRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last?.focus(); } }
      else { if (document.activeElement === last) { e.preventDefault(); first?.focus(); } }
    };
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleTab);
    document.addEventListener("keydown", handleEsc);
    first?.focus();
    return () => { document.removeEventListener("keydown", handleTab); document.removeEventListener("keydown", handleEsc); };
  }, [isOpen, onClose]);

  const handleSignOut = async () => {
    await neonAuthClient.signOut();
    router.push("/");
  };

  const handleExport = (format: 'json' | 'doc') => {
    onExportChat?.(format);
    onClose();
  };

  const handleClearHistory = () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    onClearHistory?.();
    setConfirmClear(false);
    onClose();
  };

  if (!isOpen) return null;

  const renderSection = () => {
    switch (section) {
      case "appearance":
        return (
          <div>
            <SectionTitle>Theme</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 8 }}>
              {(["dark", "system", "light"] as const).map((t) => (
                <button key={t} onClick={() => setTheme(t)} style={{
                  padding: "12px 8px", borderRadius: 12,
                  border: `1.5px solid ${theme === t ? "var(--brand)" : "var(--border-default)"}`,
                  background: theme === t ? "var(--brand-glow)" : "var(--surface-2)",
                  cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  transition: "all 0.15s ease",
                }}>
                  {t === "dark" ? <Moon style={{ width: 18, height: 18, color: theme === t ? "var(--brand)" : "var(--text-muted)" }} />
                    : t === "system" ? <Monitor style={{ width: 18, height: 18, color: theme === t ? "var(--brand)" : "var(--text-muted)" }} />
                    : <Sun style={{ width: 18, height: 18, color: theme === t ? "var(--brand)" : "var(--text-muted)" }} />}
                  <span style={{ fontSize: 12, fontWeight: 600, color: theme === t ? "var(--brand)" : "var(--text-muted)", textTransform: "capitalize" }}>{t}</span>
                  {theme === t && <Check style={{ width: 12, height: 12, color: "var(--brand)" }} />}
                </button>
              ))}
            </div>

            <SectionTitle>Font</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
              {FONTS.map((f) => (
                <button key={f.id} onClick={() => setGlobalFont(f.id)} style={{
                  padding: "10px 12px", borderRadius: 10,
                  border: `1.5px solid ${globalFont === f.id ? "var(--brand)" : "var(--border-default)"}`,
                  background: globalFont === f.id ? "var(--brand-glow)" : "var(--surface-2)",
                  cursor: "pointer", textAlign: "left", transition: "all 0.15s ease",
                }}>
                  <span style={{ fontFamily: f.var, fontSize: 14, color: globalFont === f.id ? "var(--brand)" : "var(--text-primary)", fontWeight: 500 }}>{f.label}</span>
                </button>
              ))}
            </div>

            <SectionTitle>Font Size</SectionTitle>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Aa</span>
              <input type="range" min={12} max={18} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))}
                style={{ flex: 1, accentColor: "var(--brand)" }} />
              <span style={{ fontSize: 15, color: "var(--text-primary)", minWidth: 24, textAlign: "right" }}>Aa</span>
              <span style={{ fontSize: 12, color: "var(--brand)", minWidth: 32 }}>{fontSize}px</span>
            </div>

            <SectionTitle>Density</SectionTitle>
            <div style={{ display: "flex", gap: 8 }}>
              {["compact", "default", "comfortable"].map((d) => (
                <button key={d} onClick={() => setDensity(d)} style={{
                  flex: 1, padding: "9px 4px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                  border: `1.5px solid ${density === d ? "var(--brand)" : "var(--border-default)"}`,
                  background: density === d ? "var(--brand-glow)" : "var(--surface-2)",
                  color: density === d ? "var(--brand)" : "var(--text-muted)",
                  cursor: "pointer", textTransform: "capitalize", transition: "all 0.15s ease",
                }}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        );

      case "interface":
        return (
          <div>
            <SectionTitle>Chat</SectionTitle>
            <Row label="Streaming" subtitle="Show AI response as it types"><Toggle value={streaming} onChange={setStreaming} /></Row>
            <Row label="Markdown rendering" subtitle="Format bold, code, tables in responses"><Toggle value={markdownEnabled} onChange={setMarkdown} /></Row>
            <Row label="Syntax highlighting" subtitle="Color-coded code blocks"><Toggle value={codeHighlight} onChange={setCodeHighlight} /></Row>
            <Row label="Sounds" subtitle="Audio feedback on send/receive"><Toggle value={sounds} onChange={setSounds} /></Row>
            <SectionTitle>TTS Voice</SectionTitle>
            <Row label="Voice gender" subtitle="Default voice for read-aloud">
              <div style={{ display: "flex", gap: 6 }}>
                {["female", "male"].map((g) => (
                  <button key={g} onClick={() => setVoiceGender(g)} style={{
                    padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                    border: `1.5px solid ${voiceGender === g ? "var(--brand)" : "var(--border-default)"}`,
                    background: voiceGender === g ? "var(--brand-glow)" : "transparent",
                    color: voiceGender === g ? "var(--brand)" : "var(--text-muted)",
                    cursor: "pointer", textTransform: "capitalize",
                  }}>{g}</button>
                ))}
              </div>
            </Row>
          </div>
        );

      case "ai":
        return (
          <div>
            <SectionTitle>Response Style</SectionTitle>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {["concise", "balanced", "detailed"].map((r) => (
                <button key={r} onClick={() => setResponseLen(r)} style={{
                  flex: 1, padding: "9px 4px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                  border: `1.5px solid ${responseLen === r ? "var(--brand)" : "var(--border-default)"}`,
                  background: responseLen === r ? "var(--brand-glow)" : "var(--surface-2)",
                  color: responseLen === r ? "var(--brand)" : "var(--text-muted)",
                  cursor: "pointer", textTransform: "capitalize", transition: "all 0.15s",
                }}>{r}</button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
              {responseLen === "concise" ? "Short, direct answers — great for quick facts." :
               responseLen === "detailed" ? "Thorough, comprehensive responses with examples." :
               "Balanced responses — detail when needed, brief when possible."}
            </p>
          </div>
        );

      case "skills":
        return (
          <div>
            <SectionTitle>Custom Expert Skills</SectionTitle>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
              Describe your preferred expert persona or domain focus (e.g. "You are a senior DevOps engineer who prefers Kubernetes...").
            </p>
            <textarea
              value={customSkills}
              onChange={(e) => setCustomSkills(e.target.value)}
              rows={5}
              placeholder="Optional: Custom skills or instructions..."
              style={{
                width: "100%", borderRadius: 10, border: "1px solid var(--border-default)",
                background: "var(--surface-1)", color: "var(--text-primary)", padding: "10px 12px",
                fontSize: 13, lineHeight: 1.6, resize: "vertical", outline: "none", fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
            <SectionTitle>ACP Webhook URL</SectionTitle>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
              Connect external MCP/ACP tools via webhook.
            </p>
            <input
              type="url"
              value={acpTools}
              onChange={(e) => setAcpTools(e.target.value)}
              placeholder="https://your-tool.example.com/webhook"
              style={{
                width: "100%", borderRadius: 10, border: "1px solid var(--border-default)",
                background: "var(--surface-1)", color: "var(--text-primary)", padding: "10px 12px",
                fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
              }}
            />
          </div>
        );

      case "notifications":
        return (
          <div>
            <SectionTitle>Push Notifications</SectionTitle>
            <Row label="Chat responses" subtitle="Notify when AI finishes long responses"><Toggle value={notifChat} onChange={setNotifChat} /></Row>
            <Row label="Product updates" subtitle="New features and improvements"><Toggle value={notifUpdate} onChange={setNotifUpdate} /></Row>
          </div>
        );

      case "privacy":
        return (
          <div>
            <SectionTitle>Data</SectionTitle>
            <Row label="Analytics" subtitle="Help improve AstraMind with usage data"><Toggle value={analytics} onChange={setAnalytics} /></Row>
            <Row label="Save conversation history" subtitle="Store chats locally for sidebar access"><Toggle value={saveHistory} onChange={setSaveHistory} /></Row>
            <SectionTitle>Actions</SectionTitle>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={() => handleExport('json')} style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "10px", borderRadius: 10, border: "1px solid var(--border-default)",
                background: "var(--surface-2)", color: "var(--text-secondary)", cursor: "pointer",
                fontSize: 13, fontWeight: 600, transition: "all 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--brand)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-default)")}>
                <Download style={{ width: 14, height: 14 }} /> Export JSON
              </button>
              <button onClick={() => handleExport('doc')} style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "10px", borderRadius: 10, border: "1px solid var(--border-default)",
                background: "var(--surface-2)", color: "var(--text-secondary)", cursor: "pointer",
                fontSize: 13, fontWeight: 600, transition: "all 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--brand)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-default)")}>
                <Download style={{ width: 14, height: 14 }} /> Export Text
              </button>
            </div>
            <button
              onClick={handleClearHistory}
              style={{
                width: "100%", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "10px", borderRadius: 10,
                border: `1px solid ${confirmClear ? "var(--error)" : "rgba(245,100,90,0.3)"}`,
                background: confirmClear ? "rgba(245,100,90,0.15)" : "transparent",
                color: "var(--error)", cursor: "pointer", fontSize: 13, fontWeight: 700,
                transition: "all 0.15s",
              }}
            >
              <Trash2 style={{ width: 14, height: 14 }} />
              {confirmClear ? "⚠ Confirm — This cannot be undone" : "Clear all conversation history"}
            </button>
            {confirmClear && (
              <button onClick={() => setConfirmClear(false)} style={{
                width: "100%", marginTop: 6, padding: "8px", borderRadius: 10,
                border: "1px solid var(--border-default)", background: "transparent",
                color: "var(--text-muted)", cursor: "pointer", fontSize: 12,
              }}>Cancel</button>
            )}
          </div>
        );

      case "account":
        return (
          <div>
            <SectionTitle>Profile</SectionTitle>
            {session?.user ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 14, padding: "14px",
                background: "var(--surface-2)", borderRadius: 12, border: "1px solid var(--border-default)",
                marginBottom: 14,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: "linear-gradient(135deg,var(--brand),var(--brand-light))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, fontWeight: 700, color: "#1a1410", flexShrink: 0,
                }}>
                  {(session.user.name?.[0] || session.user.email?.[0] || "A").toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {session.user.name || "User"}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {session.user.email}
                  </p>
                  <span style={{
                    display: "inline-block", marginTop: 4, fontSize: 10, fontWeight: 700,
                    letterSpacing: "0.06em", padding: "2px 7px", borderRadius: 20,
                    background: "rgba(61,214,140,0.12)", color: "#3dd68c", border: "1px solid rgba(61,214,140,0.3)",
                  }}>✓ Verified</span>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--text-muted)", padding: "12px 0" }}>Not signed in.</p>
            )}
            <button onClick={handleSignOut} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "11px", borderRadius: 10,
              border: "1px solid rgba(245,100,90,0.3)", background: "rgba(245,100,90,0.06)",
              color: "var(--error)", cursor: "pointer", fontSize: 14, fontWeight: 600, transition: "all 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(245,100,90,0.15)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(245,100,90,0.06)")}>
              <LogOut style={{ width: 15, height: 15 }} /> Sign out
            </button>
          </div>
        );

      case "shortcuts":
        return (
          <div>
            <SectionTitle>Keyboard Shortcuts</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {SHORTCUTS.map((s, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "9px 0", borderBottom: "1px solid var(--border-subtle)",
                }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{s.action}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    {s.keys.map((k) => (
                      <kbd key={k} style={{
                        fontSize: 11, padding: "2px 7px", borderRadius: 6,
                        border: "1px solid var(--border-default)", background: "var(--surface-2)",
                        color: "var(--text-secondary)", fontFamily: "monospace",
                      }}>{k}</kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
        animation: "fadeIn 0.2s ease",
        padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        style={{
          width: "100%", maxWidth: 720, maxHeight: "85vh",
          background: "var(--surface-1)", borderRadius: 20,
          border: "1px solid var(--border-default)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          display: "flex", flexDirection: "column",
          animation: "scaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1)",
          overflow: "hidden",
        }}
      >
        {/* Modal header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Settings</h2>
          <button onClick={onClose} style={{
            padding: 6, borderRadius: 8, background: "transparent", border: "none",
            color: "var(--text-muted)", cursor: "pointer", display: "flex",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-3)"; e.currentTarget.style.color = "var(--text-primary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Modal body */}
        <div className="settings-body" style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
          {/* Nav sidebar */}
          <nav className="settings-nav" style={{
            width: 180, flexShrink: 0, borderRight: "1px solid var(--border-subtle)",
            padding: "12px 8px", overflowY: "auto",
          }}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 12px", borderRadius: 10, fontSize: 13, fontWeight: active ? 600 : 400,
                    background: active ? "var(--surface-3)" : "transparent",
                    border: "none", cursor: "pointer", textAlign: "left",
                    color: active ? "var(--text-primary)" : "var(--text-muted)",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.color = "var(--text-primary)"; } }}
                  onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; } }}
                >
                  <Icon style={{ width: 15, height: 15, flexShrink: 0 }} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Content panel */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  );
}
