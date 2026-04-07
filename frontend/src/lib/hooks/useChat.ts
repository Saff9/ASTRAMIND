import { useCallback, useMemo, useRef, useState } from 'react';
import { sendChatMessage, type ChatRequest } from '../api/chat';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  contextUsage: number;
  sendMessage: (message: string) => Promise<void>;
  clearContext: () => Promise<void>;
  summarizeContext: () => Promise<void>;
  model: NonNullable<ChatRequest['model']>;
  setModel: (next: NonNullable<ChatRequest['model']>) => void;
  stopGenerating: () => void;
  error: string | null;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messageIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const [model, setModel] = useState<NonNullable<ChatRequest['model']>>('fast');
  const [error, setError] = useState<string | null>(null);

  const generateId = useCallback(() => {
    return `msg_${++messageIdRef.current}`;
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;
    if (isLoading) return;

    setError(null);
    setIsLoading(true);

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: trimmed,
    };

    const assistantId = generateId();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    const controller = new AbortController();
    abortRef.current = controller;

    await new Promise<void>((resolve) => {
      void sendChatMessage(
        { prompt: trimmed, model, stream: true },
        (chunk) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          );
        },
        () => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId ? { ...msg, isStreaming: false } : msg
            )
          );
          setIsLoading(false);
          resolve();
        },
        (err) => {
          if (err?.name === 'AbortError') {
            // Cancellation is a UX action; don't surface it as an error.
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId ? { ...msg, isStreaming: false } : msg
              )
            );
            setIsLoading(false);
            resolve();
            return;
          }

          const nextError = err?.message ? String(err.message) : 'Request failed';
          setError(nextError);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId ? { ...msg, isStreaming: false } : msg
            )
          );
          setIsLoading(false);
          resolve();
        },
        controller.signal
      );
    });
  }, [generateId, isLoading, model]);

  const stopGenerating = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
    setMessages((prev) => prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)));
  }, []);

  const contextUsage = useMemo(() => {
    // Approximate "context usage" by characters; replace with token counting later.
    const totalChars = messages.reduce((acc, m) => acc + m.content.length, 0);
    const pct = Math.round((totalChars / 12000) * 100);
    return Math.max(0, Math.min(100, pct));
  }, [messages]);

  return {
    messages,
    isLoading,
    contextUsage,
    sendMessage,
    clearContext: async () => {
      abortRef.current?.abort();
      abortRef.current = null;
      setMessages([]);
      setError(null);
      setIsLoading(false);
    },
    summarizeContext: async () => {
      setError(null);
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant',
          content: 'Summary: I will keep this chat context concise while preserving key decisions and open questions.',
          isStreaming: false,
        },
      ]);
    },
    model,
    setModel,
    stopGenerating,
    error,
  };
}