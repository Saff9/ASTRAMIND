"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Settings, SidebarClose, SidebarOpen,
  ArrowLeft, Info, Shield, Wrench, SquarePen, Download
} from "lucide-react";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";
import SettingsModal from "@/components/chat/SettingsModal";
import { 
  GroqLogoIcon, ClaudeIcon, DeepSeekIcon, AstraIcon,
  OpenAIIcon, GeminiIcon, MistralIcon, MetaIcon 
} from "@/components/common/ProviderIcons";
import { useSession, signOut, signIn } from "next-auth/react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: string;
  model?: string;
  timestamp: Date;
  loading?: boolean;
}

const MODEL_OPTIONS = [
  // Top 3 (Always shown initially)
  { id: "gpt-4o",           label: "GPT-4o",              Icon: OpenAIIcon,   desc: "Flagship multi-modal",     provider: "OpenAI",    model: "gpt-4o",           tier: "smart",    speedMs: 1200 },
  { id: "claude-sonnet",    label: "Claude 3.5 Sonnet",   Icon: ClaudeIcon,   desc: "Top coding & reasoning",   provider: "Anthropic", model: "claude-3-5-sonnet",tier: "smart",    speedMs: 1600 },
  { id: "llama-3-70b",      label: "Llama 3.3 70B",       Icon: GroqLogoIcon, desc: "Lightning fast open weight",provider:"Groq",      model: "llama-3.3-70b",    tier: "balanced", speedMs: 400 },
  // The rest (Shown on 'Show more')
  { id: "deepseek-r1",      label: "DeepSeek R1",         Icon: DeepSeekIcon, desc: "Advanced reasoning",       provider: "DeepSeek",  model: "deepseek-reasoner",tier: "smart",    speedMs: 2500 },
  { id: "gpt-4o-mini",      label: "GPT-4o Mini",         Icon: OpenAIIcon,   desc: "Fast & affordable",        provider: "OpenAI",    model: "gpt-4o-mini",      tier: "fast",     speedMs: 600 },
  { id: "claude-haiku",     label: "Claude 3.5 Haiku",    Icon: ClaudeIcon,   desc: "Fastest from Anthropic",   provider: "Anthropic", model: "claude-3-haiku",   tier: "fast",     speedMs: 700 },
  { id: "gemini-2-flash",   label: "Gemini 2.0 Flash",    Icon: GeminiIcon,   desc: "Google's fastest",         provider: "Google",    model: "gemini-2.0-flash", tier: "fast",     speedMs: 500 },
  { id: "gemini-pro",       label: "Gemini 1.5 Pro",      Icon: GeminiIcon,   desc: "Large context window",     provider: "Google",    model: "gemini-1.5-pro",   tier: "smart",    speedMs: 1800 },
  { id: "mistral-large",    label: "Mistral Large",       Icon: MistralIcon,  desc: "European flagship",        provider: "Mistral",   model: "mistral-large",    tier: "smart",    speedMs: 1500 },
  { id: "mistral-small",    label: "Mistral Small",       Icon: MistralIcon,  desc: "Efficient & fast",         provider: "Mistral",   model: "mistral-small",    tier: "fast",     speedMs: 600 },
  { id: "llama-3-8b",       label: "Llama 3.1 8B",        Icon: GroqLogoIcon, desc: "Sub-100ms responses",      provider: "Groq",      model: "llama-3.1-8b",     tier: "fast",     speedMs: 200 },
  { id: "deepseek-chat",    label: "DeepSeek V3",         Icon: DeepSeekIcon, desc: "Standard chat model",      provider: "DeepSeek",  model: "deepseek-chat",    tier: "fast",     speedMs: 1100 },
  { id: "grok-2",           label: "Grok 2",              Icon: MetaIcon, /* Using placeholder Meta icon for grok */ desc: "Real-time knowledge",      provider: "xAI",       model: "grok-2",           tier: "balanced", speedMs: 1300 },
  { id: "phi-3",            label: "Phi-3 Mini",          Icon: AstraIcon,    desc: "Microsoft's small model",  provider: "Azure",     model: "phi-3-mini",       tier: "fast",     speedMs: 400 },
  { id: "qwen-max",         label: "Qwen Max",            Icon: AstraIcon,    desc: "Alibaba's top model",      provider: "Alibaba",   model: "qwen-max",         tier: "smart",    speedMs: 1400 },
];

const EMPTY_SUGGESTIONS = [
  "Explain how transformers work in machine learning",
  "Write a REST API in FastAPI with JWT auth",
  "What are the best practices for React performance?",
  "Summarize the key ideas from Atomic Habits",
];

export default function ChatPage() {
  const { data: session } = useSession();
  const [messages, setMessages]   = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modelId, setModelId]     = useState("gpt-4o");
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [isMobile, setIsMobile]         = useState(false);
  const [modelOpen, setModelOpen]       = useState(false);
  const [showAllModels, setShowAllModels] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageTime = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const selectedModel = MODEL_OPTIONS.find((m) => m.id === modelId) || MODEL_OPTIONS[0];

  const router = useRouter();

  useEffect(() => {
    if (session === null) {
      // Not authenticated — redirect to sign-in
      router.replace("/signin");
      return;
    }
    if (session?.user?.email) {
      // Load persisted chat history for this user
      const stored = localStorage.getItem(`chat_history_${session.user.email}`);
      if (stored) {
        try { setMessages(JSON.parse(stored)); } catch { /* ignore */ }
      }
      // Sync user to Neon (fire-and-forget, non-blocking)
      fetch("/api/users/sync", { method: "POST" }).catch(() => {/* silent */});
    } else {
      setMessages([]);
    }
  }, [session, router]);

  useEffect(() => {
    if (session?.user?.email && messages.length > 0) {
      localStorage.setItem(`chat_history_${session.user.email}`, JSON.stringify(messages));
    }
  }, [messages, session]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    setTimeout(() => {
      if (window.innerWidth < 768) setSidebarOpen(false);
    }, 0);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const stopResponse = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    // Mark any loading message as stopped
    setMessages((prev) =>
      prev.map((m) =>
        m.loading ? { ...m, loading: false, content: m.content || "_Response stopped._" } : m
      )
    );
  }, []);

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const now = Date.now();
    if (now - lastMessageTime.current < 2000) {
      const errorMsg: Message = {
        id: crypto.randomUUID(), role: "assistant",
        content: "You are sending messages too fast. Please wait a moment.",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMsg]);
      return;
    }
    lastMessageTime.current = now;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text, timestamp: new Date() };
    const loadId = crypto.randomUUID();
    const loadingMsg: Message = { id: loadId, role: "assistant", content: "", loading: true, timestamp: new Date() };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://astramind-reer.onrender.com";

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const rawToken = (session as { accessToken?: string } | null)?.accessToken;
      if (rawToken) headers["Authorization"] = `Bearer ${rawToken}`;

      // Build conversation history from current messages (exclude the just-added loading msg)
      const history = messages
        .filter((m) => !m.loading && (m.role === "user" || m.role === "assistant") && m.content)
        .slice(-50)  // last 50 messages for context
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch(`${apiBase}/api/v1/chat`, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          prompt: text,
          model: selectedModel.tier || "fast",
          stream: false,
          messages: history.length > 0 ? history : undefined,
        }),
      });

      if (response.status === 429) {
        let detail = "Daily limit reached. Please try again tomorrow.";
        try { const d = await response.json(); if (d?.detail) detail = typeof d.detail === "string" ? d.detail : JSON.stringify(d.detail); } catch { /**/ }
        throw new Error(detail);
      }
      if (!response.ok) {
        let detail = `Request failed (${response.status})`;
        try { const d = await response.json(); if (d?.detail) detail = typeof d.detail === "string" ? d.detail : JSON.stringify(d.detail); } catch { /**/ }
        throw new Error(detail);
      }

      const data = await response.json();
      const content = data.response || data.content || data.choices?.[0]?.message?.content || data.text || "No response generated.";

      const reply: Message = {
        id: loadId, role: "assistant", content,
        provider: data.provider || selectedModel.provider,
        model: data.model || selectedModel.model,
        timestamp: new Date(),
      };
      setMessages((prev) => prev.map((m) => (m.id === loadId ? reply : m)));
    } catch (err: unknown) {
      const error = err as Error;
      // Aborted = user clicked stop, don't show error
      if (error.name === "AbortError") return;
      const errorMsg: Message = {
        id: loadId, role: "assistant",
        content: `**Error:** ${error.message || "Failed to fetch response."}`,
        timestamp: new Date()
      };
      setMessages((prev) => prev.map((m) => (m.id === loadId ? errorMsg : m)));
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, [isLoading, selectedModel, session, messages]);

  const exportChat = (format: "json" | "doc" | "pdf") => {
    if (messages.length === 0) return;
    const title = `ASTRAMIND_Chat_${new Date().toISOString().split("T")[0]}`;
    
    if (format === "pdf") {
      window.print();
    } else if (format === "json") {
      const blob = new Blob([JSON.stringify(messages, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${title}.json`; a.click();
    } else if (format === "doc") {
      const text = messages.map(m => `[${m.role.toUpperCase()}]\n${m.content}\n`).join("\n");
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${title}.doc`; a.click();
    }
  };

  const MIcon = selectedModel.Icon;

  return (
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden", background: "var(--bg-primary)", color: "var(--text-primary)" }}>

      {/* ═══ MOBILE OVERLAY ═══ */}
      {isMobile && sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{ position: "absolute", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} 
        />
      )}

      {/* ═══ SIDEBAR ═══ */}
      <aside style={{
        flexShrink: 0,
        position: isMobile ? "absolute" : "relative",
        zIndex: 50,
        height: "100%",
        width: sidebarOpen ? 260 : 0,
        left: isMobile && !sidebarOpen ? -260 : 0,
        overflow: "hidden",
        transition: "width 0.3s cubic-bezier(0.16,1,0.3,1), left 0.3s cubic-bezier(0.16,1,0.3,1)",
        background: "var(--surface-1)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ width: 260, height: "100%", display: "flex", flexDirection: "column" }}>

          {/* Sidebar header */}
          <div style={{ padding: "12px 12px 10px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,var(--brand),var(--brand-light))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <AstraIcon size={18} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>ASTRAMIND</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{ padding: 6, borderRadius: 8, background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-3)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
            >
              <SidebarClose style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {/* New chat button */}
          <div style={{ padding: "10px 10px 6px" }}>
            <button
              onClick={() => setMessages([])}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", borderRadius: 10, fontSize: 14, fontWeight: 500,
                background: "rgba(212,118,59,0.08)", color: "var(--brand-light)",
                border: "1px solid rgba(212,118,59,0.2)", cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(212,118,59,0.15)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(212,118,59,0.08)"; }}
            >
              <Plus style={{ width: 16, height: 16, flexShrink: 0 }} />
              New conversation
            </button>
          </div>

          {/* Conversation list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 10px" }}>
            <p style={{ padding: "8px 6px 6px", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>
              Recent
            </p>
            {messages.length > 0 ? (
              <button style={{
                width: "100%", textAlign: "left", padding: "10px 10px", borderRadius: 10,
                background: "var(--surface-2)", border: "none", cursor: "pointer",
                display: "block", transition: "background 0.15s ease", marginBottom: 2,
              }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  Current Conversation
                </p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {messages[messages.length - 1]?.content?.slice(0, 40)}...
                </p>
              </button>
            ) : (
              <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>No recent chats</p>
            )}
          </div>

          {/* Sidebar footer */}
          <div style={{ padding: "8px 10px 12px", borderTop: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 2 }}>
            <Link href="/" style={{ textDecoration: "none" }}>
              <button style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 10, fontSize: 13,
                background: "transparent", border: "none", cursor: "pointer",
                color: "var(--text-muted)", transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}>
                <ArrowLeft style={{ width: 15, height: 15 }} />
                Back to Home
              </button>
            </Link>
            {/* Settings — opens modal */}
            <button
              onClick={() => setSettingsOpen(true)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 10, fontSize: 13,
                background: "transparent", border: "none", cursor: "pointer",
                color: "var(--text-muted)", transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
            >
              <Settings style={{ width: 15, height: 15 }} />
              Settings
            </button>

            {/* Discover Link */}
            <Link href="/discover" style={{ textDecoration: "none" }}>
              <button style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 10, fontSize: 13,
                background: "transparent", border: "none", cursor: "pointer",
                color: "var(--text-muted)", transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}>
                <svg style={{ width: 15, height: 15 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
                </svg>
                Discover
                <span style={{ marginLeft: "auto", fontSize: 9, padding: "2px 5px", background: "rgba(212,118,59,0.15)", color: "var(--brand-light)", borderRadius: 100, fontWeight: 700 }}>NEW</span>
              </button>
            </Link>

            <button style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px", borderRadius: 10, fontSize: 13,
              background: "transparent", border: "none", cursor: "pointer",
              color: "var(--text-muted)", transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}>
              <Wrench style={{ width: 15, height: 15 }} />
              Tools
            </button>

            <button style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px", borderRadius: 10, fontSize: 13,
              background: "transparent", border: "none", cursor: "pointer",
              color: "var(--text-muted)", transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}>
              <Info style={{ width: 15, height: 15 }} />
              About
            </button>

            {/* Privacy — navigates to /privacy */}
            <Link href="/privacy" style={{ textDecoration: "none" }}>
              <button style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 10, fontSize: 13,
                background: "transparent", border: "none", cursor: "pointer",
                color: "var(--text-muted)", transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}>
                <Shield style={{ width: 15, height: 15 }} />
                Privacy
              </button>
            </Link>
          </div>
        </div>
      </aside>

      {/* ═══ MAIN ═══ */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

        {/* Top bar */}
        <header style={{
          flexShrink: 0, height: 56,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px",
          background: "rgba(26,22,18,0.85)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border-subtle)",
          position: "relative", zIndex: 45,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{ padding: 7, borderRadius: 8, background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
              >
                <SidebarOpen style={{ width: 17, height: 17 }} />
              </button>
            )}

            <button
              onClick={() => setMessages([])}
              style={{ padding: 7, borderRadius: 8, background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
            >
              <SquarePen style={{ width: 17, height: 17 }} />
            </button>

            {/* Model selector */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => {
                  if (modelOpen) setShowAllModels(false);
                  setModelOpen(!modelOpen);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "6px 12px", borderRadius: 10, fontSize: 13, fontWeight: 500,
                  background: modelOpen ? "var(--surface-3)" : "var(--surface-2)",
                  border: "1px solid var(--border-default)", cursor: "pointer",
                  color: "var(--text-secondary)", transition: "all 0.15s ease",
                }}
              >
                <MIcon size={16} />
                {selectedModel.label}
                <svg style={{ width: 12, height: 12, transform: modelOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {modelOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", left: 0, width: 240, zIndex: 100,
                  background: "var(--surface-2)", border: "1px solid var(--border-default)",
                  borderRadius: 14, padding: "6px",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3)",
                  maxHeight: 400, overflowY: "auto"
                }}>
                  {(showAllModels ? MODEL_OPTIONS : MODEL_OPTIONS.slice(0, 3)).map((m) => {
                    const MIcon = m.Icon;
                    const isActive = m.id === modelId;
                    return (
                      <button
                        key={m.id}
                        onClick={() => { setModelId(m.id); setModelOpen(false); setShowAllModels(false); }}
                        style={{
                          width: "100%", display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 12px", borderRadius: 10, fontSize: 13, border: "none", cursor: "pointer",
                          background: isActive ? "var(--brand-glow)" : "transparent",
                          color: isActive ? "var(--brand-light)" : "var(--text-secondary)",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-3)"; }}
                        onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                      >
                        <MIcon size={18} />
                        <div style={{ textAlign: "left", flex: 1 }}>
                          <p style={{ fontWeight: 500, marginBottom: 1 }}>{m.label}</p>
                          <p style={{ fontSize: 11, opacity: 0.6 }}>{m.desc}</p>
                        </div>
                        {isActive && (
                          <svg style={{ width: 14, height: 14, flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                  
                  {!showAllModels && (
                    <button
                      onClick={() => setShowAllModels(true)}
                      style={{
                        width: "100%", padding: "10px 12px", marginTop: 4,
                        borderRadius: 10, border: "1px dashed var(--border-strong)",
                        background: "transparent", color: "var(--text-muted)",
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-3)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
                    >
                      Show 12 more models
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right actions — NO sign out here, that's in Settings */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {!session && (
              <button onClick={() => signIn()} style={{ padding: "6px 14px", borderRadius: 8, background: "var(--text-primary)", color: "var(--bg-primary)", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}>
                Sign In
              </button>
            )}
            {/* Export Menu */}
            <div style={{ position: "relative" }}>
              <button onClick={() => {
                const el = document.getElementById("export-menu");
                if (el) el.style.display = el.style.display === "none" ? "block" : "none";
              }} style={{ padding: 7, borderRadius: 8, background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex" }}>
                <Download style={{ width: 16, height: 16 }} />
              </button>
              <div id="export-menu" style={{ display: "none", position: "absolute", top: "100%", right: 0, marginTop: 8, background: "var(--surface-2)", border: "1px solid var(--border-subtle)", borderRadius: 10, padding: 4, width: 120, zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
                <button onClick={() => { exportChat("pdf"); document.getElementById("export-menu")!.style.display="none"; }} style={{ width: "100%", padding: "8px", background: "transparent", border: "none", borderRadius: 6, color: "var(--text-primary)", fontSize: 13, textAlign: "left", cursor: "pointer" }}>Save as PDF</button>
                <button onClick={() => { exportChat("doc"); document.getElementById("export-menu")!.style.display="none"; }} style={{ width: "100%", padding: "8px", background: "transparent", border: "none", borderRadius: 6, color: "var(--text-primary)", fontSize: 13, textAlign: "left", cursor: "pointer" }}>Export DOC</button>
                <button onClick={() => { exportChat("json"); document.getElementById("export-menu")!.style.display="none"; }} style={{ width: "100%", padding: "8px", background: "transparent", border: "none", borderRadius: 6, color: "var(--text-primary)", fontSize: 13, textAlign: "left", cursor: "pointer" }}>Export JSON</button>
              </div>
            </div>
          </div>
        </header>

        {/* Message area — flex-1 with overflow-y:auto, no fixed height needed */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", position: "relative", minHeight: 0 }}>
          {messages.length === 0 ? (
            // Empty state
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", textAlign: "center" }}>
              <div style={{
                width: 64, height: 64, borderRadius: 20, marginBottom: 24,
                background: "linear-gradient(135deg,var(--brand),var(--brand-light))",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 8px 32px var(--brand-glow), 0 16px 48px rgba(0,0,0,0.3)",
              }}>
                <AstraIcon size={36} />
              </div>
              <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8, fontFamily: "var(--font-syne,'Syne'),sans-serif" }}>How can I help?</h1>
              <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 40 }}>
                Using <span style={{ color: "var(--brand-light)", fontWeight: 600 }}>{selectedModel.label}</span> mode · {selectedModel.desc}
              </p>

              {/* Suggestion grid */}
              <div className="mobile-grid-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 580, width: "100%" }}>
                {EMPTY_SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => handleSend(s)} style={{
                    textAlign: "left", padding: "16px 18px", borderRadius: 16, fontSize: 14, fontWeight: 400,
                    background: "var(--surface-1)", border: "1px solid var(--border-default)",
                    cursor: "pointer", color: "var(--text-secondary)", lineHeight: 1.45,
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--brand)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-default)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)"; (e.currentTarget as HTMLButtonElement).style.transform = ""; }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px" }}>
              {messages.map((msg) => (
                <div key={msg.id} style={{ marginBottom: 28 }}>
                  <MessageBubble {...msg} />
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Composer area */}
        <div className="mobile-p-sm" style={{ flexShrink: 0, padding: "12px 24px 16px", background: "var(--bg-primary)" }}>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            {/* Stop button — shown while loading */}
            {isLoading && (
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <button
                  onClick={stopResponse}
                  style={{
                    padding: "6px 18px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)",
                    color: "#ff5050", cursor: "pointer", transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,80,80,0.2)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,80,80,0.1)"; }}
                >
                  ⏹ Stop generating
                </button>
              </div>
            )}
            {/* Pass onStop to ChatInput — model label hidden */}
            <ChatInput onSend={handleSend} isLoading={isLoading} />
            <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
              AI can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </main>

      {/* Click-away to close model dropdown */}
      {modelOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => { setModelOpen(false); setShowAllModels(false); }} />
      )}

      {/* Settings Modal */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}