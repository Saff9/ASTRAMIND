"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Globe, Paperclip, Mic } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  model?: string;
}

export default function ChatInput({ onSend, isLoading = false, model }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "24px";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  const handleSend = () => {
    const t = input.trim();
    if (!t) { setErrorMsg("Message cannot be empty."); return; }
    if (t.length > 4000) { setErrorMsg("Message is too long (max 4000 characters)."); return; }
    if (isLoading) return;
    onSend(t);
    setInput("");
    setErrorMsg(null);
    if (textareaRef.current) textareaRef.current.style.height = "24px";
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const canSend = input.trim().length > 0 && input.length <= 4000 && !isLoading;

  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: `1.5px solid ${focused || canSend ? "var(--brand)" : "var(--border-default)"}`,
        borderRadius: 16,
        transition: "border-color 0.25s ease, box-shadow 0.25s ease",
        boxShadow: focused || canSend ? "0 0 0 3px var(--brand-glow)" : "0 2px 12px rgba(0,0,0,0.25)",
        cursor: isMobile && !focused ? "text" : "default",
      }}
      onClick={() => {
        // On mobile, only focus the textarea when the container is explicitly clicked
        if (!focused && textareaRef.current) {
          textareaRef.current.focus();
        }
      }}
    >
      {/* Textarea */}
      <div className="mobile-tight" style={{ padding: "10px 14px 4px" }}>
        {errorMsg && (
          <div style={{ fontSize: 12, color: "#ff4a4a", marginBottom: 6, fontWeight: 500 }}>
            {errorMsg}
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (e.target.value.length < 4000) setErrorMsg(null);
          }}
          onKeyDown={handleKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={isLoading}
          placeholder="Ask anything…"
          maxLength={4000}
          rows={1}
          // Prevent mobile keyboard from popping up before user taps
          autoFocus={false}
          style={{
            width: "100%", resize: "none", background: "transparent", border: "none",
            outline: "none", fontSize: 15, lineHeight: 1.5, color: "var(--text-primary)",
            fontFamily: "inherit", minHeight: 24, maxHeight: "50vh", overflowY: "auto",
            display: "block", padding: 0, margin: 0,
          }}
        />
      </div>

      {/* Toolbar */}
      <div className="mobile-tight-toolbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 8px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {[
            { icon: <Paperclip style={{ width: 14, height: 14 }} />, title: "Attach file",  hoverColor: "var(--text-secondary)" },
            { icon: <Globe       style={{ width: 14, height: 14 }} />, title: "Web search",  hoverColor: "var(--accent)" },
            { icon: <Mic         style={{ width: 14, height: 14 }} />, title: "Voice input", hoverColor: "var(--text-secondary)" },
          ].map((btn) => (
            <button key={btn.title} title={btn.title} style={{
              padding: 6, borderRadius: 7, background: "transparent", border: "none",
              color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center",
              transition: "color 0.15s ease, background 0.15s ease",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = btn.hoverColor; (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-3)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
              {btn.icon}
            </button>
          ))}

          {model && (
            <div className="mobile-hidden" style={{
              marginLeft: 4, fontSize: 11, fontWeight: 600, padding: "2px 9px",
              borderRadius: 100, background: "var(--brand-glow)", color: "var(--brand-light)",
              border: "1px solid rgba(232,160,48,0.25)", letterSpacing: "0.02em",
            }}>
              {model}
            </div>
          )}
        </div>

        {/* Send button — only visible when canSend */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          style={{
            width: 32, height: 32, borderRadius: 9, border: "none",
            background: "linear-gradient(135deg,var(--brand),var(--brand-light))",
            color: "var(--bg-primary)",
            boxShadow: canSend ? "0 2px 10px var(--brand-glow)" : "none",
            cursor: canSend ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, overflow: "hidden",
            opacity: canSend ? 1 : 0.4,
            transform: canSend ? "scale(1)" : "scale(0.85)",
            pointerEvents: canSend ? "auto" : "none",
            transition: "opacity 0.2s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease",
          }}
          onMouseEnter={(e) => { if (canSend) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = canSend ? "scale(1)" : "scale(0.6)"; }}
        >
          {isLoading ? (
            <div style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid var(--bg-primary)", borderTopColor: "transparent", animation: "spin-slow 0.8s linear infinite" }} />
          ) : (
            <Send style={{ width: 14, height: 14 }} />
          )}
        </button>
      </div>
    </div>
  );
}