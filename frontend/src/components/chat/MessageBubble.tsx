"use client";

import React, { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check, RotateCcw, ThumbsUp, ThumbsDown } from "lucide-react";
import { AstraIcon } from "@/components/common/ProviderIcons";

interface MessageBubbleProps {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: string;
  model?: string;
  timestamp: Date;
  loading?: boolean;
}

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

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div style={{ margin: "12px 0", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border-default)", background: "var(--surface-1)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", background: "var(--surface-2)", borderBottom: "1px solid var(--border-subtle)" }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", fontFamily: "monospace" }}>{lang || "code"}</span>
        <button onClick={copy} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, padding: "3px 8px", borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", color: "var(--text-secondary)", transition: "color 0.15s ease" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}>
          {copied ? <Check style={{ width: 11, height: 11 }} /> : <Copy style={{ width: 11, height: 11 }} />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre style={{ margin: 0, padding: "16px 18px", overflowX: "auto", fontSize: 13, lineHeight: 1.65, background: "transparent", border: "none" }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

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
};

export default function MessageBubble({ role, content, provider, model, timestamp, loading }: MessageBubbleProps) {
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
        <div style={{
          width: 30, height: 30, borderRadius: 9,
          background: "linear-gradient(135deg,var(--brand),var(--brand-light))",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 8px var(--brand-glow)",
        }}>
          <AstraIcon size={18} />
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--brand-light)" }}>ASTRAMIND</span>
          {provider && (
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              via {provider}{model ? ` · ${model}` : ""}
            </span>
          )}
        </div>

        {/* Loading */}
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
            {/* Markdown content */}
            <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.7 }}>
              <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {content}
              </Markdown>
            </div>

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
                {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}