"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

  const removeFile = useCallback((idx: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));
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

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [setErrorMsg]);

  // ─── Derived state ────────────────────────────────────────────────────────

  const canSend = (input.trim().length > 0 || attachedFiles.length > 0) && input.length <= 32000 && !isLoading;
  
  const isVoiceGlow = isListening;
  const isAgentGlow = agentMode && focused;
  const isResearchGlow = researchMode && focused;

  const borderColor = isVoiceGlow
    ? "rgba(248,113,113,0.8)"
    : isAgentGlow
    ? "var(--brand)"
    : isResearchGlow
    ? "var(--accent)"
    : focused
    ? "rgba(255, 255, 255, 0.2)"
    : "var(--border-default)";

  const boxShadow = focused || isListening
    ? (isVoiceGlow
        ? "0 0 0 3px rgba(248,113,113,0.15), 0 12px 30px rgba(0,0,0,0.4)"
        : isAgentGlow
        ? "0 0 0 3px var(--brand-glow), 0 12px 30px rgba(0,0,0,0.4)"
        : isResearchGlow
        ? "0 0 0 3px var(--accent-glow), 0 12px 30px rgba(0,0,0,0.4)"
        : "0 0 0 3px rgba(255,255,255,0.03), 0 12px 30px rgba(0,0,0,0.4)")
    : "0 4px 20px rgba(0,0,0,0.3)";

  return (
    <div
      className="bg-[#121217] transition-all duration-300 relative"
      style={{
        border: `1.5px solid ${borderColor}`,
        borderRadius: 18,
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
      <div className="flex flex-wrap gap-2 px-5 pt-3">
        <AnimatePresence>
          {attachedFiles.map((f, idx) => (
            <motion.div 
              key={f.name + idx}
              initial={{ opacity: 0, scale: 0.8, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 5 }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/[0.08] border border-amber-500/25 text-[11px] text-amber-300 font-semibold shadow-sm"
            >
              📎 {f.name}
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                className="bg-transparent border-none cursor-pointer text-[#5a5a72] hover:text-white p-0 flex items-center transition-colors"
              >
                <X size={11} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Textarea row */}
      <div className="mobile-tight px-5 pt-3 pb-1">
        {errorMsg && (
          <div className="text-xs text-[#f5645a] mb-1.5 font-semibold">
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
          placeholder={isListening ? "🎤 Listening... speak now" : "Ask anything... (Shift+Enter for new line)"}
          maxLength={32000}
          rows={1}
          autoComplete="off"
          spellCheck={true}
          className="w-full resize-none bg-transparent border-none outline-none text-base leading-relaxed overflow-y-auto block p-0 m-0 min-h-6 max-h-[40vh] transition-colors"
          style={{
            color: isListening ? "#f87171" : "var(--text-primary)",
            fontFamily: "inherit",
          }}
        />
      </div>

      {/* Toolbar */}
      <div
        className="mobile-tight-toolbar flex items-center justify-between px-3.5 pb-3.5 pt-1.5"
      >
        {/* Left tools */}
        <div className="flex items-center gap-1.5">
          {/* Attach file */}
          <button
            title="Attach text file (.py, .js, .txt, .md, etc.)"
            onClick={handleFileAttach}
            className="p-2 rounded-lg bg-transparent border-none cursor-pointer flex items-center transition-colors"
            style={{
              color: attachedFiles.length > 0 ? "var(--brand)" : "var(--text-muted)"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = attachedFiles.length > 0 ? "var(--brand)" : "var(--text-muted)")}
          >
            <Paperclip size={14} />
          </button>

          {/* Web search (informational — auto-detects) */}
          <button
            title="Web search auto-detects based on your query"
            className="p-2 rounded-lg bg-transparent border-none text-[#5a5a72] opacity-40 cursor-default flex items-center"
          >
            <Globe size={14} />
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
            className={`p-2 rounded-lg border-none flex items-center transition-all ${
              isListening ? "bg-[#f5645a]/10" : "bg-transparent"
            }`}
            style={{
              color: isListening ? "#f87171" : "var(--text-muted)",
              cursor: voiceSupported ? "pointer" : "not-allowed",
              opacity: voiceSupported ? 1 : 0.4,
              animation: isListening ? "glow-pulse 1.5s ease-in-out infinite" : "none",
            }}
            onMouseEnter={(e) => { if (voiceSupported && !isListening) e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { if (!isListening) e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            {isListening
              ? <MicOff size={14} />
              : <Mic size={14} />}
          </button>

          {/* Agent mode toggle */}
          {onAgentModeChange && (
            <button
              type="button"
              title={agentMode ? "Agent mode ON — file operations and executions enabled" : "Enable Agent mode"}
              onClick={() => onAgentModeChange(!agentMode)}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1 text-[11.5px] cursor-pointer transition-all border ${
                agentMode 
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300 font-bold shadow-sm" 
                  : "bg-transparent border-white/[0.06] text-[#9898b0] hover:text-white"
              }`}
            >
              <Cpu size={13} />
              <span className="mobile-hidden">Agent</span>
              {agentMode && (
                <span className="text-[8px] font-extrabold bg-amber-400 text-black px-1.5 py-0.5 rounded ml-0.5 select-none leading-none">ON</span>
              )}
            </button>
          )}

          {/* Research mode toggle */}
          {onResearchModeChange && (
            <button
              type="button"
              title={researchMode ? "Deep Research ON — multi-source web synthesis enabled" : "Enable Deep Research"}
              onClick={() => onResearchModeChange(!researchMode)}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1 text-[11.5px] cursor-pointer transition-all border ${
                researchMode 
                  ? "bg-[#8b7afc]/10 border-[#8b7afc]/30 text-[#b0a5ff] font-bold shadow-sm" 
                  : "bg-transparent border-white/[0.06] text-[#9898b0] hover:text-white"
              }`}
            >
              <Microscope size={13} />
              <span className="mobile-hidden">Research</span>
            </button>
          )}

          {/* Model badge */}
          {model && (
            <div
              className="mobile-hidden text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-amber-500/[0.08] border border-amber-500/15 text-amber-300 ml-1.5 uppercase tracking-wide"
            >
              {model}
            </div>
          )}

          {/* Character counter */}
          {input.length > 8000 && (
            <span 
              className={`text-xs ml-2 ${
                input.length > 28000 ? "text-[#f5645a]" : "text-[#5a5a72]"
              }`}
            >
              {input.length.toLocaleString()}/32k
            </span>
          )}
        </div>

        {/* Right: Stop or Send */}
        {isLoading && onStop ? (
          <button
            onClick={onStop}
            title="Stop generating"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#f5645a]/30 bg-[#f5645a]/10 hover:bg-[#f5645a]/20 text-[#f87171] text-xs font-bold cursor-pointer transition-all"
          >
            <Square size={11} className="fill-[#f87171]" />
            Stop
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send message"
            className="w-9 h-9 rounded-xl border-none flex items-center justify-center cursor-pointer transition-all flex-shrink-0"
            style={{
              background: canSend
                ? "linear-gradient(135deg, var(--brand), var(--brand-light))"
                : "var(--surface-3)",
              color: canSend ? "#100c0a" : "var(--text-disabled)",
              boxShadow: canSend ? "0 4px 14px var(--brand-glow)" : "none",
              opacity: canSend ? 1 : 0.4,
              transform: canSend ? "scale(1)" : "scale(0.95)",
            }}
            onMouseEnter={(e) => { if (canSend) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = canSend ? "scale(1)" : "scale(0.95)"; }}
          >
            <Send size={15} />
          </button>
        )}
      </div>
    </div>
  );
}