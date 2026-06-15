"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Settings, SidebarClose, SidebarOpen,
  ArrowLeft, Info, Shield, Wrench, SquarePen, Download, Trash2
} from "lucide-react";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";
import SettingsModal from "@/components/chat/SettingsModal";
import { 
  GroqLogoIcon, ClaudeIcon, DeepSeekIcon, AstraIcon,
  OpenAIIcon, GeminiIcon, MistralIcon, MetaIcon 
} from "@/components/common/ProviderIcons";
import { neonAuthClient } from "@/lib/auth-client";
import { useSettings } from "@/lib/SettingsContext";

import type { AgentEvent } from "@/components/chat/MessageBubble";

interface Message {
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
}

interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
}

const MODEL_OPTIONS = [
  // Top 3 (Always shown initially)
  { id: "gpt-4.5",          label: "GPT-4.5",             Icon: OpenAIIcon,   desc: "Flagship multi-modal",     provider: "OpenAI",    model: "gpt-4.5",          tier: "smart",    speedMs: 1200 },
  { id: "claude-sonnet",    label: "Claude 3.7 Sonnet",   Icon: ClaudeIcon,   desc: "Top coding & reasoning",   provider: "Anthropic", model: "claude-3-7-sonnet",tier: "smart",    speedMs: 1600 },
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

// ─── Search intent detection ─────────────────────────────────────────────────
const SEARCH_KEYWORDS = [
  "latest", "today", "current", "news", "now", "2024", "2025", "2026",
  "weather", "stock", "price", "who is", "what is", "what happened",
  "recently", "last week", "this week", "yesterday", "upcoming",
  "new release", "update", "announcement", "trending", "live", "real time",
  "search for", "look up", "find me", "tell me about recent",
];

function detectSearchIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return SEARCH_KEYWORDS.some((kw) => lower.includes(kw));
}

export default function ChatPage() {
  const { vibration } = useSettings();
  const [session, setSession] = useState<{ user?: { email?: string; name?: string; image?: string }; accessToken?: string } | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchingWeb, setSearchingWeb] = useState(false);
  const [agentMode, setAgentMode] = useState(false);
  const [researchMode, setResearchMode] = useState(false);
  const [modelId, setModelId]     = useState("gpt-4.5");
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
    async function checkSession() {
      try {
        const { data } = await neonAuthClient.getSession();
        if (!data) {
          setSession(null);
          router.replace("/signin");
        } else {
          const mappedSession = {
            user: {
              email: data.user.email,
              name: data.user.name || undefined,
              image: data.user.image || undefined,
            },
            accessToken: data.session.id
          };
          setSession(mappedSession);
          
          // Sync user to Neon (fire-and-forget, non-blocking)
          fetch("/api/users/sync", { method: "POST" }).catch(() => {/* silent */});
          
          // Load persisted chat sessions
          const storedSessions = localStorage.getItem(`chat_sessions_${data.user.email}`);
          if (storedSessions) {
            try {
              const parsed = JSON.parse(storedSessions);
              setSessions(parsed);
              if (parsed.length > 0) {
                setCurrentSessionId(parsed[0].id);
                setMessages(parsed[0].messages);
              }
            } catch { /* session parse error */ }
          } else {
            // Check for legacy single-chat history
            const legacyHistory = localStorage.getItem(`chat_history_${data.user.email}`);
            if (legacyHistory) {
              try {
                const parsed = JSON.parse(legacyHistory);
                const newSessionId = crypto.randomUUID();
                const migratedSession: ChatSession = {
                  id: newSessionId,
                  title: parsed.find((m: any) => m.role === "user")?.content.slice(0, 30) + "..." || "Migrated Chat",
                  updatedAt: Date.now(),
                  messages: parsed
                };
                setSessions([migratedSession]);
                setCurrentSessionId(newSessionId);
                setMessages(parsed);
                localStorage.setItem(`chat_sessions_${data.user.email}`, JSON.stringify([migratedSession]));
                localStorage.removeItem(`chat_history_${data.user.email}`);
              } catch { /* migration fail */ }
            }
          }
        }
      } catch (err) {
        console.error("Chat session check failed:", err);
        setSession(null);
        router.replace("/signin");
      }
    }
    checkSession();
  }, [router]);

  useEffect(() => {
    const userEmail = session?.user?.email;
    if (!userEmail || messages.length === 0) return;

    setSessions((prev) => {
      let cid = currentSessionId;
      const existingSession = prev.find(s => s.id === cid);
      if (existingSession && JSON.stringify(existingSession.messages) === JSON.stringify(messages)) {
        return prev;
      }

      let updated = [...prev];
      if (!cid) {
        cid = crypto.randomUUID();
        const firstUserMsg = messages.find(m => m.role === "user")?.content || "";
        const title = firstUserMsg.slice(0, 40) + (firstUserMsg.length > 40 ? "…" : "") || "New chat";
        updated.unshift({
          id: cid,
          title,
          updatedAt: Date.now(),
          messages
        });
        setTimeout(() => setCurrentSessionId(cid), 0);
      } else {
        const idx = updated.findIndex(s => s.id === cid);
        if (idx >= 0) {
          const firstUserMsg = messages.find(m => m.role === "user")?.content || "";
          const title = firstUserMsg.slice(0, 40) + (firstUserMsg.length > 40 ? "…" : "") || "Chat";
          updated[idx].messages = messages;
          updated[idx].updatedAt = Date.now();
          updated[idx].title = title;
          const [moved] = updated.splice(idx, 1);
          updated.unshift(moved);
        } else {
          updated.unshift({ id: cid, title: "Chat", updatedAt: Date.now(), messages });
        }
      }
      localStorage.setItem(`chat_sessions_${userEmail}`, JSON.stringify(updated));
      return updated;
    });
  }, [messages, currentSessionId, session]);

  useEffect(() => {
    try {
      setAgentMode(localStorage.getItem("astramind-agent-mode") === "true");
      setResearchMode(localStorage.getItem("astramind-research-mode") === "true");
    } catch {
      /* ignore */
    }
  }, []);

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

  const setAgentModePersist = useCallback((v: boolean) => {
    setAgentMode(v);
    try {
      localStorage.setItem("astramind-agent-mode", v ? "true" : "false");
    } catch {
      /* ignore */
    }
  }, []);

  const setResearchModePersist = useCallback((v: boolean) => {
    setResearchMode(v);
    try {
      localStorage.setItem("astramind-research-mode", v ? "true" : "false");
    } catch {
      /* ignore */
    }
  }, []);

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

    // ── DuckDuckGo auto-search ──────────────────────────────────────────────
    let webSources: Array<{ title: string; url: string; snippet?: string }> = [];
    let enrichedPrompt = text;
    if (!researchMode && detectSearchIntent(text)) {
      try {
        setSearchingWeb(true);
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://astramind-reer.onrender.com";
        let rawToken = (session as { accessToken?: string } | null)?.accessToken;
        if (!rawToken) {
          const ns = await neonAuthClient.getSession();
          rawToken = ns?.data?.session?.id;
        }
        const headers: Record<string, string> = {};
        if (rawToken) headers["Authorization"] = `Bearer ${rawToken}`;
        const searchRes = await fetch(`${apiBase}/api/v1/web-search?q=${encodeURIComponent(text)}`, { headers });
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.results?.length > 0) {
            webSources = searchData.results.slice(0, 5).map((r: { title?: string; link?: string; url?: string; snippet?: string }) => ({
              title: r.title || "Source",
              url: r.link || r.url || "#",
              snippet: r.snippet,
            }));
            const context = webSources
              .map((s, i) => `[${i + 1}] ${s.title}\n${s.snippet || ""}\nURL: ${s.url}`)
              .join("\n\n");
            enrichedPrompt = `[Real-time web search results for: "${text}"]\n\n${context}\n\n---\nBased on the above search results, please answer: ${text}`;
          }
        }
      } catch {
        /* silent — fallback to normal */
      } finally {
        setSearchingWeb(false);
      }
    }

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text, timestamp: new Date() };
    const loadId = crypto.randomUUID();
    const loadingMsg: Message = { id: loadId, role: "assistant", content: "", loading: true, timestamp: new Date() };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    const pendingSources = webSources;
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://astramind-reer.onrender.com";
      const headers: Record<string, string> = { "Content-Type": "application/json" };

      let rawToken = (session as { accessToken?: string } | null)?.accessToken;
      if (!rawToken) {
        const neonSession = await neonAuthClient.getSession();
        rawToken = neonSession?.data?.session?.id;
      }
      if (rawToken) headers["Authorization"] = `Bearer ${rawToken}`;

      const history = messages
        .filter((m) => !m.loading && (m.role === "user" || m.role === "assistant") && m.content && !m.content.startsWith("**Error:**"))
        .slice(-100)
        .map((m) => ({ role: m.role, content: m.content }));

      let custom_skills: string | undefined;
      let acp_tools: string | undefined;
      if (typeof window !== "undefined") {
        custom_skills = localStorage.getItem("astramind_custom_skills") || undefined;
        acp_tools = localStorage.getItem("astramind_acp_tools") || undefined;
      }

      const requestBody = {
        prompt: enrichedPrompt,
        model: selectedModel.tier || "fast",
        stream: true,
        messages: history.length > 0 ? history : undefined,
        agent_mode: agentMode,
        research_mode: researchMode,
        custom_skills,
        acp_tools,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        local_time: new Date().toString(),
      };

      // Use the unified agent streaming endpoint when agent mode is on
      const endpoint = agentMode ? `${apiBase}/api/v1/agent/stream` : `${apiBase}/api/v1/chat`;

      const response = await fetch(endpoint, {
        method: "POST", headers, signal: controller.signal,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let detail = `Request failed (${response.status})`;
        try { const d = await response.json(); if (d?.detail) detail = typeof d.detail === "string" ? d.detail : JSON.stringify(d.detail); } catch { /**/ }
        throw new Error(detail);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream available.");

      const decoder = new TextDecoder();
      let streamedContent = "";
      let vibrationTriggered = false;
      let streamDone = false; // ← flag to exit outer while loop
      // Accumulated agent events for this message
      const accumulatedAgentEvents: AgentEvent[] = [];
      // Buffer for partial SSE lines across chunks
      let lineBuffer = "";

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        if (!vibrationTriggered && vibration && typeof window !== "undefined" && window.navigator.vibrate) {
          try { window.navigator.vibrate(12); } catch { /* silent */ }
          vibrationTriggered = true;
        }

        const chunk = decoder.decode(value, { stream: true });
        lineBuffer += chunk;
        const lines = lineBuffer.split("\n");
        // Keep the last (potentially partial) line in buffer
        lineBuffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const str = line.slice(6).trim();
          if (!str || str === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(str);

            // Agent tool events — update in real-time
            if (parsed.type === "thinking" || parsed.type === "tool_start" || parsed.type === "tool_result") {
              accumulatedAgentEvents.push(parsed as AgentEvent);
              setMessages((prev) => prev.map((m) =>
                m.id === loadId ? { ...m, loading: false, agentEvents: [...accumulatedAgentEvents] } : m
              ));
              continue;
            }

            if (parsed.type === "agent_done") continue; // Internal signal, not shown

            // ✅ FIXED: set flag to exit outer while loop, not just inner for
            if (parsed.type === "done") { streamDone = true; break; }

            if (parsed.type === "error" || parsed.error) {
              const errMsg = parsed.message || parsed.error || "Stream error";
              setMessages((prev) => prev.map((m) =>
                m.id === loadId ? { ...m, loading: false, streaming: false, content: `**Error:** ${errMsg}` } : m
              ));
              return;
            }

            // Text content — agent endpoint sends {type:"text",content:"..."}, chat endpoint varies
            const delta: string =
              (parsed.type === "text" && typeof parsed.content === "string" ? parsed.content : null) ??
              (typeof parsed.content === "string" && !["thinking", "tool_start", "tool_result", "agent_done", "error", "done"].includes(parsed.type ?? "") ? parsed.content : null) ??
              (parsed.choices?.[0]?.delta?.content as string | undefined) ??
              "";

            if (delta) {
              streamedContent += delta;
              setMessages((prev) => prev.map((m) =>
                m.id === loadId
                  ? { ...m, content: streamedContent, loading: false, streaming: true, agentEvents: accumulatedAgentEvents.length > 0 ? [...accumulatedAgentEvents] : undefined }
                  : m
              ));
            }
          } catch {
            // Ignore partial JSON / keep-alive pings
          }
        }
      }

      // Stream complete
      setMessages((prev) => prev.map((m) =>
        m.id === loadId
          ? {
              ...m,
              loading: false,
              streaming: false,
              content: m.content || "_No response received._",
              sources: pendingSources.length > 0 ? pendingSources : undefined,
              agentEvents: accumulatedAgentEvents.length > 0 ? accumulatedAgentEvents : undefined,
            }
          : m
      ));
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === "AbortError") return;
      setMessages((prev) => prev.map((m) =>
        m.id === loadId ? { ...m, loading: false, streaming: false, content: `**Error:** ${error.message || "Failed to fetch."}` } : m
      ));
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, [isLoading, selectedModel, session, messages, agentMode, researchMode, vibration]);

  // Must come after handleSend to avoid 'used before declaration' error
  const handleRegenerate = useCallback(async () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg || isLoading) return;
    const allIdxs = messages.map((m, i) => m.role === "user" ? i : -1).filter((i) => i >= 0);
    const lastUserIdx = allIdxs.length > 0 ? allIdxs[allIdxs.length - 1] : -1;
    if (lastUserIdx >= 0) {
      setMessages((prev) => prev.slice(0, lastUserIdx));
    }
    await handleSend(lastUserMsg.content);
  }, [messages, isLoading, handleSend]);

  const handleFeedback = useCallback((messageId: string, type: "up" | "down") => {
    // In production: POST to /api/v1/feedback
    console.log(`Feedback ${type} for message ${messageId}`);
  }, []);

  const startNewChat = useCallback(() => {
    // Abort any in-progress stream
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    setMessages([]);
    setCurrentSessionId(null);
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const loadSession = (id: string) => {
    const s = sessions.find((s) => s.id === id);
    if (s) {
      setMessages(s.messages);
      setCurrentSessionId(id);
    }
    if (isMobile) setSidebarOpen(false);
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      const email = session?.user?.email;
      if (email) {
        localStorage.setItem(`chat_sessions_${email}`, JSON.stringify(updated));
      }
      return updated;
    });
    if (currentSessionId === id) {
      setMessages([]);
      setCurrentSessionId(null);
    }
  };

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
    <div className="flex h-screen overflow-hidden bg-[#0c0c0e] text-[#eeeef2] relative font-sans">
      
      {/* Background spotlights */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute top-[10%] left-[20%] w-[350px] h-[350px] rounded-full bg-amber-500/[0.03] blur-[100px] animate-float-1" />
        <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] rounded-full bg-[#8b7afc]/[0.03] blur-[100px] animate-float-2" />
      </div>

      {/* ═══ MOBILE OVERLAY ═══ */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 z-40 bg-black/60 backdrop-blur-[4px]"
          />
        )}
      </AnimatePresence>

      {/* ═══ SIDEBAR ═══ */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: sidebarOpen ? 260 : 0,
          x: isMobile && !sidebarOpen ? -260 : 0 
        }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex-shrink-0 h-full z-50 bg-[#111116]/95 backdrop-blur-md border-r border-white/[0.06] flex flex-col overflow-hidden"
        style={{ position: isMobile ? "absolute" : "relative" }}
      >
        <div className="w-[260px] h-full flex flex-col">
          {/* Sidebar header */}
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7.5 h-7.5 rounded-lg bg-gradient-to-br from-amber-500 to-amber-300 flex items-center justify-center shadow-[0_0_15px_rgba(242,169,59,0.25)]">
                <AstraIcon size={16} />
              </div>
              <span className="font-extrabold text-sm tracking-tight text-white font-display">ASTRAMIND</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg bg-transparent border-none text-[#5a5a72] hover:text-white cursor-pointer hover:bg-white/[0.04] flex items-center transition-colors"
            >
              <SidebarClose size={15} />
            </button>
          </div>

          {/* New chat button */}
          <div className="p-3 pb-1.5">
            <button
              onClick={startNewChat}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-amber-500/[0.07] hover:bg-amber-500/[0.12] text-amber-300 border border-amber-500/20 cursor-pointer transition-all duration-200"
            >
              <Plus size={15} className="flex-shrink-0" />
              New conversation
            </button>
          </div>

          {/* Conversation list with date groupings */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {sessions.length > 0 ? (() => {
              const todayStart = new Date(); todayStart.setHours(0,0,0,0);
              const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(todayStart.getDate() - 1);
              const weekStart = new Date(todayStart); weekStart.setDate(todayStart.getDate() - 7);

              const groups: Array<{ label: string; items: typeof sessions }> = [
                { label: "Today", items: sessions.filter(s => s.updatedAt >= todayStart.getTime()) },
                { label: "Yesterday", items: sessions.filter(s => s.updatedAt >= yesterdayStart.getTime() && s.updatedAt < todayStart.getTime()) },
                { label: "This Week", items: sessions.filter(s => s.updatedAt >= weekStart.getTime() && s.updatedAt < yesterdayStart.getTime()) },
                { label: "Older", items: sessions.filter(s => s.updatedAt < weekStart.getTime()) },
              ].filter(g => g.items.length > 0);

              return (
                <div className="flex flex-col gap-1.5">
                  {groups.map((group) => (
                    <div key={group.label} className="flex flex-col gap-0.5">
                      <p className="px-2 py-1.5 text-[9px] font-extrabold tracking-wider uppercase text-[#5a5a72]">
                        {group.label}
                      </p>
                      {group.items.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => loadSession(s.id)}
                          className={`group flex justify-between items-center px-3 py-2 rounded-xl cursor-pointer transition-all duration-150 border ${
                            currentSessionId === s.id 
                              ? "bg-white/[0.04] border-white/[0.06] text-white" 
                              : "bg-transparent border-transparent text-[#9898b0] hover:bg-white/[0.02]"
                          }`}
                        >
                          <div className="overflow-hidden text-ellipsis whitespace-nowrap flex-1 pr-2">
                            <p className="text-[12.5px] font-medium overflow-hidden text-ellipsis">{s.title}</p>
                            <p className="text-[10px] text-[#5a5a72] mt-0.5">
                              {s.messages.length} msg{s.messages.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <button
                            onClick={(e) => deleteSession(e, s.id)}
                            className="p-1 rounded-lg bg-transparent border-none text-[#5a5a72] hover:text-[#f5645a] hover:bg-[#f5645a]/10 cursor-pointer flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              );
            })() : (
              <p className="text-xs text-[#5a5a72] text-center py-6">No recent chats</p>
            )}
          </div>

          {/* Sidebar footer */}
          <div className="p-3 border-t border-white/[0.06] flex flex-col gap-0.5">
            <Link href="/" className="no-underline">
              <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs bg-transparent border-none cursor-pointer text-[#9898b0] hover:text-white hover:bg-white/[0.03] transition-all">
                <ArrowLeft size={14} />
                Back to Home
              </button>
            </Link>
            
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs bg-transparent border-none cursor-pointer text-[#9898b0] hover:text-white hover:bg-white/[0.03] transition-all"
            >
              <Settings size={14} />
              Settings
            </button>

            <Link href="/discover" className="no-underline">
              <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs bg-transparent border-none cursor-pointer text-[#9898b0] hover:text-white hover:bg-white/[0.03] transition-all">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
                </svg>
                Discover
                <span className="ml-auto text-[8px] font-extrabold px-1.5 py-0.5 bg-amber-500/10 text-amber-300 rounded">NEW</span>
              </button>
            </Link>

            <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs bg-transparent border-none cursor-pointer text-[#9898b0] hover:text-white hover:bg-white/[0.03] transition-all">
              <Wrench size={14} />
              Tools
            </button>

            <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs bg-transparent border-none cursor-pointer text-[#9898b0] hover:text-white hover:bg-white/[0.03] transition-all">
              <Info size={14} />
              About
            </button>

            <Link href="/privacy" className="no-underline">
              <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs bg-transparent border-none cursor-pointer text-[#9898b0] hover:text-white hover:bg-white/[0.03] transition-all">
                <Shield size={14} />
                Privacy
              </button>
            </Link>
          </div>
        </div>
      </motion.aside>

      {/* ═══ MAIN CHAT CONTAINER ═══ */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">

        {/* Top Header Bar */}
        <header className="flex-shrink-0 h-14 flex items-center justify-between px-4 bg-[#111116]/80 backdrop-blur-md border-b border-white/[0.06] relative z-40 shadow-[0_2px_15px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-lg bg-transparent border-none text-[#9898b0] hover:text-white cursor-pointer hover:bg-white/[0.03] flex"
              >
                <SidebarOpen size={16} />
              </button>
            )}

            <button
              onClick={startNewChat}
              title="New chat"
              className="p-1.5 rounded-lg bg-transparent border-none text-[#9898b0] hover:text-white cursor-pointer hover:bg-white/[0.03] flex"
            >
              <SquarePen size={16} />
            </button>

            {/* Model Selector Dropdown Button */}
            <div className="relative ml-1">
              <button
                onClick={() => {
                  if (modelOpen) setShowAllModels(false);
                  setModelOpen(!modelOpen);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition-colors ${
                  modelOpen 
                    ? "bg-[#1c1c24] border-white/[0.12] text-white" 
                    : "bg-[#16161c] border-white/[0.06] text-[#9898b0] hover:text-white"
                }`}
              >
                <MIcon size={14} />
                {selectedModel.label}
                <svg 
                  className={`w-3 h-3 transition-transform duration-200 ${modelOpen ? "rotate-180" : "rotate-0"}`} 
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {/* Model Dropdown Panel */}
              <AnimatePresence>
                {modelOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute top-[calc(100%+6px)] left-0 w-60 z-100 bg-[#16161c] border border-white/[0.08] rounded-xl p-1 shadow-[0_12px_40px_rgba(0,0,0,0.6)] max-h-96 overflow-y-auto"
                  >
                    {(showAllModels ? MODEL_OPTIONS : MODEL_OPTIONS.slice(0, 3)).map((m) => {
                      const ModelIcon = m.Icon;
                      const isActive = m.id === modelId;
                      return (
                        <button
                          key={m.id}
                          onClick={() => { setModelId(m.id); setModelOpen(false); setShowAllModels(false); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs border-none cursor-pointer text-left transition-colors ${
                            isActive 
                              ? "bg-amber-500/10 text-amber-300 font-bold" 
                              : "bg-transparent text-[#9898b0] hover:bg-white/[0.03] hover:text-white"
                          }`}
                        >
                          <ModelIcon size={15} />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold leading-tight">{m.label}</p>
                            <p className="text-[10px] text-[#5a5a72] mt-0.5 truncate">{m.desc}</p>
                          </div>
                          {isActive && (
                            <svg className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                    
                    {!showAllModels && (
                      <button
                        onClick={() => setShowAllModels(true)}
                        className="w-full py-2.5 mt-1 rounded-lg border border-dashed border-white/[0.1] bg-transparent text-[#5a5a72] hover:text-white hover:bg-white/[0.02] text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        Show 12 more models
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Action Menu */}
          <div className="flex items-center gap-2">
            {!session && (
              <button 
                onClick={() => router.push("/signin")} 
                className="px-3.5 py-1.5 rounded-lg bg-white text-black text-xs font-bold border-none cursor-pointer"
              >
                Sign In
              </button>
            )}
            
            {/* Export Dropdown */}
            <div className="relative">
              <button 
                onClick={() => {
                  const el = document.getElementById("export-menu");
                  if (el) el.style.display = el.style.display === "none" ? "block" : "none";
                }} 
                className="p-1.5 rounded-lg bg-transparent border-none text-[#9898b0] hover:text-white cursor-pointer hover:bg-white/[0.03] flex"
              >
                <Download size={15} />
              </button>
              <div 
                id="export-menu" 
                style={{ display: "none" }}
                className="absolute top-full right-0 mt-1.5 bg-[#16161c] border border-white/[0.08] rounded-lg p-1 w-28 z-100 shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
              >
                <button 
                  onClick={() => { exportChat("pdf"); document.getElementById("export-menu")!.style.display="none"; }} 
                  className="w-full p-2 bg-transparent border-none rounded-md text-white text-xs text-left cursor-pointer hover:bg-white/[0.03]"
                >
                  Save as PDF
                </button>
                <button 
                  onClick={() => { exportChat("doc"); document.getElementById("export-menu")!.style.display="none"; }} 
                  className="w-full p-2 bg-transparent border-none rounded-md text-white text-xs text-left cursor-pointer hover:bg-white/[0.03]"
                >
                  Export DOC
                </button>
                <button 
                  onClick={() => { exportChat("json"); document.getElementById("export-menu")!.style.display="none"; }} 
                  className="w-full p-2 bg-transparent border-none rounded-md text-white text-xs text-left cursor-pointer hover:bg-white/[0.03]"
                >
                  Export JSON
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Message Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative min-h-0">
          {messages.length === 0 ? (
            // Redesigned Empty State suggestions
            <div className="h-full flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto z-10 relative">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-300 flex items-center justify-center shadow-[0_8px_25px_rgba(242,169,59,0.3)] mb-6"
              >
                <AstraIcon size={30} />
              </motion.div>
              
              <h1 className="text-2xl font-extrabold tracking-tight mb-2 font-display text-white">How can I help?</h1>
              <p className="text-xs text-[#9898b0] mb-8">
                Orchestrating <span className="text-amber-300 font-bold">{selectedModel.label}</span> · {selectedModel.desc}
              </p>

              {/* Suggestions grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {EMPTY_SUGGESTIONS.map((s) => (
                  <button 
                    key={s} 
                    onClick={() => handleSend(s)} 
                    className="text-left p-4.5 rounded-2xl text-xs sm:text-[13px] font-normal bg-[#16161c]/60 hover:bg-[#1a1a22]/70 border border-white/[0.05] hover:border-amber-500/20 text-[#9898b0] hover:text-white cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-6 py-8">
              {messages.map((msg) => (
                <div key={msg.id} className="mb-7">
                  <MessageBubble
                    {...msg}
                    sources={msg.sources}
                    agentEvents={msg.agentEvents}
                    streaming={msg.streaming}
                    onRegenerate={msg.role === "assistant" && !msg.loading ? handleRegenerate : undefined}
                    onFeedback={msg.role === "assistant" && !msg.loading ? (type) => handleFeedback(msg.id, type) : undefined}
                  />
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input composer area */}
        <div className="flex-shrink-0 p-3 sm:p-4 bg-[#0c0c0e]">
          <div className="max-w-3xl mx-auto">
            {searchingWeb && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/[0.08] border border-amber-500/15 w-fit mx-auto mb-3.5 shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[11px] color-amber-300 font-semibold">Searching the web...</span>
              </div>
            )}
            
            <ChatInput
              onSend={handleSend}
              onStop={stopResponse}
              isLoading={isLoading}
              model={selectedModel.tier}
              agentMode={agentMode}
              researchMode={researchMode}
              onAgentModeChange={setAgentModePersist}
              onResearchModeChange={setResearchModePersist}
            />
            
            <p className="text-center text-[10px] text-[#5a5a72] mt-2.5">
              AI can make mistakes. Verify critical output. ·{" "}
              <a href="/disclaimer" className="text-[#5a5a72] underline underline-offset-2 hover:text-[#9898b0]">Disclaimer</a>
            </p>
          </div>
        </div>
      </main>

      {/* Click-away overlay to close model selector */}
      {modelOpen && (
        <div className="fixed inset-0 z-40" onClick={() => { setModelOpen(false); setShowAllModels(false); }} />
      )}

      {/* Settings Dialog */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onExportChat={exportChat}
        onClearHistory={() => {
          setMessages([]);
          setSessions([]);
          const email = session?.user?.email;
          if (email) {
            localStorage.removeItem(`chat_sessions_${email}`);
          }
        }}
      />
    </div>
  );
}