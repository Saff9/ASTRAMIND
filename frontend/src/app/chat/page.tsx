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
  OpenAIIcon, GeminiIcon, MistralIcon, MetaIcon,
  KimiIcon, GrokIcon, QwenIcon, QGPTIcon, PerplexityIcon
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
  { id: "claude-4.8",       label: "Claude 4.8",          Icon: ClaudeIcon,   desc: "Next-gen reasoning",       provider: "Anthropic", model: "claude-4.8",       tier: "smart",    speedMs: 1300 },
  { id: "gpt-4.5",          label: "GPT-4.5",             Icon: QGPTIcon,     desc: "Flagship multi-modal",     provider: "OpenAI",    model: "gpt-4.5",          tier: "smart",    speedMs: 1200 },
  { id: "gemini-2.0",       label: "Gemini 2.0",          Icon: GeminiIcon,   desc: "Google's best model",      provider: "Google",    model: "gemini-2.0",       tier: "smart",    speedMs: 820 },
  { id: "perplexity",       label: "Perplexity",          Icon: PerplexityIcon,desc: "Live search champion",    provider: "Perplexity",model: "sonar-huge",       tier: "smart",    speedMs: 640 },
  { id: "meta",             label: "Meta",                Icon: MetaIcon,     desc: "Llama open intelligence",  provider: "Meta",      model: "meta",            tier: "balanced", speedMs: 450 },
  { id: "grok-coder",       label: "Grok Coder",          Icon: GrokIcon,     desc: "xAI's coding expert",      provider: "xAI",       model: "grok-coder",      tier: "smart",    speedMs: 1200 },
  { id: "qwen",             label: "Qwen",                Icon: QwenIcon,     desc: "Alibaba's top model",      provider: "Alibaba",   model: "qwen",            tier: "balanced", speedMs: 900 },
  { id: "deepseek-nlu",     label: "DeepSeek NLU",        Icon: DeepSeekIcon, desc: "Language understanding",   provider: "DeepSeek",  model: "deepseek-nlu",    tier: "balanced", speedMs: 800 },
  { id: "qgpt",             label: "QGPT Ultra",          Icon: OpenAIIcon,   desc: "Enhanced GPT model",       provider: "OpenAI",    model: "qgpt",            tier: "smart",    speedMs: 1000 },
  { id: "mistral-large",    label: "Mistral Large",       Icon: MistralIcon,  desc: "Top European model",       provider: "Mistral",   model: "mistral-large",   tier: "smart",    speedMs: 890 },
  { id: "kimi",             label: "Kimi",                Icon: KimiIcon,     desc: "Moonshot's assistant",     provider: "Moonshot",  model: "kimi",            tier: "smart",    speedMs: 1100 },
  { id: "claude-sonnet",    label: "Claude 3.7 Sonnet",   Icon: ClaudeIcon,   desc: "Top coding & reasoning",   provider: "Anthropic", model: "claude-3-7-sonnet",tier: "smart",    speedMs: 1600 },
  { id: "llama-3-70b",      label: "Llama 3.3 70B",       Icon: GroqLogoIcon, desc: "Lightning fast Groq",      provider: "Groq",      model: "llama-3.3-70b",    tier: "balanced", speedMs: 400 },
  { id: "deepseek-r1",      label: "DeepSeek R1",         Icon: DeepSeekIcon, desc: "Advanced reasoning",       provider: "DeepSeek",  model: "deepseek-reasoner",tier: "smart",    speedMs: 2500 },
];

const EMPTY_SUGGESTIONS = [
  "Explain how transformers work in machine learning",
  "Write a REST API in FastAPI with JWT auth",
  "What are the best practices for React performance?",
  "Summarize the key ideas from Atomic Habits",
];

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
  const [modelId, setModelId]     = useState("claude-4.8");
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [isMobile, setIsMobile]         = useState(false);
  const [modelOpen, setModelOpen]       = useState(false);
  const [showAllModels, setShowAllModels] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
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
          fetch("/api/users/sync", { method: "POST" }).catch(() => {/* silent */});
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
    try { localStorage.setItem("astramind-agent-mode", v ? "true" : "false"); } catch {}
  }, []);

  const setResearchModePersist = useCallback((v: boolean) => {
    setResearchMode(v);
    try { localStorage.setItem("astramind-research-mode", v ? "true" : "false"); } catch {}
  }, []);

  const stopResponse = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
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
    const loadingMsg: Message = { id: loadId, role: "assistant", content: "", loading: true, timestamp: new Date(), model: selectedModel.id, provider: selectedModel.label };

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
      let streamDone = false; 
      const accumulatedAgentEvents: AgentEvent[] = [];
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
        lineBuffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const str = line.slice(6).trim();
          if (!str || str === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(str);
            if (parsed.type === "thinking" || parsed.type === "tool_start" || parsed.type === "tool_result") {
              accumulatedAgentEvents.push(parsed as AgentEvent);
              setMessages((prev) => prev.map((m) =>
                m.id === loadId ? { ...m, loading: false, agentEvents: [...accumulatedAgentEvents] } : m
              ));
              continue;
            }

            if (parsed.type === "agent_done") continue;
            if (parsed.type === "done") { streamDone = true; break; }
            if (parsed.type === "error" || parsed.error) {
              const errMsg = parsed.message || parsed.error || "Stream error";
              setMessages((prev) => prev.map((m) =>
                m.id === loadId ? { ...m, loading: false, streaming: false, content: `**Error:** ${errMsg}` } : m
              ));
              return;
            }

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
          } catch { }
        }
      }

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
    console.log(`Feedback ${type} for message ${messageId}`);
  }, []);

  const startNewChat = useCallback(() => {
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
    <div className="flex h-dvh overflow-hidden bg-bg-base text-text-main relative font-sans selection:bg-brand-500/30 selection:text-white">
      
      {/* Background spotlights */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute top-[10%] left-[20%] w-[350px] h-[350px] rounded-full bg-brand-500/5 blur-[100px] animate-float-slow" />
        <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] rounded-full bg-accent-500/5 blur-[100px] animate-float-slow" style={{ animationDelay: '-5s' }} />
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
        className="flex-shrink-0 h-full z-50 bg-bg-panel/95 backdrop-blur-md border-r border-border-dim flex flex-col overflow-hidden"
        style={{ position: isMobile ? "absolute" : "relative" }}
      >
        <div className="w-[260px] h-full flex flex-col">
          {/* Sidebar header */}
          <div className="p-4 border-b border-border-dim flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
                <AstraIcon size={16} className="text-white" />
              </div>
              <span className="font-display font-extrabold text-sm tracking-tight text-white">ASTRAMIND</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg bg-transparent border-none text-text-muted hover:text-white cursor-pointer hover:bg-bg-hover flex items-center transition-colors"
            >
              <SidebarClose size={15} />
            </button>
          </div>

          {/* New chat button */}
          <div className="p-3 pb-1.5">
            <button
              onClick={startNewChat}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/20 cursor-pointer transition-all duration-300 shadow-sm"
            >
              <Plus size={16} className="flex-shrink-0" />
              New conversation
            </button>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {sessions.length > 0 ? (() => {
              const todayStart = new Date(); todayStart.setHours(0,0,0,0);
              const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(todayStart.getDate() - 1);
              const weekStart = new Date(todayStart); weekStart.setDate(todayStart.getDate() - 7);

              const groups = [
                { label: "Today", items: sessions.filter(s => s.updatedAt >= todayStart.getTime()) },
                { label: "Yesterday", items: sessions.filter(s => s.updatedAt >= yesterdayStart.getTime() && s.updatedAt < todayStart.getTime()) },
                { label: "This Week", items: sessions.filter(s => s.updatedAt >= weekStart.getTime() && s.updatedAt < yesterdayStart.getTime()) },
                { label: "Older", items: sessions.filter(s => s.updatedAt < weekStart.getTime()) },
              ].filter(g => g.items.length > 0);

              return (
                <div className="flex flex-col gap-2">
                  {groups.map((group) => (
                    <div key={group.label} className="flex flex-col gap-1">
                      <p className="px-2 py-1.5 text-xs font-bold tracking-widest uppercase text-text-dim">
                        {group.label}
                      </p>
                      {group.items.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => loadSession(s.id)}
                          className={`group flex justify-between items-center px-3 py-2 rounded-xl cursor-pointer transition-all duration-200 border ${
                            currentSessionId === s.id 
                              ? "bg-bg-hover border-border-strong text-white shadow-sm" 
                              : "bg-transparent border-transparent text-text-muted hover:bg-bg-elevated hover:text-text-main"
                          }`}
                        >
                          <div className="overflow-hidden text-ellipsis whitespace-nowrap flex-1 pr-2">
                            <p className="text-[13px] font-medium overflow-hidden text-ellipsis">{s.title}</p>
                            <p className="text-[10px] text-text-dim mt-0.5">
                              {s.messages.length} msg{s.messages.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <button
                            onClick={(e) => deleteSession(e, s.id)}
                            className="p-1 rounded-lg bg-transparent border-none text-text-dim hover:text-red-400 hover:bg-red-500/10 cursor-pointer flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              );
            })() : (
              <p className="text-xs text-text-dim text-center py-6">No recent chats</p>
            )}
          </div>

          {/* Sidebar footer */}
          <div className="p-3 border-t border-border-dim flex flex-col gap-1">
            <Link href="/" className="no-underline">
              <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium bg-transparent border-none cursor-pointer text-text-muted hover:text-white hover:bg-bg-hover transition-colors">
                <ArrowLeft size={16} />
                Back to Home
              </button>
            </Link>
            
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium bg-transparent border-none cursor-pointer text-text-muted hover:text-white hover:bg-bg-hover transition-colors"
            >
              <Settings size={16} />
              Settings
            </button>

            <Link href="/discover" className="no-underline">
              <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium bg-transparent border-none cursor-pointer text-text-muted hover:text-white hover:bg-bg-hover transition-colors">
                <CompassIcon />
                Discover
                <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 bg-brand-500/20 text-brand-300 rounded">NEW</span>
              </button>
            </Link>
          </div>
        </div>
      </motion.aside>

      {/* ═══ MAIN CHAT CONTAINER ═══ */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">

        {/* Top Header Bar */}
        <header className="flex-shrink-0 h-16 flex items-center justify-between px-4 bg-bg-panel/80 backdrop-blur-xl border-b border-border-dim relative z-40 shadow-sm">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg bg-transparent border-none text-text-muted hover:text-white cursor-pointer hover:bg-bg-hover flex"
              >
                <SidebarOpen size={18} />
              </button>
            )}

            <button
              onClick={startNewChat}
              title="New chat"
              className="p-2 rounded-lg bg-transparent border-none text-text-muted hover:text-white cursor-pointer hover:bg-bg-hover flex"
            >
              <SquarePen size={18} />
            </button>

            {/* Model Selector Dropdown Button */}
            <div className="relative ml-2">
              <button
                onClick={() => {
                  if (modelOpen) setShowAllModels(false);
                  setModelOpen(!modelOpen);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer border transition-colors ${
                  modelOpen 
                    ? "bg-bg-hover border-border-strong text-white shadow-sm" 
                    : "bg-bg-elevated border-border-dim text-text-muted hover:text-white hover:border-border-subtle"
                }`}
              >
                <MIcon size={16} />
                {selectedModel.label}
                <svg 
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${modelOpen ? "rotate-180" : "rotate-0"}`} 
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
                    className="absolute top-[calc(100%+8px)] left-0 w-64 z-[100] bg-bg-panel border border-border-strong rounded-xl p-1.5 shadow-2xl shadow-black/50 max-h-96 overflow-y-auto"
                  >
                    {(showAllModels ? MODEL_OPTIONS : MODEL_OPTIONS.slice(0, 4)).map((m) => {
                      const ModelIcon = m.Icon;
                      const isActive = m.id === modelId;
                      return (
                        <button
                          key={m.id}
                          onClick={() => { setModelId(m.id); setModelOpen(false); setShowAllModels(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm border-none cursor-pointer text-left transition-colors ${
                            isActive 
                              ? "bg-brand-500/15 text-brand-300 font-bold" 
                              : "bg-transparent text-text-muted hover:bg-bg-hover hover:text-white"
                          }`}
                        >
                          <ModelIcon size={16} />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold leading-tight">{m.label}</p>
                            <p className="text-[11px] text-text-dim mt-0.5 truncate">{m.desc}</p>
                          </div>
                          {isActive && (
                            <svg className="w-4 h-4 flex-shrink-0 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                    
                    {!showAllModels && (
                      <button
                        onClick={() => setShowAllModels(true)}
                        className="w-full py-2.5 mt-1 rounded-lg border border-dashed border-border-strong bg-transparent text-text-dim hover:text-white hover:bg-bg-elevated text-xs font-bold cursor-pointer transition-colors"
                      >
                        Show {MODEL_OPTIONS.length - 4} more models
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Action Menu */}
          <div className="flex items-center gap-3">
            {!session && (
              <button 
                onClick={() => router.push("/signin")} 
                className="px-4 py-2 rounded-xl bg-white hover:bg-gray-100 text-bg-base text-sm font-bold border-none cursor-pointer transition-colors shadow-sm"
              >
                Sign In
              </button>
            )}
            
            {/* Export Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setExportOpen(!exportOpen)} 
                className="p-2 rounded-lg bg-transparent border-none text-text-muted hover:text-white cursor-pointer hover:bg-bg-hover flex"
              >
                <Download size={18} />
              </button>
              {exportOpen && (
                <>
                  <div className="fixed inset-0 z-[45]" onClick={() => setExportOpen(false)} />
                  <div 
                    className="absolute top-full right-0 mt-2 bg-bg-panel border border-border-strong rounded-xl p-1.5 w-36 z-[100] shadow-2xl shadow-black/50"
                  >
                    <button onClick={() => { exportChat("pdf"); setExportOpen(false); }} className="w-full px-3 py-2.5 bg-transparent border-none rounded-lg text-white text-sm font-medium text-left cursor-pointer hover:bg-bg-hover transition-colors">Save as PDF</button>
                    <button onClick={() => { exportChat("doc"); setExportOpen(false); }} className="w-full px-3 py-2.5 bg-transparent border-none rounded-lg text-white text-sm font-medium text-left cursor-pointer hover:bg-bg-hover transition-colors">Export DOC</button>
                    <button onClick={() => { exportChat("json"); setExportOpen(false); }} className="w-full px-3 py-2.5 bg-transparent border-none rounded-lg text-white text-sm font-medium text-left cursor-pointer hover:bg-bg-hover transition-colors">Export JSON</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Message Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative min-h-0">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto z-10 relative">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20 mb-6"
              >
                <AstraIcon size={32} className="text-white" />
              </motion.div>
              
              <h1 className="text-3xl font-display font-extrabold tracking-tight mb-2 text-white">How can I help?</h1>
              <p className="text-sm text-text-muted mb-10">
                Orchestrating <span className="text-brand-300 font-bold">{selectedModel.label}</span> · {selectedModel.desc}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                {EMPTY_SUGGESTIONS.map((s) => (
                  <button 
                    key={s} 
                    onClick={() => handleSend(s)} 
                    className="text-left p-4 rounded-2xl text-sm font-medium bg-bg-elevated hover:bg-bg-hover border border-border-dim hover:border-brand-500/30 text-text-muted hover:text-white cursor-pointer transition-all duration-300 hover-lift"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto px-6 py-8">
              {messages.map((msg) => (
                <div key={msg.id} className="mb-8">
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
        <div className="flex-shrink-0 p-4 sm:p-6 bg-gradient-to-t from-bg-base via-bg-base/95 to-transparent">
          <div className="max-w-4xl mx-auto relative">
            {searchingWeb && (
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 w-fit mx-auto mb-4 shadow-sm backdrop-blur-md">
                <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
                <span className="text-xs text-brand-300 font-bold tracking-wide">Searching the web...</span>
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
            
            <p className="text-center text-xs text-text-dim mt-4">
              AI can make mistakes. Verify critical output. ·{" "}
              <a href="/disclaimer" className="text-text-dim underline underline-offset-2 hover:text-text-muted transition-colors">Disclaimer</a>
            </p>
          </div>
        </div>
      </main>

      {modelOpen && (
        <div className="fixed inset-0 z-[45]" onClick={() => { setModelOpen(false); setShowAllModels(false); }} />
      )}

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

// Quick helper to render a compass icon
function CompassIcon(props: any) {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10"></circle>
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
    </svg>
  );
}