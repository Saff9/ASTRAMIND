"use client";
import { useState, useEffect, useRef } from 'react';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { ContextManager } from './ContextManager';
import { useChat } from '../../lib/hooks/useChat';

export function ChatWindow() {
  const {
    messages,
    isLoading,
    sendMessage,
    contextUsage,
    clearContext,
    summarizeContext,
    model,
    setModel,
    stopGenerating,
    error,
  } = useChat();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full p-2 sm:p-4 overflow-hidden bg-gradient-to-b from-slate-950/60 via-slate-950/40 to-slate-950/10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 sm:mb-4">
        <div>
          <div className="text-xs text-slate-400">DeepSeek / Kimi style</div>
          <div className="text-lg font-semibold text-slate-100">Chat</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as any)}
            className="h-9 px-3 rounded-xl bg-slate-900/40 text-slate-100 border border-slate-800"
            disabled={isLoading}
            aria-label="Model selection"
          >
            <option value="fast">Fast</option>
            <option value="balanced">Balanced</option>
            <option value="smart">Smart</option>
          </select>

          <button
            type="button"
            onClick={() => void clearContext()}
            className="h-9 px-3 rounded-xl bg-slate-900/40 text-slate-100 border border-slate-800 hover:bg-slate-900/60"
            disabled={isLoading}
          >
            New chat
          </button>

          {isLoading && (
            <button
              type="button"
              onClick={stopGenerating}
              className="h-9 px-3 rounded-xl bg-cyan-500/90 text-slate-950 border border-cyan-300/30 hover:bg-cyan-500"
            >
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto mb-3 sm:mb-4 pr-1">
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-200 text-sm">
            {error}
          </div>
        )}
        <MessageList messages={messages} isLoading={isLoading} />
        <div ref={messagesEndRef} />
      </div>

      <ContextManager
        contextUsage={contextUsage}
        onClearContext={clearContext}
        onSummarizeContext={summarizeContext}
      />

      <InputArea onSend={sendMessage} isDisabled={isLoading} onStop={stopGenerating} />
    </div>
  );
}