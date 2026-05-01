"use client";

import { useState } from "react";
import { Eye, Code2, Maximize2, X, RefreshCw } from "lucide-react";

interface HTMLPreviewProps {
  code: string;
}

export function HTMLPreview({ code }: HTMLPreviewProps) {
  const [view, setView] = useState<"code" | "preview">("preview");
  const [fullscreen, setFullscreen] = useState(false);
  const [key, setKey] = useState(0); // force iframe reload

  const isFullHTML = code.toLowerCase().includes("<html") || code.includes("<!DOCTYPE") || code.includes("<!doctype");
  const srcDoc = isFullHTML
    ? code
    : `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:16px;background:#fff;color:#111;line-height:1.5}</style></head><body>${code}</body></html>`;

  const containerStyle: React.CSSProperties = fullscreen
    ? { position: "fixed", inset: 0, zIndex: 999, display: "flex", flexDirection: "column", background: "var(--bg-primary)", borderRadius: 0 }
    : { borderRadius: "0 0 12px 12px", overflow: "hidden", border: "1px solid var(--border-default)", borderTop: "none" };

  return (
    <div style={{ marginTop: -1 }}>
      {/* Tab bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 14px", background: "var(--surface-2)",
        border: "1px solid var(--border-default)", borderTop: "none",
        borderBottom: view === "preview" ? "none" : "1px solid var(--border-default)",
      }}>
        <div style={{ display: "flex", gap: 0 }}>
          {([
            { id: "code" as const, label: "Code", icon: <Code2 size={13} /> },
            { id: "preview" as const, label: "Preview", icon: <Eye size={13} /> },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", fontSize: 12, fontWeight: 600,
                background: "transparent", border: "none", cursor: "pointer",
                color: view === tab.id ? "var(--brand-light)" : "var(--text-muted)",
                borderBottom: view === tab.id ? "2px solid var(--brand)" : "2px solid transparent",
                transition: "all 0.15s",
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={() => setKey(k => k + 1)}
            title="Reload preview"
            style={{ padding: 6, borderRadius: 6, background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-3)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={() => setFullscreen(!fullscreen)}
            title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            style={{ padding: 6, borderRadius: 6, background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-3)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            {fullscreen ? <X size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={containerStyle}>
        {view === "preview" ? (
          <iframe
            key={key}
            srcDoc={srcDoc}
            sandbox="allow-scripts allow-same-origin"
            style={{
              width: "100%",
              height: fullscreen ? "calc(100vh - 48px)" : "360px",
              border: "none",
              background: "#fff",
              display: "block",
            }}
            title="HTML Preview"
          />
        ) : (
          <div style={{ height: fullscreen ? "calc(100vh - 48px)" : 360, overflowY: "auto", background: "var(--surface-1)" }}>
            <pre style={{ margin: 0, padding: "16px 18px", fontSize: 13, lineHeight: 1.65, color: "var(--text-primary)", fontFamily: "monospace" }}>
              <code>{code}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
