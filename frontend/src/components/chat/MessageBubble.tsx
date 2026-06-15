"use client";

import React, { useState, useEffect, useCallback } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Copy, Check, RotateCcw, ThumbsUp, ThumbsDown,
  Volume2, VolumeX, ChevronDown, ChevronRight,
  Search, Terminal, Code2, FolderGit2, Globe,
  Loader2, CheckCircle2, XCircle, FileText, Cpu,
} from "lucide-react";
import { AstraIcon } from "@/components/common/ProviderIcons";
import { HTMLPreview } from "./HTMLPreview";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ToolEvent {
  type: "tool_start" | "tool_result";
  tool: string;
  args?: Record<string, unknown>;
  result?: string;
  step: number;
  call_idx: number;
}

export interface ThinkingEvent {
  type: "thinking";
  content: string;
  step: number;
}

export type AgentEvent = ToolEvent | ThinkingEvent;

interface MessageBubbleProps {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: string;
  model?: string;
  timestamp: Date;
  loading?: boolean;
  streaming?: boolean;
  sources?: Array<{ title: string; url: string; snippet?: string }>;
  agentEvents?: AgentEvent[];
  onRegenerate?: () => void;
  onFeedback?: (type: "up" | "down") => void;
}

// ─── Language config ──────────────────────────────────────────────────────────
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
  bash:       { color: "#4EAA25", bg: "#4EAA2518", badge: "$",    label: "Bash" },
  sh:         { color: "#4EAA25", bg: "#4EAA2518", badge: "$",    label: "Shell" },
  zsh:        { color: "#4EAA25", bg: "#4EAA2518", badge: "$",    label: "Zsh" },
  json:       { color: "#8B949E", bg: "#8B949E18", badge: "{ }",  label: "JSON" },
  yaml:       { color: "#CB171E", bg: "#CB171E18", badge: "YML",  label: "YAML" },
  yml:        { color: "#CB171E", bg: "#CB171E18", badge: "YML",  label: "YAML" },
  toml:       { color: "#9B59B6", bg: "#9B59B618", badge: "TOML", label: "TOML" },
  sql:        { color: "#CC6600", bg: "#CC660018", badge: "SQL",  label: "SQL" },
  rust:       { color: "#CE412B", bg: "#CE412B18", badge: "Rs",   label: "Rust" },
  rs:         { color: "#CE412B", bg: "#CE412B18", badge: "Rs",   label: "Rust" },
  go:         { color: "#00ACD7", bg: "#00ACD718", badge: "Go",   label: "Go" },
  java:       { color: "#ED8B00", bg: "#ED8B0018", badge: "Jv",   label: "Java" },
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
  dockerfile: { color: "#2496ED", bg: "#2496ED18", badge: "🐳",   label: "Dockerfile" },
  nginx:      { color: "#009639", bg: "#00963918", badge: "NGX",  label: "Nginx" },
};

function getLang(lang?: string): LangConfig {
  if (!lang) return { color: "#8B949E", bg: "#8B949E18", badge: "</>", label: "Code" };
  return LANG_MAP[lang.toLowerCase()] ?? {
    color: "#8B949E", bg: "#8B949E18",
    badge: lang.slice(0, 4).toUpperCase(), label: lang,
  };
}

const getDomain = (urlStr: string) => {
  try {
    return new URL(urlStr).hostname.replace("www.", "");
  } catch {
    return "Web";
  }
};

const getFaviconUrl = (urlStr: string) => {
  try {
    const domain = new URL(urlStr).hostname;
    return `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
  } catch {
    return "";
  }
};

// ─── Tool icon mapping ───────────────────────────────────────────────────────

function getToolIcon(tool: string) {
  const t = tool.toLowerCase();
  if (t === "web_search" || t === "fetch_url") return <Globe style={{ width: 13, height: 13 }} />;
  if (t === "git_clone") return <FolderGit2 style={{ width: 13, height: 13 }} />;
  if (t === "bash_run" || t === "run_terminal") return <Terminal style={{ width: 13, height: 13 }} />;
  if (t === "run_code") return <Code2 style={{ width: 13, height: 13 }} />;
  if (t === "read_file" || t === "write_file" || t === "create_file" || t === "list_dir") return <FileText style={{ width: 13, height: 13 }} />;
  return <Cpu style={{ width: 13, height: 13 }} />;
}

// ─── CopyBtn ─────────────────────────────────────────────────────────────────

function CopyBtn({ text, size = 14 }: { text: string; size?: number }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for non-HTTPS
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  };
  return (
    <button
      onClick={copy}
      title="Copy"
      style={{
        padding: 5, borderRadius: 7, background: "transparent", border: "none",
        color: "var(--text-muted)", cursor: "pointer", display: "flex",
        alignItems: "center", transition: "color 0.15s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
    >
      {done
        ? <Check style={{ width: size, height: size }} />
        : <Copy style={{ width: size, height: size }} />}
    </button>
  );
}

// ─── CodeBlock ───────────────────────────────────────────────────────────────

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const cfg = getLang(lang);
  const isHTML = lang?.toLowerCase() === "html" || lang?.toLowerCase() === "svg";
  const lines = code.split("\n").length;
  const showLineNumbers = lines > 4;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const el = document.createElement("textarea");
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // Map our lang to react-syntax-highlighter language
  const hlLang = lang
    ? (["cpp", "c++"].includes(lang.toLowerCase()) ? "cpp" : lang.toLowerCase())
    : "text";

  return (
    <div style={{
      margin: "16px 0",
      borderRadius: 12,
      overflow: "hidden",
      border: "1px solid var(--border-default)",
      background: "#0d0e15",
      boxShadow: "0 8px 30px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)",
      transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 16px",
        background: "rgba(255,255,255,0.02)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* macOS window control dots */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f56", opacity: 0.85 }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ffbd2e", opacity: 0.85 }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#27c93f", opacity: 0.85 }} />
          </div>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2px 8px",
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 800,
            background: cfg.bg,
            color: cfg.color,
            fontFamily: "monospace",
            border: `1px solid ${cfg.color}35`,
            letterSpacing: "0.03em",
            marginLeft: 8,
          }}>{cfg.badge}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{cfg.label}</span>
          <span style={{ fontSize: 11, color: "var(--text-muted)", opacity: 0.75 }}>({lines} lines)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isHTML && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 6,
                border: `1px solid ${showPreview ? cfg.color + "60" : "rgba(255,255,255,0.1)"}`,
                background: showPreview ? cfg.bg : "transparent",
                cursor: "pointer",
                color: showPreview ? cfg.color : "var(--text-secondary)",
                fontWeight: 600,
                transition: "all 0.2s",
              }}
            >
              👁️ {showPreview ? "Hide Preview" : "Live Preview"}
            </button>
          )}
          <button
            onClick={copy}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.02)",
              cursor: "pointer",
              color: "var(--text-secondary)",
              transition: "all 0.2s ease",
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-primary)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
            }}
          >
            {copied ? <Check style={{ width: 11, height: 11 }} /> : <Copy style={{ width: 11, height: 11 }} />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Syntax-highlighted code */}
      {(!showPreview || !isHTML) && (
        <SyntaxHighlighter
          language={hlLang}
          style={atomOneDark}
          showLineNumbers={showLineNumbers}
          lineNumberStyle={{
            color: "rgba(255,255,255,0.12)",
            fontSize: 11,
            paddingRight: 16,
            userSelect: "none",
            minWidth: 32,
            textAlign: "right",
          }}
          customStyle={{
            margin: 0,
            padding: "16px",
            background: "transparent",
            fontSize: 13,
            lineHeight: 1.65,
            fontFamily: "var(--font-mono, 'JetBrains Mono', 'Fira Code', monospace)",
          }}
          wrapLongLines={false}
        >
          {code}
        </SyntaxHighlighter>
      )}

      {/* HTML Preview */}
      {isHTML && showPreview && <HTMLPreview code={code} />}
    </div>
  );
}

// ─── ToolCard — shows agent tool events inline ────────────────────────────────

function ToolCard({ startEvent, resultEvent }: {
  startEvent: ToolEvent;
  resultEvent?: ToolEvent;
}) {
  const [expanded, setExpanded] = useState(false);
  const isRunning = !resultEvent;
  const isError = resultEvent?.result?.startsWith("[") && resultEvent.result.includes("error");

  const statusColor = isRunning ? "#60a5fa" : isError ? "#f87171" : "#4ade80";
  const StatusIcon = isRunning
    ? () => <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
    : isError
    ? () => <XCircle style={{ width: 12, height: 12 }} />
    : () => <CheckCircle2 style={{ width: 12, height: 12 }} />;

  const toolLabel = startEvent.tool
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // Format args for display
  const argsPreview = startEvent.args
    ? Object.entries(startEvent.args)
        .map(([k, v]) => `${k}: ${String(v).slice(0, 80)}`)
        .join(" · ")
        .slice(0, 150)
    : "";

  return (
    <div style={{
      margin: "6px 0", borderRadius: 10, overflow: "hidden",
      border: `1px solid ${statusColor}28`,
      background: `${statusColor}08`,
      transition: "all 0.2s ease",
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
          background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ color: statusColor, display: "flex", alignItems: "center" }}>
          <StatusIcon />
        </span>
        <span style={{ color: statusColor, display: "flex", alignItems: "center" }}>
          {getToolIcon(startEvent.tool)}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", flex: 1 }}>
          {toolLabel}
        </span>
        {argsPreview && (
          <span style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
            {argsPreview}
          </span>
        )}
        <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", marginLeft: 4 }}>
          {expanded
            ? <ChevronDown style={{ width: 12, height: 12 }} />
            : <ChevronRight style={{ width: 12, height: 12 }} />}
        </span>
      </button>

      {expanded && (
        <div style={{ padding: "0 12px 10px", borderTop: `1px solid ${statusColor}18` }}>
          {startEvent.args && Object.keys(startEvent.args).length > 0 && (
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", margin: "0 0 6px" }}>
                Input
              </p>
              <pre style={{
                fontSize: 12, lineHeight: 1.5, color: "var(--text-secondary)",
                background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: "8px 10px",
                overflow: "auto", maxHeight: 150, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all",
              }}>
                {JSON.stringify(startEvent.args, null, 2)}
              </pre>
            </div>
          )}
          {resultEvent?.result && (
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", margin: "0 0 6px" }}>
                Output
              </p>
              <pre style={{
                fontSize: 12, lineHeight: 1.5, color: isError ? "#f87171" : "var(--text-secondary)",
                background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: "8px 10px",
                overflow: "auto", maxHeight: 200, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all",
              }}>
                {resultEvent.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ThinkingBlock — shows agent reasoning ────────────────────────────────────

function ThinkingBlock({ thoughts }: { thoughts: string[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!thoughts.length) return null;

  return (
    <div style={{
      margin: "8px 0 12px",
      borderRadius: 10,
      border: "1px solid rgba(139,122,252,0.2)",
      background: "rgba(139,122,252,0.05)",
      overflow: "hidden",
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "7px 12px",
          background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ fontSize: 12 }}>🧠</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#a78bfa", flex: 1 }}>
          Reasoning ({thoughts.length} step{thoughts.length > 1 ? "s" : ""})
        </span>
        <span style={{ color: "#a78bfa", display: "flex" }}>
          {expanded
            ? <ChevronDown style={{ width: 12, height: 12 }} />
            : <ChevronRight style={{ width: 12, height: 12 }} />}
        </span>
      </button>
      {expanded && (
        <div style={{ padding: "0 12px 10px", borderTop: "1px solid rgba(139,122,252,0.15)" }}>
          {thoughts.map((t, i) => (
            <p key={i} style={{
              fontSize: 12, color: "#c4b5fd", fontStyle: "italic", lineHeight: 1.6,
              margin: i === 0 ? "8px 0 0" : "6px 0 0",
            }}>
              <span style={{ fontStyle: "normal", opacity: 0.5, marginRight: 6 }}>Step {i + 1}:</span>
              {t}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Agent Events Panel ───────────────────────────────────────────────────────

function AgentEventsPanel({ events }: { events: AgentEvent[] }) {
  if (!events || events.length === 0) return null;

  const thoughts = events
    .filter((e): e is ThinkingEvent => e.type === "thinking")
    .map((e) => e.content);

  const toolEvents = events.filter((e): e is ToolEvent =>
    e.type === "tool_start" || e.type === "tool_result"
  );

  // Group tool events by (step, call_idx)
  const toolPairs: Array<{ start: ToolEvent; result?: ToolEvent }> = [];
  const starts = toolEvents.filter((e) => e.type === "tool_start") as ToolEvent[];
  const results = toolEvents.filter((e) => e.type === "tool_result") as ToolEvent[];

  for (const start of starts) {
    const result = results.find(
      (r) => r.step === start.step && r.call_idx === start.call_idx
    );
    toolPairs.push({ start, result });
  }

  return (
    <div style={{ marginBottom: 10 }}>
      {thoughts.length > 0 && <ThinkingBlock thoughts={thoughts} />}
      {toolPairs.length > 0 && (
        <div>
          {toolPairs.map((pair, i) => (
            <ToolCard key={`${pair.start.step}-${pair.start.call_idx}-${i}`} startEvent={pair.start} resultEvent={pair.result} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Markdown components ──────────────────────────────────────────────────────

const markdownComponents = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  code({ className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || "");
    const codeStr = String(children).replace(/\n$/, "");
    if (match || codeStr.includes("\n")) {
      return <CodeBlock code={codeStr} lang={match?.[1]} />;
    }
    return (
      <code
        style={{
          background: "var(--surface-2)", border: "1px solid var(--border-subtle)",
          borderRadius: 4, padding: "2px 6px", fontSize: "0.85em",
          color: "var(--brand-light)", fontFamily: "monospace",
        }}
        {...props}
      >
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

// ─── Strip markdown for TTS ───────────────────────────────────────────────────

function stripMarkdownForTTS(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/`[^`]+`/g, (m) => m.slice(1, -1))
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── MessageBubble ───────────────────────────────────────────────────────────

export default function MessageBubble({
  role,
  content,
  timestamp,
  loading,
  streaming,
  sources,
  agentEvents,
  onRegenerate,
  onFeedback,
}: MessageBubbleProps) {
  const isUser = role === "user";
  const [isPlaying, setIsPlaying] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleFeedback = useCallback((type: "up" | "down") => {
    setFeedback(type);
    onFeedback?.(type);
  }, [onFeedback]);

  // ─── Stop any active playback ────────────────────────────────────────────
  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  }, []);

  // ─── Premium TTS via backend (OpenAI / ElevenLabs) ──────────────────────
  const playWithBackend = useCallback(async (text: string, voice: string): Promise<boolean> => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://astramind-reer.onrender.com";
    try {
      // Get auth token the same way the chat endpoint does
      const { neonAuthClient } = await import("@/lib/auth-client");
      const neonSession = await neonAuthClient.getSession().catch(() => null);
      const token = neonSession?.data?.session?.id;

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const resp = await fetch(`${apiBase}/api/v1/tts`, {
        method: "POST",
        headers,
        body: JSON.stringify({ text: text.slice(0, 4000), voice, speed: 1.0 }),
        signal: AbortSignal.timeout(35000),
      });

      if (resp.ok && resp.headers.get("content-type")?.includes("audio")) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onplay = () => setIsPlaying(true);
        audio.onended = () => { setIsPlaying(false); URL.revokeObjectURL(url); };
        audio.onerror = () => { setIsPlaying(false); URL.revokeObjectURL(url); };
        await audio.play();
        return true;
      }
    } catch {
      // Backend unavailable or no API key — fall through to Web Speech
    }
    return false;
  }, []);

  // ─── Natural Web Speech fallback ─────────────────────────────────────────
  const playWithWebSpeech = useCallback((text: string, prefGender: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const utterance = new SpeechSynthesisUtterance(text.slice(0, 3000));

    // Quality scoring — prefer neural/online/natural voices
    const score = (v: SpeechSynthesisVoice): number => {
      const n = v.name.toLowerCase();
      let s = 0;
      if (v.lang.toLowerCase().startsWith("en")) s += 8;
      // Microsoft neural (Edge/Windows) — best quality
      if (n.includes("aria") || n.includes("jenny") || n.includes("guy") || n.includes("tony")) s += 100;
      if (n.includes("neural") || n.includes("online")) s += 80;
      // Apple Siri voices
      if (n.includes("siri")) s += 70;
      if (n.includes("premium")) s += 65;
      // Google voices
      if (n.includes("google")) s += 50;
      // General microsoft (non-neural)
      if (n.includes("microsoft")) s += 30;
      // Natural keyword
      if (n.includes("natural")) s += 90;
      return s;
    };

    const isMale = (v: SpeechSynthesisVoice) => {
      const n = v.name.toLowerCase();
      return n.includes("male") || n.includes("david") || n.includes("guy") || n.includes("william") ||
             n.includes("brian") || n.includes("ryan") || n.includes("george") || n.includes("tony") ||
             n.includes("james") || n.includes("thomas") || n.includes("stefan") || n.includes("mark");
    };
    const isFemale = (v: SpeechSynthesisVoice) => {
      const n = v.name.toLowerCase();
      return n.includes("female") || n.includes("aria") || n.includes("jenny") || n.includes("zira") ||
             n.includes("hazel") || n.includes("samantha") || n.includes("linda") || n.includes("karen") ||
             n.includes("victoria") || n.includes("moira") || n.includes("tessa") || n.includes("fiona");
    };

    const doSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      let pool = voices.filter(prefGender === "male" ? isMale : isFemale);
      if (pool.length === 0) pool = voices;
      if (pool.length > 0) {
        pool.sort((a, b) => score(b) - score(a));
        utterance.voice = pool[0];
      }
      utterance.pitch = prefGender === "male" ? 0.92 : 1.08;
      utterance.rate = 1.05;
      utterance.volume = 1;
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => { doSpeak(); window.speechSynthesis.onvoiceschanged = null; };
    } else {
      doSpeak();
    }
  }, []);

  // ─── Main play handler ───────────────────────────────────────────────────
  const handlePlayVoice = useCallback(async () => {
    if (isPlaying || ttsLoading) { stopPlayback(); return; }

    const cleanText = stripMarkdownForTTS(content);
    if (!cleanText) return;

    const prefGender = (typeof localStorage !== "undefined" && localStorage.getItem("astramind_voice_gender")) || "female";
    // Map gender to OpenAI voice name (nova=female, onyx=male)
    const openAIVoice = prefGender === "male" ? "onyx" : "nova";

    setTtsLoading(true);
    try {
      const usedBackend = await playWithBackend(cleanText, openAIVoice);
      if (!usedBackend) {
        // Backend not configured — use Web Speech with best voice
        playWithWebSpeech(cleanText, prefGender);
      }
    } finally {
      setTtsLoading(false);
    }
  }, [content, isPlaying, ttsLoading, stopPlayback, playWithBackend, playWithWebSpeech]);

  // ─── User message ──────────────────────────────────────────────────────────

  if (isUser) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <div style={{
          maxWidth: "75%",
          padding: "12px 18px",
          borderRadius: "20px 20px 4px 20px",
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid var(--border-default)",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25)",
          color: "var(--text-primary)",
          fontSize: 14,
          lineHeight: 1.7,
          animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          wordBreak: "break-word",
        }}>
          <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {content}
          </Markdown>
        </div>
      </div>
    );
  }

  // ─── Assistant message ────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", gap: 16, animation: "slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)", marginBottom: 16 }}>
      {/* Avatar */}
      <div style={{ flexShrink: 0, marginTop: 4 }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: "linear-gradient(135deg, var(--brand), var(--brand-light))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 12px var(--brand-glow)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}>
          <AstraIcon size={20} />
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Label row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--brand-light)" }}>ASTRAMIND</span>
          {streaming && (
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
              color: "var(--brand)", padding: "2px 7px", borderRadius: 20,
              background: "var(--brand-glow)", border: "1px solid rgba(242,169,59,0.3)",
              animation: "glow-pulse 2s ease-in-out infinite",
            }}>
              LIVE
            </span>
          )}
        </div>

        {/* Agent events panel */}
        {agentEvents && agentEvents.length > 0 && (
          <AgentEventsPanel events={agentEvents} />
        )}

        {/* Content */}
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 4 }}>
            <div style={{ display: "flex", gap: 5 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: "50%", background: "var(--brand)",
                  animation: "thinking 1.4s ease-in-out infinite",
                  animationDelay: `${i * 0.18}s`,
                }} />
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
              {/* Streaming cursor */}
              {streaming && content && (
                <span style={{
                  display: "inline-block",
                  width: 2,
                  height: "1.05em",
                  background: "var(--brand)",
                  marginLeft: 3,
                  boxShadow: "0 0 8px var(--brand)",
                  animation: "cursor-blink 1s step-end infinite",
                  verticalAlign: "text-bottom"
                }} />
              )}
            </div>

            {/* Sources */}
            {sources && sources.length > 0 && (
              <div style={{
                marginTop: 16,
                padding: "14px 16px",
                background: "rgba(242, 169, 59, 0.02)",
                border: "1px solid rgba(242, 169, 59, 0.08)",
                borderRadius: 14,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.01)",
              }}>
                <p style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--brand-light)",
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}>
                  <Search style={{ width: 12, height: 12 }} /> Source Citations
                </p>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: 10
                }}>
                  {sources.slice(0, 6).map((s, i) => {
                    const domain = getDomain(s.url);
                    const favicon = getFaviconUrl(s.url);
                    return (
                      <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          textDecoration: "none",
                          padding: "10px 12px",
                          borderRadius: 10,
                          background: "rgba(255, 255, 255, 0.02)",
                          border: "1px solid rgba(255, 255, 255, 0.04)",
                          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(242, 169, 59, 0.05)";
                          e.currentTarget.style.borderColor = "rgba(242, 169, 59, 0.2)";
                          e.currentTarget.style.transform = "translateY(-1px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.04)";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {favicon ? (
                            <img
                              src={favicon}
                              alt={domain}
                              style={{ width: 14, height: 14, borderRadius: 3, objectFit: "contain" }}
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                          ) : (
                            <Globe style={{ width: 14, height: 14, color: "var(--text-muted)" }} />
                          )}
                          <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>{domain}</span>
                          <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: "auto" }}>[{i + 1}]</span>
                        </div>
                        <p style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--brand-light)",
                          margin: 0,
                          lineHeight: 1.3,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical"
                        }}>{s.title}</p>
                        {s.snippet && (
                          <p style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            margin: 0,
                            lineHeight: 1.4,
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical"
                          }}>{s.snippet.slice(0, 120)}…</p>
                        )}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action row */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 14,
              paddingTop: 8,
              borderTop: "1px solid rgba(255, 255, 255, 0.03)"
            }}>
              <CopyBtn text={content} />

              {/* TTS */}
              <button
                onClick={handlePlayVoice}
                title={isPlaying ? "Stop voice" : ttsLoading ? "Loading audio…" : "Read aloud (AI voice)"}
                disabled={ttsLoading && !isPlaying}
                style={{
                  padding: "5px 10px", borderRadius: 7,
                  background: isPlaying ? "var(--brand-glow)" : ttsLoading ? "rgba(242,169,59,0.08)" : "transparent",
                  border: "none", color: isPlaying ? "var(--brand-light)" : ttsLoading ? "var(--brand)" : "var(--text-muted)",
                  cursor: ttsLoading && !isPlaying ? "wait" : "pointer",
                  display: "flex", alignItems: "center", gap: 5,
                  fontSize: 11, fontWeight: 600, transition: "all 0.15s ease",
                  opacity: ttsLoading && !isPlaying ? 0.7 : 1,
                }}
                onMouseEnter={(e) => { if (!isPlaying && !ttsLoading) e.currentTarget.style.color = "var(--text-primary)"; }}
                onMouseLeave={(e) => { if (!isPlaying && !ttsLoading) e.currentTarget.style.color = "var(--text-muted)"; }}
              >
                {isPlaying
                  ? <VolumeX style={{ width: 13, height: 13 }} />
                  : ttsLoading
                    ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
                    : <Volume2 style={{ width: 13, height: 13 }} />
                }
                {isPlaying ? "Stop" : ttsLoading ? "Loading…" : "Listen"}
              </button>

              {/* Regenerate */}
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  title="Regenerate response"
                  style={{
                    padding: 5, borderRadius: 7, background: "transparent", border: "none",
                    color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--brand-light)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                >
                  <RotateCcw style={{ width: 13, height: 13 }} />
                </button>
              )}

              {/* Thumbs */}
              <button
                onClick={() => handleFeedback("up")}
                title="Good response"
                style={{
                  padding: 5, borderRadius: 7,
                  background: feedback === "up" ? "rgba(74,222,128,0.12)" : "transparent",
                  border: "none",
                  color: feedback === "up" ? "#4ade80" : "var(--text-muted)",
                  cursor: "pointer", display: "flex", alignItems: "center",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { if (feedback !== "up") e.currentTarget.style.color = "#4ade80"; }}
                onMouseLeave={(e) => { if (feedback !== "up") e.currentTarget.style.color = "var(--text-muted)"; }}
              >
                <ThumbsUp style={{ width: 13, height: 13 }} />
              </button>
              <button
                onClick={() => handleFeedback("down")}
                title="Bad response"
                style={{
                  padding: 5, borderRadius: 7,
                  background: feedback === "down" ? "rgba(248,113,113,0.12)" : "transparent",
                  border: "none",
                  color: feedback === "down" ? "#f87171" : "var(--text-muted)",
                  cursor: "pointer", display: "flex", alignItems: "center",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { if (feedback !== "down") e.currentTarget.style.color = "#f87171"; }}
                onMouseLeave={(e) => { if (feedback !== "down") e.currentTarget.style.color = "var(--text-muted)"; }}
              >
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