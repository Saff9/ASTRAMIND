"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Globe, Paperclip, Mic, MicOff, Cpu, Microscope, Square, X } from "lucide-react";

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

// SpeechRecognition types (browser API)
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
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
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; content: string }>>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect mobile and voice support after mount
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);

    // Check SpeechRecognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognition);

    return () => window.removeEventListener("resize", check);
  }, []);

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "24px";
    if (input) {
      ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = useCallback(() => {
    const t = input.trim();
    if (!t && attachedFiles.length === 0) {
      setErrorMsg("Type a message first.");
      return;
    }
    if (t.length > 32000) {
      setErrorMsg("Message too long (max 32,000 characters).");
      return;
    }
    if (isLoading) return;

    // Compose: include file contents if any
    let finalMessage = t;
    if (attachedFiles.length > 0) {
      const fileBlocks = attachedFiles
        .map((f) => `\`\`\`\n// ${f.name}\n${f.content}\n\`\`\``)
        .join("\n\n");
      finalMessage = t ? `${t}\n\n${fileBlocks}` : fileBlocks;
    }

    onSend(finalMessage);
    setInput("");
    setAttachedFiles([]);
    setErrorMsg(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "24px";
    }
  }, [input, attachedFiles, isLoading, onSend]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── Voice input ──────────────────────────────────────────────────────────

  const toggleVoice = useCallback(() => {
    const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionApi) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognitionApi();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    let finalTranscript = input;

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + " ";
        } else {
          interim = result[0].transcript;
        }
      }
      setInput(finalTranscript + interim);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setErrorMsg("Voice input error. Please try again.");
    };

    recognition.onend = () => {
      setIsListening(false);
      setInput(finalTranscript.trim());
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setErrorMsg(null);
  }, [isListening, input]);

  // ─── File attach ──────────────────────────────────────────────────────────

  const handleFileAttach = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const MAX_SIZE = 100 * 1024; // 100KB per file
    const ALLOWED_TYPES = [
      "text/plain", "text/markdown", "text/csv", "text/html",
      "application/json", "application/javascript", "text/javascript",
      "text/css", "text/xml", "application/xml",
      "text/x-python", "text/x-typescript",
    ];

    const newFiles: Array<{ name: string; content: string }> = [];
    for (const file of files.slice(0, 5)) {
      if (file.size > MAX_SIZE) {
        setErrorMsg(`File "${file.name}" is too large (max 100KB).`);
        continue;
      }
      const isText = ALLOWED_TYPES.includes(file.type) || file.name.match(/\.(txt|md|py|js|ts|tsx|jsx|json|css|html|xml|csv|sh|yaml|yml|toml|rs|go|rb|java|cpp|c|cs|php)$/i);
      if (!isText) {
        setErrorMsg(`File "${file.name}" is not a supported text format.`);
        continue;
      }
      const content = await file.text();
      newFiles.push({ name: file.name, content });
    }

    if (newFiles.length > 0) {
      setAttachedFiles((prev) => [...prev, ...newFiles].slice(0, 5));
      setErrorMsg(null);
    }

    // Reset file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const removeFile = useCallback((idx: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // ─── Derived state ────────────────────────────────────────────────────────

  const canSend = (input.trim().length > 0 || attachedFiles.length > 0) && input.length <= 32000 && !isLoading;
  const borderColor = focused || isListening
    ? (isListening ? "rgba(248,113,113,0.7)" : "var(--brand)")
    : "var(--border-default)";
  const boxShadow = focused || isListening
    ? (isListening
        ? "0 0 0 3px rgba(248,113,113,0.15), 0 4px 20px rgba(0,0,0,0.4)"
        : "0 0 0 3px var(--brand-glow), 0 4px 20px rgba(0,0,0,0.4)")
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
        if (textareaRef.current && !focused) textareaRef.current.focus();
      }}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".txt,.md,.py,.js,.ts,.tsx,.jsx,.json,.css,.html,.xml,.csv,.sh,.yaml,.yml,.toml,.rs,.go,.rb,.java,.cpp,.c,.cs,.php"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Attached files preview */}
      {attachedFiles.length > 0 && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 6, padding: "10px 14px 0",
        }}>
          {attachedFiles.map((f, idx) => (
            <div key={idx} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "3px 8px 3px 10px", borderRadius: 20,
              background: "var(--brand-glow)", border: "1px solid rgba(242,169,59,0.3)",
              fontSize: 11, color: "var(--brand-light)", fontWeight: 600,
            }}>
              📎 {f.name}
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "0 0 0 2px", display: "flex", lineHeight: 1 }}
              >
                <X style={{ width: 11, height: 11 }} />
              </button>
            </div>
          ))}
        </div>
      )}

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
          placeholder={isListening ? "🎤 Listening… speak now" : "Ask anything… (Shift+Enter for new line)"}
          maxLength={32000}
          rows={1}
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
            color: isListening ? "#f87171" : "var(--text-primary)",
            fontFamily: "inherit",
            minHeight: 24,
            maxHeight: "40vh",
            overflowY: "auto",
            display: "block",
            padding: 0,
            margin: 0,
            transition: "color 0.2s ease",
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
          {/* Attach file */}
          <button
            title="Attach text file (.py, .js, .txt, .md, etc.)"
            onClick={handleFileAttach}
            style={{
              padding: 7, borderRadius: 8, background: "transparent", border: "none",
              color: attachedFiles.length > 0 ? "var(--brand)" : "var(--text-muted)",
              cursor: "pointer", display: "flex", alignItems: "center",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = attachedFiles.length > 0 ? "var(--brand)" : "var(--text-muted)")}
          >
            <Paperclip style={{ width: 14, height: 14 }} />
          </button>

          {/* Web search (informational — auto-detects) */}
          <button
            title="Web search auto-detects based on your query"
            style={{
              padding: 7, borderRadius: 8, background: "transparent", border: "none",
              color: "var(--text-muted)", cursor: "default", display: "flex", alignItems: "center", opacity: 0.5,
            }}
          >
            <Globe style={{ width: 14, height: 14 }} />
          </button>

          {/* Voice input */}
          <button
            title={
              !voiceSupported
                ? "Voice input not supported in this browser (use Chrome/Edge)"
                : isListening
                ? "Stop listening"
                : "Voice input"
            }
            onClick={voiceSupported ? toggleVoice : undefined}
            style={{
              padding: 7, borderRadius: 8,
              background: isListening ? "rgba(248,113,113,0.12)" : "transparent",
              border: "none",
              color: isListening ? "#f87171" : voiceSupported ? "var(--text-muted)" : "var(--text-muted)",
              cursor: voiceSupported ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center",
              opacity: voiceSupported ? 1 : 0.4,
              transition: "all 0.15s",
              animation: isListening ? "glow-pulse 1.5s ease-in-out infinite" : "none",
            }}
            onMouseEnter={(e) => { if (voiceSupported && !isListening) e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { if (!isListening) e.currentTarget.style.color = voiceSupported ? "var(--text-muted)" : "var(--text-muted)"; }}
          >
            {isListening
              ? <MicOff style={{ width: 14, height: 14 }} />
              : <Mic style={{ width: 14, height: 14 }} />}
          </button>

          {/* Agent mode toggle */}
          {onAgentModeChange && (
            <button
              type="button"
              title={agentMode ? "Agent mode ON — file ops, bash, git clone, code execution" : "Enable Agent mode"}
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
              {agentMode && (
                <span style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: "0.05em",
                  background: "var(--brand)", color: "#1a1410",
                  padding: "1px 4px", borderRadius: 10,
                }}>ON</span>
              )}
            </button>
          )}

          {/* Research mode toggle */}
          {onResearchModeChange && (
            <button
              type="button"
              title={researchMode ? "Deep Research ON — multi-source web synthesis" : "Enable Deep Research"}
              onClick={() => onResearchModeChange(!researchMode)}
              style={{
                padding: "5px 10px", borderRadius: 8,
                border: researchMode ? "1px solid var(--accent)" : "1px solid var(--border-default)",
                background: researchMode ? "rgba(139,122,252,0.12)" : "transparent",
                color: researchMode ? "var(--accent-light, var(--accent))" : "var(--text-muted)",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                fontSize: 12, fontWeight: researchMode ? 700 : 500,
                transition: "all 0.15s ease",
              }}
            >
              <Microscope style={{ width: 13, height: 13 }} />
              <span className="mobile-hidden">Research</span>
            </button>
          )}

          {/* Model badge */}
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

          {/* Character counter */}
          {input.length > 8000 && (
            <span style={{
              fontSize: 11,
              color: input.length > 28000 ? "var(--error)" : "var(--text-muted)",
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
              padding: "5px 14px", borderRadius: 10,
              border: "1px solid rgba(255,80,80,0.35)",
              background: "rgba(255,80,80,0.1)", color: "#ff5050",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,80,80,0.2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,80,80,0.1)")}
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
            onMouseEnter={(e) => { if (canSend) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.06)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = canSend ? "scale(1)" : "scale(0.9)"; }}
          >
            <Send style={{ width: 15, height: 15 }} />
          </button>
        )}
      </div>
    </div>
  );
}