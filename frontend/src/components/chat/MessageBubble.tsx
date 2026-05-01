"use client";

import React, { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check, RotateCcw, ThumbsUp, ThumbsDown } from "lucide-react";
import { AstraIcon } from "@/components/common/ProviderIcons";
import { HTMLPreview } from "./HTMLPreview";

interface MessageBubbleProps {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: string;
  model?: string;
  timestamp: Date;
  loading?: boolean;
  sources?: Array<{ title: string; url: string; snippet?: string }>;
}

// ─── Language config ─────────────────────────────────────────────────────────
interface LangConfig { color: string; bg: string; badge: string; label: string }

const LANG_MAP: Record<string, LangConfig> = {
  python:     { color: "#3776AB", bg: "#3776AB20", badge: "Py",   label: "Python" },
  py:         { color: "#3776AB", bg: "#3776AB20", badge: "Py",   label: "Python" },
  javascript: { color: "#F7DF1E", bg: "#F7DF1E18", badge: "JS",   label: "JavaScript" },
  js:         { color: "#F7DF1E", bg: "#F7DF1E18", badge: "JS",   label: "JavaScript" },
  typescript: { color: "#3178C6", bg: "#3178C620", badge: "TS",   label: "TypeScript" },
  ts:         { color: "#3178C6", bg: "#3178C620", badge: "TS",   label: "TypeScript" },
  jsx:        { color: "#61DAFB", bg: "#61DAFB18", badge: "JSX",  label: "JSX" },
  tsx:        { color: "#61DAFB", bg: "#61DAFB18", badge: "TSX",  label: "TSX" },
  html:       { color: "#E34F26", bg: "#E34F2618", badge: "HTML", label: "HTML" },
  css:        { color: "#1572B6", bg: "#1572B620", badge: "CSS",  label: "CSS" },
  scss:       { color: "#CC6699", bg: "#CC669918", badge: "SCSS", label: "SCSS" },
  bash:       { color: "#4EAA25", bg: "#4EAA2518", badge: "$_",   label: "Bash" },
  sh:         { color: "#4EAA25", bg: "#4EAA2518", badge: "$_",   label: "Shell" },
  zsh:        { color: "#4EAA25", bg: "#4EAA2518", badge: "$_",   label: "Zsh" },
  json:       { color: "#8B949E", bg: "#8B949E18", badge: "{ }",  label: "JSON" },
  yaml:       { color: "#CB171E", bg: "#CB171E18", badge: "YML",  label: "YAML" },
  yml:        { color: "#CB171E", bg: "#CB171E18", badge: "YML",  label: "YAML" },
  toml:       { color: "#9B59B6", bg: "#9B59B618", badge: "TOML", label: "TOML" },
  sql:        { color: "#CC6600", bg: "#CC660018", badge: "SQL",  label: "SQL" },
  rust:       { color: "#CE412B", bg: "#CE412B18", badge: "Rs",   label: "Rust" },
  rs:         { color: "#CE412B", bg: "#CE412B18", badge: "Rs",   label: "Rust" },
  go:         { color: "#00ACD7", bg: "#00ACD718", badge: "Go",   label: "Go" },
  java:       { color: "#ED8B00", bg: "#ED8B0018", badge: "☕",    label: "Java" },
  kotlin:     { color: "#7F52FF", bg: "#7F52FF18", badge: "Kt",   label: "Kotlin" },
  swift:      { color: "#F05138", bg: "#F0513818", badge: "Sw",   label: "Swift" },
  c:          { color: "#A8B9CC", bg: "#A8B9CC18", badge: "C",    label: "C" },
  cpp:        { color: "#00599C", bg: "#00599C18", badge: "C++",  label: "C++" },
  "c++":      { color: "#00599C", bg: "#00599C18", badge: "C++",  label: "C++" },
  csharp:     { color: "#178600", bg: "#17860018", badge: "C#",   label: "C#" },
  cs:         { color: "#178600", bg: "#17860018", badge: "C#",   label: "C#" },
  php:        { color: "#777BB4", bg: "#777BB418", badge: "PHP",  label: "PHP" },
  ruby:       { color: "#CC342D", bg: "#CC342D18", badge: "Rb",   label: "Ruby" },
  rb:         { color: "#CC342D", bg: "#CC342D18", badge: "Rb",   label: "Ruby" },
  r:          { color: "#276DC3", bg: "#276DC318", badge: "R",    label: "R" },
  dart:       { color: "#0175C2", bg: "#0175C218", badge: "Dt",   label: "Dart" },
  lua:        { color: "#000080", bg: "#00008018", badge: "Lua",  label: "Lua" },
  markdown:   { color: "#083FA1", bg: "#083FA118", badge: "MD",   label: "Markdown" },
  md:         { color: "#083FA1", bg: "#083FA118", badge: "MD",   label: "Markdown" },
  xml:        { color: "#F1672C", bg: "#F1672C18", badge: "XML",  label: "XML" },
  graphql:    { color: "#E10098", bg: "#E1009818", badge: "GQL",  label: "GraphQL" },
  dockerfile: { color: "#2496ED", bg: "#2496ED18", badge: "🐳",    label: "Dockerfile" },
  nginx:      { color: "#009639", bg: "#00963918", badge: "NGX",  label: "Nginx" },
};

function getLang(lang?: string): LangConfig {
  if (!lang) return { color: "#8B949E", bg: "#8B949E18", badge: "</>", label: "Code" };
  return LANG_MAP[lang.toLowerCase()] ?? { color: "#8B949E", bg: "#8B949E18", badge: lang.slice(0, 4).toUpperCase(), label: lang };
}

// ─── CopyBtn ─────────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  };
  return (
    <button onClick={copy} title="Copy" style={{ padding: 5, borderRadius: 7, background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", transition: "color 0.15s ease" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}>
      {done ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
    </button>
  );
}

// ─── CodeBlock ───────────────────────────────────────────────────────────────
function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const cfg = getLang(lang);
  const isHTML = lang?.toLowerCase() === "html" || lang?.toLowerCase() === "svg";

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // Auto-show preview for HTML
  const [previewOpen, setPreviewOpen] = useState(isHTML);

  return (
    <div style={{ margin: "12px 0", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border-default)", background: "var(--surface-1)", borderLeft: `3px solid ${cfg.color}` }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", background: "var(--surface-2)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Language badge */}
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            padding: "2px 7px", borderRadius: 6, fontSize: 10, fontWeight: 800,
            background: cfg.bg, color: cfg.color, fontFamily: "monospace",
            border: `1px solid ${cfg.color}30`, letterSpacing: "0.03em",
            minWidth: 28, textAlign: "center",
          }}>
            {cfg.badge}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{cfg.label}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {isHTML && (
            <button
              onClick={() => setPreviewOpen(!previewOpen)}
              style={{
                display: "flex", alignItems: "center", gap: 5, fontSize: 11, padding: "3px 10px",
                borderRadius: 7, border: `1px solid ${previewOpen ? cfg.color + "60" : "var(--border-subtle)"}`,
                background: previewOpen ? cfg.bg : "transparent", cursor: "pointer",
                color: previewOpen ? cfg.color : "var(--text-muted)", fontWeight: 600, transition: "all 0.15s",
              }}
            >
              👁 {previewOpen ? "Hide Preview" : "Live Preview"}
            </button>
          )}
          <button onClick={copy} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, padding: "3px 8px", borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", color: "var(--text-secondary)", transition: "color 0.15s ease" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}>
            {copied ? <Check style={{ width: 11, height: 11 }} /> : <Copy style={{ width: 11, height: 11 }} />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
      {/* Code */}
      {(!previewOpen || !isHTML) && (
        <pre style={{ margin: 0, padding: "14px 18px", overflowX: "auto", fontSize: 13, lineHeight: 1.65, background: "transparent", border: "none" }}>
          <code style={{ fontFamily: "monospace", color: "var(--text-primary)" }}>{code}</code>
        </pre>
      )}
      {/* HTML Preview */}
      {isHTML && previewOpen && <HTMLPreview code={code} />}
    </div>
  );
}

// ─── Markdown components ──────────────────────────────────────────────────────
const markdownComponents = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  code({ className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || "");
    if (match || String(children).includes("\n")) {
      return <CodeBlock code={String(children).replace(/\n$/, "")} lang={match?.[1]} />;
    }
    return (
      <code style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", borderRadius: 4, padding: "2px 6px", fontSize: "0.85em", color: "var(--brand-light)", fontFamily: "monospace" }} {...props}>
        {children}
      </code>
    );
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pre({ children }: any) { return <>{children}</>; },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  p({ children }: any) { return <p style={{ marginBottom: "0.7rem", lineHeight: 1.75 }}>{children}</p>; },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ul({ children }: any) { return <ul style={{ marginLeft: "1.4rem", marginBottom: "0.7rem" }}>{children}</ul>; },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ol({ children }: any) { return <ol style={{ marginLeft: "1.4rem", marginBottom: "0.7rem" }}>{children}</ol>; },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  li({ children }: any) { return <li style={{ marginBottom: "0.25rem", lineHeight: 1.6 }}>{children}</li>; },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  strong({ children }: any) { return <strong style={{ fontWeight: 600, color: "var(--text-primary)" }}>{children}</strong>; },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  a({ children, href }: any) { return <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: 3 }}>{children}</a>; },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blockquote({ children }: any) { return <blockquote style={{ borderLeft: "3px solid var(--brand)", paddingLeft: "1rem", color: "var(--text-secondary)", margin: "0.75rem 0", fontStyle: "italic" }}>{children}</blockquote>; },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  h1({ children }: any) { return <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "1.2rem 0 0.4rem", letterSpacing: "-0.02em" }}>{children}</h1>; },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  h2({ children }: any) { return <h2 style={{ fontSize: "1.2rem", fontWeight: 600, margin: "1rem 0 0.35rem", letterSpacing: "-0.015em" }}>{children}</h2>; },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  h3({ children }: any) { return <h3 style={{ fontSize: "1.05rem", fontWeight: 600, margin: "0.9rem 0 0.3rem" }}>{children}</h3>; },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table({ children }: any) { return <div style={{ overflowX: "auto", margin: "0.75rem 0" }}><table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>{children}</table></div>; },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  th({ children }: any) { return <th style={{ padding: "8px 12px", background: "var(--surface-2)", borderBottom: "1px solid var(--border-default)", textAlign: "left", fontWeight: 600, fontSize: 12, color: "var(--text-secondary)" }}>{children}</th>; },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  td({ children }: any) { return <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>{children}</td>; },
};

// ─── MessageBubble ───────────────────────────────────────────────────────────
export default function MessageBubble({ role, content, timestamp, loading, sources }: MessageBubbleProps) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{
          maxWidth: "75%", padding: "12px 18px", borderRadius: "20px 20px 6px 20px",
          background: "var(--surface-2)", border: "1px solid var(--border-default)",
          color: "var(--text-primary)", fontSize: 14, lineHeight: 1.65,
          animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1)",
        }}>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 14, animation: "slideUp 0.35s cubic-bezier(0.16,1,0.3,1)" }}>
      {/* Avatar */}
      <div style={{ flexShrink: 0, marginTop: 2 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,var(--brand),var(--brand-light))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px var(--brand-glow)" }}>
          <AstraIcon size={18} />
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--brand-light)" }}>ASTRAMIND</span>
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 4 }}>
            <div style={{ display: "flex", gap: 5 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--brand)", animation: "thinking 1.4s ease-in-out infinite", animationDelay: `${i * 0.18}s` }} />
              ))}
            </div>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Thinking…</span>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.7 }}>
              <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {content}
              </Markdown>
            </div>

            {/* Sources */}
            {sources && sources.length > 0 && (
              <div style={{ marginTop: 14, padding: "12px 14px", background: "rgba(212,118,59,0.06)", border: "1px solid rgba(212,118,59,0.18)", borderRadius: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--brand-light)", marginBottom: 8 }}>
                  🔍 Web Sources
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {sources.slice(0, 5).map((s, i) => (
                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "flex-start", gap: 8, textDecoration: "none", padding: "6px 8px", borderRadius: 8, transition: "background 0.15s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(212,118,59,0.1)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", minWidth: 16, marginTop: 1 }}>{i + 1}.</span>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--brand-light)", margin: 0, lineHeight: 1.3 }}>{s.title}</p>
                        {s.snippet && <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", lineHeight: 1.4 }}>{s.snippet.slice(0, 120)}…</p>}
                        <p style={{ fontSize: 10, color: "var(--text-disabled)", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 400 }}>{s.url}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Action row */}
            <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 10 }}>
              <CopyBtn text={content} />
              <button title="Regenerate" style={{ padding: 5, borderRadius: 7, background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}>
                <RotateCcw style={{ width: 13, height: 13 }} />
              </button>
              <button title="Good response" style={{ padding: 5, borderRadius: 7, background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#4ade80")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}>
                <ThumbsUp style={{ width: 13, height: 13 }} />
              </button>
              <button title="Bad response" style={{ padding: 5, borderRadius: 7, background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}>
                <ThumbsDown style={{ width: 13, height: 13 }} />
              </button>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>
                {new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}