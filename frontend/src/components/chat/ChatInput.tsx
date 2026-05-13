"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Globe, Paperclip, Mic, Cpu, Microscope, Square } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isLoading?: boolean;
  model?: string;
  agentMode?: boolean;
  researchMode?: boolean;
  onAgentModeChange?: (v: boolean) => void;
  onResearchModeChange?: (v: boolean) => void;
}

export default function ChatInput({
  onSend,
  onStop,
  isLoading = false,
  model,
  agentMode = false,
  researchMode = false,
  onAgentModeChange,
  onResearchModeChange,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Detect mobile AFTER mount (avoid SSR mismatch)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "24px";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [input]);

  const handleSend = useCallback(() => {
    const t = input.trim();
    if (!t) { setErrorMsg("Type a message first."); return; }
    if (t.length > 32000) { setErrorMsg("Message too long (max 32,000 characters)."); return; }
    if (isLoading) return;
    onSend(t);
    setInput("");
    setErrorMsg(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "24px";
    }
  }, [input, isLoading, onSend]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = input.trim().length > 0 && input.length <= 32000 && !isLoading;

  // Border: only glow when focused — NOT just because canSend is true
  const borderColor = focused ? "var(--brand)" : "var(--border-default)";
  const boxShadow = focused
    ? "0 0 0 3px var(--brand-glow), 0 4px 20px rgba(0,0,0,0.4)"
    : "0 2px 12px rgba(0,0,0,0.25)";

  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: `1.5px solid ${borderColor}`,
        borderRadius: 18,
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        boxShadow,
      }}
      onClick={() => {
        if (textareaRef.current && !focused) {
          textareaRef.current.focus();
        }
      }}
    >
      {/* Textarea row */}
      <div className="mobile-tight" style={{ padding: "12px 16px 4px" }}>
        {errorMsg && (
          <div style={{ fontSize: 12, color: "var(--error)", marginBottom: 6, fontWeight: 500 }}>
            ⚠ {errorMsg}
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (e.target.value.length < 32000) setErrorMsg(null);
          }}
          onKeyDown={handleKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={isLoading}
          placeholder="Ask anything… (Shift+Enter for new line)"
          maxLength={32000}
          rows={1}
          autoFocus={false}
          autoComplete="off"
          spellCheck={true}
          style={{
            width: "100%",
            resize: "none",
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: 15,
            lineHeight: 1.6,
            color: "var(--text-primary)",
            fontFamily: "inherit",
            minHeight: 24,
            maxHeight: "40vh",
            overflowY: "auto",
            display: "block",
            padding: 0,
            margin: 0,
          }}
        />
      </div>

      {/* Toolbar */}
      <div
        className="mobile-tight-toolbar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 10px 10px",
        }}
      >
        {/* Left tools */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {[
            { icon: <Paperclip style={{ width: 14, height: 14 }} />, title: "Attach file" },
            { icon: <Globe       style={{ width: 14, height: 14 }} />, title: "Web search" },
            { icon: <Mic         style={{ width: 14, height: 14 }} />, title: "Voice input" },
          ].map((btn) => (
            <button
              key={btn.title}
              title={btn.title}
              disabled
              style={{
                padding: 7, borderRadius: 8, background: "transparent", border: "none",
                color: "var(--text-muted)", cursor: "not-allowed", display: "flex",
                alignItems: "center", opacity: 0.5,
              }}
            >
              {btn.icon}
            </button>
          ))}

          {onAgentModeChange && (
            <button
              type="button"
              title={agentMode ? "Agent mode ON — file ops, code execution" : "Enable Agent mode"}
              onClick={() => onAgentModeChange(!agentMode)}
              style={{
                padding: "5px 10px", marginLeft: 4, borderRadius: 8,
                border: agentMode ? "1px solid var(--brand)" : "1px solid var(--border-default)",
                background: agentMode ? "var(--brand-glow)" : "transparent",
                color: agentMode ? "var(--brand-light)" : "var(--text-muted)",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                fontSize: 12, fontWeight: agentMode ? 700 : 500,
                transition: "all 0.15s ease",
              }}
            >
              <Cpu style={{ width: 13, height: 13 }} />
              <span className="mobile-hidden">Agent</span>
            </button>
          )}

          {onResearchModeChange && (
            <button
              type="button"
              title={researchMode ? "Deep Research ON — multi-source web synthesis" : "Enable Deep Research"}
              onClick={() => onResearchModeChange(!researchMode)}
              style={{
                padding: "5px 10px", borderRadius: 8,
                border: researchMode ? "1px solid var(--accent)" : "1px solid var(--border-default)",
                background: researchMode ? "rgba(139,122,252,0.12)" : "transparent",
                color: researchMode ? "var(--accent-light)" : "var(--text-muted)",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                fontSize: 12, fontWeight: researchMode ? 700 : 500,
                transition: "all 0.15s ease",
              }}
            >
              <Microscope style={{ width: 13, height: 13 }} />
              <span className="mobile-hidden">Research</span>
            </button>
          )}

          {model && (
            <div
              className="mobile-hidden"
              style={{
                marginLeft: 6, fontSize: 11, fontWeight: 700,
                padding: "3px 10px", borderRadius: 100,
                background: "var(--brand-glow)", color: "var(--brand-light)",
                border: "1px solid rgba(242,169,59,0.25)", letterSpacing: "0.04em",
                textTransform: "capitalize",
              }}
            >
              {model}
            </div>
          )}

          {/* Character counter — show when approaching limit */}
          {input.length > 8000 && (
            <span style={{
              fontSize: 11, color: input.length > 28000 ? "var(--error)" : "var(--text-muted)",
              marginLeft: 8,
            }}>
              {input.length.toLocaleString()}/32k
            </span>
          )}
        </div>

        {/* Right: Stop or Send */}
        {isLoading && onStop ? (
          <button
            onClick={onStop}
            title="Stop generating"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 14px", borderRadius: 10, border: "1px solid rgba(255,80,80,0.35)",
              background: "rgba(255,80,80,0.1)", color: "#ff5050",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,80,80,0.2)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,80,80,0.1)")}
          >
            <Square style={{ width: 12, height: 12 }} />
            Stop
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send message"
            style={{
              width: 36, height: 36, borderRadius: 10, border: "none",
              background: canSend
                ? "linear-gradient(135deg, var(--brand), var(--brand-light))"
                : "var(--surface-3)",
              color: canSend ? "#1a1410" : "var(--text-muted)",
              boxShadow: canSend ? "0 2px 12px var(--brand-glow)" : "none",
              cursor: canSend ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              opacity: canSend ? 1 : 0.45,
              transform: canSend ? "scale(1)" : "scale(0.9)",
              transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
            }}
            onMouseEnter={e => { if (canSend) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.06)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = canSend ? "scale(1)" : "scale(0.9)"; }}
          >
            <Send style={{ width: 15, height: 15 }} />
          </button>
        )}
      </div>
    </div>
  );
}